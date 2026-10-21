import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand, siteUrl } from "@/brand";
import { GuideDeep } from "@/components/guide-deep";
import { skillName } from "@/content/labels";
import { articleJsonLd } from "@/content/editorial";
import { deepGuideFor } from "@/content/guide-labs";
import { rehberBySection } from "@/content/rehber";
import { and, answers, eq, getDb, inArray, items, mastery } from "@/db/client";
import { ydsBlueprint, type SectionId } from "@/modules/exam/blueprint";
import { currentProfile } from "@/server/auth";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const band = ydsBlueprint.bands.find((item) => item.section === section);
  const note = rehberBySection(section);
  const deep = deepGuideFor(section);
  if (!band || !note) return { title: "Rehber" };
  if (deep) {
    return {
      title: { absolute: deep.seoTitle },
      description: deep.seoDescription,
      alternates: { canonical: `/rehber/${section}` },
      openGraph: {
        title: deep.seoTitle,
        description: deep.seoDescription,
        type: "article",
        url: `${siteUrl}/rehber/${section}`,
        siteName: brand.name,
      },
      twitter: {
        card: "summary_large_image",
        title: deep.seoTitle,
        description: deep.seoDescription,
      },
    };
  }
  return {
    title: `${band.title} nasıl çözülür`,
    description: note.measures,
    alternates: { canonical: `/rehber/${section}` },
  };
}

export default async function GuideSectionPage({ params }: Props) {
  const { section } = await params;
  const band = ydsBlueprint.bands.find((item) => item.section === section);
  const note = rehberBySection(section);
  if (!band || !note) notFound();
  const deep = deepGuideFor(section);
  const path = `/rehber/${section}`;
  const profile = await currentProfile();
  const stats = profile ? await sectionStats(profile.id, band.section) : null;
  const readingSkills = profile && band.section === "reading" ? await readingBreakdown(profile.id) : [];

  const jsonLd = deep
    ? {
        "@context": "https://schema.org",
        "@graph": [
          articleJsonLd({ path, title: deep.h1, description: deep.seoDescription }),
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Ana sayfa", item: siteUrl },
              { "@type": "ListItem", position: 2, name: "Rehber", item: `${siteUrl}/rehber` },
              { "@type": "ListItem", position: 3, name: band.title, item: `${siteUrl}${path}` },
            ],
          },
          {
            "@type": "HowTo",
            name: deep.nextTitle,
            description: deep.approach,
            step: deep.nextSteps.map((text, index) => ({
              "@type": "HowToStep",
              position: index + 1,
              name: `Adım ${index + 1}`,
              text,
            })),
          },
          {
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: deep.h1,
                acceptedAnswer: { "@type": "Answer", text: `${deep.lead} ${deep.approach}` },
              },
              {
                "@type": "Question",
                name: deep.layersTitle,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${deep.layers.map((layer) => `${layer.title}: ${layer.body}`).join(" ")} ${deep.layersNote}`,
                },
              },
              {
                "@type": "Question",
                name: "Yanlış seçenekler nasıl analiz edilir?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Doğru cevabı ezberlemek yeterli değildir. Her yanlış seçeneğin yapısal veya anlamsal olarak neden elendiğini ayrı ayrı gerekçelendirmek gerekir.",
                },
              },
            ],
          },
        ],
      }
    : null;

  return (
    <article className="landing mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-5 sm:py-16 lg:grid-cols-[minmax(0,1fr)_min(100%,280px)] lg:gap-10">
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">
          <Link href="/rehber" className="hover:text-ink">
            Rehber
          </Link>
          {" · "}
          {band.to - band.from + 1} soru · {band.title}
        </p>
        {deep ? (
          <GuideDeep guide={deep} path={path} />
        ) : (
          <>
            <h1 className="display mt-3">{band.title}</h1>
            <p className="mt-4 max-w-xl leading-8 text-muted">{note.measures}</p>
            <h2 className="mt-10 text-3xl">Nasıl çözülür?</h2>
            <ol className="mt-4 space-y-3">
              {note.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6">
                  <span className="font-serif text-gold">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <h2 className="mt-10 text-3xl">Sık yapılan hatalar</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
              {note.misses.map((miss) => (
                <li key={miss}>{miss}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        {deep ? (
          <nav aria-label="Sayfa içi" className="rounded-[24px] border border-line bg-card p-5 sm:rounded-[28px]">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Bu sayfada</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#ornek-soru" className="font-medium text-ink hover:text-pine">
                  Örnek soruyu incele
                </a>
              </li>
              <li>
                <a href="#lab" className="font-medium text-ink hover:text-pine">
                  Örnek soru çöz
                </a>
              </li>
              <li>
                <a href="#yontem" className="text-muted hover:text-pine">
                  Çözüm adımları
                </a>
              </li>
              <li>
                <a href="#kaynaklar" className="text-muted hover:text-pine">
                  Kaynaklar
                </a>
              </li>
            </ul>
          </nav>
        ) : null}
        <div className="rounded-[24px] border border-line bg-card p-5 sm:rounded-[28px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">İpucu</p>
          <p className="mt-3 text-sm leading-7 sm:text-base">{note.tip}</p>
        </div>
        <div className="rounded-[24px] border border-line bg-card p-5 sm:rounded-[28px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Senin sonuçların</p>
          {stats && stats.answered > 0 ? (
            <>
              <p className="mt-3 font-serif text-4xl">
                {stats.correct}/{stats.answered}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Bu bölümde çözdüğün soruların doğru sayısı.{" "}
                {stats.wrong > 0
                  ? `${stats.wrong} yanlışın var; gerçek sınavda bu, ${(Math.round(stats.wrong * 125) / 100).toLocaleString("tr-TR")} puan kaybı demek.`
                  : "Henüz yanlışın yok."}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              Bu bölümden henüz soru çözmedin. Seviye testini çözünce sonuçların burada görünür.
            </p>
          )}
          {readingSkills.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {readingSkills.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>{row.name}</span>
                  <span className="text-muted">%{row.mastery}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href={profile ? "/bugun" : "/teshis"} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-pine px-4 py-2 text-sm font-semibold text-pine-ink">
            {profile ? "Bugünün çalışmasına dön" : "Seviye testine başla"}
          </Link>
        </div>
        {deep ? (
          <div className="rounded-[24px] border border-pine/25 bg-soft p-5 sm:rounded-[28px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">outklas. standardı</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              Yapısal kanıt → anlam kontrolü → çeldirici otopsisi. Kuralı ezberlemek değil; soruyu çözmek ve gerekçeyi görmek.
            </p>
          </div>
        ) : null}
      </aside>
    </article>
  );
}

async function sectionStats(profileId: string, section: SectionId) {
  const db = await getDb();
  const rows = await db
    .select({ correct: answers.correct })
    .from(answers)
    .innerJoin(items, eq(items.id, answers.itemId))
    .where(and(eq(answers.profileId, profileId), eq(items.section, section)));
  let correct = 0;
  let wrong = 0;
  for (const row of rows) {
    if (row.correct === true) correct += 1;
    else if (row.correct === false) wrong += 1;
  }
  return { correct, wrong, answered: correct + wrong };
}

async function readingBreakdown(profileId: string) {
  const db = await getDb();
  const readingIds = ["detail", "inference", "reference", "main-idea", "purpose"];
  const rows = await db
    .select({ skillId: mastery.skillId, value: mastery.mastery })
    .from(mastery)
    .where(and(eq(mastery.profileId, profileId), inArray(mastery.skillId, readingIds)));
  return rows.map((row) => ({ id: row.skillId, name: skillName(row.skillId), mastery: row.value }));
}
