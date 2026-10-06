import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, profiles, sessions, answers } from "@/db/client";
import { hashPassword, verifyPassword } from "./password";
import { supabaseKey, supabaseUrl } from "./supabase";

const sessionCookie = "tomo_session";
const guestCookie = "tomo_guest";
const hintCookie = "tomo_in";

function hasSupabaseSession(jar: { getAll(): { name: string }[] }) {
  return jar.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

function secret(): string {
  return process.env.AUTH_SECRET || "dev-only-secret-change-me";
}

function sign(id: string): string {
  const mac = createHmac("sha256", secret()).update(id).digest("hex");
  return `${id}.${mac}`;
}

function readSigned(value: string | undefined): string | null {
  if (!value) return null;
  const [id, mac] = value.split(".");
  if (!id || !mac) return null;
  const expected = createHmac("sha256", secret()).update(id).digest("hex");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return id;
}

export async function supabaseEnabled(): Promise<boolean> {
  return Boolean(supabaseUrl() && supabaseKey());
}

const remoteUsers = new Map<string, { at: number; user: { id: string; email: string } | null }>();

async function supabaseUser(jar: { getAll(): { name: string; value: string }[] }): Promise<{ id: string; email: string } | null> {
  if (!hasSupabaseSession(jar) || !(await supabaseEnabled())) return null;
  const key = createHash("sha256")
    .update(
      jar
        .getAll()
        .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"))
        .map((cookie) => cookie.value)
        .join("."),
    )
    .digest("hex");
  const hit = remoteUsers.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.user;
  const { createSupabaseServer } = await import("./supabase");
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
  remoteUsers.set(key, { at: Date.now(), user });
  return user;
}

export async function markSignedIn() {
  const jar = await cookies();
  if (jar.get(hintCookie)?.value === "1") return;
  jar.set(hintCookie, "1", { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function readGuestId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(guestCookie)?.value ?? null;
}

export async function getGuestId(): Promise<string> {
  const existing = await readGuestId();
  if (existing) return existing;
  const id = randomUUID();
  const jar = await cookies();
  jar.set(guestCookie, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return id;
}

export async function currentProfile() {
  const jar = await cookies();
  const remote = await supabaseUser(jar);
  if (!remote) {
    const id = readSigned(jar.get(sessionCookie)?.value);
    if (!id) return null;
    const db = await getDb();
    const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return rows[0] ?? null;
  }
  const db = await getDb();
  const found = await db.select().from(profiles).where(eq(profiles.id, remote.id)).limit(1);
  if (found[0]) return found[0];
  const created = {
    id: remote.id,
    email: remote.email || `${remote.id}@supabase.local`,
    passwordHash: null,
    role: adminEmails().includes(remote.email) ? "admin" : "learner",
    onboardingCompleted: false,
  };
  await db.insert(profiles).values(created);
  return (await db.select().from(profiles).where(eq(profiles.id, remote.id)).limit(1))[0] ?? null;
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "admin@ydslab.local")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function registerAccount(email: string, password: string): Promise<{ error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@") || password.length < 6) return { error: "Geçerli bir e-posta ve en az 6 karakterlik bir şifre gir." };
  if (await supabaseEnabled()) {
    const { createSupabaseServer } = await import("./supabase");
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.signUp({ email: normalized, password });
    if (error) return { error: error.message };
    await markSignedIn();
    return {};
  }
  const db = await getDb();
  const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, normalized)).limit(1);
  if (existing[0]) return { error: "Bu e-postayla açılmış bir hesap var. Giriş yap sekmesinden devam edebilirsin." };
  const id = randomUUID();
  await db.insert(profiles).values({
    id,
    email: normalized,
    passwordHash: hashPassword(password),
    role: adminEmails().includes(normalized) ? "admin" : "learner",
  });
  const jar = await cookies();
  jar.set(sessionCookie, sign(id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  await markSignedIn();
  return {};
}

export async function loginAccount(email: string, password: string): Promise<{ error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (await supabaseEnabled()) {
    const { createSupabaseServer } = await import("./supabase");
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) return { error: error.message };
    await markSignedIn();
    return {};
  }
  const db = await getDb();
  const rows = await db.select().from(profiles).where(eq(profiles.email, normalized)).limit(1);
  const profile = rows[0];
  if (!profile || !verifyPassword(password, profile.passwordHash)) return { error: "E-posta ya da şifre yanlış. Tekrar dener misin?" };
  const jar = await cookies();
  jar.set(sessionCookie, sign(profile.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  await markSignedIn();
  return {};
}

export async function logoutAccount() {
  const jar = await cookies();
  if (hasSupabaseSession(jar) && (await supabaseEnabled())) {
    const { createSupabaseServer } = await import("./supabase");
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  jar.delete(sessionCookie);
  jar.delete(hintCookie);
}

export async function claimGuest(profileId: string) {
  const guestId = await getGuestId();
  const db = await getDb();
  const pending = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.guestId, guestId), isNull(sessions.profileId)));
  if (pending.length === 0) return;
  const ids = pending.map((row) => row.id);
  await db.update(sessions).set({ profileId }).where(inArray(sessions.id, ids));
  await db.update(answers).set({ profileId }).where(inArray(answers.sessionId, ids));
}
