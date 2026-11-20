import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/brand";
import { JsonLd } from "@/components/JsonLd";
import { TopicLinks } from "@/components/topic-links";
import { celdiriciTespiti } from "@/content/articles/celdirici-tespiti";
import { videoDersDevri } from "@/content/articles/video-ders-devri";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Outklas Blog · Akademik İngilizce ve Sınav Stratejileri",
  description:
    "YDS ve YÖKDİL hazırlığında bilişsel yük yönetimi, Bloom 2 Sigma adaptif modeli, çeldirici analizi ve kanıta dayalı sınav hazırlık yazıları.",
  alternates: { canonical: "/blog" },
};

const posts = [
  {
    article: celdiriciTespiti,
    reading: "Kasım 2026 · 5 dk okuma",
    teaser:
      "Sınav salonunda iki şık arasında kalıp hep yanlış olanı mı seçiyorsunuz? Bu kelime eksiğinden değil, ÖSYM'nin 3 katmanlı çeldirici mühendisliğinden kaynaklanır. Dilbilgisel, sözdizimsel ve anlamsal çeldiricileri örnek soru otopsisiyle elerken doğru refleksi kazanın.",
    tags: ["Çeldirici Tespiti", "Cümle Tamamlama", "Soru Otopsisi"],
  },
  {
    article: videoDersDevri,
    reading: "Kasım 2026 · 6 dk okuma",
    teaser:
      "Bugüne kadar yüzlerce saat gramer videosu izleyip, deneme sınavında iki şık arasında kalarak aynı puan bandında sıkışıyorsanız sorun sizde değil, kullandığınız hazırlık modelinde. Bloom 2 Sigma adaptif modeli ve çeldirici analizi ile YDS/YÖKDİL hazırlığında yeni dönem.",
    tags: ["Bloom 2 Sigma", "Çeldirici Tespiti", "Maliyet & Verim"],
  },
] as const;

const guides = [
  {
    href: "/yds-hazirlik",
    kicker: "Hazırlık Kılavuzu",
    title: "YDS ve YÖKDİL hazırlık: önce ölç, sonra tek açığa çalış",
    note: "Nereden başlanır, 5 adımlık çalışma döngüsü ve YÖKDİL farkı.",
  },
  {
    href: "/yds-taktikleri",
    kicker: "Soru Çözüm Taktikleri",
    title: "YDS ve YÖKDİL taktikleri: kurallar nerede biter?",
    note: "Üç kontrol, yaygın taktiklerin sınırları ve 180 dakika sınav yönetimi.",
  },
  {
    href: "/yds-sifirdan-hazirlik",
    kicker: "Sıfırdan Başlayanlar",
    title: "YDS’ye sıfırdan hazırlık: cümleyi çözemiyorsan ilk 12 hafta",
    note: "Çalışma sırası, ilk 4 hafta planı ve temel gramer-kelime adımları.",
  },
  {
    href: "/yds-70-80-90-nasil-alinir",
    kicker: "Hedef Puan Stratejisi",
    title: "YDS’de 70, 80 ve 90: üç bant, üç hata bütçesi",
    note: "Hedefe göre doğru sayısı, bölüm bazlı hata hakkı ve soru dağılımı.",
  },
] as const;

const blogLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "@id": `${siteUrl}/blog#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      ],
    },
    {
      "@type": "Blog",
      "@id": `${siteUrl}/blog#blog`,
      url: `${siteUrl}/blog`,
      name: "Outklas Blog",
      description:
        "YDS ve YÖKDİL hazırlığında bilişsel yük yönetimi, Bloom 2 Sigma adaptif modeli, çeldirici analizi ve kanıta dayalı sınav hazırlık yazıları.",
      publisher: { "@id": `${siteUrl}/#organization` },
      blogPost: posts.map(({ article }) => ({
        "@type": "BlogPosting",
        headline: `${article.title} ${article.accent}`,
        description: article.description,
        url: `${siteUrl}${article.path}`,
        datePublished: "2026-11-19",
        dateModified: "2026-11-19",
      })),
    },
  ],
};

export default function BlogIndexPage() {
  return (
    <section className="landing mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-4 py-12 sm:px-5 sm:py-20">
      <JsonLd data={blogLd} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Blog</p>
      <h1 className="display-xl mt-4 max-w-3xl font-serif">
        Sınav Stratejileri ve <span className="grad">Araştırmalar</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
        Yüzlerce saatlik pasif videolar yerine adaptif öğrenme, çeldirici analizi ve bilişsel yükü azaltan kanıta dayalı hazırlık modeli.
      </p>

      <div className="mt-10 grid gap-6">
        {posts.map((post) => (
          <article key={post.article.path} className="min-w-0 rounded-[28px] border border-line bg-card p-5 sm:rounded-[32px] sm:p-8">
            <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.14em] text-pine sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:tracking-[0.16em]">
              <span className="min-w-0 break-words">{post.article.eyebrow}</span>
              <span className="shrink-0 text-muted">{post.reading}</span>
            </div>
            <h2 className="mt-4 text-xl leading-snug break-words sm:text-2xl sm:leading-tight lg:text-3xl">
              <Link href={post.article.path} className="transition hover:text-pine">
                {post.article.title} <span className="grad">{post.article.accent}</span>
              </Link>
            </h2>
            <p className="mt-4 text-base leading-7 break-words text-muted sm:text-lg sm:leading-8">{post.teaser}</p>

            <ul className="mt-6 flex flex-wrap gap-2 text-xs">
              {post.tags.map((tag) => (
                <li key={tag} className="rounded-full border border-line bg-soft px-3 py-1 font-medium text-ink">
                  {tag}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-4 border-t border-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-xs leading-5 text-muted">
                Yazar: <span className="font-medium text-ink">Outklas Editoryal Ekibi</span>
              </p>
              <Link
                href={post.article.path}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full bg-pine px-5 py-2.5 text-center text-sm font-semibold text-pine-ink transition hover:-translate-y-0.5 sm:w-auto"
              >
                Makaleyi Oku →
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-16">
        <h3 className="text-xl leading-snug text-ink sm:text-2xl">Temel Hazırlık Kılavuzları</h3>
        <p className="mt-2 text-sm leading-6 text-muted">Sınav mimarisi, soru çözme taktikleri ve çalışma döngüleri.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="glass group block min-w-0 rounded-[24px] border border-line p-5 transition hover:border-pine"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">{guide.kicker}</span>
              <p className="mt-2 font-serif text-lg leading-snug break-words text-ink transition group-hover:text-pine">
                {guide.title} →
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">{guide.note}</p>
            </Link>
          ))}
        </div>
      </div>

      <TopicLinks className="mt-16" />
    </section>
  );
}
