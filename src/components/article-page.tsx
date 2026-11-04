import Link from "next/link";
import type { ReactNode } from "react";
import { EditorialNote } from "@/components/editorial-note";
import { articleJsonLd } from "@/content/editorial";
import { rehberBySection } from "@/content/rehber";
import { sourceAnchor, sources } from "@/content/articles/sources";
import { type Article, type Block, plainText } from "@/content/articles/types";
import { siteUrl } from "@/brand";
import { yokdilBands } from "@/content/yokdil";
import { ydsBlueprint } from "@/modules/exam/blueprint";

const yokdilCount = new Map<string, number>(yokdilBands.map((band) => [band.id, band.count]));

function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push(
      <Link key={index} href={match[2]!} className="link-underline font-medium text-pine">
        {match[1]}
      </Link>,
    );
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Table({ head, rows, caption }: { head: string[]; rows: string[][]; caption?: string }) {
  return (
    <figure className="mt-6">
      <div className="overflow-x-auto rounded-[24px] border border-line bg-card">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-soft text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              {head.map((cell) => (
                <th key={cell} className="px-4 py-3 font-semibold">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell, index) => (
                  <td key={index} className={`px-4 py-3 align-top leading-6 ${index === 0 ? "font-medium text-ink" : "text-muted"}`}>
                    <Rich text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? <figcaption className="mt-3 text-sm text-muted">{caption}</figcaption> : null}
    </figure>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="mt-4 leading-8">
          <Rich text={block.text} />
        </p>
      );
    case "list": {
      const items = block.items.map((item) => (
        <li key={item} className="pl-1 leading-7">
          <Rich text={item} />
        </li>
      ));
      return block.ordered ? (
        <ol className="mt-4 list-decimal space-y-2 pl-6">{items}</ol>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-6">{items}</ul>
      );
    }
    case "steps":
      return (
        <ol className="mt-6 grid gap-3">
          {block.items.map((step, index) => (
            <li key={step.title} className="glass rounded-[24px] border border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">{index + 1}</p>
              <h3 className="mt-2 text-xl">{step.title}</h3>
              <p className="mt-2 leading-7 text-muted">
                <Rich text={step.body} />
              </p>
            </li>
          ))}
        </ol>
      );
    case "table":
      return <Table head={block.head} rows={block.rows} caption={block.caption} />;
    case "example":
      return (
        <div className="mt-6 rounded-[24px] border border-line bg-card p-5">
          <p className="font-serif text-xl leading-8 text-ink">{block.sentence}</p>
          <dl className="mt-4 grid gap-3">
            {block.lines.map((line) => (
              <div key={line.label} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{line.label}</dt>
                <dd className="leading-7 text-muted">
                  <Rich text={line.text} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "examTable":
      return (
        <Table
          head={["Bölüm", "YDS", "YÖKDİL"]}
          rows={[
            ...ydsBlueprint.bands.map((band) => {
              const yds = band.to - band.from + 1;
              const yokdil = yokdilCount.get(band.section) ?? 0;
              return [
                `[${band.title}](/rehber/${band.section})`,
                `${yds} soru · ${(yds * 1.25).toLocaleString("tr-TR")} puan`,
                yokdil ? `${yokdil} soru · ${(yokdil * 1.25).toLocaleString("tr-TR")} puan` : "yok",
              ];
            }),
            ["Toplam", "80 soru · 180 dakika", "80 soru · 180 dakika"],
          ]}
        />
      );
    case "sectionTips":
      return (
        <ul className="mt-6 grid gap-3">
          {ydsBlueprint.bands.map((band) => {
            const note = rehberBySection(band.section);
            const yds = band.to - band.from + 1;
            const yokdil = yokdilCount.get(band.section);
            return (
              <li key={band.section} className="rounded-[24px] border border-line bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xl">{band.title}</h3>
                  <span className="text-sm text-muted">
                    YDS {yds} soru · YÖKDİL {yokdil ? `${yokdil} soru` : "yok"}
                  </span>
                </div>
                {note ? <p className="mt-2 leading-7 text-muted">{note.tip}</p> : null}
                <Link href={`/rehber/${band.section}`} className="link-underline mt-3 inline-block text-sm font-semibold text-pine">
                  Adım adım çözüm ve sık yapılan hatalar →
                </Link>
              </li>
            );
          })}
        </ul>
      );
    case "cta":
      return (
        <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-line bg-card/70 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl leading-7 text-muted">{block.text}</p>
          <Link href={block.href} className="shrink-0 rounded-full bg-pine px-6 py-3 text-center text-sm font-semibold transition hover:-translate-y-0.5">
            {block.label}
          </Link>
        </div>
      );
  }
}

export function ArticlePage({ article }: { article: Article }) {
  const cited = article.sources.map((id) => sources[id]!);
  const hasSectionTips = article.sections.some((section) => section.blocks.some((block) => block.kind === "sectionTips"));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...articleJsonLd({ path: article.path, title: article.metaTitle, description: article.description }),
        citation: cited.map((source) => ({ "@type": "CreativeWork", name: source.title, author: source.cite, url: source.url })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana sayfa", item: siteUrl },
          { "@type": "ListItem", position: 2, name: article.eyebrow, item: `${siteUrl}${article.path}` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: article.faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: plainText(item.answer) },
        })),
      },
    ],
  };

  return (
    <article className="landing mx-auto w-full max-w-4xl px-4 py-12 sm:px-5 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{article.eyebrow}</p>
      <h1 className="display-xl mt-4 font-serif">
        {article.title} <span className="grad">{article.accent}</span>
      </h1>
      <EditorialNote path={article.path} className="mt-4" />

      <div className="mt-8 rounded-[28px] border border-line bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">Kısa cevap</p>
        <p className="mt-3 text-lg leading-8 text-ink">
          <Rich text={article.lead} />
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/teshis" className="rounded-full bg-pine px-6 py-3.5 text-center text-sm font-semibold transition hover:-translate-y-0.5">
            Ücretsiz seviyemi ölç →
          </Link>
          <Link href="/yds-puan-hesaplama" className="rounded-full border border-line bg-paper px-6 py-3.5 text-center text-sm font-semibold text-ink transition hover:border-pine">
            Puanını hesapla
          </Link>
        </div>
      </div>

      <nav aria-label="Bu sayfada" className="mt-8 flex flex-wrap gap-2">
        {article.sections.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-pine hover:text-ink">
            {section.title}
          </a>
        ))}
        {cited.length ? (
          <a href="#kaynaklar" className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-pine hover:text-ink">
            Kaynaklar
          </a>
        ) : null}
      </nav>

      {article.sections.map((section) => (
        <section key={section.id} id={section.id} className="mt-14 scroll-mt-24">
          <h2 className="text-3xl">{section.title}</h2>
          {section.blocks.map((block, index) => (
            <BlockView key={index} block={block} />
          ))}
        </section>
      ))}

      <section id="sss" className="mt-14 scroll-mt-24">
        <h2 className="text-3xl">Sık sorulanlar</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {article.faqs.map((item) => (
            <details key={item.question} className="faq group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                <h3 className="font-sans text-lg font-medium tracking-normal">{item.question}</h3>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-pine transition duration-300 group-open:rotate-45 group-open:border-pine">+</span>
              </summary>
              <p className="mt-3 pr-10 leading-7 text-muted">
                <Rich text={item.answer} />
              </p>
            </details>
          ))}
        </div>
      </section>

      {hasSectionTips ? null : (
        <section className="mt-14">
          <h2 className="text-2xl">Soru tiplerine göre çözüm rehberleri</h2>
          <p className="mt-2 leading-7 text-muted">Her bölümde açıklamalı bir örnek soru, adım adım çözüm ve kendin deneyebileceğin bir alıştırma var.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {ydsBlueprint.bands.map((band) => (
              <li key={band.section}>
                <Link
                  href={`/rehber/${band.section}`}
                  className="inline-block rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink transition hover:border-pine hover:text-pine"
                >
                  {band.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cited.length ? (
        <section id="kaynaklar" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl">Kaynaklar</h2>
          <p className="mt-2 leading-7 text-muted">
            Yazıda atıf yaptığımız çalışmalar. Her birinin altında, yazıda hangi bulgusunu kullandığımızı not ettik. Ürünle ilgili cümleler bizim kararlarımızdır; bu çalışmalar onları test etmedi.
          </p>
          <ol className="mt-4 grid gap-3">
            {cited.map((source) => (
              <li key={source.id} id={sourceAnchor(source.id)} className="scroll-mt-24 rounded-2xl border border-line bg-card px-4 py-3 text-sm leading-6">
                <p className="text-ink">
                  <span className="font-semibold">{source.cite}.</span> {source.title}. <span className="text-muted">{source.venue}.</span>{" "}
                  <a href={source.url} rel="noopener" target="_blank" className="link-underline font-medium text-pine">
                    {source.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </p>
                <p className="mt-1 text-muted">{source.finding}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="mt-14">
        <h2 className="text-2xl">Devamı</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {article.related.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="lift flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 transition hover:border-pine">
                <span className="font-medium text-ink">{item.label}</span>
                <span aria-hidden className="text-pine">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
