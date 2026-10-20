type FaqPlace = "home" | "score" | "prep";

type Faq = {
  question: string;
  answer: string;
  place: readonly FaqPlace[];
};

/** Visible FAQ copy. JSON-LD on each page uses the same list, so the schema matches the page. */
export const siteFaqs: readonly Faq[] = [
  {
    question: "YDS'ye nasıl çalışmalıyım?",
    answer:
      "Daha çok soru çözmek tek başına yetmez. Önce hangi bölümde puan kaybettiğini bul, her gün o açığı kapatacak tek bir işe odaklan, kaçırdığın soruları da belli aralıklarla yeniden çöz. outklas. işe 40 soruluk ücretsiz bir seviye testiyle başlar. Aynı yol e-YDS, YÖKDİL ve e-YÖKDİL için de geçerli.",
    place: ["home", "prep"],
  },
  {
    question: "YDS'de kaç soru var?",
    answer:
      "80 soru var ve süre 180 dakika. e-YDS, YÖKDİL ve e-YÖKDİL’de de aynı. Her doğru 1,25 puan getirir; yanlışlar doğruları götürmez.",
    place: ["home", "score"],
  },
  {
    question: "YDS denemesi çözebilir miyim?",
    answer:
      "Evet. Deneme, gerçek sınav gibi 80 soru ve 180 dakikadır; sorular kitapçıktaki sırayla gelir. Süre geri sayar; istediğin soruyu işaretleyebilir, emin olmadığın şıkları eleyebilirsin. Bitince puanını ve en çok puan kaybettiğin bölümü görürsün. Ekran ÖSYM’nin birebir kopyası değildir.",
    place: ["home"],
  },
  {
    question: "e-YDS simülasyonu var mı?",
    answer:
      "Var. Deneme, e-YDS’deki gibi bilgisayarda çözülür; böylece sınav günü ekrana alışmış olursun. e-YÖKDİL için de aynısı geçerli, yalnızca soru dağılımı YÖKDİL’e göre değişir. Ekran ÖSYM arayüzünün birebir kopyası değildir.",
    place: ["home"],
  },
  {
    question: "YDS kelime nasıl çalışılır?",
    answer:
      "Uzun ezber listeleri yerine her gün 10 kelimeyle çalış. Kelimeyi tek başına değil, bir cümlenin içinde gör ve anlamını şıklar arasından seç. Yanlış yaptığın kelime birkaç gün sonra tekrar gelir, bildiğin kelime giderek seyrekleşir. outklas’ta bu günlük 10 kelime ücretsizdir.",
    place: ["home"],
  },
  {
    question: "YDS'de hangi soru tipleri var?",
    answer:
      "On bölüm var: kelime bilgisi (6 soru), dil bilgisi ve yapı (10), paragrafta boşluk doldurma (10), cümle tamamlama (10), çeviri (6), okuduğunu anlama (20), diyalog tamamlama (5), anlamca yakın cümle (4), paragraf tamamlama (4) ve anlam bütünlüğünü bozan cümle (5). YÖKDİL’de diyalog ve anlamca yakın cümle yoktur; çeviri 12, okuma 15 sorudur.",
    place: ["home", "score"],
  },
  {
    question: "YDS çalışma programı nasıl oluşturulur?",
    answer:
      "Programını hedef puanın, sınav tarihin ve günde ayırabildiğin süre belirler. Her gün zayıf olduğun bölümden sorular, önceki yanlışların ve birkaç yeni soru çözersin. Zaten iyi olduğun bölüme o gün vakit harcamazsın.",
    place: ["home", "prep"],
  },
  {
    question: "outklas. ücretsiz mi?",
    answer:
      "Başlamak ücretsiz: Cümle Röntgeni deneyimi, seviye testinin ilk bulguları, her gün 10 kelime ve 10 bağlaç sorusu ve 1 tam deneme için ödeme yapmazsın. Sınavına 45 gün ya da daha az varsa Sprint: 45 gün, 3.450 TL; günlük plan ve 4 tam deneme. Daha fazla varsa Kamp: 180 gün, 5.950 TL; sınırsız deneme. Sprint’ten Kamp’a geçersen ödediğin 3.450 TL düşülür. Abonelik yoktur, bir kez ödersin; fiyatlar KDV dahil.",
    place: ["home"],
  },
  {
    question: "YDS'de yanlış doğruyu götürür mü?",
    answer:
      "Götürmez. Puanın, doğru sayının 1,25 katıdır. 56 doğrun varsa, 4 yanlışın da olsa 20 yanlışın da olsa puanın 70’tir. Boş bırakmak da yanlış yapmak da puanını düşürmez. YÖKDİL ve e-YÖKDİL’de de kural aynı.",
    place: ["score", "prep"],
  },
  {
    question: "70 puan için kaç doğru gerekir?",
    answer:
      "56 doğru gerekir. 65 puan için 52, 80 puan için 64, 90 puan için 72 doğru yapman lazım. YÖKDİL’de de hesap aynı. Başvuracağın kurumun istediği puanı ayrıca kontrol etmeyi unutma.",
    place: ["score"],
  },
  {
    question: "e-YDS ile YDS puanı aynı mıdır?",
    answer:
      "Evet, aynıdır. İkisinde de 80 soru, 180 dakika ve doğru başına 1,25 puan vardır. Tek fark, e-YDS’nin bilgisayarda, YDS’nin kâğıt üzerinde yapılmasıdır.",
    place: ["score"],
  },
  {
    question: "YÖKDİL puanı nasıl hesaplanır?",
    answer:
      "YDS’yle aynı şekilde: doğru sayısı × 1,25. Yanlışlar doğruları götürmez; e-YÖKDİL’de de kural aynı. Sağlık, fen ve sosyal alanlarında puanlama değişmez, yalnızca metinlerin konusu değişir. Soru dağılımı ise farklı: YÖKDİL’de çeviri 12, dil bilgisi 14, okuma 15 sorudur; diyalog ve anlamca yakın cümle sorusu çıkmaz.",
    place: ["home", "score"],
  },
  {
    question: "Seviye testinin sonucu resmi puan mı?",
    answer:
      "Hayır. 40 soruluk seviye testi, 80 soruluk sınavda alabileceğin puanı tahmin eder; ÖSYM sonucunun yerini tutmaz. Sorular gerçek sınavdaki bölüm ağırlıklarına göre seçildiği için okuma sorusu burada da çoktur.",
    place: ["home", "score", "prep"],
  },
  {
    question: "Soruları yapay zekâ mı seçiyor?",
    answer:
      "Hayır. Sıradaki soru belli kurallarla seçilir: o bölümdeki doğru oranın, daha önce görmediğin sorular ve bölümün sınavdaki ağırlığı. Çözüm açıklamalarını editörlerimiz yazar.",
    place: ["home"],
  },
];

export function faqsFor(place: FaqPlace) {
  return siteFaqs.filter((item) => item.place.includes(place));
}

export const scoreMarks = [
  { correct: 40, score: 50, note: "E düzeyi eşiği" },
  { correct: 48, score: 60, note: "D" },
  { correct: 52, score: 65, note: "Birçok lisansüstü programın barajı" },
  { correct: 56, score: 70, note: "En sık hedeflenen puan" },
  { correct: 60, score: 75, note: "C" },
  { correct: 64, score: 80, note: "B" },
  { correct: 72, score: 90, note: "A eşiği" },
] as const;
