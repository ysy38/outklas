import type { Metadata } from "next";
import Link from "next/link";
import { ScoreCalculator } from "@/components/score-calculator";
import { scoreMarks, siteFaqs } from "@/content/seo";

export const metadata: Metadata = {
  title: "YDS puan hesaplama",
  description:
    "YDS ve e-YDS puanı doğru sayının 1,25 katıdır. Yanlış doğruyu götürmez. 56 doğru 70, 64 doğru 80 puan eder.",
  alternates: { canonical: "/yds-puan-hesaplama" },
};

const faqs = siteFaqs.filter((item) => item.question !== "Soru seçimini bir model mi yapıyor?");

export default function ScorePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS · e-YDS</p>
      <h1 className="mt-3 text-5xl">YDS puan hesaplama</h1>
      <p className="mt-4 text-lg leading-8 text-muted">
        YDS ve e-YDS’de seksen soru, her doğru 1,25 puan. Yanlış bu çarpıma girmez. YDT’de aynı seksen soru 120 dakikadır ve net, doğru eksi yanlış bölü dört diye kurulur. Aşağıdaki sayı YDS içindir; resmi sonuç ÖSYM belgesindedir.
      </p>
      <div className="mt-8">
        <ScoreCalculator />
      </div>
      <table className="mt-10 w-full text-left text-sm">
        <caption className="mb-3 text-left text-xs uppercase tracking-[0.16em] text-gold">Sık hedefler</caption>
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
      <p className="mt-8 leading-8">
        Tablo eksik doğru sayısını söyler, o doğrunun hangi bölümden geleceğini söylemez. Onu teşhis ayırır.
      </p>
      <Link href="/teshis" className="mt-6 inline-block rounded-full bg-pine px-5 py-3 text-cream">
        Ücretsiz teşhisi başlat
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
