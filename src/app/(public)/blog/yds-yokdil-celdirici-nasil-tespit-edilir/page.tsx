import type { Metadata } from "next";
import { ArticlePage } from "@/components/article-page";
import { DistractorArticleJsonLd } from "@/components/seo/DistractorArticleJsonLd";
import { celdiriciTespiti } from "@/content/articles";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: celdiriciTespiti.metaTitle,
  description: celdiriciTespiti.description,
  alternates: { canonical: celdiriciTespiti.path },
  openGraph: {
    title: celdiriciTespiti.metaTitle,
    description: celdiriciTespiti.description,
    url: `https://outklas.com${celdiriciTespiti.path}`,
    siteName: "Outklas",
    locale: "tr_TR",
    type: "article",
    images: [
      {
        url: "https://outklas.com/og/yds-yokdil-celdirici-tespiti.png",
        width: 1200,
        height: 630,
        alt: celdiriciTespiti.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: celdiriciTespiti.metaTitle,
    description: celdiriciTespiti.description,
    images: ["https://outklas.com/og/yds-yokdil-celdirici-tespiti.png"],
  },
};

export default function CeldiriciArticlePage() {
  return (
    <ArticlePage
      article={celdiriciTespiti}
      customJsonLd={<DistractorArticleJsonLd />}
    />
  );
}
