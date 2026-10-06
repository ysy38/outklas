import Link from "next/link";
import { brand } from "@/brand";
import { PendingButton } from "@/components/pending-button";
import { faqsFor } from "@/content/seo";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { startDiagnosticAction } from "@/server/actions";

export const dynamic = "force-static";

const steps = [
  {
    title: "Hedef puan",
    body: "YDS ve YÖKDİL’de puan, YDT’de net. Ölçüm bu sayının neresinde olduğunu ayırır.",
  },
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
];

const problems = [
  ["Kaynak çok", "Elindeki banka bitmiyor. Bitmeyen banka, bugün ne çözeceğini söylemez."],
  ["Sıra herkese aynı", "Senin boşluğun zayıfken komşunun okuması zayıf olabilir. Liste bunu ayırır."],
  ["Yanlış unutuluyor", "Bir kez bakıp geçilen yanlış, sınavda aynı yerden yine puan bırakır."],
];

const loop = ["Hata", "Neden", "Not", "Yeni soru", "Tekrar"];

const ribbon = ["YDS", "e-YDS", "YÖKDİL", "e-YÖKDİL", "80 soru", "180 dakika", "doğru × 1,25", "hedef puan", "günün işi"];

const gaps = [
  ["Okuduğunu anlama", "48%", "Puanın çeyreği burada."],
  ["Paragrafta boşluk", "61%", "Parça tek, boşluk on."],
  ["Çeviri", "74%", "Altı soru, yedi buçuk puan."],
];

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
    <div className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-8 pt-12 sm:px-5 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div className="rise-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-gold backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-pine" />
            YDS · e-YDS · YÖKDİL · e-YÖKDİL
          </p>
          <h1 className="display-xl mt-6 max-w-xl font-serif">{brand.hero}</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
            Ders yok, video yok, bitmeyen banka yok. Hedef puanını yazarsın. Yirmi dört soru, hangi bölümün o hedefe puan bıraktığını söyler. Ertesi güne tek bir iş kalır.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-7 text-muted">
            Dördü de 80 soru, 180 dakika. Puan, doğru sayının 1,25 katı. YÖKDİL’de metin sağlık, fen ya da sosyalden gelir; hesap değişmez.{" "}
            <Link href="/yds-puan-hesaplama" className="text-pine">
              Bölüme göre puanını hesapla.
            </Link>
          </p>
          <form action={startDiagnosticAction} className="mt-8">
            <PendingButton pendingLabel="Analiz açılıyor…" className="w-full rounded-full bg-pine px-6 py-3.5 text-cream shadow-[0_16px_40px_-18px_rgba(12,92,98,0.8)] transition hover:-translate-y-0.5 sm:w-auto">
              Ücretsiz analizi başlat
            </PendingButton>
          </form>
          <p className="mt-4 text-sm leading-6 text-muted">15 dakika · Ücretsiz · Kart gerekmez</p>
        </div>
        <aside className="glass rise-in rise-in-late rounded-[32px] border border-line p-5 sm:p-7" aria-hidden>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gold">
            <span>Örnek profil</span>
            <span>Hedef 80</span>
          </div>
          <p className="mt-5 font-serif text-5xl tracking-tight sm:text-6xl">
            64–72
            <span className="mt-2 block text-lg text-muted">tahmini puan · hedefe 8 kaldı</span>
          </p>
          <ul className="mt-6 space-y-4 text-sm">
            {gaps.map(([label, value, note], index) => (
              <li key={label}>
                <span className="flex items-center justify-between gap-3">
                  <span>{label}</span>
                  <span className="text-muted">{value}</span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-paper">
                  <span className="bar-grow block h-full rounded-full bg-pine" style={{ width: value, animationDelay: `${index * 120}ms` }} />
                </span>
                <span className="mt-1 block text-xs text-muted">{note}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-line pt-4 text-sm leading-6 text-muted">Bugün 24 soru · 28 dakika. Okuma önce gelir, çünkü puanın çeyreği oradadır.</p>
        </aside>
      </section>

      <div className="ribbon border-y border-line py-4 text-sm text-muted" aria-hidden>
        <div className="ribbon-track">
          {[...ribbon, ...ribbon].map((item, index) => (
            <span key={`${item}-${index}`} className="shrink-0 tracking-[0.14em] uppercase">
              {item}
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-5 sm:py-24">
        <div data-rise>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Sorun</p>
          <h2 className="mt-3 max-w-3xl text-4xl sm:text-5xl">YDS çalışırken sorun genellikle kaynak değil.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {problems.map(([title, body], index) => (
            <article key={title} data-rise className="lift rounded-[28px] border border-line bg-card/80 p-6 backdrop-blur sm:p-7" style={{ transitionDelay: `${index * 70}ms` }}>
              <p className="text-xs uppercase tracking-[0.16em] text-gold">0{index + 1}</p>
              <h3 className="mt-8 text-3xl">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-10 px-4 py-16 sm:px-5 sm:py-24 lg:grid-cols-2">
          <div data-rise className="lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Analiz</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">Önce hangi bölümün puan bıraktığı yazılır.</h2>
            <p className="mt-5 max-w-xl leading-8 text-muted">
              Hedef puanını yazarsın. Ölçüm 24 sorudur ve okumanın payını korur. Bittiğinde tahmini bir puan görürsün. Bu, 80 soruluk sınavın kendisi değildir. Eksik bölüm, o hedefe göre ertesi günün işini kurar. Hesap sonda istenir. YDT’de dört yanlış bir net götürür ve süre 120 dakikadır.
            </p>
          </div>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={step.title} data-rise className="glass rounded-[24px] border border-line px-5 py-5">
                <p className="font-serif text-3xl text-gold">0{index + 1}</p>
                <p className="mt-2 text-xl">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-5 sm:py-24 lg:grid-cols-2">
        <div data-rise>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Bugün</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">Herkese aynı liste yok.</h2>
          <p className="mt-5 leading-8 text-muted">
            Süreye göre dağılır. Bir bölüm listenin yarısını yutmaz. Güçlü bölüm o gün dışarıda kalır. Sınav yaklaşınca yeni soru azalır, kaçırdığın soru çoğalır. Eksik bölümün çözüm yolu rehberde durur; o türden soru listenin içine düşer.
          </p>
        </div>
        <ol data-rise className="glass rounded-[32px] border border-line p-6 sm:p-8">
          {[
            ["Okuduğunu anlama", "dün yanlış · 4 soru"],
            ["Paragrafta boşluk", "zayıf bölüm · 3 soru"],
            ["Kelime", "tekrar · 6 kart"],
          ].map(([title, meta], index) => (
            <li key={title} className="flex items-start justify-between gap-3 border-b border-line py-4 text-sm last:border-0">
              <span>
                <span className="mr-3 font-serif text-2xl text-gold">0{index + 1}</span>
                {title}
              </span>
              <span className="pt-1 text-right text-muted">{meta}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-5 sm:py-24">
          <div data-rise>
            <h2 className="text-4xl sm:text-5xl">On bölüm. Puan bunların içinde.</h2>
            <p className="mt-4 max-w-2xl leading-8 text-muted">Kitapçık yıllardır aynı sırayla gelir. Her bölümün kendi sayfası var: ne ölçülür, nereye bakılır, nasıl çözülür.</p>
          </div>
          <ol className="mt-10 grid gap-3 sm:grid-cols-2">
            {ydsBlueprint.bands.map((band) => (
              <li key={band.section} data-rise>
                <Link href={`/rehber/${band.section}`} className="lift flex items-baseline justify-between gap-3 rounded-2xl border border-line bg-card/80 px-4 py-4 text-sm backdrop-blur hover:border-pine">
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

      <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-4 py-16 sm:px-5 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
        <div data-rise>
          <h2 className="text-4xl sm:text-5xl">Soru çözmek yetmez. Nasıl çözüleceği de yazıyor.</h2>
          <p className="mt-5 leading-8 text-muted">Rehber, kitapçıktaki on bölümü tek tek açar. Soru çözdükçe senin sayın da o sayfaya düşer.</p>
          <Link href="/rehber" className="mt-6 inline-block rounded-full border border-line bg-card/80 px-5 py-3 text-sm backdrop-blur hover:border-pine">
            Rehbere geç
          </Link>
        </div>
        <div data-rise>
          <p className="text-sm text-muted">Kaçırdığın soru bu sırayla geri gelir.</p>
          <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {loop.map((step, index) => (
              <li key={step} className="glass rounded-2xl border border-line px-3 py-5 text-sm">
                <span className="block font-serif text-2xl text-gold">0{index + 1}</span>
                <span className="mt-3 block">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-5">
        <div data-rise className="relative overflow-hidden rounded-[36px] bg-pine px-6 py-12 text-cream sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cream/15 blur-3xl" />
          <p className="relative text-xs uppercase tracking-[0.18em] text-cream/70">Deneme</p>
          <h2 className="relative mt-3 max-w-xl text-4xl text-cream sm:text-5xl">80 soru, 180 dakika, ekranda.</h2>
          <p className="relative mt-5 max-w-xl leading-8 text-cream/80">
            Birkaç tam deneme. Sıra YDS kitapçığındaki on bölümdedir. Süre işler, şıkkı elersin. Bitince puan, doğru sayısının 1,25 katıdır. e-YDS ve e-YÖKDİL de ekranda girilir. YÖKDİL’de puan aynıdır, bölüm sayıları aynı değildir. Bu ekran ÖSYM’nin kopyası değildir.
          </p>
          <Link href="/deneme" className="relative mt-8 inline-block rounded-full bg-cream px-5 py-3 text-sm text-pine-deep">
            Denemeye bak
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-16 sm:px-5 sm:py-24 lg:grid-cols-3">
        <article data-rise className="lift rounded-[28px] border border-line bg-card/80 p-6 backdrop-blur">
          <h2 className="text-3xl">Kelime ezber listesi değil.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">Kart, kaçırdığın sorunun kelimesinden gelir. Bildiğini ertelersin, kaçanı erken görürsün.</p>
        </article>
        <article data-rise className="lift rounded-[28px] border border-line bg-card/80 p-6 backdrop-blur">
          <h2 className="text-3xl">Tahmin güncellenir.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">Bugün 64–72 ise yarın 68–76 olabilir. Okuma 48’den 61’e çıkınca hedefe kalan puan oradan kapanır.</p>
        </article>
        <article data-rise className="lift glass rounded-[28px] border border-line p-6">
          <h2 className="text-3xl">Ölçüm bedava.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Günde {brand.freeDailyQuestions} soru ve {brand.freeSimulators} deneme ücretsiz. Sınır kalksın dersen 90 gün {brand.prices.lab90.toLocaleString("tr-TR")} TL. Sınava az kaldıysa sprint {brand.prices.sprint.toLocaleString("tr-TR")} TL, 60 gün.
          </p>
          <Link href="/fiyat" className="mt-5 inline-block text-sm text-pine">
            Fiyatlara ve sınav günlerine bak
          </Link>
        </article>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-5">
        <h2 data-rise className="text-4xl sm:text-5xl">Sık sorulanlar</h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {faqs.map((item) => (
            <details key={item.question} className="group py-5 sm:py-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg sm:text-xl [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="font-serif text-3xl leading-none text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-5 sm:py-28">
        <div data-rise className="glass rounded-[36px] border border-line px-6 py-14 text-center sm:px-12 sm:py-20">
          <h2 className="display-xl mx-auto max-w-3xl font-serif">{brand.hero}</h2>
          <p className="mx-auto mt-5 max-w-lg text-muted">
            Ölçüm bedava. Günde {brand.freeDailyQuestions} sorudan fazlası ücretli pakette.
          </p>
          <form action={startDiagnosticAction} className="mt-8">
            <PendingButton pendingLabel="Analiz açılıyor…" className="w-full rounded-full bg-pine px-6 py-3.5 text-cream sm:w-auto">
              Ücretsiz analizi başlat
            </PendingButton>
          </form>
        </div>
      </section>
    </div>
  );
}
