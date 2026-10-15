import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/brand";
import { EditorialNote } from "@/components/editorial-note";
import { articleJsonLd } from "@/content/editorial";
import { guides } from "@/content/guides";
import { faqsFor, scoreMarks } from "@/content/seo";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export const dynamic = "force-static";

const title = "YDS Hazırlık: Ücretsiz Seviye Testi ve Kişisel Plan";
const description = `YDS ve YÖKDİL için ${brand.diagnosticQuestions} soruluk ücretsiz seviye testi. Puan kaybettiğin bölümleri bul, hedefine göre günlük çalışma planını al. Üyelik gerekmez.`;

export const metadata: Metadata = {
  title: { absolute: `${title} | ${brand.name}` },
  description,
  alternates: { canonical: "/yds-hazirlik" },
};

const steps = [
  {
    title: "Seviyeni ölç",
    body: `${brand.diagnosticQuestions} soruluk seviye testi, 80 soruluk sınavda alabileceğin puanı bir aralık olarak tahmin eder. Üye olmadan çözersin.`,
  },
  {
    title: "Puan kaybettiğin bölümü bul",
    body: "Her bölümdeki doğru oranın, o bölümün sınavdaki soru sayısıyla tartılır. Böylece hangi açığın sana kaç puana mal olduğunu görürsün.",
  },
  {
    title: "Her gün tek bir işe odaklan",
    body: "Zayıf olduğun bölümden sorular, önceki yanlışların ve birkaç yeni soru. Zaten iyi olduğun bölüme o gün vakit harcamazsın.",
  },
  {
    title: "Denemeyle kontrol et",
    body: "80 soru, 180 dakika, ekranda. Bitince puanını ve en çok puan kaybettiğin bölümü görürsün; planın buna göre güncellenir.",
  },
];

export default function YdsPrepPage() {
  const faqs = faqsFor("prep");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      articleJsonLd({ path: "/yds-hazirlik", title, description }),
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
      },
    ],
  };

  return (
    <article className="landing mx-auto w-full max-w-4xl px-4 py-12 sm:px-5 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS hazırlık</p>
      <h1 className="display-xl mt-4 font-serif">
        YDS hazırlık: <span className="grad">önce seviyeni ölç, sonra planla.</span>
      </h1>
      <EditorialNote path="/yds-hazirlik" className="mt-4" />
      <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
        YDS’ye hazırlanırken en çok zaman, neye çalışacağına karar verirken kaybedilir. Bu sayfada sınavın yapısını, puanın nasıl hesaplandığını ve hazırlığı hangi sırayla kurman gerektiğini bulursun. YÖKDİL, e-YDS ve e-YÖKDİL için de aynı yol geçerli.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link href="/teshis" className="rounded-full bg-pine px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5">
          Ücretsiz seviyemi ölç →
        </Link>
        <Link href="/yds-puan-hesaplama" className="rounded-full border border-line bg-card px-6 py-3.5 text-center text-sm font-semibold text-ink transition hover:border-pine">
          Puanını hesapla
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-3xl">Sınavı tanı</h2>
        <p className="mt-3 leading-7">
          YDS {ydsBlueprint.questionCount} soru ve {ydsBlueprint.minutes} dakikadır. Her doğru 1,25 puan getirir; yanlışlar doğruları götürmez. e-YDS’de puanlama aynıdır, yalnızca sınav bilgisayarda yapılır. Sorular 10 bölüme şöyle dağılır:
        </p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {ydsBlueprint.bands.map((band) => {
            const count = band.to - band.from + 1;
            return (
              <li key={band.section}>
                <Link href={`/rehber/${band.section}`} className="lift flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 transition hover:border-pine">
                  <span className="font-medium text-ink">{band.title}</span>
                  <span className="shrink-0 text-sm text-muted">
                    {count} soru · {(count * 1.25).toLocaleString("tr-TR")} puan
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl">Hazırlığı 4 adımda kur</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title} className="glass rounded-[24px] border border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">{index + 1}. adım</p>
              <h3 className="mt-2 text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          Puanı ve soru seçimini nasıl hesapladığımızı{" "}
          <Link href="/yontem" className="link-underline text-pine">
            yöntem sayfasında
          </Link>{" "}
          açıkça anlatıyoruz.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl">Hedef puan için kaç doğru gerekir?</h2>
        <div className="mt-6 overflow-hidden rounded-[24px] border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Puan</th>
                <th className="px-4 py-3 font-semibold">Doğru</th>
                <th className="px-4 py-3 font-semibold">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {scoreMarks.map((mark) => (
                <tr key={mark.score}>
                  <td className="px-4 py-3 font-semibold text-ink">{mark.score}</td>
                  <td className="px-4 py-3">{mark.correct}</td>
                  <td className="px-4 py-3 text-muted">{mark.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl">Konu rehberleri</h2>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            ...guides.map((guide) => [guide.title, `/${guide.slug}`] as const),
            ["Bölüm rehberi: 10 bölüm", "/rehber"] as const,
            ["Ücretsiz deneme sınavı", "/deneme"] as const,
            ["YDS puan hesaplama", "/yds-puan-hesaplama"] as const,
          ].map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="link-underline text-pine">
                {label} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl">Sık sorulanlar</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {faqs.map((item) => (
            <details key={item.question} className="faq group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                <h3 className="font-sans text-lg font-medium tracking-normal">{item.question}</h3>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-pine transition duration-300 group-open:rotate-45 group-open:border-pine">+</span>
              </summary>
              <p className="mt-3 pr-10 leading-7 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
