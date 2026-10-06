import type { Metadata } from "next";
import { brand } from "@/brand";
import { PendingButton } from "@/components/pending-button";
import { countdownText, daysUntil, finishedFamilies, formatDay, upcomingSittings } from "@/content/exam-calendar";
import { devCheckoutAction } from "@/server/actions";
import { iyzicoConfigured } from "@/modules/billing/iyzico";
import { currentProfile } from "@/server/auth";
import type { CheckoutPlan } from "@/modules/billing/entitlement";

export const metadata: Metadata = {
  title: "Fiyat",
  description: `Seviye ölçümü ücretsiz. 90 gün ${brand.prices.lab90} TL, 180 gün ${brand.prices.lab180} TL, sınav sprinti ${brand.prices.sprint} TL.`,
  alternates: { canonical: "/fiyat" },
};

function tl(amount: number) {
  return amount.toLocaleString("tr-TR");
}

function applyNote(applyFrom: string | undefined, applyUntil: string | undefined, lateApply: string | undefined) {
  if (!applyUntil) return null;
  if (applyFrom && daysUntil(applyFrom) > 0) return `Başvuru ${formatDay(applyFrom)} tarihinde açılır.`;
  const left = daysUntil(applyUntil);
  const late = lateApply ? ` Geç başvuru ${formatDay(lateApply)}.` : "";
  if (left > 0) return `Başvuru ${formatDay(applyUntil)} gece yarısına kadar açık.${late}`;
  if (left === 0) return `Başvuru bugün gece yarısına kadar açık.${late}`;
  if (lateApply && daysUntil(lateApply) >= 0) return `Normal başvuru kapandı. Geç başvuru ${formatDay(lateApply)}.`;
  return null;
}

export default async function PricingPage() {
  const profile = await currentProfile();
  const live = iyzicoConfigured();
  const upcoming = upcomingSittings();
  const finished = finishedFamilies();
  const offers: {
    plan: CheckoutPlan;
    title: string;
    price: number;
    unit: string;
    points: string[];
    featured?: boolean;
  }[] = [
    {
      plan: "lab_90",
      title: "90 gün",
      price: brand.prices.lab90,
      unit: "90 gün",
      featured: true,
      points: ["Günlük soru sınırı yok", "Deneme sınırı yok", "Süre bitince biter, her ay yenilenmez"],
    },
    {
      plan: "lab_180",
      title: "180 gün",
      price: brand.prices.lab180,
      unit: "6 ay",
      points: ["90 günle aynı iş", "Sınavın tarihi daha ilerideyse", "Süre bitince biter"],
    },
    {
      plan: "sprint",
      title: "Sınav sprinti",
      price: brand.prices.sprint,
      unit: "60 gün",
      points: ["Sınava 30 ile 60 gün kala", "60 gün boyunca soru sınırı yok", "Deneme sınırı yok"],
    },
  ];

  return (
    <section className="landing mx-auto w-full max-w-6xl px-4 py-12 sm:px-5 sm:py-20">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Fiyat</p>
      <h1 className="display-xl mt-4 max-w-3xl font-serif">
        Seviyeni ölçmek <span className="grad">bedava.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-muted sm:text-lg">
        24 soruluk ölçüm ücretsiz. Çıkan sayı resmi puanın değildir; 80 soruluk sınavın kısasıdır. Ölçümden sonra, çalışmaya başlayınca günde {brand.freeDailyQuestions} soru ve{" "}
        {brand.freeSimulators} deneme hakkı var. Ücretli pakette bu sınır kalkar. Kartından her ay para çekilmez; aldığın süre bitince paket de biter.
      </p>

      <div data-rise className="glass mt-10 rounded-[28px] border border-line p-5 sm:p-6">
        <h2 className="text-2xl">Sıradaki sınavlar</h2>
        <p className="mt-2 text-sm leading-6 text-muted">ÖSYM’nin 2026 sınav takviminden. Tarih değişirse osym.gov.tr geçerlidir.</p>
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
            {finished.map((row) => `${row.sitting.name}, ${formatDay(row.sitting.date)} tarihinde yapıldı`).join(". ")}. 2026 takviminde bunlar için başka tarih yok.
          </p>
        ) : null}
        <p className="mt-3 text-sm">
          <a className="text-pine" href="https://www.osym.gov.tr/Sayfa/SinavTakvimi">
            ÖSYM sınav takvimi
          </a>
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article data-rise className="lift glass rounded-3xl border border-line p-6">
          <h2 className="text-2xl">Ücretsiz</h2>
          <p className="mt-6 font-serif text-4xl">0 TL</p>
          <ul className="mt-6 space-y-2 text-sm leading-6 text-muted">
            <li>24 soruluk ölçüm</li>
            <li>Sonra günde {brand.freeDailyQuestions} soru</li>
            <li>{brand.freeSimulators} deneme</li>
          </ul>
        </article>
        {offers.map((offer) => (
          <article
            key={offer.plan}
            data-rise
            className={
              offer.featured
                ? "lift shine rounded-3xl bg-pine p-6 text-cream shadow-[0_24px_60px_-36px_rgba(20,63,54,0.8)]"
                : "lift glass rounded-3xl border border-line p-6"
            }
          >
            <h2 className={`text-2xl ${offer.featured ? "text-cream" : ""}`}>{offer.title}</h2>
            <p className={`mt-6 font-serif text-4xl ${offer.featured ? "text-cream" : ""}`}>
              {tl(offer.price)} <span className={`text-lg ${offer.featured ? "text-cream/70" : "text-muted"}`}>TL / {offer.unit}</span>
            </p>
            <ul className={`mt-6 space-y-2 text-sm leading-6 ${offer.featured ? "text-cream/80" : "text-muted"}`}>
              {offer.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {profile && !live ? (
              <form action={devCheckoutAction.bind(null, offer.plan)} className="mt-6">
                <PendingButton
                  pendingLabel="Açılıyor…"
                  className={offer.featured ? "rounded-full bg-cream px-4 py-2 text-sm text-pine-deep" : "rounded-full border border-line px-4 py-2 text-sm"}
                >
                  Geliştirmede aç
                </PendingButton>
              </form>
            ) : null}
          </article>
        ))}
      </div>
      {live ? <p className="mt-8 text-sm text-muted">Ödeme iyzico ile alınır. Paket, ödeme bildirimi gelince açılır.</p> : null}
    </section>
  );
}
