import type { Metadata } from "next";
import Link from "next/link";
import { brand, siteUrl } from "@/brand";
import { HeroStage } from "@/components/hero-stage";
import { PendingButton } from "@/components/pending-button";
import { faqsFor } from "@/content/seo";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { startDiagnosticAction } from "@/server/actions";

export const dynamic = "force-static";

export const metadata: Metadata = { alternates: { canonical: "/" } };

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

const practicePoints = [
  "Giriş yaptığında seni onlarca menü karşılamaz; bugün ne yapacağını hemen görürsün.",
  "Görev, ayırdığın süreye göre hazırlanır.",
  "İyi olduğun bölüm o gün listeye girmez; sınav yaklaştıkça yanlış yaptığın sorular öne çıkar.",
];

const smart = [
  { tag: "Uyarlanır", title: "Soru seçimi", body: "Soruların zorluğu, konusu ve tipi, şimdiye kadarki sonuçlarına göre belirlenir." },
  { tag: "Analiz eder", title: "Yanlış analizi", body: "Yanlışlarının nedenini ayırır: kelime bilgisi mi, dil bilgisi mi, yoksa süre mi?" },
  { tag: "Önceliklendirir", title: "Puan etkisi", body: "Her eksik aynı derecede önemli değildir. Hedef puanına en çok katkı sağlayacak bölüm öne çıkar." },
  { tag: "Takip eder", title: "Hazırlık durumu", body: "Gerçek sınava ne kadar hazır olduğunu takip eder." },
];

const TRAIL =
  "M505 548 L560 556 L605 572 L647 590 L690 612 L728 628 L752 624 L778 600 L806 581 L834 567 L862 558 L872 546 L858 534 L844 525 L839 511 L844 502 L858 490 L870 480 L886 469 L905 462 L922 452 L915 442 L900 435 L887 427 L888 421 L915 410 L930 405 L939 399 L929 387 L932 380 L945 376 L960 372 L969 365 L960 357 L945 352 L925 345 L912 338 L924 334 L929 326 L931 317 L940 310 L937 282 L941 250 L937 215 L933 185 L931 166";

const loop = ["Yanlış", "Nedeni", "Kısa not", "Benzer soru", "Tekrar"];
const bars = [36, 43, 51, 48, 64, 70, 76];
const exams = ["YDS", "e-YDS", "YÖKDİL", "e-YÖKDİL"];
const appNav = ["Bugün", "Rehber", "Kelime", "Hatalar", "Deneme", "İlerleme"];

