import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialNote } from "@/components/editorial-note";
import { articleJsonLd } from "@/content/editorial";
import { guideBySlug, guides } from "@/content/guides";

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
      <p className="mt-6 text-sm text-muted">
        <Link href="/yds-hazirlik" className="link-underline text-pine">
          YDS hazırlık rehberine dön
        </Link>
      </p>
    </article>
  );
}
