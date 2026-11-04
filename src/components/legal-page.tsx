import type { Metadata } from "next";
import Link from "next/link";
import { formatUpdated } from "@/content/editorial";
import { legalDocs, type LegalDoc } from "@/content/legal";

export function legalMetadata(doc: LegalDoc): Metadata {
  return { title: doc.title, description: doc.description, alternates: { canonical: doc.path } };
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const others = legalDocs.filter((item) => item.path !== doc.path);
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-5 sm:py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Yasal</p>
      <h1 className="display mt-3">{doc.title}</h1>
      <p className="mt-3 text-sm text-muted">Son güncelleme: {formatUpdated(doc.updated)}</p>
      <p className="mt-4 text-lg leading-8 text-muted">{doc.lead}</p>
      {doc.sections.map((section) => (
        <section key={section.id} id={section.id} className="mt-10 scroll-mt-24">
          <h2 className="text-2xl">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 leading-7 text-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <nav aria-label="Diğer yasal metinler" className="mt-12 border-t border-line pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {others.map((item) => (
            <li key={item.path}>
              <Link href={item.path} className="link-underline text-pine">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
