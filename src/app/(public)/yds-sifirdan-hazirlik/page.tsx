import type { Metadata } from "next";
import { ArticlePage } from "@/components/article-page";
import { sifirdan as article } from "@/content/articles";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: article.metaTitle,
  description: article.description,
  alternates: { canonical: article.path },
};

export default function FromScratchPage() {
  return <ArticlePage article={article} />;
}
