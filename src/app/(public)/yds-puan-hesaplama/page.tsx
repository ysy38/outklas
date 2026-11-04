import type { Metadata } from "next";
import Link from "next/link";
import { ScoreCalculator } from "@/components/score-calculator";
import { TopicLinks } from "@/components/topic-links";
import { faqsFor } from "@/content/seo";
import { yokdilBands } from "@/content/yokdil";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { scoreTable, ydsLevels } from "@/modules/exam/yds-points";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "YDS ve YÖKDİL puan hesaplama",
  description:
    "Doğru sayını yaz, YDS veya YÖKDİL puanın çıksın. 80 soruda her doğru 1,25 puandır; yanlış doğruyu götürmez. 56 doğru 70, 64 doğru 80, 72 doğru 90 eder.",
  alternates: { canonical: "/yds-puan-hesaplama" },
};

const faqs = faqsFor("score");
const table = scoreTable();

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
        description: "Doğru sayısından YDS, e-YDS, YÖKDİL ve e-YÖKDİL puanını hesaplar. İptal edilen soruyu da hesaba katar.",
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
            YDS puan hesaplama: <span className="grad">kaç doğru, kaç puan.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted">
            Doğru sayını yaz, puanın çıksın. YÖKDİL ve e-YÖKDİL’de de hesap aynıdır: 80 soru geçerliyken her doğru 1,25 puandır. Yanlış ve boş, doğru sayını düşürmez.
          </p>
        </div>
        <div className="rise-in rise-in-late mt-10">
          <ScoreCalculator />
        </div>
        <p className="mt-4 text-xs text-muted">Bu hesap tahmindir, ÖSYM sonuç belgesinin yerini tutmaz.</p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-5">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Formül</p>
          <h2 className="mt-4 text-4xl">YDS puanı nasıl hesaplanır?</h2>
          <p className="mt-4 leading-8 text-muted">
            Değerlendirmede yalnız doğru cevaplar sayılır. 80 sorunun tamamı geçerliyse puan, doğru sayısı × 1,25’tir. Bir soru iptal edilirse o soru dışarıda kalır ve kalan sorular 100 puanı paylaşır: doğru sayısı × 100 ÷ kalan soru. YDT’deki “dört yanlış bir doğruyu götürür” kuralı burada yoktur.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-5">
          {ydsLevels.map((level) => (
            <div key={level.id} className="glass rounded-2xl border border-line p-4">
              <p className="font-serif text-4xl">{level.id}</p>
              <p className="mt-1 text-sm">{level.range} puan</p>
              <p className="mt-3 text-xs leading-5 text-muted">{level.correct} doğru</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          50 puanın altı bir düzeye karşılık gelmez. 56 doğru 70 ve C, 64 doğru 80 ve B, 72 doğru 90 ve A eder. Bu doğruların hangi bölümden gelebileceğini{" "}
          <Link href="/yds-70-80-90-nasil-alinir" className="link-underline text-pine">70, 80, 90 sayfasında</Link> gösteriyoruz.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">80 soru geçerliyken</p>
          <h2 className="mt-4 text-4xl">Kaç doğru kaç puan?</h2>
        </div>
        <div className="mt-8 overflow-hidden rounded-[28px] border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Doğru</th>
                <th className="px-4 py-3 font-medium">Puan</th>
                <th className="px-4 py-3 font-medium">Düzey</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.correct} className="border-t border-line">
                  <td className="px-4 py-2.5">{row.correct}</td>
                  <td className="px-4 py-2.5 font-medium">{formatScore(row.score)}</td>
                  <td className="px-4 py-2.5 text-muted">{row.level ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted">40 doğrunun altı 50 puanın altındadır. İptal edilen soru varsa yukarıdaki hesaplayıcıya yaz; bu tablo onu kapsamaz.</p>
        <div className="mt-10 flex flex-col gap-5 rounded-[28px] border border-line bg-card/70 p-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl leading-7 text-muted">Tablo kaç doğru gerektiğini söyler. O doğruların hangi bölümden geleceğini 40 soruluk ücretsiz seviye testi gösterir.</p>
          <Link href="/teshis" className="shine shrink-0 rounded-full bg-pine px-6 py-3 text-center text-cream transition hover:-translate-y-0.5">
            Ücretsiz ölçümü başlat →
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS ile YÖKDİL farkı</p>
          <h2 className="mt-4 text-4xl">Hesap aynı, kitapçık farklı.</h2>
          <p className="mt-4 leading-8 text-muted">
            İkisi de 80 soru, 180 dakika. YÖKDİL’deki sağlık, fen ve sosyal ayrımı ayrı bir puan sistemi değildir; yalnızca metinlerin konusu değişir. Fark bölümlerde: YÖKDİL’de çeviri ve dil bilgisi daha ağır, okuma daha hafiftir. Diyalog ve anlamca yakın cümle sorusu çıkmaz.
          </p>
          <p className="mt-4 leading-7 text-muted">
            Bölüm bölüm nasıl çözüleceği{" "}
            <Link href="/rehber" className="link-underline text-pine">rehberde</Link>.
          </p>
        </div>
        <div className="glass overflow-hidden rounded-[28px] border border-line">
          <div className="grid grid-cols-[1fr_4.5rem_4.5rem] border-b border-line bg-card/60 px-5 py-3 text-xs uppercase tracking-[0.12em] text-muted sm:grid-cols-[1fr_6rem_6rem]">
            <span>Bölüm</span>
            <span className="text-right">YDS</span>
            <span className="text-right">YÖKDİL</span>
          </div>
          {sections.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center border-b border-line px-5 py-3.5 text-sm last:border-0 sm:grid-cols-[1fr_6rem_6rem]">
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

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
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

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-5">
        <TopicLinks exclude="/yds-puan-hesaplama" title="Puanı yükseltmek için" className="max-w-4xl" />
      </div>
    </div>
  );
}

function formatScore(value: number) {
  return value.toLocaleString("tr-TR");
}
