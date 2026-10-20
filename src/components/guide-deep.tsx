import Link from "next/link";
import type { DeepGuide } from "@/content/guide-labs";
import { GuideLab } from "@/components/guide-lab";

export function GuideDeep({ guide }: { guide: DeepGuide }) {
  const correct = guide.worked.options.find((item) => item.correct);
  const steps = guide.workedSteps ?? {
    structural: "1. Yapısal kanıt",
    meaning: "2. Anlam kontrolü",
    autopsy: "3. Çeldirici otopsisi",
  };

  return (
    <div className="space-y-12">
      <header>
        <h1 className="display mt-3 max-w-3xl">{guide.h1}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{guide.lead}</p>
        <p className="mt-4 max-w-2xl rounded-2xl border border-pine/25 bg-soft px-4 py-3 text-sm leading-7 text-ink">{guide.approach}</p>
      </header>

      <section>
        <h2 className="text-3xl">{guide.layersTitle}</h2>
        <ul className="mt-5 space-y-3">
          {guide.layers.map((layer) => (
            <li key={layer.title} className="rounded-2xl border border-line bg-card px-4 py-3.5">
              <p className="text-sm font-semibold text-pine">{layer.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{layer.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-7 text-muted">{guide.layersNote}</p>
      </section>

      <section className="rounded-[28px] border border-line bg-card p-5 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Açıklamalı örnek · 01</p>
        <h2 className="mt-2 text-2xl sm:text-3xl">{guide.workedTitle}</h2>
        <p className="mt-5 text-lg font-medium leading-relaxed text-ink sm:text-xl sm:leading-8">{guide.worked.stem}</p>
        <ul className="mt-5 space-y-2 text-sm text-ink">
          {guide.worked.options.map((item) => (
            <li key={item.id} className={item.correct ? "font-semibold text-teal" : "text-muted"}>
              {item.text}
              {item.correct ? " · doğru" : ""}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-semibold text-ink">Doğru cevap: {correct?.text}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-pine">{steps.structural}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              {guide.worked.structural.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-pine">{steps.meaning}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              {guide.worked.meaning.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
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

        <div className="mt-8 rounded-2xl border border-pine/25 bg-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">{guide.worked.rule.title}</p>
          <p className="mt-2 text-sm leading-7 text-ink">{guide.worked.rule.body}</p>
        </div>
      </section>

      <section>
        <h2 className="text-3xl">{guide.nextTitle}</h2>
        <ol className="mt-5 space-y-3">
          {guide.nextSteps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-7 text-muted">
              <span className="font-semibold text-pine">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {guide.notebook ? (
        <section className="rounded-[28px] border border-line bg-card p-5 sm:p-6">
          <h2 className="text-2xl">{guide.notebook.title}</h2>
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
        <section>
          <h2 className="text-2xl">{guide.misses.title}</h2>
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

      <section>
        <h2 className="text-3xl">{guide.beyondTitle}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base sm:leading-8">{guide.beyondBody}</p>
      </section>

      {guide.errorKinds ? (
        <section>
          <h2 className="text-2xl">{guide.errorKinds.title}</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-muted">
            {guide.errorKinds.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-pine">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <GuideLab lab={guide.lab} />
      </section>

      {guide.sources?.length ? (
        <section className="rounded-[28px] border border-line bg-night p-5 text-[#f4f3eb] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">Araştırma kaynağı</p>
          {guide.sources.map((source) => (
            <div key={source.cite} className="mt-4">
              <h3 className="text-xl text-[#f4f3eb]">
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

      <section className="flex flex-col gap-3 rounded-[28px] bg-night p-5 text-[#f4f3eb] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">Sonraki adım</p>
          <p className="mt-1 max-w-xl text-lg font-semibold leading-7">{guide.ctaLine}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
