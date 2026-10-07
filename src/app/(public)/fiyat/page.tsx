import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/brand";
import { OfferCards } from "@/components/offer-cards";
import { countdownText, daysUntil, finishedFamilies, formatDay, upcomingSittings } from "@/content/exam-calendar";
import { currentProfile } from "@/server/auth";
import { entitlementFor } from "@/server/sessions";

export const metadata: Metadata = {
  title: "Fiyat",
  description: `Seviye testi ücretsiz. Gelişim Paketi ${brand.prices.gelisim} TL, Kişisel YDS Kampı ${brand.prices.kamp.toLocaleString("tr-TR")} TL. Tek seferlik ödeme, abonelik yok.`,
  alternates: { canonical: "/fiyat" },
};

function applyNote(applyFrom: string | undefined, applyUntil: string | undefined, lateApply: string | undefined) {
  if (!applyUntil) return null;
  if (applyFrom && daysUntil(applyFrom) > 0) return `Başvurular ${formatDay(applyFrom)} tarihinde başlıyor.`;
  const left = daysUntil(applyUntil);
  const late = lateApply ? ` Geç başvuru: ${formatDay(lateApply)}.` : "";
  if (left > 0) return `Son başvuru: ${formatDay(applyUntil)}.${late}`;
  if (left === 0) return `Son başvuru bugün.${late}`;
  if (lateApply && daysUntil(lateApply) >= 0) return `Normal başvuru süresi bitti. Geç başvuru: ${formatDay(lateApply)}.`;
  return null;
}

export default async function PricingPage() {
  const profile = await currentProfile();
  const access = await entitlementFor(profile?.id ?? null);
  const upcoming = upcomingSittings();
  const finished = finishedFamilies();
  return (
    <section className="landing mx-auto w-full max-w-6xl px-4 py-12 sm:px-5 sm:py-20">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Fiyat</p>
      <h1 className="display-xl mt-4 max-w-3xl font-serif">
        Önce seviyeni ölç. <span className="grad">Sonra yolunu seç.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-muted sm:text-lg">
        {brand.diagnosticQuestions} soruluk seviye testi ücretsiz ve üyelik istemez. Sonucuna göre ya araçları alıp kendin çalışırsın ya da programını biz kurarız. İki paket de tek seferlik ödemedir; abonelik yok.
      </p>

      <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[0.8fr_2fr]">
        <article data-rise className="lift glass flex flex-col rounded-3xl border border-line p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Şimdilik ücretsiz</p>
          <h2 className="mt-2 text-2xl">Ücretsiz</h2>
          <p className="mt-4 font-serif text-4xl">0 TL</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm leading-6 text-muted">
            <li>{brand.diagnosticQuestions} soruluk seviye testi</li>
            <li>Raporun ilk 3 bulgusu</li>
            <li>Her gün {brand.freeDailyWords} kelime ve {brand.freeDailyConnectors} bağlaç</li>
            <li>{brand.freeSimulators} tam deneme</li>
          </ul>
          <Link href="/teshis" className="mt-5 rounded-full border border-pine px-5 py-3 text-center text-pine transition hover:bg-pine hover:text-cream">
            Ücretsiz seviyemi ölç →
          </Link>
        </article>
        <OfferCards signedIn={Boolean(profile)} tier={access.tier === "kamp" ? "free" : access.tier} />
      </div>

      <div data-rise className="glass mt-10 rounded-[28px] border border-line p-5 sm:p-6">
        <h2 className="text-2xl">Yaklaşan sınavlar</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Tarihler ÖSYM’nin 2026 sınav takviminden alınmıştır. Bir değişiklik olursa osym.gov.tr’deki bilgi geçerlidir.</p>
        <ul className="mt-5 divide-y divide-line">
          {upcoming.map((sitting) => {
            const note = applyNote(sitting.applyFrom, sitting.applyUntil, sitting.lateApply);
            return (
              <li key={sitting.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className="text-lg">{sitting.name}</p>
                  <p className="text-sm text-muted">
                    {sitting.detail}
                    {note ? ` · ${note}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-serif text-2xl">
                  {formatDay(sitting.date)}
                  <span className="mt-1 block font-sans text-sm text-muted sm:text-right">{countdownText(sitting.days)}</span>
                </p>
              </li>
            );
          })}
        </ul>
        {finished.length > 0 ? (
          <p className="border-t border-line pt-4 text-sm leading-6 text-muted">
            {finished.map((row) => `${row.sitting.name} ${formatDay(row.sitting.date)} tarihinde yapıldı`).join(". ")}. 2026 takviminde bu sınavlar için başka oturum yok.
          </p>
        ) : null}
        <p className="mt-3 text-sm">
          <a className="text-pine" href="https://www.osym.gov.tr/Sayfa/SinavTakvimi">
            ÖSYM sınav takvimi
          </a>
        </p>
      </div>

    </section>
  );
}
