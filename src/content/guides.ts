export type Guide = {
  slug: string;
  title: string;
  lead: string;
  paragraphs: string[];
};

export const guides: Guide[] = [
  {
    slug: "yds-baglac-testi",
    title: "YDS bağlaç testi",
    lead: "Bağlaç, YDS’de ayrı bir oturum değildir. Dil bilgisinin ve cümle tamamlamanın içindedir.",
    paragraphs: [
      "7–16 dil bilgisi, 27–36 cümle tamamlamadır. Tense, edat ve bağlaç bu iki bandın içinde birer beceridir. Bölüm yine tektir; etiket, yanlışın nedenini ayırmak içindir.",
      "“However biliyorum” yetmez. Şık, cümlenin yönünü tersine çeviriyorsa bu bir bağlaç hatasıdır, kelime eksiği değil. Teşhis bunu ayırır; ertesi günün listesi de ona göre kurulur.",
    ],
  },
  {
    slug: "yds-okudugunu-anlama",
    title: "YDS okuduğunu anlama",
    lead: "Okuma 43–62 arasındadır: beş metin, her biri dört soru. Puanın çeyreği bu yirmi sorudadır.",
    paragraphs: [
      "Metinsiz okuma sorusu olmaz. Teşhiste bir metin dört soruyla, bir kısa metin iki soruyla gelir. Tahmin, okumayı üç soruda geçiştirmez.",
      "Ayrıntı, çıkarım, gönderim, ana fikir, amaç ve except aynı bandın etiketleridir. “Okuma zayıf” demek yerine, hangi işin kaçtığı yazılır.",
    ],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}
