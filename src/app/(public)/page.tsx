import type { Metadata } from "next";
import Link from "next/link";
import { brand, siteUrl } from "@/brand";
import { HeroAssembly } from "@/components/hero-assembly";
import {
  ArchitectureSection,
  MotorSection,
  PricingTeaserSection,
  ReadingModelSection,
  ScienceSection,
} from "@/components/landing-signature";
import { PendingButton } from "@/components/pending-button";
import { funnelSteps } from "@/content/landing-signature";
import { faqsFor } from "@/content/seo";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { startDiagnosticAction } from "@/server/actions";

export const dynamic = "force-static";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const ribbon = ["YDS", "e-YDS", "YÖKDİL", "e-YÖKDİL", "80 soru", "180 dakika", "her doğru 1,25 puan", "hedef puan", "günlük plan"];

const problems = [
  {
    tag: "01 · Plato",
    quote: "Çalışıyorum… puan yerinde sayıyor.",
    body: "Her hafta deneme, kelime, kitap. Net aynı bandda. Eksik olan çaba değil: hangi açığın puanı tuttuğunu bilmemek.",
  },
  {
    tag: "02 · Yön yok",
    quote: "Bugün neye çalışacağımı bilmiyorum.",
    body: "Önünde binlerce soru ve video var. Karar yorgunluğu başlıyor; en kolay olanı seçiyorsun, en çok puan getireni değil.",
  },
  {
    tag: "03 · Aynı tuzak",
    quote: "İki şık arasında kalıp yine yanılıyorum.",
    body: "Doğruyu görüyorsun ama neden diğerinin cazip geldiğini çözmüyorsun. Ertesi denemede aynı çeldirici yine seni çekiyor.",
  },
];

const compare = [
  ["Okuma", "Kelimeye takılıp cümleyi baştan okumak", "Özne + bağlaç + yüklem kilidi"],
  ["Yanlışlar", "Doğru şıkkı ezberlemek", "Çeldiricinin neden cazip göründüğünü görmek"],
  ["Plan", "Herkese aynı program", "Teşhise göre günlük nokta atışı görev"],
  ["Deneme", "Sadece puan ve doğru sayısı", "Hangi bölümde ve hangi tuzakta puan kaybettiğin"],
  ["Hedef", "“Daha çok çalış”", "“Bugün sana en çok puan kazandıracak konuya çalış”"],
];

const steps = funnelSteps;

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
];

const practiceIcons = ["M4 19V9M10 19V5M16 19v-7M22 19H2", "M5 12h14M13 6l6 6-6 6", "M4 16l5-5 3 3 8-8"];
const smartIcons = ["M12 3v3M5 7l2 2M4 13h3M12 21a6 6 0 1 0-4-10.5", "M4 6h16M4 12h10M4 18h7", "M12 3l2.2 6.4H21l-5.4 4 2 6.6L12 16.2 6.4 20l2-6.6L3 9.4h6.8L12 3Z", "M4 16c2-6 4-8 8-8s6 2 8 8"];

const pulling = [
  { title: "Okuduğunu anlama", score: "5/10 doğru", level: "Geliştirilmeli", tone: "text-clay", width: 50 },
  { title: "Dil bilgisi ve yapı", score: "3/5 doğru", level: "Orta", tone: "text-gold", width: 60 },
  { title: "Cümle tamamlama", score: "3/5 doğru", level: "Orta", tone: "text-gold", width: 60 },
];

