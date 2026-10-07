import { brand } from "@/brand";
import type { CheckoutPlan } from "@/modules/billing/entitlement";

export type Offer = {
  plan: CheckoutPlan;
  eyebrow: string;
  name: string;
  price: number;
  days: number;
  points: string[];
  tagline: string;
  cta: string;
  featured: boolean;
};

export const offers: Record<CheckoutPlan, Offer> = {
  gelisim: {
    plan: "gelisim",
    eyebrow: "Kendim çalışacağım",
    name: "Gelişim Paketi",
    price: brand.prices.gelisim,
    days: brand.accessDays.gelisim,
    points: [
      "Seviye testinin tam raporu, bütün bulgularıyla",
      "Kelime ve bağlaç setleri (yazdırılabilir, PDF olarak indirilebilir)",
      "Günlük sınır olmadan kelime alıştırması",
      "Günlük sınır olmadan bağlaç alıştırması",
      "Rapora göre günlük çalışma önerisi",
    ],
    tagline: "Sen çalış, araçları biz verelim.",
    cta: "Gelişim araçlarını aç →",
    featured: false,
  },
  kamp: {
    plan: "kamp",
    eyebrow: "Bana program oluştur",
    name: "Kişisel YDS Kampı",
    price: brand.prices.kamp,
    days: brand.accessDays.kamp,
    points: [
      "Gelişim Paketi’ndeki her şey",
      "Hedef puanına ve sınav tarihine göre çalışma planı",
      "Her gün hazır bir görev listesi",
      "Zayıf olduğun bölümlerden seçilen sorular (10 bölümün hepsi)",
      "Sınırsız tam deneme",
      "İlerleme takibi ve güncel puan tahmini",
    ],
    tagline: "Sen hedefini söyle, ne yapacağını biz söyleyelim.",
    cta: "Kişisel kampımı oluştur →",
    featured: true,
  },
};

export function launchLabel() {
  const until = new Date(`${brand.launchUntil}T12:00:00+03:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  return `Lansman fiyatı · son gün ${until}`;
}

export function launchActive(now = new Date()) {
  return now.getTime() <= new Date(`${brand.launchUntil}T23:59:59+03:00`).getTime();
}

export function tl(amount: number) {
  return amount.toLocaleString("tr-TR");
}

export function checkoutHref(plan: CheckoutPlan, signedIn: boolean) {
  const target = `/odeme?paket=${plan}`;
  return signedIn ? target : `/giris?kayit=1&sonra=${encodeURIComponent(target)}`;
}
