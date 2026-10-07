"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { clearPoolCache, getDb, profiles } from "@/db/client";
import { publishBlockers } from "@/modules/content/publish";
import { devCheckoutAllowed } from "@/modules/billing/iyzico";
import type { CheckoutPlan } from "@/modules/billing/entitlement";
import { currentProfile, loginAccount, logoutAccount, markSignedIn, registerAccount } from "./auth";
import { claimGuestSessions, createSession, devActivate, ensureDailyPlan, entitlementFor, recordEvent, saveAnswer, setFlag, submitSession } from "./sessions";
import { answerDrill } from "./drills";
import { checkoutHref } from "@/content/offers";

/** Only same-site paths, so the form cannot be used to bounce people to another domain. */
function nextPath(formData: FormData) {
  const value = String(formData.get("next") ?? "");
  return /^\/(?![/\\])/.test(value) ? value : "/bugun";
}

export async function signInAction(formData: FormData) {
  const result = await loginAccount(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (result.error) return result;
  const profile = await currentProfile();
  if (profile) await claimGuestSessions(profile.id);
  redirect(nextPath(formData));
}

export async function signUpAction(formData: FormData) {
  const result = await registerAccount(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (result.error) return result;
  const profile = await currentProfile();
  if (profile) {
    await claimGuestSessions(profile.id);
    await recordEvent("user_registered", profile.id);
  }
  redirect(nextPath(formData));
}

export async function signOutAction() {
  await logoutAccount();
  redirect("/");
}

export async function saveOnboardingAction(formData: FormData) {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const db = await getDb();
  await db
    .update(profiles)
    .set({
      exam: String(formData.get("exam") ?? "yds") === "ydt" ? "ydt" : "yds",
      targetScore: Number(formData.get("targetScore") ?? 70),
      examDate: String(formData.get("examDate") ?? "") || null,
      dailyMinutes: Number(formData.get("dailyMinutes") ?? 30),
      priorScore: formData.get("priorScore") ? Number(formData.get("priorScore")) : null,
      onboardingCompleted: true,
    })
    .where(eq(profiles.id, profile.id));
  await recordEvent("onboarding_completed", profile.id);
  await markSignedIn();
  redirect("/bugun");
}

export async function startDiagnosticAction() {
  await startModeAction("diagnostic");
}

export async function startSimulatorAction() {
  await startModeAction("simulator");
}

export async function startModeAction(mode: "diagnostic" | "practice" | "simulator", itemIds?: string[]) {
  const profile = await currentProfile();
  if (profile) await markSignedIn();
  const created = await createSession({ mode, profileId: profile?.id ?? null, itemIds });
  if (created.paywall) redirect(checkoutHref("kamp", Boolean(profile)));
  if (!created.id) return created;
  redirect(`/oturum/${created.id}`);
}

export async function answerAction(input: {
  sessionId: string;
  itemId: string;
  choiceId: string;
  responseTimeMs: number;
  confidence?: string | null;
}) {
  const profile = await currentProfile();
  const { getGuestId } = await import("./auth");
  return saveAnswer({ ...input, profileId: profile?.id ?? null, guestId: await getGuestId() });
}

export async function flagAction(sessionId: string, itemId: string, flagged: boolean) {
  const profile = await currentProfile();
  const { getGuestId } = await import("./auth");
  await setFlag(sessionId, itemId, flagged, profile?.id ?? null, await getGuestId());
}

export async function submitAction(sessionId: string) {
  const profile = await currentProfile();
  const { getGuestId } = await import("./auth");
  await submitSession(sessionId, profile?.id ?? null, await getGuestId());
  redirect(`/oturum/${sessionId}/sonuc`);
}

export async function drillAnswerAction(questionId: string, choiceIndex: number) {
  const profile = await currentProfile();
  if (!profile) return { error: "Devam etmek için giriş yap." };
  const access = await entitlementFor(profile.id);
  return answerDrill({ profileId: profile.id, tier: access.tier, questionId, choiceIndex });
}

export async function devCheckoutAction(plan: CheckoutPlan) {
  if (!devCheckoutAllowed()) redirect(`/odeme?paket=${plan}`);
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  await devActivate(profile.id, plan);
  redirect("/bugun");
}

export async function saveItemAction(formData: FormData) {
  const profile = await currentProfile();
  if (profile?.role !== "admin") redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  const { items, choices, itemSkills } = await import("@/db/client");
  const stem = String(formData.get("stem") ?? "");
  const explanation = String(formData.get("explanation") ?? "");
  const difficulty = Number(formData.get("difficulty") ?? 3);
  const layout = String(formData.get("layout") ?? "blank");
  const skillIds = formData.getAll("skill").map(String);
  const choiceBodies = [0, 1, 2, 3, 4].map((index) => String(formData.get(`choice-${index}`) ?? ""));
  const distractors = [0, 1, 2, 3, 4].map((index) => String(formData.get(`distractor-${index}`) ?? "") || null);
  const correctIndex = Number(formData.get("correct") ?? 0);
  const draftChoices = choiceBodies.map((body, index) => ({
    body,
    correct: index === correctIndex,
    distractorType: index === correctIndex ? null : distractors[index],
  }));
  const blockers = publishBlockers({
    stem,
    explanation,
    difficulty,
    skillIds,
    layout: layout as "blank",
    choices: draftChoices,
  });
  const status = String(formData.get("status") ?? "draft");
  if (status === "published" && blockers.length > 0) {
    redirect(`/admin/maddeler/${id}?hata=${encodeURIComponent(blockers.join(" "))}`);
  }
  await db.update(items).set({ stem, explanation, difficulty, status }).where(eq(items.id, id));
  const existing = await db.select().from(choices).where(eq(choices.itemId, id));
  for (const choice of existing.sort((a, b) => a.position - b.position)) {
    const next = draftChoices[choice.position];
    if (!next) continue;
    await db.update(choices).set({ body: next.body, correct: next.correct, distractorType: next.distractorType }).where(eq(choices.id, choice.id));
  }
  await db.delete(itemSkills).where(eq(itemSkills.itemId, id));
  if (skillIds.length > 0) await db.insert(itemSkills).values(skillIds.map((skillId) => ({ itemId: id, skillId })));
  clearPoolCache();
  redirect("/admin");
}

export async function startTodayAction() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  await markSignedIn();
  const plan = await ensureDailyPlan(profile.id, profile.dailyMinutes ?? 30, profile.targetScore, profile.examDate);
  const itemIds = plan.blocks.filter((block) => block.kind === "question").map((block) => block.id);
  const created = await createSession({ mode: "practice", profileId: profile.id, itemIds });
  if (created.paywall || !created.id) redirect("/odeme?paket=kamp");
  redirect(`/oturum/${created.id}`);
}