/** Mirrors the sections of the real diagnostic report; values are illustrative. */
const heroReport = (
  <div className="max-h-[min(72svh,36rem)] overflow-y-auto overflow-x-hidden rounded-2xl bg-card shadow-[0_40px_90px_-40px_rgba(23,36,59,0.55)] ring-1 ring-line sm:rounded-[28px] lg:max-h-none lg:overflow-visible">
    <div className="flex items-center justify-between gap-3 border-b border-line bg-soft/60 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
      <p className="flex items-center gap-2 text-xs font-semibold text-ink">
        <span className="pulse-dot h-2 w-2 rounded-full bg-teal" />
        Seviye raporun
      </p>
      <p className="text-[11px] text-muted sm:text-xs">40 soru · örnek değerler</p>
    </div>
    <div className="grid divide-y divide-line lg:grid-cols-[1fr_1.25fr_1fr] lg:divide-x lg:divide-y-0">
      <div className="p-4 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Tahmini YDS puanı</p>
        <p className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:mt-3 sm:text-5xl">60–68</p>
        <p className="mt-1.5 text-sm text-muted sm:mt-2">Tahmini merkez puan: 64</p>
        <div className="relative mt-4 h-2 rounded-full bg-soft sm:mt-6">
          <span className="absolute inset-y-0 left-[40%] w-[16%] rounded-full bg-gradient-to-r from-pine to-teal" />
          <span className="absolute -top-1.5 h-5 w-0.5 rounded-full bg-ink/70" style={{ left: "64%" }} />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted">
          <span>40</span>
          <span>hedef 72</span>
          <span>90</span>
        </div>
        <p className="mt-3 hidden text-xs leading-5 text-muted sm:mt-5 sm:block">80 soruluk sınavda alabileceğin puanın tahmini aralığı; resmi sonuç değildir.</p>
      </div>
      <div className="p-4 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Neden 64?</p>
        <p className="mt-1 text-sm text-muted">Puanını en çok aşağı çeken 3 bölüm</p>
        <ul className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3.5">
          {pulling.map((area) => (
            <li key={area.title}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{area.title}</span>
                <span className={`text-xs font-semibold ${area.tone}`}>{area.level}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-soft">
                <div className="h-1.5 rounded-full bg-pine" style={{ width: `${area.width}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">{area.score}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[linear-gradient(160deg,var(--soft),transparent_70%)] p-4 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">En büyük fırsatın</p>
        <p className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:mt-3 sm:text-4xl">
          64 <span className="text-pine">→</span> 70–76
        </p>
        <p className="mt-2 text-sm leading-6 text-muted sm:mt-3">Okuma ve dil bilgisindeki açığı kapattığında tahmini aralığın. Garanti değil, bir senaryo.</p>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-line sm:mt-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pine text-sm font-bold text-white">1</span>
          <p className="text-sm leading-5 text-ink">Planın puanını en çok çeken bölümden başlar.</p>
        </div>
      </div>
    </div>
  </div>
);

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

      <HeroAssembly
        report={heroReport}
        caption={
          <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-3 text-left sm:flex-row sm:items-center sm:justify-center sm:gap-5">
            <p className="text-center text-sm leading-6 text-muted sm:text-left">
              Seviye testini bitirdiğinde ilk bu ekranı görürsün.{" "}
              <span className="font-medium text-ink">Ücretsiz · önce değer, sonra hesap.</span>
            </p>
            <form action={startDiagnosticAction} className="shrink-0">
              <PendingButton
                pendingLabel="Hazırlanıyor…"
                className="shine w-full rounded-full bg-pine px-5 py-3 text-sm font-semibold shadow-[0_16px_36px_-16px_rgba(215,255,98,0.55)] transition hover:-translate-y-0.5 sm:w-auto"
              >
                3 dakikada keşfet ↗
              </PendingButton>
            </form>
          </div>
        }
        copy={
        <>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">
            <span className="h-px w-6 bg-pine" aria-hidden />
            {brand.tagline}
          </p>
          <h1 className="mt-4 max-w-xl text-[clamp(2.1rem,6.5vw,3.85rem)] leading-[1.08]">
            Daha çok değil.
            <br />
            <span className="text-pine">Daha isabetli</span> çalış.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Saatlerce video izlemek, yüzlerce soru çözmek zorunda değilsin. Önce İngilizce soruları nerede ve neden kaçırdığını gör; sonra sadece ihtiyacın olan yere odaklan. Teşhis temelli bir{" "}
            <span className="font-medium text-ink">YDS / YÖKDİL çalışma programı</span>.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            YÖKDİL Sağlık / Sosyal / Fen ve e-YDS süre yönetimi aynı çerçevede: 80 soru, 180 dakika, her doğru 1,25 puan.{" "}
            <Link href="/yds-puan-hesaplama" className="link-underline font-medium text-pine">
              Puanını hesapla →
            </Link>
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <form action={startDiagnosticAction}>
              <PendingButton
                pendingLabel="Hazırlanıyor…"
                className="shine w-full rounded-full bg-pine px-6 py-3.5 text-sm font-semibold shadow-[0_16px_36px_-16px_rgba(215,255,98,0.55)] transition hover:-translate-y-0.5 sm:w-auto"
              >
                3 dakikada keşfet ↗
              </PendingButton>
            </form>
            <a href="#nasil" className="rounded-full border border-line bg-card/80 px-6 py-3.5 text-center text-sm font-semibold text-ink transition hover:border-pine">
              Yöntemi incele ↓
            </a>
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pine" aria-hidden />
            Ücretsiz ilk deneyim · Kayıt gerektirmez · Yaklaşık 3 dakika
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {exams.map((exam) => (
              <li key={exam} className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-muted">
                {exam}
              </li>
            ))}
          </ul>
        </>
        }
      />

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

      <section className="relative overflow-hidden border-y border-line bg-night text-[#f4f3eb]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(215,255,98,0.14),transparent_48%),radial-gradient(ellipse_at_90%_80%,rgba(255,107,87,0.1),transparent_42%)]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-24">
          <div data-rise className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Tanıdık geldi mi?</p>
            <h2 className="mt-3 text-4xl leading-[1.08] sm:text-5xl">
              Çalışıyorsun.
              <br />
              <span className="text-pine">Puanın kıpırdamıyor.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#a7aa9e]">
              Bu tembellik değil. Kaynak da yetmiyor değil. Asıl dert şu:{" "}
              <span className="font-medium text-[#f4f3eb]">yanlış yere harcanan saat</span>
              {" "}ve herkesin aynı programı dayatması.
            </p>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-3">
            {problems.map((item) => (
              <article
                key={item.tag}
                data-rise
                className="flex flex-col rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-left backdrop-blur-sm transition hover:border-pine/35 hover:bg-white/[0.07] sm:p-7"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">{item.tag}</p>
                <h3 className="mt-4 font-display text-2xl leading-snug tracking-tight text-[#f4f3eb] sm:text-[1.65rem]">
                  “{item.quote}”
                </h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-[#a7aa9e]">{item.body}</p>
              </article>
            ))}
          </div>

          <p data-rise className="mt-10 max-w-2xl text-base leading-7 text-[#a7aa9e] sm:text-lg sm:leading-8">
            Eksik olan bir video daha değil.{" "}
            <span className="font-semibold text-pine">Nerede puan kaçırdığını gösteren teşhis</span>
            ; sonra sadece o noktaya isabet.
          </p>
        </div>
      </section>

      <MotorSection />
      <ReadingModelSection />

      <section className="border-y border-line bg-card/80">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-4 py-20 sm:px-5 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <div data-rise className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Farkımız</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">
              Başkaları kaynak verir. <span className="text-pine">Biz neye çalışacağını söyleriz.</span>
            </h2>
            <p className="mt-5 max-w-md leading-8 text-muted">
              {brand.wordmark} bir soru bankası ya da video kursu değil. Çalışan temposuna uygun, teşhis temelli bir YDS / YÖKDİL çalışma programı.
            </p>
          </div>
          <div data-rise className="overflow-hidden rounded-[28px] bg-card shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
            <div className="hidden grid-cols-[0.8fr_1fr_1.2fr] border-b border-line bg-soft text-sm sm:grid">
              <p className="px-5 py-4 text-muted">Konu</p>
              <p className="border-l border-line px-5 py-4 text-muted">Genelde</p>
              <p className="border-l border-line px-5 py-4 font-semibold text-pine">{brand.wordmark}</p>
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
              <h2 className="mt-3 text-4xl leading-[1.15] sm:text-5xl">YDS çalışma programı: teşhis → rota → sprint.</h2>
            </div>
            <div className="max-w-md">
              <p className="leading-8 text-muted">
                Ücretsiz deneyim kendi başına anlamlıdır; seni hemen kayıt duvarına itmez. Derinlik hesap sonrası artar; ücretli plan rotayı açar.
              </p>
              <form action={startDiagnosticAction} className="mt-6">
                <PendingButton pendingLabel="Test hazırlanıyor…" className="shine rounded-full bg-pine px-6 py-3.5 text-sm font-semibold shadow-[0_16px_36px_-16px_rgba(215,255,98,0.55)] transition hover:-translate-y-0.5">
                  Cümle Röntgenini dene →
                </PendingButton>
              </form>
              <Link href="/yontem" className="link-underline mt-4 inline-block text-sm font-medium text-pine">
                Yöntemimizi ayrıntılı oku →
              </Link>
            </div>
          </div>
          <ol className="relative mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            <span aria-hidden className="route-line absolute left-[8%] right-[8%] top-8 hidden h-px xl:block" />
            {steps.map((step, index) => (
              <li key={step.title} data-rise className="relative">
                <span className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-card text-pine shadow-[0_16px_40px_-18px_rgba(215,255,98,0.45)] ring-1 ring-line">
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

      <ArchitectureSection />
      <ScienceSection />

      <section id="analiz" className="relative scroll-mt-24 overflow-hidden bg-night text-[#f4f3eb]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(215,255,98,0.18),transparent_52%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,#080907)]" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-5 sm:py-24 lg:grid-cols-[0.82fr_1.18fr]">
          <div data-rise>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Uygulama · e-YDS süre yönetimi</p>
            <h2 className="mt-3 text-4xl text-[#f4f3eb] sm:text-5xl">
              Karmaşık bir panel yok. <span className="text-pine">Sadece bugünün işi.</span>
            </h2>
            <ul className="mt-8 space-y-5">
              {practicePoints.map((point, index) => (
                <li key={point} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/5 text-pine ring-1 ring-white/10">
                    <Glyph d={practiceIcons[index]} />
                  </span>
                  <p className="pt-1 text-sm leading-7 text-[#a7aa9e]">{point}</p>
                </li>
              ))}
            </ul>
          </div>
          <div data-rise className="relative" aria-hidden>
            <div className="rounded-[28px] border border-white/10 bg-[#161814]/95 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-5 lg:pr-52">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{brand.domain}/bugun</p>
                  <p className="mt-1 text-lg font-semibold">İyi akşamlar, Deniz.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Pazartesi</p>
                  <span className="mt-1 inline-block rounded-full bg-pine px-3 py-1.5 text-xs font-semibold text-pine-ink">Devam et →</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {appNav.map((item, index) => (
                  <span key={item} className={`rounded-full px-2.5 py-1 text-[11px] ${index === 0 ? "bg-white/10 text-[#f4f3eb]" : "text-white/50"}`}>
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Tahmini puan</p>
                  <p className="mt-1 text-4xl font-bold tracking-tight">64,8</p>
                  <p className="text-xs text-teal">bu ay +2,6</p>
                  <div className="mt-4 flex h-16 items-end gap-1.5">
                    {bars.map((height, index) => (
                      <span key={index} className="flex-1 rounded-t bg-gradient-to-t from-[#3a4a12] to-pine" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Bugünün görevi</p>
                  <p className="mt-2 text-2xl font-semibold">Bağlaçlar</p>
                  <p className="mt-1 text-xs text-white/55">12 soru · 18 dakika</p>
                  <span className="mt-6 inline-block rounded-full border border-pine/40 px-3 py-1.5 text-xs text-pine">Göreve başla</span>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">En çok puan kazanabileceğin yer</p>
                  <p className="mt-2 text-sm font-medium">Dil bilgisi · zıtlık bağlaçları</p>
                  <p className="mt-1 text-xs text-white/55">%61 doğru · puana etkisi yüksek</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">e-YDS süre yönetimi</p>
                  <p className="mt-2 text-sm font-medium">Okuma hızın düşüyor</p>
                  <p className="mt-1 text-xs text-white/55">Süreye dikkat ettiğinde doğru oranın düşmüyor.</p>
                </div>
              </div>
            </div>
            <div className="relative mt-4 rounded-[24px] border border-white/10 bg-[#1c2118] p-4 shadow-2xl lg:absolute lg:right-0 lg:top-14 lg:mt-0 lg:w-52">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Örnek plan</p>
              <p className="mt-2 text-2xl font-bold">
                64 <span className="text-white/35">→</span> 72
              </p>
              <p className="text-xs text-white/55">Hedefe 8 puan kaldı</p>
              <svg viewBox="0 0 220 90" className="mt-3 w-full" aria-hidden>
                <path d="M4 72 C 40 70, 60 58, 90 50 S 150 28, 216 12 V 90 H 4 Z" fill="rgba(215,255,98,0.14)" />
                <path d="M4 72 C 40 70, 60 58, 90 50 S 150 28, 216 12" fill="none" stroke="#d7ff62" strokeWidth="3" />
                <circle cx="216" cy="12" r="4" fill="#f4f3eb" />
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
            <Link href="/deneme" className="shine mt-7 inline-block rounded-full bg-pine px-6 py-3 text-sm font-semibold shadow-[0_16px_36px_-16px_rgba(215,255,98,0.55)] transition hover:-translate-y-0.5">
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

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-20 sm:px-5 sm:py-24 lg:grid-cols-2">
        <article data-rise className="lift rounded-[28px] bg-card p-7 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
          <h2 className="text-3xl">Her gün 10 kelime, 10 bağlaç.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">YDS’de en çok puan kaybettiren iki konu. Yanlış yaptıkların birkaç gün sonra tekrar karşına çıkar, bildiklerin giderek seyrekleşir. Dünkü sonucunla bugünkünü yan yana görürsün.</p>
        </article>
        <article data-rise className="lift rounded-[28px] bg-card p-7 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
          <h2 className="text-3xl">Puan tahminin her gün güncellenir.</h2>
          <p className="mt-3 text-sm leading-7 text-muted">Bugün tahminin 64 ile 72 arasındaysa, birkaç hafta sonra 68 ile 76 arasına çıkabilir. Örneğin okumada doğru oranın %48’den %61’e yükselirse, hedefine kalan puanın büyük kısmı buradan gelir.</p>
        </article>
      </section>

      <PricingTeaserSection />

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
              Bir sorunun cevabını bulmakla, <span className="grad">neden o cevap olduğunu anlamak</span> aynı şey değil.
            </h2>
            <p className="mt-3 max-w-md text-base leading-7 text-muted sm:text-lg">Cümle Röntgeni ile başla. Sonra profilini genişlet, rotanı kur.</p>
            <form action={startDiagnosticAction} className="mt-5">
              <PendingButton pendingLabel="Test hazırlanıyor…" className="shine rounded-full bg-pine px-6 py-3 text-sm font-semibold shadow-[0_16px_36px_-16px_rgba(215,255,98,0.55)] transition hover:-translate-y-0.5">
                Cümle Röntgenini dene →
              </PendingButton>
            </form>
            <p className="mt-3 text-sm text-muted">Ücretsiz · Kayıt zorunluluğu yok · Önce değer, sonra hesap</p>
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
