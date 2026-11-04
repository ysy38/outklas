import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialNote } from "@/components/editorial-note";
import { TopicLinks } from "@/components/topic-links";
import { articleJsonLd } from "@/content/editorial";
import { guideBySlug, guides } from "@/content/guides";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.lead, alternates: { canonical: `/${guide.slug}` } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const jsonLd = { "@context": "https://schema.org", ...articleJsonLd({ path: `/${guide.slug}`, title: guide.title, description: guide.lead }) };
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-5 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs uppercase tracking-[0.18em] text-gold">YDS İngilizce</p>
      <h1 className="display mt-3">{guide.title}</h1>
      <EditorialNote path={`/${guide.slug}`} className="mt-3" />
      <p className="mt-4 text-lg text-muted">{guide.lead}</p>
      {guide.paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-4 leading-7">
          {paragraph}
        </p>
      ))}
      <Link href="/teshis" className="mt-8 inline-block rounded-full bg-pine px-5 py-3 text-cream">
        Bu konuda nerede olduğunu gör
      </Link>
      <section className="mt-12">
        <h2 className="text-2xl">Bu soruların çözüm rehberi</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {guide.sections.map((section) => {
            const band = ydsBlueprint.bands.find((item) => item.section === section);
            return band ? (
              <li key={section}>
                <Link href={`/rehber/${section}`} className="inline-block rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink transition hover:border-pine hover:text-pine">
                  {band.title} →
                </Link>
              </li>
            ) : null;
          })}
        </ul>
      </section>
      <TopicLinks className="mt-12" />
    </article>
  );
}
