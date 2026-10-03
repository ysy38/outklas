import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { brand } from "@/brand";
import { getDb, sessions } from "@/db/client";
import { currentProfile, readGuestId } from "@/server/auth";
import { entitlementFor } from "@/server/sessions";
import { startModeAction } from "@/server/actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "e-YDS benzeri deneme",
  description: "80 soru, 180 dakika, 1’den 80’e ızgara. YDS ve e-YDS’de yanlış doğruyu götürmez. Ekran ÖSYM kopyası değildir.",
  alternates: { canonical: "/deneme" },
};

export default async function SimulatorPage() {
  const profile = await currentProfile();
  const guestId = await readGuestId();
  const access = await entitlementFor(profile?.id ?? null);
  const db = await getDb();
  const filter = profile ? eq(sessions.profileId, profile.id) : guestId ? eq(sessions.guestId, guestId) : eq(sessions.mode, "__none__");
  const done = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(filter, eq(sessions.mode, "simulator"), eq(sessions.status, "submitted")));
  const blocked = !access.pro && done.length >= brand.freeSimulators;
  async function start() {
    "use server";
    await startModeAction("simulator");
  }
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_0.9fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Deneme</p>
        <h1 className="mt-3 text-5xl">180 dakika, 80 soru, ekranda.</h1>
        <p className="mt-4 max-w-xl leading-8 text-muted">
          Sıra kitapçıktaki on banttadır. Süre işler, soruyu işaretlersin, şıkkı elersin. Bitince puan doğru × 1,25’tir. Bu sayfa ÖSYM ekranının kopyası değildir.
        </p>
        <dl className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm">
          {[
            ["80", "soru"],
            ["180", "dakika"],
            ["× 1,25", "puan"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-line bg-card px-3 py-4">
              <dt className="font-serif text-2xl">{value}</dt>
              <dd className="mt-1 text-muted">{label}</dd>
            </div>
          ))}
        </dl>
        {blocked ? (
          <p className="mt-8">
            Ücretsiz deneme kullanıldı. <Link href="/odeme" className="text-pine">Pro ile devam et.</Link>
          </p>
        ) : (
          <form action={start} className="mt-8">
            <button className="rounded-full bg-pine px-5 py-3 text-cream">Denemeyi başlat</button>
          </form>
        )}
      </div>
      <aside className="rounded-[28px] border border-line bg-card p-5 shadow-[0_30px_80px_-48px_rgba(20,26,23,0.55)]" aria-hidden>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gold">
          <span>Örnek ızgara</span>
          <span>180:00</span>
        </div>
        <div className="mt-4 grid grid-cols-10 gap-1">
          {Array.from({ length: 80 }, (_, index) => (
            <span
              key={index}
              className={`grid h-7 place-items-center rounded-md text-[10px] ${index < 6 ? "bg-pine text-cream" : index === 22 ? "ring-1 ring-clay" : "bg-paper text-muted"}`}
            >
              {index + 1}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">İşaret, eleme ve kalan süre aynı ekranda durur. Bitince en çok kaçan bant yazılır.</p>
      </aside>
    </section>
  );
}
