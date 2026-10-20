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
    lead: "YDS’de bağlaçlar ayrı bir bölüm olarak sorulmaz; dil bilgisi ve cümle tamamlama sorularının içinde karşına çıkar.",
    paragraphs: [
      "Dil bilgisi bölümünde 10, cümle tamamlama bölümünde 10 soru var. Zaman, edat ve bağlaç soruları bu iki bölümün içine dağılmıştır. outklas. bunları ayrı ayrı takip eder, böylece yanlışlarının asıl nedenini görürsün.",
      "“However’ı biliyorum” demek yetmez. Seçtiğin şık cümlenin anlamını tersine çeviriyorsa, sorun kelime bilgisinde değil bağlacı yanlış kullanmandadır. Seviye testi bu farkı ortaya çıkarır ve ertesi günkü çalışman buna göre hazırlanır.",
    ],
  },
  {
    slug: "yds-okudugunu-anlama",
    title: "YDS okuduğunu anlama",
    lead: "Okuma bölümünde 5 metin ve her metne ait 4 soru var. Toplam 20 soruyla puanın dörtte biri buradan gelir.",
    paragraphs: [
      "Okuma soruları her zaman bir metinle gelir. Seviye testinde de böyle: bir uzun metin 4 soruyla, bir kısa metin 2 soruyla gelir. Böylece okuma becerin birkaç soruyla geçiştirilmeden ölçülür.",
      "Ayrıntı, çıkarım, zamirin neyi gösterdiği, ana fikir, yazarın amacı ve “hangisi söylenemez” soruları aynı bölümdedir. outklas. sana “okuman zayıf” demek yerine, bu soru tiplerinden hangisinde puan kaybettiğini gösterir.",
    ],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}
