import { brand, siteUrl } from "@/brand";

export type Author = { name: string; profile: string; role?: string };

/** People shown as "Hazırlayanlar" on content pages and as Article authors in JSON-LD. */
export const authors: Author[] = [
  { name: "İsa Eroğlu", profile: "https://www.linkedin.com/in/isa-eroglu-9610131bb/" },
  { name: "Kenan İpkıran", profile: "https://www.linkedin.com/in/kenan-ipk%C4%B1ran-bb865497/" },
];

export const editor = {
  about:
    "Soru açıklamalarını, bölüm rehberlerini ve yöntem sayfasını yazan ve kontrol eden ekip. Sınav tarihleri ÖSYM’nin sınav takviminden alınır.",
  href: "/yontem#editor",
};

/** Last content change per public path. Update the date whenever the page's copy changes; the sitemap reads it too. */
export const updatedAt: Record<string, string> = {
  "/": "2026-10-15",
  "/yontem": "2026-10-15",
  "/yds-hazirlik": "2026-10-15",
  "/yds-baglac-testi": "2026-10-15",
  "/yds-okudugunu-anlama": "2026-10-15",
  "/fiyat": "2026-10-15",
  "/rehber/grammar": "2026-10-21",
  "/rehber/vocabulary": "2026-10-21",
  "/rehber/cloze": "2026-10-21",
  "/rehber/sentence": "2026-10-21",
  "/rehber/translation": "2026-10-21",
  "/rehber/reading": "2026-10-21",
  "/rehber/dialogue": "2026-10-22",
  "/rehber/restatement": "2026-10-22",
  "/rehber/paragraph": "2026-10-22",
  "/rehber/irrelevant": "2026-10-22",
};

export function formatUpdated(day: string) {
  return new Date(`${day}T12:00:00+03:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function authorsJsonLd() {
  return authors.map((author) => ({
    "@type": "Person",
    name: author.name,
    url: author.profile,
    sameAs: [author.profile],
    ...(author.role ? { jobTitle: author.role } : {}),
    worksFor: { "@type": "Organization", name: brand.name, url: siteUrl },
  }));
}

export function articleJsonLd(input: { path: string; title: string; description: string }) {
  const updated = updatedAt[input.path];
  return {
    "@type": "Article",
    headline: input.title,
    description: input.description,
    inLanguage: "tr-TR",
    url: `${siteUrl}${input.path}`,
    mainEntityOfPage: `${siteUrl}${input.path}`,
    author: authorsJsonLd(),
    publisher: { "@type": "Organization", name: brand.name, url: siteUrl },
    ...(updated ? { dateModified: updated } : {}),
  };
}
