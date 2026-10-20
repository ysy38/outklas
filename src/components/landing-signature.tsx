import Link from "next/link";
import { brand } from "@/brand";
import { architecturePoints, distractorTypes, motorPillars, scienceCards } from "@/content/landing-signature";
import { tl } from "@/content/offers";
import { PendingButton } from "@/components/pending-button";
import { ReadingModel } from "@/components/reading-model";
import { RoiSwitcher } from "@/components/roi-switcher";
import { XrayLab } from "@/components/xray-lab";
import { startDiagnosticAction } from "@/server/actions";

export function MotorSection() {
  return (
    <section id="motor" className="scroll-mt-24 border-y border-line bg-[linear-gradient(180deg,var(--soft)_0%,var(--paper)_55%,var(--paper)_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-24">
        <div data-rise className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">{brand.wordmark} motoru</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">
            YÖKDİL Sağlık cümle analizi: <span className="text-pine">Röntgen</span>, Neşter, Otopsi.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Doğru şıkkı bulmakla, neden o şık olduğunu anlamak aynı şey değil. Branş seç, katmanı değiştir, kelimeye ve şıkka tıkla — örnek lab canlıdır.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {motorPillars.map((item) => (
            <article key={item.code} data-rise className="lift rounded-2xl bg-card p-5 shadow-[0_18px_40px_-28px_rgba(23,36,59,0.28)] ring-1 ring-line">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pine">{item.code}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
            </article>
          ))}
        </div>

        <div data-rise className="mt-10">
          <XrayLab />
        </div>

        <div data-rise className="mt-6 flex flex-col gap-4 rounded-[24px] bg-night p-5 text-[#f4f3eb] sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">İlk deneyim</p>
            <p className="mt-1 text-lg font-semibold sm:text-xl">Lab’ı beğendiysen kendi profilinle devam et.</p>
            <p className="mt-1 text-sm text-[#a7aa9e]">Ücretsiz · hesap zorunlu değil · önce değer, sonra kayıt</p>
          </div>
          <form action={startDiagnosticAction} className="shrink-0">
            <PendingButton
              pendingLabel="Hazırlanıyor…"
              className="shine w-full rounded-full bg-pine px-5 py-3 text-sm font-semibold shadow-[0_16px_36px_-16px_rgba(215,255,98,0.55)] transition hover:-translate-y-0.5 sm:w-auto"
            >
              Cümle Röntgenini dene →
            </PendingButton>
          </form>
        </div>
      </div>
    </section>
  );
}

export function ReadingModelSection() {
  return (
    <section id="okuma-modeli" className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-24">
      <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div data-rise className="lg:sticky lg:top-28">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Okuma modeli karşılaştırması</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">Aynı cümle. İki zihin.</h2>
          <p className="mt-4 max-w-md text-lg leading-8 text-muted">
            Soldaki tuşlarla klasik kaos ile {brand.wordmark} iskelet kilidi arasında geç. Göz yolu, metrikler ve açıklama birlikte değişir.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <span className="text-clay" aria-hidden>
                ✕
              </span>
              Klasik: ara kelimelere takılıp cümleyi tekrar tekrar okumak
            </li>
            <li className="flex gap-2">
              <span className="text-teal" aria-hidden>
                ✓
              </span>
              {brand.wordmark}: zıtlık → yüklem → hedef — üç kilit nokta
            </li>
          </ul>
        </div>
        <div data-rise>
          <ReadingModel />
        </div>
      </div>
    </section>
  );
}

