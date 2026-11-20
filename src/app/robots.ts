import type { MetadataRoute } from "next";
import { siteUrl } from "@/brand";

const privatePaths = ["/api/", "/dashboard/", "/bugun", "/admin", "/oturum", "/profil", "/odeme"];

/** Allow general crawlers + major AI/GEO bots; keep study/account/API routes private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/rehber/", "/llms.txt"],
        disallow: privatePaths,
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/rehber/", "/llms.txt"],
        disallow: privatePaths,
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/rehber/", "/llms.txt"],
        disallow: privatePaths,
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/rehber/", "/llms.txt"],
        disallow: privatePaths,
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl.replace(/^https?:\/\//, ""),
  };
}
