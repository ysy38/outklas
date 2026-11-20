import type { Metadata } from "next";
import { ArticlePage } from "@/components/article-page";
import { BloomArticleJsonLd } from "@/components/seo/BloomArticleJsonLd";
import { videoDersDevri } from "@/content/articles";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: videoDersDevri.metaTitle,
  description: videoDersDevri.description,
  alternates: { canonical: videoDersDevri.path },
  openGraph: {
    title: videoDersDevri.metaTitle,
    description: videoDersDevri.description,
    url: `https://outklas.com${videoDersDevri.path}`,
    siteName: "Outklas",
    locale: "tr_TR",
    type: "article",
    images: [
      {
        url: "https://outklas.com/og/bloom-2-sigma-yds-yokdil.png",
        width: 1200,
        height: 630,
        alt: videoDersDevri.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: videoDersDevri.metaTitle,
    description: videoDersDevri.description,
    images: ["https://outklas.com/og/bloom-2-sigma-yds-yokdil.png"],
  },
};

export default function BloomArticlePage() {
  return (
    <ArticlePage
      article={videoDersDevri}
      customJsonLd={<BloomArticleJsonLd />}
    />
  );
}
