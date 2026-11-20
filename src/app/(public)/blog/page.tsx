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
      blogPost: [
        {
          "@type": "BlogPosting",
          headline: `${celdiriciTespiti.title} ${celdiriciTespiti.accent}`,
          description: celdiriciTespiti.description,
          url: `${siteUrl}${celdiriciTespiti.path}`,
          datePublished: "2026-11-19",
          dateModified: "2026-11-19",
        },
        {
          "@type": "BlogPosting",
          headline: `${videoDersDevri.title} ${videoDersDevri.accent}`,
          description: videoDersDevri.description,
          url: `${siteUrl}${videoDersDevri.path}`,
          datePublished: "2026-11-19",
          dateModified: "2026-11-19",
        },
      ],
    },
  ],
};

export default function BlogIndexPage() {
  return (
    <section className="landing mx-auto w-full max-w-5xl px-4 py-12 sm:px-5 sm:py-20">
      <JsonLd data={blogLd} />
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Blog</p>
      <h1 className="display-xl mt-4 max-w-3xl font-serif">
        Sınav Stratejileri ve <span className="grad">Araştırmalar</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
        Yüzlerce saatlik pasif videolar yerine adaptif öğrenme, çeldirici analizi ve bilişsel yükü azaltan kanıta dayalı hazırlık modeli.
      </p>

      {/* Featured Article 1: Celdirici Tespiti */}
      <div className="mt-10 rounded-[32px] border border-line bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-pine">
          <span>{celdiriciTespiti.eyebrow}</span>
          <span className="text-muted">Kasım 2026 · 5 dk okuma</span>
        </div>
        <h2 className="mt-4 text-2xl font-serif sm:text-3xl">
          <Link href={celdiriciTespiti.path} className="hover:text-pine transition">
            {celdiriciTespiti.title} <span className="grad">{celdiriciTespiti.accent}</span>
          </Link>
        </h2>
        <p className="mt-4 text-base leading-7 text-muted sm:text-lg sm:leading-8">
          Sınav salonunda iki şık arasında kalıp hep yanlış olanı mı seçiyorsunuz? Bu kelime eksiğinden değil, ÖSYM'nin 3 katmanlı çeldirici mühendisliğinden kaynaklanır. Dilbilgisel, sözdizimsel ve anlamsal çeldiricileri örnek soru otopsisiyle elerken doğru refleksi kazanın.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-line bg-soft px-3 py-1 font-medium text-ink">Çeldirici Tespiti</span>
          <span className="rounded-full border border-line bg-soft px-3 py-1 font-medium text-ink">Cümle Tamamlama</span>
          <span className="rounded-full border border-line bg-soft px-3 py-1 font-medium text-ink">Soru Otopsisi</span>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-line/60 pt-6">
          <div className="text-xs text-muted">
            <span>Yazar: </span>
            <span className="font-medium text-ink">Outklas Editoryal Ekibi</span>
          </div>
          <Link
            href={celdiriciTespiti.path}
            className="inline-flex min-h-11 items-center rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-pine-ink transition hover:-translate-y-0.5"
          >
            Makaleyi Oku →
          </Link>
        </div>
      </div>

      {/* Featured Article 2: Video Ders Devri */}
      <div className="mt-8 rounded-[32px] border border-line bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-pine">
          <span>{videoDersDevri.eyebrow}</span>
          <span className="text-muted">Kasım 2026 · 6 dk okuma</span>
        </div>
        <h2 className="mt-4 text-2xl font-serif sm:text-3xl">
          <Link href={videoDersDevri.path} className="hover:text-pine transition">
            {videoDersDevri.title} <span className="grad">{videoDersDevri.accent}</span>
          </Link>
        </h2>
        <p className="mt-4 text-base leading-7 text-muted sm:text-lg sm:leading-8">
          Bugüne kadar yüzlerce saat gramer videosu izleyip, deneme sınavında iki şık arasında kalarak aynı puan bandında sıkışıyorsanız sorun sizde değil, kullandığınız hazırlık modelinde. Bloom 2 Sigma adaptif modeli ve çeldirici analizi ile YDS/YÖKDİL hazırlığında yeni dönem.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-line bg-soft px-3 py-1 font-medium text-ink">Bloom 2 Sigma</span>
          <span className="rounded-full border border-line bg-soft px-3 py-1 font-medium text-ink">Çeldirici Tespiti</span>
          <span className="rounded-full border border-line bg-soft px-3 py-1 font-medium text-ink">Maliyet & Verim</span>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-line/60 pt-6">
          <div className="text-xs text-muted">
            <span>Yazar: </span>
            <span className="font-medium text-ink">Outklas Editoryal Ekibi</span>
          </div>
          <Link
            href={videoDersDevri.path}
            className="inline-flex min-h-11 items-center rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-pine-ink transition hover:-translate-y-0.5"
          >
            Makaleyi Oku →
          </Link>
        </div>
      </div>

      {/* Additional Reading Guides */}
      <div className="mt-16">
        <h3 className="text-xl font-serif text-ink sm:text-2xl">Temel Hazırlık Kılavuzları</h3>
        <p className="mt-2 text-sm text-muted">Sınav mimarisi, soru çözme taktikleri ve çalışma döngüleri.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/yds-hazirlik" className="glass group block rounded-[24px] border border-line p-5 transition hover:border-pine">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Hazırlık Kılavuzu</span>
            <p className="mt-2 font-serif text-lg text-ink group-hover:text-pine transition">YDS ve YÖKDİL hazırlık: önce ölç, sonra tek açığa çalış →</p>
            <p className="mt-2 text-sm text-muted leading-6">Nereden başlanır, 5 adımlık çalışma döngüsü ve YÖKDİL farkı.</p>
          </Link>

          <Link href="/yds-taktikleri" className="glass group block rounded-[24px] border border-line p-5 transition hover:border-pine">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Soru Çözüm Taktikleri</span>
            <p className="mt-2 font-serif text-lg text-ink group-hover:text-pine transition">YDS ve YÖKDİL taktikleri: kurallar nerede biter? →</p>
            <p className="mt-2 text-sm text-muted leading-6">Üç kontrol, yaygın taktiklerin sınırları ve 180 dakika sınav yönetimi.</p>
          </Link>

          <Link href="/yds-sifirdan-hazirlik" className="glass group block rounded-[24px] border border-line p-5 transition hover:border-pine">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Sıfırdan Başlayanlar</span>
            <p className="mt-2 font-serif text-lg text-ink group-hover:text-pine transition">YDS’ye sıfırdan hazırlık: nereden başlanır? →</p>
            <p className="mt-2 text-sm text-muted leading-6">Çalışma sırası, ilk 4 hafta planı ve temel gramer-kelime adımları.</p>
          </Link>

          <Link href="/yds-70-80-90-nasil-alinir" className="glass group block rounded-[24px] border border-line p-5 transition hover:border-pine">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Hedef Puan Stratejisi</span>
            <p className="mt-2 font-serif text-lg text-ink group-hover:text-pine transition">YDS’den 70, 80, 90 nasıl alınır? →</p>
            <p className="mt-2 text-sm text-muted leading-6">Hedefe göre doğru sayısı, bölüm bazlı hata hakkı ve soru dağılımı.</p>
          </Link>
        </div>
      </div>

      <TopicLinks className="mt-16" />
    </section>
  );
}
