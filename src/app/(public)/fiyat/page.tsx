import type { Metadata } from "next";
import { brand } from "@/brand";
import { devCheckoutAction } from "@/server/actions";
import { iyzicoConfigured } from "@/modules/billing/iyzico";
import { currentProfile } from "@/server/auth";

export const metadata: Metadata = {
  title: "Fiyat",
  description: `YDS Lab Pro ayda ${brand.prices.proMonthly} TL. Sınav geçişi ${brand.prices.examPass} TL ve 90 gün. Teşhis ücretsiz kalır.`,
  alternates: { canonical: "/fiyat" },
};

export default async function PricingPage() {
  const profile = await currentProfile();
  const live = iyzicoConfigured();
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Fiyat</p>
      <h1 className="mt-3 max-w-xl text-5xl">Teşhis açık kalır. Kota, çalışmaya başlayınca gelir.</h1>
      <p className="mt-4 max-w-xl leading-8 text-muted">
        Ücretsizde günde {brand.freeDailyQuestions} soru ve {brand.freeSimulators} tam deneme vardır. Pro kotayı kaldırır. Sınav geçişi, sınava kadar olan 90 gündür; ay ay yenilenmez.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-line bg-card p-6">
          <h2 className="text-2xl">Ücretsiz</h2>
          <p className="mt-6 font-serif text-4xl">0 TL</p>
          <ul className="mt-6 space-y-2 text-sm leading-6 text-muted">
            <li>24 soruluk teşhis ve aralık tahmini</li>
            <li>Günde {brand.freeDailyQuestions} pratik sorusu</li>
            <li>{brand.freeSimulators} tam deneme</li>
          </ul>
        </article>
        <article className="rounded-3xl bg-pine p-6 text-cream shadow-[0_24px_60px_-36px_rgba(20,63,54,0.8)]">
          <h2 className="text-2xl text-cream">Pro</h2>
          <p className="mt-6 font-serif text-4xl text-cream">
            {brand.prices.proMonthly} <span className="text-lg text-cream/70">TL / ay</span>
          </p>
          <ul className="mt-6 space-y-2 text-sm leading-6 text-cream/80">
            <li>Günlük soru kotası yok</li>
            <li>Kelime ve yanlış soru aynı tekrar kuyruğunda</li>
            <li>Ek denemeler</li>
          </ul>
          {profile && !live ? (
            <form action={devCheckoutAction.bind(null, "pro")} className="mt-6">
              <button className="rounded-full bg-cream px-4 py-2 text-sm text-pine-deep">Geliştirmede Pro’yu aç</button>
            </form>
          ) : null}
        </article>
        <article className="rounded-3xl border border-line bg-card p-6">
          <h2 className="text-2xl">Sınav geçişi</h2>
          <p className="mt-6 font-serif text-4xl">
            {brand.prices.examPass} <span className="text-lg text-muted">TL / 90 gün</span>
          </p>
          <p className="mt-6 text-sm leading-6 text-muted">Pro’nun aynısı, tek sefer. Sınav tarihine kadar yeten süre için.</p>
          {profile && !live ? (
            <form action={devCheckoutAction.bind(null, "exam_pass")} className="mt-6">
              <button className="rounded-full border border-line px-4 py-2 text-sm">90 günü aç</button>
            </form>
          ) : null}
        </article>
      </div>
      {live ? <p className="mt-8 text-sm text-muted">Ödeme iyzico ile alınır. Hesap, ödeme bildirimi gelince açılır.</p> : null}
    </section>
  );
}
