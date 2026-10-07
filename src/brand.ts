export const brand = {
  name: "YDS Lab",
  domain: "ydslab.com",
  hero: "YDS’de kaç alacağını tahmin etmek yerine, önce seviyeni ölç.",
  sub: "40 soruluk seviye testini çöz. Seviyeni, güçlü ve zayıf olduğun bölümleri ve hedef puanına ulaşmak için kapatman gereken açıkları gör.",
  prices: {
    gelisim: 499,
    kamp: 2490,
  },
  accessDays: {
    gelisim: 90,
    kamp: 180,
  },
  /** Kamp is sold at the launch price until this day; the label on the card shows the date. */
  launchUntil: "2026-12-31",
  diagnosticQuestions: 40,
  diagnosticMinutes: 30,
  freeDailyWords: 10,
  freeDailyConnectors: 10,
  freeSimulators: 1,
} as const;
