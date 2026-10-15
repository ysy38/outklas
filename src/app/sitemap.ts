import type { MetadataRoute } from "next";
import { siteUrl } from "@/brand";
import { updatedAt } from "@/content/editorial";
import { guides } from "@/content/guides";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/yds-hazirlik",
    "/teshis",
    "/yontem",
    "/rehber",
    ...ydsBlueprint.bands.map((band) => `/rehber/${band.section}`),
    "/deneme",
    "/fiyat",
    "/yds-puan-hesaplama",
    ...guides.map((guide) => `/${guide.slug}`),
  ];
  return paths.map((path) => {
    const updated = updatedAt[path || "/"];
    return {
      url: `${siteUrl}${path}`,
      ...(updated ? { lastModified: updated } : {}),
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/yds-hazirlik" || path === "/teshis" ? 0.9 : 0.7,
    };
  });
}
