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
    "Bölüme göre doğru sayını yaz, puanını gör. YDS, e-YDS, YÖKDİL ve e-YÖKDİL’de her doğru 1,25 puandır. Yanlış doğruyu götürmez. 56 doğru 70, 64 doğru 80 eder.",
  alternates: { canonical: "/yds-puan-hesaplama" },
};

const faqs = faqsFor("score");

function points(count: number) {
  return (Math.round(count * 125) / 100).toLocaleString("tr-TR");
}

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
        description: "80 soruyu bölüme göre yazarak YDS, e-YDS, YÖKDİL ve e-YÖKDİL puanını hesaplar.",
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
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-5 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS · e-YDS · YÖKDİL · e-YÖKDİL</p>
      <h1 className="display mt-3">YDS ve YÖKDİL puan hesaplama</h1>
      <p className="mt-4 text-lg leading-8 text-muted">
        Dört sınav da 80 soru, 180 dakika. Puan, doğru sayının 1,25 katıdır. Yanlış doğruyu götürmez. Her bölüme kaç doğru beklediğini yaz; toplam puan aşağıda durur. Bu sayı ÖSYM belgesi değildir.
      </p>
      <div className="mt-8">
        <ScoreCalculator />
      </div>

      <h2 className="mt-12 text-3xl">YDS ve e-YDS bölümleri</h2>
      <p className="mt-3 leading-7 text-muted">e-YDS, aynı kitapçığın ekranda girilenidir. Soru sırası değişmez.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-medium">Bölüm</th>
              <th className="py-2 font-medium">Sorular</th>
              <th className="py-2 font-medium">En fazla</th>
            </tr>
          </thead>
          <tbody>
            {ydsBlueprint.bands.map((band) => {
              const count = band.to - band.from + 1;
              return (
                <tr key={band.section} className="border-t border-line">
                  <td className="py-3">{band.title}</td>
                  <td className="py-3">
                    {band.from}–{band.to}
                    <span className="text-muted"> · {count}</span>
                  </td>
                  <td className="py-3">{points(count)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-3xl">YÖKDİL ve e-YÖKDİL bölümleri</h2>
      <p className="mt-3 leading-7 text-muted">
        Sağlık, fen ve sosyal ayrı bir puan sistemi değildir. Metnin konusu değişir; formül değişmez. Kitapçık YDS’nin kopyası da değildir. Çeviri 12 sorudur, okuma 15. Diyalog ve anlamca yakın cümle yoktur. e-YÖKDİL, bunun ekranda girilenidir.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-medium">Bölüm</th>
              <th className="py-2 font-medium">Soru</th>
              <th className="py-2 font-medium">En fazla</th>
            </tr>
          </thead>
          <tbody>
            {yokdilBands.map((band) => (
              <tr key={band.id} className="border-t border-line">
                <td className="py-3">{band.title}</td>
                <td className="py-3">{band.count}</td>
                <td className="py-3">{points(band.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-3xl">Sık hedefler</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[16rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-medium">Doğru</th>
              <th className="py-2 font-medium">Puan</th>
              <th className="py-2 font-medium">Ne işe yarar</th>
            </tr>
          </thead>
          <tbody>
            {scoreMarks.map((row) => (
              <tr key={row.correct} className="border-t border-line">
                <td className="py-3">{row.correct}</td>
                <td className="py-3">{row.score}</td>
                <td className="py-3 text-muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-8 leading-8">
        56 doğru 70 eder, 64 doğru 80. Tablo hangi bölümden geleceğini söylemez. Onu 24 soruluk ölçüm ayırır.
      </p>
      <Link href="/teshis" className="mt-6 inline-block rounded-full bg-pine px-5 py-3 text-cream">
        Ücretsiz ölçümü başlat
      </Link>
      <div className="mt-12 space-y-6">
        {faqs.map((item) => (
          <section key={item.question}>
            <h2 className="text-2xl">{item.question}</h2>
            <p className="mt-2 leading-7 text-muted">{item.answer}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
