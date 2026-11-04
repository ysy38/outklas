export type TopicLink = { href: string; label: string; note: string };

/** Hub links shown on rehber, guide, method and exam pages. */
export const topicLinks: TopicLink[] = [
  { href: "/yds-hazirlik", label: "YDS ve YÖKDİL hazırlık", note: "Nereden başlanır, 5 adımlık çalışma döngüsü" },
  { href: "/yds-taktikleri", label: "YDS ve YÖKDİL taktikleri", note: "Üç kontrol, yaygın taktiklerin sınırı, 180 dakika planı" },
  { href: "/yds-sifirdan-hazirlik", label: "YDS’ye sıfırdan hazırlık", note: "Çalışma sırası, kaba süreler, ilk 4 hafta" },
  { href: "/yds-70-80-90-nasil-alinir", label: "YDS’den 70, 80, 90", note: "Hedefe göre doğru sayısı ve hata hakkı" },
  { href: "/yds-puan-hesaplama", label: "YDS puan hesaplama", note: "Doğru sayısından puan ve düzey" },
];
