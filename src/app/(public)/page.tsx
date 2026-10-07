import Link from "next/link";
import { brand } from "@/brand";
import { PendingButton } from "@/components/pending-button";
import { faqsFor } from "@/content/seo";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { startDiagnosticAction } from "@/server/actions";

export const dynamic = "force-static";

const ribbon = ["YDS", "e-YDS", "YÖKDİL", "e-YÖKDİL", "80 soru", "180 dakika", "her doğru 1,25 puan", "hedef puan", "günlük plan"];

const problems = [
  {
    tag: "Kaynak çok",
    title: "Neye çalışacağına karar vermek bile yorucu.",
    body: "Kitaplar, videolar, soru bankaları… Herkese aynı sırayla çalıştıran bir program en çok senin zamanını harcar.",
  },
  {
    tag: "Ezbere soru çözmek",
    title: "Çok soru çözmek tek başına yetmez.",
    body: "Neden yanlış yaptığını anlamadan yüz soru daha çözersen, büyük ihtimalle aynı hatayı tekrar edersin.",
  },
  {
    tag: "Yol haritası yok",
    title: "Hedefin belli ama oraya nasıl gideceğin belli değil.",
    body: "64’ten 72’ye çıkmak istiyorsun ama hangi konunun sana kaç puan kazandıracağını bilmiyorsun.",
  },
];

const compare = [
  ["Kaynak", "Video, kitap, soru yığını", "Sadece o gün işine yarayan çalışma"],
  ["Plan", "Herkese aynı program", "Seviyene göre hazırlanan plan"],
  ["Yanlışlar", "Çözümü okuyup geçmek", "Yanlışın nedenini görüp benzer sorularla pekiştirmek"],
  ["Deneme", "Sadece puan ve doğru sayısı", "Hangi bölümde puan kaybettiğin"],
  ["Hedef", "“Daha çok çalış”", "“Bugün sana en çok puan kazandıracak konuya çalış”"],
];

const steps = [
  { title: "Seviye testi", body: "Üye olmadan 40 soruluk testi çözersin. Tahmini puanını ve puanını aşağı çeken bölümleri görürsün." },
  { title: "Eksiklerin", body: "Hangi bölümlerde puan kaybettiğini görürsün." },
  { title: "Doğru sorular", body: "Her seferinde o an en çok işine yarayacak sorular seçilir." },
  { title: "Günün görevi", body: "Her gün kısa ve net bir çalışma görevi alırsın." },
  { title: "Puan tahmini", body: "Hedefe ne kadar yaklaştığın her gün yeniden hesaplanır." },
];

const smart = [
  { tag: "Uyarlanır", title: "Soru seçimi", body: "Soruların zorluğu, konusu ve tipi, şimdiye kadarki sonuçlarına göre belirlenir." },
  { tag: "Analiz eder", title: "Yanlış analizi", body: "Yanlışlarının nedenini ayırır: kelime bilgisi mi, dil bilgisi mi, yoksa süre mi?" },
  { tag: "Önceliklendirir", title: "Puan etkisi", body: "Her eksik aynı derecede önemli değildir. Hedef puanına en çok katkı sağlayacak bölüm öne çıkar." },
  { tag: "Takip eder", title: "Hazırlık durumu", body: "Gerçek sınava ne kadar hazır olduğunu takip eder." },
];

const loop = ["Yanlış", "Nedeni", "Kısa not", "Benzer soru", "Tekrar"];

