import Link from "next/link";
import { brand } from "@/brand";
import { PendingButton } from "@/components/pending-button";
import { faqsFor } from "@/content/seo";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { startDiagnosticAction } from "@/server/actions";

export const dynamic = "force-static";

const steps = [
  {
    title: "Ücretsiz analiz",
    body: "Yirmi dört soru. Sonuç resmi puan değildir; 80 soruluk sınavın kısaltılmış bir tahminidir.",
  },
  {
    title: "Eksik bölüm",
    body: "Okuma, boşluk, çeviri ayrı durur. “Okuma çalış” deyip yirmi soruyu tek kovaya atmayız.",
  },
  {
    title: "Günün işi",
    body: "Ertesi gün elinde tek liste olur: zayıf bölüm, dünün yanlışı, bir parça yeni soru.",
  },
  {
    title: "Yanlış geri gelir",
    body: "Kaçırdığın soru, nedeni ve aynı türden bir yenisi zamanı gelince yeniden çıkar.",
  },
];

const problems = [
  ["Kaynak çok", "Elindeki banka bitmiyor. Bitmeyen banka, bugün ne çözeceğini söylemez."],
  ["Sıra herkese aynı", "Senin boşluğun zayıfken komşunun okuması zayıf olabilir. Liste bunu ayırır."],
  ["Yanlış unutuluyor", "Bir kez bakıp geçilen yanlış, sınavda aynı yerden yine puan bırakır."],
];

const loop = ["Hata", "Neden", "Not", "Yeni soru", "Tekrar"];

