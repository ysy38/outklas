import type { MetadataRoute } from "next";
import { siteUrl } from "@/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/bugun", "/admin", "/oturum", "/profil", "/odeme"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