const bars = [36, 43, 51, 48, 64, 70, 76];

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
        name: "YDS’de neye çalışacağın nasıl belirlenir",
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

      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-16 pt-12 sm:px-5 sm:pt-20 lg:min-h-[44rem] lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <div className="rise-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-gold backdrop-blur">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pine" />
            YDS · e-YDS · YÖKDİL · e-YÖKDİL
          </p>
          <h1 className="display-xl mt-6 max-w-2xl font-serif">
            YDS’de kaç alacağını tahmin etmek yerine, <span className="grad">önce seviyeni ölç.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            {brand.diagnosticQuestions} soruluk seviye testini çöz. Seviyeni, güçlü ve zayıf olduğun bölümleri ve hedef puanına ulaşmak için kapatman gereken açıkları gör.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            YÖKDİL ve e-YÖKDİL’de de puan aynı şekilde hesaplanır: 80 soru, 180 dakika, her doğru 1,25 puan.{" "}
            <Link href="/yds-puan-hesaplama" className="link-underline text-pine">
              Puanını hesapla →
            </Link>
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <form action={startDiagnosticAction}>
              <PendingButton
                pendingLabel="Test hazırlanıyor…"
                className="shine w-full rounded-full bg-pine px-6 py-3.5 text-cream shadow-[0_16px_40px_-18px_rgba(12,92,98,0.8)] transition hover:-translate-y-0.5 sm:w-auto"
              >
                Ücretsiz seviyemi ölç →
              </PendingButton>
            </form>
            <a href="#nasil" className="rounded-full border border-line bg-card/60 px-6 py-3.5 text-center backdrop-blur transition hover:border-pine">
              Nasıl çalışıyor?
            </a>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {["Ücretsiz", "Kayıt zorunluluğu yok", `Yaklaşık ${brand.diagnosticMinutes} dakika`].map((point) => (
              <li key={point}>
                <span aria-hidden className="mr-1.5 text-pine">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="rise-in rise-in-late" aria-hidden>
          <div className="float">
            <div className="tilt glass rounded-[32px] border border-line p-6 sm:p-7">
              <div className="flex justify-between text-[11px] uppercase tracking-[0.16em] text-muted">
                <span>Örnek plan</span>
                <span className="flex items-center gap-2">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pine" />
                  YDS
                </span>
              </div>
              <p className="mt-5 font-serif text-6xl tracking-tight">
                64 <span className="text-muted">→</span> 72
                <span className="ml-2 font-sans text-sm tracking-normal text-pine">hedef</span>
              </p>
              <p className="mt-1 text-sm text-muted">Hedefe 8 puan kaldı</p>
              <span className="mt-5 block h-2 overflow-hidden rounded-full bg-paper">
                <span className="bar-grow block h-full w-[68%] rounded-full bg-gradient-to-r from-pine to-gold" />
              </span>
              <div className="mt-6 rounded-2xl border border-line bg-card/80 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Şimdi çalışman gereken</p>
                  <span className="pulse-dot h-2 w-2 rounded-full bg-pine" />
                </div>
                <p className="mt-2 text-lg">Bağlaçlar · zıtlık ve kabul</p>
                <p className="mt-1 text-xs text-muted">12 soru · yaklaşık 18 dakika · tahmini +1,4 puan</p>
              </div>
              <div className="mt-3 rounded-2xl border border-line bg-card/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Neden bu konu?</p>
                <p className="mt-2 text-lg">Doğru oranın %61, puana etkisi yüksek</p>
                <p className="mt-1 text-xs text-muted">Hedefine en hızlı buradan yaklaşırsın.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="ribbon border-y border-line bg-card/40 py-4 text-sm text-muted" aria-hidden>
        <div className="ribbon-track">
          {[...ribbon, ...ribbon].map((item, index) => (
            <span key={`${item}-${index}`} className="flex shrink-0 items-center gap-11 uppercase tracking-[0.14em]">
              {item}
              <span className="h-1 w-1 rounded-full bg-gold" />
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-5 sm:py-28">
        <div data-rise>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Asıl sorun ne?</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl sm:text-6xl">Sorun kaynak eksikliği değil.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">
            YDS’ye hazırlanan herkesin önünde binlerce soru, video, kitap ve deneme var. Asıl zor olan şu soruya cevap vermek: <span className="text-ink">Şimdi hangisine çalışmalıyım?</span>
          </p>
        </div>
        <div className="mt-14 grid gap-4 text-left md:grid-cols-3">
          {problems.map((item, index) => (
            <article key={item.tag} data-rise className="lift min-h-60 rounded-[28px] border border-line bg-card/80 p-7 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.14em] text-gold">
                0{index + 1} · {item.tag}
              </p>
              <h3 className="mt-10 text-2xl leading-snug">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-4 py-20 sm:px-5 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]">
          <div data-rise className="lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Farkımız</p>
            <h2 className="mt-4 text-4xl sm:text-5xl">
              Başkaları kaynak verir. <span className="grad">Biz neye çalışacağını söyleriz.</span>
            </h2>
            <p className="mt-5 max-w-md leading-8 text-muted">
              YDS Lab bir soru bankası ya da video kursu değil. Seviyene ve hedefine bakıp her gün neye çalışman gerektiğine karar veren bir sistem.
            </p>
          </div>
          <div data-rise className="glass overflow-hidden rounded-[28px] border border-line">
            <div className="hidden grid-cols-[0.8fr_1fr_1.2fr] border-b border-line bg-card/60 text-sm sm:grid">
              <p className="px-5 py-4 text-muted">Konu</p>
              <p className="border-l border-line px-5 py-4 text-muted">Genelde</p>
              <p className="border-l border-line px-5 py-4">YDS Lab’de</p>
            </div>
            {compare.map(([need, old, ours]) => (
              <div key={need} className="grid border-b border-line text-sm transition-colors last:border-0 hover:bg-card/70 sm:grid-cols-[0.8fr_1fr_1.2fr]">
                <p className="px-5 pt-4 text-xs uppercase tracking-[0.14em] text-gold sm:py-5 sm:text-sm sm:normal-case sm:tracking-normal sm:text-ink">{need}</p>
                <p className="px-5 py-1 text-muted line-through decoration-line sm:border-l sm:border-line sm:py-5 sm:no-underline">{old}</p>
                <p className="bg-pine/5 px-5 pb-4 pt-1 text-pine sm:border-l sm:border-line sm:py-5">{ours}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="nasil" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 text-center sm:px-5 sm:py-28">
        <div data-rise>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Nasıl çalışıyor?</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl sm:text-6xl">Çözdüğün her soru planını biraz daha netleştirir.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">
            Soru çözdükçe sistem seni daha iyi tanır ve önerileri buna göre değişir. Sabit bir program yerine seninle birlikte güncellenen bir plan.
          </p>
        </div>
        <div className="relative mt-16">
          <span aria-hidden className="route-line absolute left-[8%] right-[8%] top-10 hidden h-0.5 rounded-full opacity-50 lg:block" />
          <ol className="relative grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <li key={step.title} data-rise className="lift glass min-h-52 rounded-[24px] border border-line p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-pine/40 bg-card text-xs text-pine">0{index + 1}</span>
                <h3 className="mt-6 text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-5 sm:pb-28">
        <div data-rise className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Uygulama</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl sm:text-6xl">
            Karmaşık bir panel yok. <span className="grad">Sadece bugünün işi.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">
            Giriş yaptığında seni onlarca menü karşılamaz; bugün ne yapacağını hemen görürsün. Görev, ayırdığın süreye göre hazırlanır. İyi olduğun bölüm o gün listeye girmez; sınav yaklaştıkça yanlış yaptığın sorular öne çıkar.
          </p>
        </div>
        <div data-rise className="glass mt-12 overflow-hidden rounded-[32px] border border-line" aria-hidden>
          <div className="flex h-11 items-center gap-1.5 border-b border-line px-4">
            <i className="h-2 w-2 rounded-full bg-line" />
            <i className="h-2 w-2 rounded-full bg-line" />
            <i className="h-2 w-2 rounded-full bg-line" />
            <span className="ml-auto text-[10px] text-muted">{brand.domain}/bugun</span>
          </div>
          <div className="grid md:grid-cols-[11rem_1fr]">
            <div className="hidden border-r border-line p-4 md:block">
              <p className="mb-5 px-3 font-serif text-lg">{brand.name}</p>
              {["Bugün", "Rehber", "Kelime", "Hatalar", "Deneme", "İlerleme"].map((item, index) => (
                <p key={item} className={`my-1 rounded-lg px-3 py-2 text-xs ${index === 0 ? "bg-pine/10 text-pine" : "text-muted"}`}>
                  {item}
                </p>
              ))}
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Pazartesi</p>
                  <p className="mt-1 font-serif text-2xl">İyi akşamlar, Deniz.</p>
                </div>
                <span className="rounded-full bg-pine px-4 py-2 text-sm text-cream">Devam et →</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-line bg-card/80 p-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Tahmini puan</p>
                  <p className="mt-2 font-serif text-4xl">64,8</p>
                  <p className="mt-1 text-xs text-pine">bu ay +2,6</p>
                  <div className="mt-5 flex h-24 items-end gap-1.5">
                    {bars.map((height, index) => (
                      <span key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-pine to-gold opacity-80" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-line bg-card/80 p-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Bugünün görevi</p>
                  <p className="mt-2 font-serif text-3xl">Bağlaçlar</p>
                  <p className="mt-1 text-xs text-muted">12 soru · 18 dakika</p>
                  <span className="mt-8 inline-block rounded-full border border-pine px-4 py-2 text-sm text-pine">Göreve başla</span>
                </div>
                <div className="rounded-2xl border border-line bg-card/80 p-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">En çok puan kazanabileceğin yer</p>
                  <p className="mt-2 text-lg">Dil bilgisi · zıtlık bağlaçları</p>
                  <p className="mt-1 text-xs text-muted">%61 doğru · puana etkisi yüksek</p>
                </div>
                <div className="rounded-2xl border border-line bg-card/80 p-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Son günlerde</p>
                  <p className="mt-2 text-lg">Okuma hızın düşüyor</p>
                  <p className="mt-1 text-xs text-muted">Süreye dikkat ettiğinde doğru oranın düşmüyor.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-card/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-28">
          <div data-rise className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold">Bölümler</p>
              <h2 className="mt-4 text-4xl sm:text-5xl">Sınav 10 bölümden oluşur. Puanın bu bölümlerden gelir.</h2>
            </div>
            <p className="leading-8 text-muted">
              Soru tipleri yıllardır aynı düzende gelir. Her bölüm için bir rehber sayfası var: ne sorulur, nelere dikkat etmelisin, nasıl çözersin. Soru çözdükçe kendi sonuçlarını da o sayfada görürsün.
            </p>
          </div>
          <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ydsBlueprint.bands.map((band) => (
              <li key={band.section} data-rise>
                <Link href={`/rehber/${band.section}`} className="lift group flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-card/80 p-4 backdrop-blur">
                  <span className="leading-snug">{band.title}</span>
                  <span className="flex items-center justify-between text-xs text-muted">
                    {band.to - band.from + 1} soru
                    <span className="translate-x-0 text-pine opacity-0 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <div data-rise className="mt-12 flex flex-col gap-4 rounded-[28px] border border-line bg-card/70 p-5 backdrop-blur sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-sm text-sm leading-6 text-muted">Yanlış yaptığın sorular kaybolmaz; şu adımlarla tekrar karşına çıkar:</p>
            <ol className="flex flex-wrap items-center gap-2 text-sm">
              {loop.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-full border border-line bg-paper px-3 py-1.5">{step}</span>
                  {index < loop.length - 1 ? <span className="text-gold">→</span> : null}
                </li>
              ))}
            </ol>
            <Link href="/rehber" className="link-underline shrink-0 text-sm text-pine">
              Rehbere git →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-28">
        <div data-rise className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Arka planda ne oluyor?</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl sm:text-6xl">Asıl iş arka planda yapılıyor.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">Bunlar gösteriş için değil; her gün neye çalışacağına bunlarla karar verilir.</p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {smart.map((item) => (
            <article key={item.title} data-rise className="lift glass rounded-[28px] border border-line p-7">
              <span className="rounded-full border border-line bg-paper px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted">{item.tag}</span>
              <h3 className="mt-6 text-2xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 sm:px-5">
        <div data-rise className="relative overflow-hidden rounded-[36px] bg-pine px-6 py-14 text-cream sm:px-12 sm:py-20">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-cream/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cream/70">Deneme</p>
              <h2 className="mt-4 max-w-xl text-4xl text-cream sm:text-5xl">80 soru, 180 dakika, bilgisayar ekranında.</h2>
              <p className="mt-5 max-w-xl leading-8 text-cream/80">
                e-YDS ve e-YÖKDİL’deki gibi ekranda çözülen, gerçek sınav zorluğunda tam denemeler. Süre geri sayar; soruları işaretleyebilir, emin olmadığın şıkları eleyebilirsin. Bitince puanını ve en çok puan kaybettiğin bölümü görürsün. Ekran, ÖSYM’nin birebir kopyası değildir.
              </p>
              <Link href="/deneme" className="shine mt-8 inline-block rounded-full bg-cream px-6 py-3 text-sm text-pine-deep transition hover:-translate-y-0.5">
                Denemeye göz at →
              </Link>
            </div>
            <div aria-hidden className="grid grid-cols-10 gap-1.5 rounded-3xl border border-cream/15 bg-cream/5 p-4 backdrop-blur">
              {Array.from({ length: 40 }, (_, index) => (
                <span key={index} className={`h-6 rounded-md ${index < 14 ? "bg-cream/80" : index === 21 ? "ring-1 ring-cream/70" : "bg-cream/10"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-20 sm:px-5 sm:py-28 lg:grid-cols-3">
        <article data-rise className="lift rounded-[28px] border border-line bg-card/80 p-7 backdrop-blur">
          <h2 className="text-3xl">Her gün 10 kelime, 10 bağlaç.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">YDS’de en çok puan kaybettiren iki konu. Yanlış yaptıkların birkaç gün sonra tekrar karşına çıkar, bildiklerin giderek seyrekleşir. Dünkü sonucunla bugünkünü yan yana görürsün.</p>
        </article>
        <article data-rise className="lift rounded-[28px] border border-line bg-card/80 p-7 backdrop-blur">
          <h2 className="text-3xl">Puan tahminin her gün güncellenir.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">Bugün tahminin 64 ile 72 arasındaysa, birkaç hafta sonra 68 ile 76 arasına çıkabilir. Örneğin okumada doğru oranın %48’den %61’e yükselirse, hedefine kalan puanın büyük kısmı buradan gelir.</p>
        </article>
        <article data-rise className="lift glass rounded-[28px] border border-line p-7">
          <h2 className="text-3xl">Başlamak ücretsiz.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Seviye testi, raporun ilk 3 bulgusu, her gün {brand.freeDailyWords} kelime ve {brand.freeDailyConnectors} bağlaç, {brand.freeSimulators} tam deneme ücretsiz. Kendin çalışacaksan Gelişim Paketi {brand.prices.gelisim} TL; programını biz kuralım dersen Kişisel YDS Kampı {brand.prices.kamp.toLocaleString("tr-TR")} TL. İkisi de tek seferlik ödeme.
          </p>
          <Link href="/fiyat" className="link-underline mt-5 inline-block text-sm text-pine">
            Fiyatlar ve sınav takvimi →
          </Link>
        </article>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-8 sm:px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div data-rise>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Sık sorulanlar</p>
          <h2 className="mt-4 text-4xl sm:text-5xl">Merak ettiklerin</h2>
          <p className="mt-4 max-w-sm leading-7 text-muted">Puan hesaplama, deneme, ücret ve seviye testi hakkında en çok sorulanlar.</p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((item) => (
            <details key={item.question} className="faq group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-gold transition duration-300 group-open:rotate-45 group-open:border-pine">+</span>
              </summary>
              <p className="mt-3 max-w-2xl pr-10 text-sm leading-7 text-muted sm:text-base">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-28">
        <div data-rise className="glass relative overflow-hidden rounded-[40px] border border-line px-6 py-16 text-center sm:px-12 sm:py-24">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-80 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pine/15 blur-3xl" />
          <p className="relative text-xs uppercase tracking-[0.18em] text-gold">Hemen başla</p>
          <h2 className="display-xl relative mx-auto mt-5 max-w-4xl font-serif">
            Daha çok saat çalışmana gerek yok. <span className="grad">Neye çalışacağını bilmen yeter.</span>
          </h2>
          <p className="relative mx-auto mt-6 max-w-lg text-lg text-muted">Önce seviyeni ölç. Puanını neyin aşağı çektiğini gör, sonra yolunu seç.</p>
          <form action={startDiagnosticAction} className="relative mt-9">
            <PendingButton pendingLabel="Test hazırlanıyor…" className="shine w-full rounded-full bg-pine px-7 py-4 text-cream transition hover:-translate-y-0.5 sm:w-auto">
              Ücretsiz seviyemi ölç →
            </PendingButton>
          </form>
          <p className="relative mt-4 text-sm text-muted">Ücretsiz · Kayıt zorunluluğu yok · Yaklaşık {brand.diagnosticMinutes} dakika</p>
        </div>
      </section>
    </div>
  );
}
