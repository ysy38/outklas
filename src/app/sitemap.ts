import type { MetadataRoute } from "next";
import { siteUrl } from "@/brand";
import { updatedAt } from "@/content/editorial";
import { guides } from "@/content/guides";
import { legalDocs } from "@/content/legal";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/yds-hazirlik",
    "/yds-taktikleri",
    "/yds-sifirdan-hazirlik",
    "/yds-70-80-90-nasil-alinir",
    "/teshis",
    "/yontem",
    "/rehber",
    ...ydsBlueprint.bands.map((band) => `/rehber/${band.section}`),
    "/deneme",
    "/fiyat",
    "/yds-puan-hesaplama",
    ...guides.map((guide) => `/${guide.slug}`),
    ...legalDocs.map((doc) => doc.path),
  ];
  return paths.map((path) => {
    const updated = updatedAt[path || "/"];
    return {
      url: `${siteUrl}${path}`,
      ...(updated ? { lastModified: updated } : {}),
      changeFrequency: path === "" ? "daily" : path.startsWith("/rehber") ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/yds-hazirlik" || path === "/teshis" ? 0.9 : path.startsWith("/rehber") ? 0.8 : 0.7,
    };
  });
}