export function ArchitectureSection() {
  return (
    <section id="mimari" className="scroll-mt-24 border-y border-line bg-card/80">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-5 sm:py-24 lg:grid-cols-[0.95fr_1.05fr]">
        <div data-rise className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">80 soruluk tam sınav mimarisi</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">50 puandan 70 puana YDS: cümleden sınav refleksine.</h2>
          <p className="mt-5 leading-8 text-muted">
            Klasik kurslar gramer yükler. {brand.wordmark} sınav refleksini ve e-YDS süre yönetimini inşa eder: hangi tipte neden takıldığını takip eder, her gün o açığa gider.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink">
            {architecturePoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="text-pine" aria-hidden>
                  ✓
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div data-rise>
          <div className="rounded-[28px] bg-card p-6 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Çeldirici kategorileri</p>
            <h3 className="mt-2 text-2xl sm:text-3xl">Sınavda en çok puan kaybettiren 5 çeldirici türü</h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              {brand.wordmark} her soruda şıkları bu bilişsel tuzak filtresinden geçirerek analiz eder.
            </p>
            <ol className="mt-6 space-y-3">
              {distractorTypes.map((item) => (
                <li key={item.code} className="flex gap-3 rounded-2xl bg-paper p-3.5 ring-1 ring-line sm:gap-4 sm:p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-soft text-xs font-bold text-pine">{item.code}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="font-semibold text-ink">{item.title}</p>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pine">{item.tag}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 border-t border-line pt-4 text-sm italic leading-7 text-muted">
              “Doğru şıkkı aramak yavaştır; yanlış şıktaki tuzağı görmek saniyeler sürer.”
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ScienceSection() {
  return (
    <section id="bilim" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-24">
        <div data-rise className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Bilimsel mimari</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">Dershane sloganlarıyla değil, bilişsel dilbilimle tasarlandı.</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Ölçemediğimizi ölçtüğümüzü söylemeyiz. Her bulgu gözlemlenebilir kanıta bağlanır; ilk aşamada ön bulgu, yeterli tekrarla güçlü örüntü.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {scienceCards.map((item) => (
            <article key={item.title} data-rise className="lift rounded-[28px] bg-card p-6 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">{item.cite}</p>
              <h3 className="mt-3 text-xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
            </article>
          ))}
        </div>
        <p data-rise className="mt-8 text-center text-xs tracking-[0.08em] text-muted">
          Nation (2000) · Coxhead (2000) · Sweller (1988) · Ericsson (1993)
        </p>
      </div>
    </section>
  );
}

export function PricingTeaserSection() {
  return (
    <section id="fiyatlar" className="scroll-mt-24 border-t border-line bg-[linear-gradient(180deg,var(--paper),var(--soft)_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-5 sm:py-24">
        <div data-rise className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Programlar & fiyat</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">Ucuz bir kelime uygulaması değil; kişisel sınav laboratuvarın.</h2>
            <p className="mt-4 max-w-xl leading-8 text-muted">
              Önce değer, sonra kayıt. Ücretsiz röntgen kendi başına anlamlıdır; ücretli plan teşhisi günlük rotaya çevirir. Tek ödeme, abonelik yok, KDV dahil.
            </p>
          </div>
          <RoiSwitcher />
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <article data-rise className="lift flex flex-col rounded-[28px] bg-card p-6 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Bilişsel check-up</p>
            <h3 className="mt-2 text-2xl">Cümle Röntgeni</h3>
            <p className="mt-4 font-display text-4xl font-bold tracking-tight text-ink">
              ₺0 <span className="font-sans text-sm font-medium text-muted">/ ilk teşhis</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm leading-6 text-muted">
              <li>✓ Yapısal çözümleme ve çeldirici otopsisi</li>
              <li>✓ Raporun ilk 3 bulgusu</li>
              <li>✓ Günlük kelime & bağlaç · 1 deneme</li>
            </ul>
            <form action={startDiagnosticAction} className="mt-6">
              <PendingButton pendingLabel="Hazırlanıyor…" className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink transition hover:border-pine">
                Ücretsiz başla
              </PendingButton>
            </form>
          </article>

          <article data-rise className="lift relative flex flex-col rounded-[28px] bg-pine p-6 text-pine-ink shadow-[0_24px_60px_-36px_rgba(215,255,98,0.45)]">
            <span className="absolute -top-3 right-6 rounded-full bg-card px-3 py-1 text-xs font-semibold text-pine">En çok tercih edilen</span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine-ink/70">{brand.accessDays.gelisim} günlük yoğun kamp</p>
            <h3 className="mt-2 text-2xl text-pine-ink">Sprint</h3>
            <p className="mt-4 font-display text-4xl font-bold tracking-tight text-pine-ink">
              ₺{tl(brand.prices.gelisim)}{" "}
              <span className="font-sans text-sm font-medium text-pine-ink/70">/ sınav dönemi</span>
            </p>
            <p className="mt-1 text-xs text-pine-ink/70">veya 3 × ₺{tl(brand.installment.gelisim)} görünümü · checkout tek ödeme</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm leading-6 text-pine-ink/85">
              <li>✓ Tam teşhis + günlük anti-plato planı</li>
              <li>✓ Cümle Röntgeni & çeldirici otopsisi</li>
              <li>✓ {brand.sprintSimulators} tam deneme · sınırsız kelime/bağlaç</li>
            </ul>
            <Link href="/fiyat" className="shine mt-6 rounded-full bg-night px-5 py-3 text-center text-sm font-semibold text-pine transition hover:-translate-y-0.5">
              Sprint’i seç →
            </Link>
          </article>

          <article data-rise className="lift flex flex-col rounded-[28px] bg-card p-6 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Tam akademik dönem · {brand.accessDays.kamp} gün</p>
            <h3 className="mt-2 text-2xl">Kamp</h3>
            <p className="mt-4 font-display text-4xl font-bold tracking-tight text-ink">
              ₺{tl(brand.prices.kamp)}{" "}
              <span className="font-sans text-sm font-medium text-muted">/ 6 ay</span>
            </p>
            <p className="mt-1 text-xs text-muted">veya 3 × ₺{tl(brand.installment.kamp)} görünümü · checkout tek ödeme</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm leading-6 text-muted">
              <li>✓ Sprint’teki her şey</li>
              <li>✓ Sınırsız deneme + uzun dönem takip</li>
              <li>✓ Sprint’ten geçişte ödenen tutar düşülür</li>
            </ul>
            <Link href="/fiyat" className="mt-6 rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5">
              Kamp’ı seç →
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
