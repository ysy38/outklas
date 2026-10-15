export const brand = {
  name: "STARC",
  tagline: "Smart Testing, Assessment, Recommendation & Coaching",
  domain: "starc.run",
  hero: "YDS ve YÖKDİL’e daha fazla değil, daha doğru çalış.",
  descriptor: "Exam Intelligence",
  sub: "Seviyeni ve hedefini ölçer, her gün sana en çok puan kazandıracak çalışmayı gösterir. YDS, e-YDS, YÖKDİL ve e-YÖKDİL için.",
  /** TL, KDV dahil. `gelisim` is the checkout code of the package sold as Sprint. */
  prices: {
    gelisim: 499,
    kamp: 2499,
  },
  accessDays: {
    gelisim: 60,
    kamp: 180,
  },
  /** At or under this many days to the exam we recommend Sprint, above it Kamp. */
  sprintMaxDays: 60,
  /** Kamp is sold at the founder price until this day; the label on the card shows the date. */
  launchUntil: "2026-12-31",
  diagnosticQuestions: 40,
  diagnosticMinutes: 30,
  freeDailyWords: 10,
  freeDailyConnectors: 10,
  freeSimulators: 1,
  sprintSimulators: 4,
} as const;

/** Canonical origin for metadata, sitemap and JSON-LD. Set NEXT_PUBLIC_SITE_URL to the production domain. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || `https://${brand.domain}`).replace(/\/+$/, "");
