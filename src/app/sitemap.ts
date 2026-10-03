import type { MetadataRoute } from "next";
import { brand } from "@/brand";
import { guides } from "@/content/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${brand.domain}`;
  const paths = ["", "/teshis", "/deneme", "/fiyat", "/giris", "/yds-puan-hesaplama", ...guides.map((guide) => `/${guide.slug}`)];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
