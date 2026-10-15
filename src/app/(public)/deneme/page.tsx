import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { brand } from "@/brand";
import { getDb, sessions } from "@/db/client";
import { simulatorLimit } from "@/modules/billing/entitlement";
import { currentProfile, readGuestId } from "@/server/auth";
import { entitlementFor } from "@/server/sessions";
import { PendingButton } from "@/components/pending-button";
import { startSimulatorAction } from "@/server/actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ücretsiz YDS ve e-YDS denemesi",
  description: "Gerçek sınav gibi 80 soru ve 180 dakika. Bitince puanını ve en çok puan kaybettiğin bölümü görürsün. Ekran ÖSYM’nin kopyası değildir.",
  alternates: { canonical: "/deneme" },
};

export default async function SimulatorPage() {
  const [profile, guestId, db] = await Promise.all([currentProfile(), readGuestId(), getDb()]);
  const filter = profile ? eq(sessions.profileId, profile.id) : guestId ? eq(sessions.guestId, guestId) : eq(sessions.mode, "__none__");
  const [access, done] = await Promise.all([
    entitlementFor(profile?.id ?? null),
    db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(filter, eq(sessions.mode, "simulator"), eq(sessions.status, "submitted"))),
  ]);
  const ydt = profile?.exam === "ydt";
  const blocked = done.length >= simulatorLimit(access.tier, { free: brand.freeSimulators, sprint: brand.sprintSimulators });
  return (
    <section className="landing mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-12 sm:px-5 sm:py-20 lg:grid-cols-[1fr_0.9fr]">
      <div className="rise-in">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Deneme</p>
        <h1 className="display mt-3">{ydt ? "80 soru, 120 dakika. Gerçek YDT gibi." : "80 soru, 180 dakika. Gerçek sınav gibi."}</h1>
        <p className="mt-4 max-w-xl leading-8 text-muted">
          {ydt
            ? "YDT’de süre 120 dakikadır ve dört yanlış bir doğruyu götürür. YDT denemesi çok yakında burada olacak. O zamana kadar seviye testini çözebilir, günlük çalışmana devam edebilirsin."
            : "Sorular, sınav kitapçığındaki sırayla gelir. Süre geri sayar; dönmek istediğin soruyu işaretleyebilir, emin olmadığın şıkları eleyebilirsin. Bitince puanını görürsün: her doğru 1,25 puan, yanlışlar doğruları götürmez. Bu ekran ÖSYM’nin birebir kopyası değildir."}
        </p>
        <dl className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm">
          {[
            ["80", "soru"],
            [ydt ? "120" : "180", "dakika"],
            [ydt ? "−1/4" : "× 1,25", ydt ? "net" : "puan"],
          ].map(([value, label]) => (
            <div key={label} className="lift glass rounded-2xl border border-line px-3 py-4">
              <dt className="font-serif text-2xl">{value}</dt>
              <dd className="mt-1 text-muted">{label}</dd>
            </div>
          ))}
        </dl>
        {ydt ? (
          <p className="mt-8">
            <Link href="/teshis" className="text-pine">Seviye testine başla.</Link>
          </p>
        ) : blocked ? (
          <p className="mt-8">
            {access.tier === "gelisim" ? "Sprint’teki deneme haklarını kullandın." : "Ücretsiz deneme hakkını kullandın."}{" "}
            <Link href={access.tier === "gelisim" ? "/odeme?paket=kamp" : "/fiyat"} className="text-pine">
              {access.tier === "gelisim" ? "Kamp’ta deneme sınırsız." : `Sprint’te ${brand.sprintSimulators} tam deneme, Kamp’ta sınırsız deneme var.`}
            </Link>
          </p>
        ) : (
          <form action={startSimulatorAction} className="mt-8">
            <PendingButton pendingLabel="Deneme hazırlanıyor…" className="w-full rounded-full bg-pine px-5 py-3 text-cream sm:w-auto">
              Denemeye başla
            </PendingButton>
          </form>
        )}
      </div>
      <aside className="rise-in rise-in-late tilt glass rounded-[32px] border border-line p-5" aria-hidden>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gold">
          <span>Soru haritası</span>
          <span>{ydt ? "120:00" : "180:00"}</span>
        </div>
        <div className="mt-4 grid grid-cols-8 gap-1 sm:grid-cols-10">
          {Array.from({ length: 80 }, (_, index) => (
            <span
              key={index}
              className={`grid h-7 place-items-center rounded-md text-[10px] ${index < 6 ? "bg-pine text-cream" : index === 22 ? "ring-1 ring-clay" : "bg-paper text-muted"}`}
            >
              {index + 1}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">İşaretlediğin sorular, elediğin şıklar ve kalan süre hep gözünün önünde. Bitince en çok puan kaybettiğin bölümü görürsün.</p>
      </aside>
    </section>
  );
}
