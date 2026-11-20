import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/article-page";
import { articles } from "@/content/articles";

export const dynamic = "force-static";

const dedicated = new Set([
  "/blog/yds-yokdil-100-saatlik-video-devri-neden-kapandi",
  "/blog/yds-yokdil-celdirici-nasil-tespit-edilir",
]);

export function generateStaticParams() {
  return articles
    .filter(
      (article) =>
        article.path.startsWith("/blog/") &&
        !dedicated.has(article.path),
    )
    .map((article) => ({ slug: article.path.replace("/blog/", "") }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.path === `/blog/${slug}`);
  if (!article) return {};
  return {
    title: article.metaTitle,
    description: article.description,
    alternates: { canonical: article.path },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((a) => a.path === `/blog/${slug}`);
  if (!article) notFound();
  return <ArticlePage article={article} />;
}
