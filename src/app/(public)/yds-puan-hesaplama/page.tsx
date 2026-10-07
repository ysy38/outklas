import type { Metadata } from "next";
import Link from "next/link";
import { ScoreCalculator } from "@/components/score-calculator";
import { faqsFor, scoreMarks } from "@/content/seo";
import { yokdilBands } from "@/content/yokdil";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "YDS ve YÖKDİL puan hesaplama",
  description:
    "Her bölüme kaç doğru beklediğini yaz, puanını anında gör. YDS, e-YDS, YÖKDİL ve e-YÖKDİL’de her doğru 1,25 puandır; yanlış doğruyu götürmez. 56 doğru 70, 64 doğru 80 eder.",
  alternates: { canonical: "/yds-puan-hesaplama" },
};

const faqs = faqsFor("score");

const yokdilCount = new Map<string, number>(yokdilBands.map((band) => [band.id, band.count]));

const sections = ydsBlueprint.bands.map((band) => ({
  id: band.section,
  title: band.title,
  yds: band.to - band.from + 1,
  yokdil: yokdilCount.get(band.section) ?? 0,
}));

export default function ScorePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "YDS ve YÖKDİL puan hesaplama",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
        inLanguage: "tr-TR",
        description: "Bölümlere göre doğru sayısını yazarak YDS, e-YDS, YÖKDİL ve e-YÖKDİL puanını hesaplar.",
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
  return (
    <div className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-12 sm:px-5 sm:pt-20">
        <div className="rise-in max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-gold backdrop-blur">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pine" />
            YDS · e-YDS · YÖKDİL · e-YÖKDİL
          </p>
          <h1 className="display-xl mt-6 font-serif">
            Puanını <span className="grad">bölüm bölüm</span> hesapla.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted">
            Sınavını seç, her bölümde kaç doğru beklediğini yaz. Puanın anında çıkar. Dört sınavda da her doğru 1,25 puandır; yanlış ve boş puanı düşürmez.
          </p>
        </div>
        <div className="rise-in rise-in-late mt-10">
          <ScoreCalculator />
        </div>
        <p className="mt-4 text-xs text-muted">Bu hesap tahmindir, ÖSYM sonuç belgesinin yerini tutmaz.</p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div data-rise>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS ile YÖKDİL farkı</p>
          <h2 className="mt-4 text-4xl">Hesap aynı, kitapçık farklı.</h2>
          <p className="mt-4 leading-8 text-muted">
            İkisi de 80 soru, 180 dakika. YÖKDİL’deki sağlık, fen ve sosyal ayrımı ayrı bir puan sistemi değildir; yalnızca metinlerin konusu değişir. Fark bölümlerde: YÖKDİL’de çeviri ve dil bilgisi daha ağır, okuma daha hafiftir. Diyalog ve anlamca yakın cümle sorusu çıkmaz.
          </p>
        </div>
        <div data-rise className="glass overflow-hidden rounded-[28px] border border-line">
          <div className="grid grid-cols-[1fr_4.5rem_4.5rem] border-b border-line bg-card/60 px-5 py-3 text-xs uppercase tracking-[0.12em] text-muted sm:grid-cols-[1fr_6rem_6rem]">
            <span>Bölüm</span>
            <span className="text-right">YDS</span>
            <span className="text-right">YÖKDİL</span>
          </div>
          {sections.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center border-b border-line px-5 py-3.5 text-sm transition-colors last:border-0 hover:bg-card/70 sm:grid-cols-[1fr_6rem_6rem]">
              <span>{row.title}</span>
              <span className="text-right">{row.yds} soru</span>
              <span className={`text-right ${row.yokdil ? "" : "text-muted"}`}>{row.yokdil ? `${row.yokdil} soru` : "yok"}</span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_4.5rem_4.5rem] bg-card/60 px-5 py-3.5 text-sm sm:grid-cols-[1fr_6rem_6rem]">
            <span>Toplam</span>
            <span className="text-right">80 soru</span>
            <span className="text-right">80 soru</span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-5">
        <div data-rise>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Sık hedefler</p>
          <h2 className="mt-4 text-4xl">Hangi puan için kaç doğru?</h2>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {scoreMarks.map((row) => (
            <div key={row.correct} data-rise className="lift glass rounded-2xl border border-line p-4">
              <p className="font-serif text-4xl">{row.score}</p>
              <p className="mt-1 text-sm">{row.correct} doğru</p>
              <p className="mt-3 text-xs leading-5 text-muted">{row.note}</p>
            </div>
          ))}
        </div>
        <div data-rise className="mt-10 flex flex-col gap-5 rounded-[28px] border border-line bg-card/70 p-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl leading-7 text-muted">Tablo kaç doğru gerektiğini söyler, o doğruların hangi bölümden geleceğini söylemez. Onu 40 soruluk ücretsiz seviye testi gösterir.</p>
          <Link href="/teshis" className="shine shrink-0 rounded-full bg-pine px-6 py-3 text-center text-cream transition hover:-translate-y-0.5">
            Ücretsiz ölçümü başlat →
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div data-rise>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Sık sorulanlar</p>
          <h2 className="mt-4 text-4xl">Puan hesabıyla ilgili sorular</h2>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((item) => (
            <details key={item.question} className="faq group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg [&::-webkit-details-marker]:hidden">
                <h3 className="font-sans text-lg font-normal tracking-normal">{item.question}</h3>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-gold transition duration-300 group-open:rotate-45 group-open:border-pine">+</span>
              </summary>
              <p className="mt-3 pr-10 leading-7 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
