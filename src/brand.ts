export const brand = {
  name: "outklas",
  wordmark: "outklas.",
  tagline: "YDS · e-YDS · YÖKDİL için teşhis temelli hazırlık",
  domain: "outklas.com",
  hero: "Daha çok değil. Daha isabetli çalış.",
  descriptor: "Sınav istihbaratı",
  sub: "Önce nerede puan kaçırdığını gör, sonra sadece ihtiyacın olan yere odaklan. Türkiye’de YDS, e-YDS, YÖKDİL ve e-YÖKDİL için Cümle Röntgeni, teşhis ve günlük adaptif plan.",
  /** TL, KDV dahil. `gelisim` is the checkout code of the package sold as Sprint. */
  prices: {
    gelisim: 3450,
    kamp: 5950,
  },
  accessDays: {
    gelisim: 45,
    kamp: 180,
  },
  /** At or under this many days to the exam we recommend Sprint, above it Kamp. */
  sprintMaxDays: 45,
  /** Optional installment display for Sprint (3 × amount); checkout remains single pay. */
  installment: {
    gelisim: 1250,
    kamp: 2150,
  },
  /** Kamp is sold at the founder price until this day; the label on the card shows the date. */
  launchUntil: "2026-12-31",
  diagnosticQuestions: 40,
  diagnosticMinutes: 30,
  freeDailyWords: 10,
  freeDailyConnectors: 10,
  freeSimulators: 1,
  sprintSimulators: 4,
} as const;

/**
 * Canonical origin for metadata, sitemap and JSON-LD.
 * Always apex (`https://outklas.com`) — never www. Vercel must 301 www → apex
 * so Google does not see two competing homes.
 */
export const siteUrl = (() => {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || `https://${brand.domain}`).replace(/\/+$/, "");
  try {
    const url = new URL(raw);
    if (url.hostname === `www.${brand.domain}`) url.hostname = brand.domain;
    return url.origin;
  } catch {
    return `https://${brand.domain}`;
  }
})();
