import type { MetadataRoute } from "next";
import { brand } from "@/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/bugun", "/admin", "/oturum", "/profil", "/odeme"] },
    sitemap: `https://${brand.domain}/sitemap.xml`,
  };
}