function Glyph({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const stepIcons = [
  "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3",
  "M4 19V9M10 19V5M16 19v-7M22 19H2",
  "M12 21a9 9 0 1 0-9-9M12 12l4-2M12 7v5",
  "M12 3v3M5 7l2 2M19 7l-2 2M8 14h8M9 18h6",
  "M4 16l5-5 3 3 8-8M14 6h6v6",
];

const practiceIcons = ["M4 19V9M10 19V5M16 19v-7M22 19H2", "M5 12h14M13 6l6 6-6 6", "M4 16l5-5 3 3 8-8"];
const smartIcons = ["M12 3v3M5 7l2 2M4 13h3M12 21a6 6 0 1 0-4-10.5", "M4 6h16M4 12h10M4 18h7", "M12 3l2.2 6.4H21l-5.4 4 2 6.6L12 16.2 6.4 20l2-6.6L3 9.4h6.8L12 3Z", "M4 16c2-6 4-8 8-8s6 2 8 8"];

export default function HomePage() {
  const faqs = faqsFor("home");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: brand.name,
        url: siteUrl,
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

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-8 pt-10 sm:px-5 sm:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:pt-10">
        <div className="rise-in">
          <p lang="en" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">{brand.tagline}</p>
          <h1 className="mt-4 max-w-xl text-[clamp(2.35rem,4.5vw,3.85rem)] leading-[1.12]">
            YDS ve YÖKDİL’e daha fazla değil, <span className="grad">daha doğru</span> çalış.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            {brand.name} seviyeni ve hedefini ölçer, çözdüğün her soruyu takip eder ve her gün sana en çok puan kazandıracak çalışmayı gösterir. Saatlerce ders, video ya da bitmeyen soru bankası yok.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            YÖKDİL ve e-YÖKDİL’de de puan aynı şekilde hesaplanır: 80 soru, 180 dakika, her doğru 1,25 puan.{" "}
            <Link href="/yds-puan-hesaplama" className="link-underline font-medium text-pine">
              Puanını hesapla →
            </Link>
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <form action={startDiagnosticAction}>
              <PendingButton
                pendingLabel="Test hazırlanıyor…"
                className="shine w-full rounded-full bg-pine px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_-16px_rgba(66,99,235,0.75)] transition hover:-translate-y-0.5 sm:w-auto"
              >
                Ücretsiz seviyemi ölç →
              </PendingButton>
            </form>
            <a href="#nasil" className="rounded-full border border-line bg-card px-6 py-3.5 text-center text-sm font-semibold text-ink shadow-sm transition hover:border-pine">
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
          <ul className="mt-5 flex flex-wrap gap-2">
            {exams.map((exam) => (
              <li key={exam} className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-muted shadow-sm">
                {exam}
              </li>
            ))}
          </ul>
        </div>
        <div className="rise-in rise-in-late">
          <HeroStage />
        </div>
      </section>

      <div className="ribbon border-y border-line bg-card/70 py-4 text-sm text-muted" aria-hidden>
        <div className="ribbon-track">
          {[...ribbon, ...ribbon].map((item, index) => (
            <span key={`${item}-${index}`} className="flex shrink-0 items-center gap-11 text-xs font-semibold uppercase tracking-[0.16em]">
              {item}
              <span className="h-1 w-1 rounded-full bg-pine" />
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-5 sm:py-24">
        <div data-rise>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Asıl sorun ne?</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-4xl sm:text-5xl">Sorun kaynak eksikliği değil.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted">
            YDS’ye hazırlanan herkesin önünde binlerce soru, video, kitap ve deneme var. Asıl zor olan şu soruya cevap vermek: <span className="font-medium text-ink">Şimdi hangisine çalışmalıyım?</span>
          </p>
        </div>
        <div className="mt-12 grid gap-4 text-left md:grid-cols-3">
          {problems.map((item, index) => (
            <article key={item.tag} data-rise className="lift rounded-[28px] bg-card p-7 text-left shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-sm font-bold text-pine">0{index + 1}</span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-pine">{item.tag}</p>
              <h3 className="mt-2 text-2xl leading-snug">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-card/80">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-4 py-20 sm:px-5 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <div data-rise className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Farkımız</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">
              Başkaları kaynak verir. <span className="grad">Biz neye çalışacağını söyleriz.</span>
            </h2>
            <p className="mt-5 max-w-md leading-8 text-muted">
              {brand.name} bir soru bankası ya da video kursu değil. Seviyene ve hedefine bakıp her gün neye çalışman gerektiğine karar veren bir sistem.
            </p>
          </div>
          <div data-rise className="overflow-hidden rounded-[28px] bg-card shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
            <div className="hidden grid-cols-[0.8fr_1fr_1.2fr] border-b border-line bg-soft text-sm sm:grid">
              <p className="px-5 py-4 text-muted">Konu</p>
              <p className="border-l border-line px-5 py-4 text-muted">Genelde</p>
              <p className="border-l border-line px-5 py-4 font-semibold text-pine">{brand.name}’de</p>
            </div>
            {compare.map(([need, old, ours]) => (
              <div key={need} className="grid border-b border-line text-sm last:border-0 hover:bg-soft sm:grid-cols-[0.8fr_1fr_1.2fr]">
                <p className="px-5 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-pine sm:py-5 sm:text-sm sm:normal-case sm:tracking-normal sm:text-ink">{need}</p>
                <p className="px-5 py-1 text-muted line-through decoration-[#d5e0ee] sm:border-l sm:border-line sm:py-5 sm:no-underline">{old}</p>
                <p className="bg-soft px-5 pb-4 pt-1 font-medium text-pine sm:border-l sm:border-line sm:py-5">{ours}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="nasil" className="scroll-mt-24 bg-[linear-gradient(180deg,var(--soft)_0%,var(--paper)_100%)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-24">
          <div data-rise className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Nasıl çalışıyor?</p>
              <h2 className="mt-3 text-4xl leading-[1.15] sm:text-5xl">Çözdüğün her soru planını biraz daha netleştirir.</h2>
            </div>
            <div className="max-w-md">
              <p className="leading-8 text-muted">
                Soru çözdükçe sistem seni daha iyi tanır ve önerileri buna göre değişir. Sabit bir program yerine seninle birlikte güncellenen bir plan.
              </p>
              <form action={startDiagnosticAction} className="mt-6">
                <PendingButton pendingLabel="Test hazırlanıyor…" className="shine rounded-full bg-pine px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_-16px_rgba(66,99,235,0.75)] transition hover:-translate-y-0.5">
                  Ücretsiz seviyemi ölç →
                </PendingButton>
              </form>
              <Link href="/yontem" className="link-underline mt-4 inline-block text-sm font-medium text-pine">
                Yöntemimizi ayrıntılı oku →
              </Link>
            </div>
          </div>
          <ol className="relative mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-5">
            <span aria-hidden className="route-line absolute left-[8%] right-[8%] top-8 hidden h-px xl:block" />
            {steps.map((step, index) => (
              <li key={step.title} data-rise className="relative">
                <span className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-card text-pine shadow-[0_16px_40px_-18px_rgba(66,99,235,0.45)] ring-1 ring-line">
                  <Glyph d={stepIcons[index]} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-pine">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="analiz" className="relative scroll-mt-24 overflow-hidden bg-night text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(47,107,255,0.38),transparent_52%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,#06101f)]" />
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-[#0b1c38]" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="currentColor" d="M0 80 180 50 340 78 520 36 760 72 980 28 1180 64 1440 40V120H0Z" opacity="0.9" />
          <path fill="#10284d" d="M0 96 220 70 460 100 700 58 980 92 1200 66 1440 88V120H0Z" />
        </svg>
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-5 sm:py-24 lg:grid-cols-[0.82fr_1.18fr]">
          <div data-rise>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8eb4ff]">Uygulama</p>
            <h2 className="mt-3 text-4xl text-white sm:text-5xl">
              Karmaşık bir panel yok. <span className="text-[#8eb6ff]">Sadece bugünün işi.</span>
            </h2>
            <ul className="mt-8 space-y-5">
              {practicePoints.map((point, index) => (
                <li key={point} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#9ec4ff] ring-1 ring-white/15">
                    <Glyph d={practiceIcons[index]} />
                  </span>
                  <p className="pt-1 text-sm leading-7 text-white/75">{point}</p>
                </li>
              ))}
            </ul>
          </div>
          <div data-rise className="relative" aria-hidden>
            <div className="rounded-[28px] border border-white/10 bg-[#0d2244]/90 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-5 lg:pr-52">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{brand.domain}/bugun</p>
                  <p className="mt-1 text-lg font-semibold">İyi akşamlar, Deniz.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Pazartesi</p>
                  <span className="mt-1 inline-block rounded-full bg-[#2f6bff] px-3 py-1.5 text-xs font-semibold">Devam et →</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {appNav.map((item, index) => (
                  <span key={item} className={`rounded-full px-2.5 py-1 text-[11px] ${index === 0 ? "bg-white/15 text-white" : "text-white/55"}`}>
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Tahmini puan</p>
                  <p className="mt-1 text-4xl font-bold tracking-tight">64,8</p>
                  <p className="text-xs text-[#8dffe0]">bu ay +2,6</p>
                  <div className="mt-4 flex h-16 items-end gap-1.5">
                    {bars.map((height, index) => (
                      <span key={index} className="flex-1 rounded-t bg-gradient-to-t from-[#2457ea] to-[#7cf0ff]" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Bugünün görevi</p>
                  <p className="mt-2 text-2xl font-semibold">Bağlaçlar</p>
                  <p className="mt-1 text-xs text-white/60">12 soru · 18 dakika</p>
                  <span className="mt-6 inline-block rounded-full border border-[#8eb4ff] px-3 py-1.5 text-xs text-[#cfe0ff]">Göreve başla</span>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">En çok puan kazanabileceğin yer</p>
                  <p className="mt-2 text-sm font-medium">Dil bilgisi · zıtlık bağlaçları</p>
                  <p className="mt-1 text-xs text-white/60">%61 doğru · puana etkisi yüksek</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Son günlerde</p>
                  <p className="mt-2 text-sm font-medium">Okuma hızın düşüyor</p>
                  <p className="mt-1 text-xs text-white/60">Süreye dikkat ettiğinde doğru oranın düşmüyor.</p>
                </div>
              </div>
            </div>
            <div className="relative mt-4 rounded-[24px] border border-white/10 bg-[#12305f] p-4 shadow-2xl lg:absolute lg:right-0 lg:top-14 lg:mt-0 lg:w-52">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Örnek plan</p>
              <p className="mt-2 text-2xl font-bold">
                64 <span className="text-white/40">→</span> 72
              </p>
              <p className="text-xs text-white/60">Hedefe 8 puan kaldı</p>
              <svg viewBox="0 0 220 90" className="mt-3 w-full" aria-hidden>
                <path d="M4 72 C 40 70, 60 58, 90 50 S 150 28, 216 12 V 90 H 4 Z" fill="rgba(126,232,255,0.18)" />
                <path d="M4 72 C 40 70, 60 58, 90 50 S 150 28, 216 12" fill="none" stroke="#7ee8ff" strokeWidth="3" />
                <circle cx="216" cy="12" r="4" fill="#ffffff" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-24">
          <div data-rise className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Bölümler</p>
              <h2 className="mt-3 text-4xl sm:text-5xl">Sınav 10 bölümden oluşur. Puanın bu bölümlerden gelir.</h2>
            </div>
            <p className="leading-8 text-muted">
              Soru tipleri yıllardır aynı düzende gelir. Her bölüm için bir rehber sayfası var: ne sorulur, nelere dikkat etmelisin, nasıl çözersin. Soru çözdükçe kendi sonuçlarını da o sayfada görürsün.
            </p>
          </div>
          <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ydsBlueprint.bands.map((band) => (
              <li key={band.section} data-rise>
                <Link href={`/rehber/${band.section}`} className="lift group flex h-full flex-col justify-between gap-6 rounded-2xl bg-paper p-4 shadow-[0_18px_40px_-28px_rgba(23,36,59,0.35)] ring-1 ring-line">
                  <span className="leading-snug">{band.title}</span>
                  <span className="flex items-center justify-between text-xs text-muted">
                    {band.to - band.from + 1} soru
                    <span className="text-pine opacity-0 transition group-hover:opacity-100">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <div data-rise className="mt-10 flex flex-col gap-4 rounded-[28px] bg-soft p-5 ring-1 ring-line sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-sm text-sm leading-6 text-muted">Yanlış yaptığın sorular kaybolmaz; şu adımlarla tekrar karşına çıkar:</p>
            <ol className="flex flex-wrap items-center gap-2 text-sm">
              {loop.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-full bg-card px-3 py-1.5 shadow-sm ring-1 ring-line">{step}</span>
                  {index < loop.length - 1 ? <span className="text-pine">→</span> : null}
                </li>
              ))}
            </ol>
            <Link href="/rehber" className="link-underline shrink-0 text-sm font-semibold text-pine">
              Rehbere git →
            </Link>
          </div>
        </div>
      </section>

      <section id="ozellikler" className="scroll-mt-24">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-24">
          <div data-rise className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Arka planda ne oluyor?</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-4xl sm:text-5xl">Asıl iş arka planda yapılıyor.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted">Bunlar gösteriş için değil; her gün neye çalışacağına bunlarla karar verilir.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {smart.map((item, index) => (
              <article key={item.title} data-rise className="lift rounded-[28px] bg-card p-6 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-soft text-pine">
                  <Glyph d={smartIcons[index]} />
                </span>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">{item.tag}</p>
                <h3 className="mt-2 text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 sm:px-5">
        <div data-rise className="grid items-center gap-10 overflow-hidden rounded-[32px] bg-card p-6 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Deneme</p>
            <h2 className="mt-3 max-w-xl text-4xl sm:text-5xl">80 soru, 180 dakika, bilgisayar ekranında.</h2>
            <p className="mt-4 max-w-xl leading-8 text-muted">
              e-YDS ve e-YÖKDİL’deki gibi ekranda çözülen, gerçek sınav zorluğunda tam denemeler. Süre geri sayar; soruları işaretleyebilir, emin olmadığın şıkları eleyebilirsin. Bitince puanını ve en çok puan kaybettiğin bölümü görürsün. Ekran, ÖSYM’nin birebir kopyası değildir.
            </p>
            <Link href="/deneme" className="shine mt-7 inline-block rounded-full bg-pine px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-16px_rgba(66,99,235,0.75)] transition hover:-translate-y-0.5">
              Denemeye göz at →
            </Link>
          </div>
          <div aria-hidden className="grid grid-cols-10 gap-1.5 rounded-3xl bg-night p-4">
            {Array.from({ length: 40 }, (_, index) => (
              <span key={index} className={`h-6 rounded-md ${index < 14 ? "bg-gradient-to-t from-pine to-teal" : index === 21 ? "ring-1 ring-white/70" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-20 sm:px-5 sm:py-24 lg:grid-cols-3">
        <article data-rise className="lift rounded-[28px] bg-card p-7 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
          <h2 className="text-3xl">Her gün 10 kelime, 10 bağlaç.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">YDS’de en çok puan kaybettiren iki konu. Yanlış yaptıkların birkaç gün sonra tekrar karşına çıkar, bildiklerin giderek seyrekleşir. Dünkü sonucunla bugünkünü yan yana görürsün.</p>
        </article>
        <article data-rise className="lift rounded-[28px] bg-card p-7 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
          <h2 className="text-3xl">Puan tahminin her gün güncellenir.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">Bugün tahminin 64 ile 72 arasındaysa, birkaç hafta sonra 68 ile 76 arasına çıkabilir. Örneğin okumada doğru oranın %48’den %61’e yükselirse, hedefine kalan puanın büyük kısmı buradan gelir.</p>
        </article>
        <article data-rise className="lift rounded-[28px] bg-soft p-7 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
          <h2 className="text-3xl">Başlamak ücretsiz.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Seviye testi, raporun ilk 3 bulgusu, her gün {brand.freeDailyWords} kelime ve {brand.freeDailyConnectors} bağlaç, {brand.freeSimulators} tam deneme ücretsiz. Sınavına {brand.sprintMaxDays} gün ya da daha az varsa Sprint {brand.prices.gelisim} TL; daha fazla varsa Kamp {brand.prices.kamp.toLocaleString("tr-TR")} TL. İkisinde de günlük planın hazır; tek ödeme, KDV dahil.
          </p>
          <Link href="/fiyat" className="link-underline mt-5 inline-block text-sm font-semibold text-pine">
            Fiyatlar ve sınav takvimi →
          </Link>
        </article>
      </section>

      <section id="sss" className="scroll-mt-24 border-t border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-5 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div data-rise>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Sık sorulanlar</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">Merak ettiklerin</h2>
            <p className="mt-4 max-w-sm leading-7 text-muted">Puan hesaplama, deneme, ücret ve seviye testi hakkında en çok sorulanlar.</p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((item) => (
              <details key={item.question} className="faq group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-pine transition duration-300 group-open:rotate-45 group-open:border-pine">+</span>
                </summary>
                <p className="mt-3 max-w-2xl pr-10 text-sm leading-7 text-muted sm:text-base">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 py-8 sm:px-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 lg:py-8">
          <div data-rise className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Hemen başla</p>
            <h2 className="mt-2 text-3xl leading-tight text-ink sm:text-4xl">
              Daha çok saat çalışmana gerek yok. <span className="grad">Neye çalışacağını bilmen yeter.</span>
            </h2>
            <p className="mt-3 max-w-md text-base leading-7 text-muted sm:text-lg">Önce seviyeni ölç. Puanını neyin aşağı çektiğini gör, sonra yolunu seç.</p>
            <form action={startDiagnosticAction} className="mt-5">
              <PendingButton pendingLabel="Test hazırlanıyor…" className="shine rounded-full bg-pine px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-16px_rgba(66,99,235,0.75)] transition hover:-translate-y-0.5">
                Ücretsiz seviyemi ölç →
              </PendingButton>
            </form>
            <p className="mt-3 text-sm text-muted">Ücretsiz · Kayıt zorunluluğu yok · Yaklaşık {brand.diagnosticMinutes} dakika</p>
          </div>
          <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-[28px] sm:aspect-[16/9] lg:mx-0 lg:max-w-none">
            <img src="/marketing/summit.jpg" alt="" width={1280} height={720} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
            {/* Coordinates are in the photo's own pixels; slice matches object-cover + object-center. */}
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
              <defs>
                <filter id="trail-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                <mask id="trail-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="720">
                  <path className="path-draw" pathLength="1" d={TRAIL} fill="none" stroke="white" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
                </mask>
              </defs>
              <g mask="url(#trail-reveal)">
                <path d={TRAIL} fill="none" stroke="#4263eb" strokeOpacity="0.55" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" filter="url(#trail-glow)" />
                <path d={TRAIL} fill="none" stroke="#e8edff" strokeWidth="5.5" strokeDasharray="0 13" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <circle cx="505" cy="548" r="16" fill="#4263eb" fillOpacity="0.28" />
              <circle cx="505" cy="548" r="8" fill="#4263eb" stroke="#ffffff" strokeWidth="3" />
              <g transform="translate(266 570)">
                <rect width="216" height="52" rx="26" className="fill-card" fillOpacity="0.95" />
                <circle cx="28" cy="26" r="8" fill="#4263eb" />
                <text x="46" y="36" fontSize="28" fontWeight="600" className="fill-ink">Başlangıç</text>
              </g>
              <path d="M931 166 V 104" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
              <path d="M932 104 L 966 116 L 932 128 Z" fill="#4263eb" />
              <circle cx="931" cy="166" r="7" fill="#4263eb" stroke="#ffffff" strokeWidth="3" />
              <g transform="translate(686 80)">
                <rect width="226" height="52" rx="26" className="fill-card" fillOpacity="0.95" />
                <text x="26" y="36" fontSize="28" fontWeight="600" className="fill-ink">Hedef puan</text>
              </g>
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}
