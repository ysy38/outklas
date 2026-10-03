import type { MetadataRoute } from "next";
import { brand } from "@/brand";
import { guides } from "@/content/guides";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${brand.domain}`;
  const paths = [
    "",
    "/teshis",
    "/rehber",
    ...ydsBlueprint.bands.map((band) => `/rehber/${band.section}`),
    "/deneme",
    "/fiyat",
    "/giris",
    "/yds-puan-hesaplama",
    ...guides.map((guide) => `/${guide.slug}`),
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
