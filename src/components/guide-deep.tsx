import Link from "next/link";
import type { DeepGuide } from "@/content/guide-labs";
import { EditorialNote } from "@/components/editorial-note";
import { GuideLab } from "@/components/guide-lab";

const jumps = [
  { href: "#beceriler", label: "Neyi ölçer?" },
  { href: "#ornek-soru", label: "Örnek soruyu incele" },
  { href: "#yontem", label: "Çözüm adımları" },
  { href: "#lab", label: "Örnek soru çöz" },
  { href: "#kaynaklar", label: "Kaynaklar" },
] as const;

export function GuideDeep({ guide, path }: { guide: DeepGuide; path: string }) {
  const correct = guide.worked.options.find((item) => item.correct);
  const steps = guide.workedSteps ?? {
    structural: "1. Yapısal kanıt",
    meaning: "2. Anlam kontrolü",
    autopsy: "3. Çeldirici otopsisi",
  };

  return (
    <div className="space-y-10 sm:space-y-14">
      <header className="border-b border-line pb-8 sm:pb-10">
        <h1 className="display mt-3 max-w-3xl text-[1.85rem] leading-tight sm:text-4xl sm:leading-[1.15]">{guide.h1}</h1>
        <EditorialNote path={path} className="mt-4" />
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">{guide.lead}</p>

        <div className="mt-5 max-w-2xl rounded-2xl border border-pine/25 bg-soft px-4 py-3.5 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Kısa özet</p>
          <p className="mt-1.5 text-sm leading-7 text-ink sm:text-[15px]">{guide.approach}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <a
            href="#ornek-soru"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-pine px-5 py-3 text-center text-sm font-semibold text-pine-ink transition hover:-translate-y-0.5"
          >
            Örnek soruyu incele
          </a>
          <a
            href="#lab"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-card px-5 py-3 text-center text-sm font-semibold text-ink transition hover:border-pine"
          >
            Örnek soru çöz
          </a>
        </div>

        <nav aria-label="Bu sayfada" className="mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {jumps.map((jump) => (
            <a
              key={jump.href}
              href={jump.href}
              className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-pine hover:text-ink"
            >
              {jump.label}
            </a>
          ))}
        </nav>
      </header>

      <section id="beceriler" className="scroll-mt-28">
        <h2 className="text-2xl sm:text-3xl">{guide.layersTitle}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {guide.layers.map((layer) => (
            <li key={layer.title} className="rounded-2xl border border-line bg-card px-4 py-3.5">
              <p className="text-sm font-semibold text-pine">{layer.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{layer.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-7 text-muted">{guide.layersNote}</p>
      </section>

      <section id="ornek-soru" className="scroll-mt-28 rounded-[24px] border border-line bg-card p-4 sm:rounded-[28px] sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Açıklamalı örnek · 01</p>
            <h2 className="mt-2 text-xl sm:text-3xl">{guide.workedTitle}</h2>
          </div>
          <a href="#lab" className="text-xs font-semibold text-pine underline-offset-2 hover:underline">
            Sen de çöz →
          </a>
        </div>
        <p className="mt-5 text-base font-medium leading-relaxed text-ink sm:text-xl sm:leading-8">{guide.worked.stem}</p>
        <ul className="mt-5 space-y-2 text-sm text-ink">
          {guide.worked.options.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl px-3 py-2 ${item.correct ? "bg-teal/10 font-semibold text-teal" : "bg-soft/80 text-muted"}`}
            >
              {item.text}
              {item.correct ? " · doğru" : ""}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-semibold text-ink">Doğru cevap: {correct?.text}</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-line/80 bg-paper/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-pine">{steps.structural}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              {guide.worked.structural.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line/80 bg-paper/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-pine">{steps.meaning}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              {guide.worked.meaning.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line/80 bg-paper/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-pine">{steps.autopsy}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              {guide.worked.options
                .filter((item) => !item.correct)
                .map((item) => (
                  <li key={item.id}>
                    <span className="font-medium text-ink">{item.text}: </span>
                    {item.autopsy}
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-pine/25 bg-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">{guide.worked.rule.title}</p>
          <p className="mt-2 text-sm leading-7 text-ink">{guide.worked.rule.body}</p>
        </div>
      </section>

      <section id="yontem" className="scroll-mt-28">
        <h2 className="text-2xl sm:text-3xl">{guide.nextTitle}</h2>
        <ol className="mt-5 space-y-3">
          {guide.nextSteps.map((step, index) => (
            <li key={step} className="flex gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 text-sm leading-7 text-muted">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-pine-ink">{index + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {guide.notebook ? (
        <section id="defter" className="scroll-mt-28 rounded-[24px] border border-line bg-card p-4 sm:rounded-[28px] sm:p-6">
          <h2 className="text-xl sm:text-2xl">{guide.notebook.title}</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-muted">
            {guide.notebook.fields.map((field) => (
              <li key={field} className="rounded-xl bg-soft px-3 py-2 text-ink">
                {field}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-7 text-muted">{guide.notebook.tip}</p>
        </section>
      ) : null}

      {guide.misses ? (
        <section id="hatalar" className="scroll-mt-28">
          <h2 className="text-xl sm:text-2xl">{guide.misses.title}</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-muted">
            {guide.misses.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-pine">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="ileri" className="scroll-mt-28">
        <h2 className="text-2xl sm:text-3xl">{guide.beyondTitle}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base sm:leading-8">{guide.beyondBody}</p>
      </section>

      {guide.errorKinds ? (
        <section id="kategoriler" className="scroll-mt-28">
          <h2 className="text-xl sm:text-2xl">{guide.errorKinds.title}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {guide.errorKinds.items.map((item) => (
              <li key={item} className="flex gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-sm leading-6 text-muted">
                <span className="text-pine">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="lab" className="scroll-mt-28">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Alıştırma laboratuvarı</p>
            <h2 className="mt-1 text-2xl sm:text-3xl">Örnek soru çöz</h2>
          </div>
          <a href="#ornek-soru" className="text-xs font-semibold text-muted underline-offset-2 hover:text-pine hover:underline">
            Önce açıklamalı örneğe dön
          </a>
        </div>
        <GuideLab lab={guide.lab} />
      </section>

      {guide.sources?.length ? (
        <section id="kaynaklar" className="scroll-mt-28 rounded-[24px] border border-line bg-night p-4 text-[#f4f3eb] sm:rounded-[28px] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Araştırma kaynağı</p>
          <h2 className="sr-only">Kaynaklar ve ürün iddiası ayrımı</h2>
          {guide.sources.map((source) => (
            <div key={source.cite} className="mt-4">
              <h3 className="text-lg text-[#f4f3eb] sm:text-xl">
                {source.cite}: {source.title}
              </h3>
              <p className="mt-1 text-sm text-[#a7aa9e]">{source.venue}</p>
              <p className="mt-4 text-sm leading-7 text-[#cfd2c6]">{source.summary}</p>
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-[#cfd2c6]">
                <span className="font-semibold text-pine">Ürün kararı (ayrı iddia): </span>
                {source.productClaim}
              </p>
              {source.doi ? (
                <a href={source.doi} className="mt-4 inline-block text-sm font-medium text-pine hover:underline" rel="noreferrer" target="_blank">
                  DOI →
                </a>
              ) : null}
            </div>
          ))}
          {guide.disclaimer ? <p className="mt-5 text-xs leading-6 text-[#a7aa9e]">{guide.disclaimer}</p> : null}
        </section>
      ) : guide.disclaimer ? (
        <p className="text-xs leading-6 text-muted">{guide.disclaimer}</p>
      ) : null}

      <section className="flex flex-col gap-4 rounded-[24px] bg-night p-5 text-[#f4f3eb] sm:rounded-[28px] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">Sonraki adım</p>
          <p className="mt-1 max-w-xl text-base font-semibold leading-7 sm:text-lg">{guide.ctaLine}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={guide.ctaPrimary.href} className="rounded-full bg-pine px-5 py-3 text-center text-sm font-semibold text-pine-ink transition hover:-translate-y-0.5">
            {guide.ctaPrimary.label}
          </Link>
          <Link href={guide.ctaSecondary.href} className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-[#f4f3eb] transition hover:border-pine">
            {guide.ctaSecondary.label}
          </Link>
        </div>
      </section>
    </div>
  );
}
