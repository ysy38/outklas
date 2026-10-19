import { brand } from "@/brand";
import { upcomingSittings } from "@/content/exam-calendar";
import type { CheckoutPlan, Tier } from "@/modules/billing/entitlement";

export type Offer = {
  plan: CheckoutPlan;
  eyebrow: string;
  name: string;
  price: number;
  days: number;
  points: string[];
  tagline: string;
  cta: string;
};

export const freeOffer = {
  name: "Cümle Röntgeni",
  eyebrow: "Ücretsiz bilişsel check-up",
  points: [
    "Hesap gerektirmeyen ilk çözümleme deneyimi",
    "Cümlenin iskeleti, kritik ipucu ve çeldirici mekanizması",
    `Raporun ilk 3 bulgusu · her gün ${brand.freeDailyWords} kelime ve ${brand.freeDailyConnectors} bağlaç`,
    `${brand.freeSimulators} tam deneme`,
  ],
};

export const offers: Record<CheckoutPlan, Offer> = {
  gelisim: {
    plan: "gelisim",
    eyebrow: `Sınavına ${brand.sprintMaxDays} gün ya da daha az varsa`,
    name: "Sprint",
    price: brand.prices.gelisim,
    days: brand.accessDays.gelisim,
    points: [
      "Teşhis raporunun tamamı; öncelikli gelişim alanların",
      "Her gün kısa, hedefe odaklı kişisel çalışma planı",
      "Cümle Röntgeni ve çeldirici otopsisi ile çözümleme pratiği",
      `${brand.sprintSimulators} tam deneme (80 soru, 180 dakika)`,
      "Günlük sınır olmadan kelime ve bağlaç alıştırması",
      "Yanlışların aralıklı tekrarla yeniden karşına çıkar",
    ],
    tagline: "50–65 bandında sıkışmayı tek sınav döneminde kırmak için.",
    cta: `Sprint’e başla, ${tl(brand.prices.gelisim)} TL tek ödeme →`,
  },
  kamp: {
    plan: "kamp",
    eyebrow: `Sınavına ${brand.sprintMaxDays} günden fazla varsa`,
    name: "Kamp",
    price: brand.prices.kamp,
    days: brand.accessDays.kamp,
    points: [
      "Sprint’teki her şey",
      "Sınırsız tam deneme ve uzun dönem bilişsel takip",
      `${brand.accessDays.kamp} gün erişim; sınav tarihini değiştirirsen plan yeni tarihe göre kurulur`,
      "İlerleme takibi ve her gün güncellenen puan tahmini",
      `Sprint’ten geçiyorsan ödediğin ${tl(brand.prices.gelisim)} TL düşülür`,
    ],
    tagline: "Hedef puanına kadar kesintisiz lab. Tek ödeme, abonelik yok.",
    cta: `Kampa başla, ${tl(brand.prices.kamp)} TL tek ödeme →`,
  },
};

/** What this person pays today: a Sprint owner upgrading to Kamp pays only the difference. */
export function priceFor(plan: CheckoutPlan, tier: Tier): number {
  if (plan === "kamp" && tier === "gelisim") return offers.kamp.price - offers.gelisim.price;
  return offers[plan].price;
}

/** Days to the exam: the profile's own date when known, otherwise the next paper YDS in the calendar. */
export function recommendedPlan(daysLeft?: number | null): { plan: CheckoutPlan; days: number | null; own: boolean } {
  const own = daysLeft != null && daysLeft >= 0;
  const upcoming = upcomingSittings();
  const days = own ? daysLeft : ((upcoming.find((sitting) => sitting.family === "yds") ?? upcoming[0])?.days ?? null);
  return { plan: days != null && days <= brand.sprintMaxDays ? "gelisim" : "kamp", days, own };
}

export function launchLabel() {
  const until = new Date(`${brand.launchUntil}T12:00:00+03:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  return `Kurucu fiyatı · son gün ${until}`;
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