export default function HomePage() {
  const faqs = faqsFor("home");
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
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "HowTo",
        name: "YDS için bugünün işi nasıl çıkar",
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

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-8 pt-10 sm:px-5 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS · e-YDS · YÖKDİL · e-YÖKDİL</p>
          <h1 className="display mt-4 max-w-xl">{brand.hero}</h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-muted sm:text-lg">
            Eksik kaldığın bölümü bulur, ertesi güne tek bir iş bırakır. Daha fazla soru bankası değil.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-7 text-muted">
            Dördü de 80 soru, 180 dakika. Puan, doğru sayının 1,25 katı. YÖKDİL’de metin sağlık, fen ya da sosyalden gelir; hesap değişmez.{" "}
            <Link href="/yds-puan-hesaplama" className="text-pine">
              Bölüme göre puanını hesapla.
            </Link>
          </p>
          <form action={startDiagnosticAction} className="mt-8">
            <PendingButton pendingLabel="Analiz açılıyor…" className="w-full rounded-full bg-pine px-5 py-3 text-cream sm:w-auto">
              Ücretsiz analizi başlat
            </PendingButton>
          </form>
          <p className="mt-4 text-sm leading-6 text-muted">15 dakika · Ücretsiz · Kart gerekmez</p>
        </div>
        <aside className="rounded-[28px] border border-line bg-card p-5 shadow-[0_30px_80px_-48px_rgba(20,26,23,0.55)] sm:p-6" aria-hidden>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gold">
            <span>Örnek profil</span>
            <span>Tahmin 64–72</span>
          </div>
          <p className="mt-4 font-serif text-4xl">Hedefe 8 puan var</p>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              ["Okuduğunu anlama", "48%"],
              ["Paragrafta boşluk", "61%"],
              ["Çeviri", "74%"],
            ].map(([label, value]) => (
              <li key={label}>
                <span className="flex items-center justify-between gap-3">
                  <span>{label}</span>
                  <span className="text-muted">{value}</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-paper">
                  <span className="block h-full rounded-full bg-pine" style={{ width: value }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">Bugün 24 soru · 28 dakika. Okuma önce gelir, çünkü puanın çeyreği oradadır.</p>
        </aside>
      </section>

      <section className="border-y border-line bg-card/70">
        <ul className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-4 py-6 text-sm sm:px-5 lg:grid-cols-4">
          {["Ücretsiz analiz", "Günün tek işi", "On bölüm ayrı", "Yanlış zamanında döner"].map((item) => (
            <li key={item} className="rounded-2xl border border-line bg-paper px-3 py-3">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
        <h2 className="max-w-xl text-3xl sm:text-4xl">YDS çalışırken sorun genellikle kaynak değil.</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {problems.map(([title, body]) => (
            <article key={title} className="rounded-3xl border border-line bg-card p-5 sm:p-6">
              <h3 className="text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-card/60">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 sm:px-5 sm:py-16 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Analiz</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Önce hangi bölümün puan bıraktığı yazılır.</h2>
            <p className="mt-4 leading-8 text-muted">
              Ölçüm 24 sorudur ve okumanın payını korur. Bittiğinde tahmini bir puan görürsün. Bu, 80 soruluk sınavın kendisi değildir. Hesap sonda istenir. YDT’de dört yanlış bir net götürür ve süre 120 dakikadır.
            </p>
          </div>
          <ol className="space-y-3">
            {steps.slice(0, 3).map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-line bg-card px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-gold">0{index + 1}</p>
                <p className="mt-1 text-lg">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 sm:px-5 sm:py-16 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Bugün</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Herkese aynı liste yok.</h2>
          <p className="mt-4 leading-8 text-muted">
            Süreye göre dağılır. Bir bölüm listenin yarısını yutmaz. Güçlü bölüm o gün dışarıda kalır. Sınav yaklaşınca yeni soru azalır, kaçırdığın soru çoğalır.
          </p>
        </div>
        <ol className="rounded-[28px] border border-line bg-card p-5">
          {[
            ["Okuduğunu anlama", "dün yanlış · 4 soru"],
            ["Paragrafta boşluk", "zayıf bölüm · 3 soru"],
            ["Kelime", "tekrar · 6 kart"],
          ].map(([title, meta], index) => (
            <li key={title} className="flex items-start justify-between gap-3 border-b border-line py-3 text-sm last:border-0">
              <span>
                <span className="mr-2 text-muted">{index + 1}.</span>
                {title}
              </span>
              <span className="text-right text-muted">{meta}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
          <h2 className="text-3xl sm:text-4xl">On bölüm. Puan bunların içinde.</h2>
          <p className="mt-4 max-w-2xl leading-8 text-muted">Kitapçık yıllardır aynı sırayla gelir. Her bölümün kendi sayfası var: ne ölçülür, nereye bakılır.</p>
          <ol className="mt-8 grid gap-2 sm:grid-cols-2">
            {ydsBlueprint.bands.map((band) => (
              <li key={band.section}>
                <Link href={`/rehber/${band.section}`} className="flex items-baseline justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm hover:border-pine">
                  <span>{band.title}</span>
                  <span className="shrink-0 text-muted">
                    {band.from}–{band.to}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 py-12 sm:px-5 sm:py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-3xl sm:text-4xl">Soru çözmek yetmez. Nasıl çözüleceği de yazıyor.</h2>
          <p className="mt-4 leading-8 text-muted">Rehber, kitapçıktaki on bölümü tek tek açar. Soru çözdükçe senin sayın da o sayfaya düşer.</p>
          <Link href="/rehber" className="mt-6 inline-block text-sm text-pine">
            Rehbere geç
          </Link>
        </div>
        <div>
          <p className="text-sm text-muted">Kaçırdığın soru bu sırayla geri gelir.</p>
          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {loop.map((step, index) => (
              <li key={step} className="rounded-2xl border border-line bg-card px-3 py-4 text-sm">
                <span className="block text-xs text-gold">0{index + 1}</span>
                <span className="mt-1 block">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-5">
        <div className="rounded-[28px] bg-pine px-5 py-8 text-cream sm:px-8 sm:py-10">
          <p className="text-xs uppercase tracking-[0.18em] text-cream/70">Deneme</p>
          <h2 className="mt-3 max-w-xl text-3xl text-cream sm:text-4xl">80 soru, 180 dakika, ekranda.</h2>
          <p className="mt-4 max-w-xl leading-8 text-cream/80">
            Sıra YDS kitapçığındaki on bölümdedir. Süre işler, şıkkı elersin. Bitince puan, doğru sayısının 1,25 katıdır. YÖKDİL’de puan aynıdır, bölüm sayıları aynı değildir. Bu ekran ÖSYM’nin kopyası değildir.
          </p>
          <Link href="/deneme" className="mt-6 inline-block rounded-full bg-cream px-5 py-3 text-sm text-pine-deep">
            Denemeye bak
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-5 sm:py-16 lg:grid-cols-3">
        <article className="rounded-3xl border border-line bg-card p-5 sm:p-6">
          <h2 className="text-2xl">Kelime ezber listesi değil.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">Kart, kaçırdığın sorunun kelimesinden gelir. Bildiğini ertelersin, kaçanı erken görürsün.</p>
        </article>
        <article className="rounded-3xl border border-line bg-card p-5 sm:p-6">
          <h2 className="text-2xl">Tahmin güncellenir.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">Bugün 64–72 ise yarın 68–76 olabilir. Okuma 48’den 61’e çıkınca hedefe kalan puan oradan kapanır.</p>
        </article>
        <article className="rounded-3xl border border-line bg-card p-5 sm:p-6">
          <h2 className="text-2xl">Ölçüm bedava.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Günde {brand.freeDailyQuestions} soru ve {brand.freeSimulators} deneme ücretsiz. Sınır kalksın dersen 90 gün {brand.prices.lab90.toLocaleString("tr-TR")} TL. Sınava az kaldıysa sprint {brand.prices.sprint.toLocaleString("tr-TR")} TL, 60 gün.
          </p>
          <Link href="/fiyat" className="mt-4 inline-block text-sm text-pine">
            Fiyatlara ve sınav günlerine bak
          </Link>
        </article>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-5">
        <h2 className="text-3xl sm:text-4xl">Sık sorulanlar</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {faqs.map((item) => (
            <details key={item.question} className="group py-4 sm:py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base sm:text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="font-serif text-2xl leading-none text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
        <h2 className="display max-w-xl">{brand.hero}</h2>
        <form action={startDiagnosticAction} className="mt-8">
          <PendingButton pendingLabel="Analiz açılıyor…" className="w-full rounded-full bg-pine px-5 py-3 text-cream sm:w-auto">
            Ücretsiz analizi başlat
          </PendingButton>
        </form>
      </section>
    </>
  );
}
