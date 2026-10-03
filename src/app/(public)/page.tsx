import Link from "next/link";
import { brand } from "@/brand";
import { ScoreCalculator } from "@/components/score-calculator";
import { siteFaqs } from "@/content/seo";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { startModeAction } from "@/server/actions";

const steps = [
  {
    n: "01",
    title: "Teşhis",
    body: "24 soru. Okuma, puanın çeyreği olduğu için üç soruda geçiştirilmez. Sonuç resmi puan değil, bir aralıktır.",
  },
  {
    n: "02",
    title: "Bugünün listesi",
    body: "Süreye göre dağılır: zayıf bölüm, tekrar, hedef bölüm, biraz güçlü, biraz yeni. Bir bölüm listenin yarısını yutmaz.",
  },
  {
    n: "03",
    title: "Yanlışın nedeni",
    body: "Şıkkın üstünde yazarın notu durur. Eşdizim kaçtıysa öyle yazar. Hangi sorunun geleceğini bir model seçmez.",
  },
];

export default function HomePage() {
  async function start() {
    "use server";
    await startModeAction("diagnostic");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: brand.name,
        url: `https://${brand.domain}`,
        inLanguage: "tr-TR",
        description: brand.sub,
      },
      {
        "@type": "FAQPage",
        mainEntity: siteFaqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "HowTo",
        name: "YDS için bugünün listesi nasıl çıkar",
        inLanguage: "tr-TR",
        step: steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.body,
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mx-auto grid w-full max-w-6xl items-end gap-12 px-5 pb-8 pt-14 md:grid-cols-[1.05fr_0.95fr] md:pt-20">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">YDS, e-YDS ve YDT</p>
          <h1 className="mt-4 max-w-xl text-5xl leading-[1.05] xl:text-6xl">{brand.hero}</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">{brand.sub}</p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <form action={start}>
              <button className="rounded-full bg-pine px-5 py-3 text-cream">Ücretsiz teşhisi başlat</button>
            </form>
            <Link href="/deneme" className="rounded-full border border-line px-5 py-3">
              180 dakikalık deneme
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted">Hesap teşhisin sonunda istenir. Tahmin, ÖSYM puanı değildir.</p>
        </div>
        <aside className="rounded-[28px] border border-line bg-card p-6 shadow-[0_30px_80px_-48px_rgba(20,26,23,0.55)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gold">
            <span>Bugün</span>
            <span>32 dk</span>
          </div>
          <ol className="mt-5 space-y-3">
            {[
              ["Kelime tekrarı", "8 kart"],
              ["Okuduğunu anlama", "zayıf bölüm · 4 soru"],
              ["Dünün yanlışı", "eşdizim"],
              ["Cümle tamamlama", "yeni · 2 soru"],
            ].map(([title, meta]) => (
              <li key={title} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
                <span>{title}</span>
                <span className="text-right text-muted">{meta}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
            56 doğru 70 puan eder. Eksik sekiz doğru hangi bölümden gelecek, onu liste söyler.
          </p>
        </aside>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-16 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.n} className="rounded-3xl border border-line bg-card p-6">
            <p className="font-serif text-3xl text-gold">{step.n}</p>
            <h2 className="mt-4 text-3xl">{step.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-line bg-card/60">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Soru dağılımı</p>
            <h2 className="mt-3 text-4xl">Puanın çeyreği 43–62 arasındadır.</h2>
            <p className="mt-4 leading-8 text-muted">
              Kitapçık yıllardır aynı on bölümle gelir. “Okuma çalış” demek, yirmi soruyu tek kovaya atmak olur. Her bölüm kendi adıyla durur.
            </p>
          </div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {ydsBlueprint.bands.map((band) => (
              <li key={band.section}>
                <Link href={`/rehber/${band.section}`} className="flex items-baseline justify-between rounded-2xl border border-line px-4 py-3 text-sm hover:border-pine">
                  <span>{band.title}</span>
                  <span className="text-muted">
                    {band.from}–{band.to}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Puan</p>
          <h2 className="mt-3 text-4xl">Yanlış doğruyu götürmez.</h2>
          <p className="mt-4 leading-8 text-muted">
            YDS ve e-YDS’de hesap makinesi doğru sayını 1,25 ile çarpar, yanlış girmez. YDT’de dört yanlış bir net götürür. Asıl soru aynıdır: hedefle arandaki fark hangi bölümden kapanacak?
          </p>
          <Link href="/yds-puan-hesaplama" className="mt-6 inline-block text-sm text-pine">
            Puan tablosuna geç
          </Link>
        </div>
        <ScoreCalculator />
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-8">
        <div className="rounded-[28px] bg-pine px-6 py-10 text-cream md:px-10">
          <h2 className="max-w-xl text-4xl text-cream">Deneme, kâğıt üstünde değil ekranda durur.</h2>
          <p className="mt-4 max-w-xl leading-8 text-cream/80">
            80 soru, 180 dakika, 1’den 80’e ızgara, işaret ve şık eleme. Bitince en çok kaçırdığın bölüm ve en yavaş çözdüğün bölüm yazılır. Bu ekran ÖSYM’nin kopyası değildir.
          </p>
          <Link href="/deneme" className="mt-6 inline-block rounded-full bg-cream px-5 py-3 text-sm text-pine-deep">
            Denemeye bak
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <h2 className="text-4xl">Sık sorulanlar</h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {siteFaqs.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="font-serif text-2xl leading-none text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl leading-7 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
