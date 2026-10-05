type FaqPlace = "home" | "score";

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
      "Soru sayısını şişirmek yetmez. Hangi bölümde puan bıraktığını gör, ertesi güne tek bir iş bırak, kaçırdığın soruyu sonra geri getir. YDS Lab buna 24 soruluk ölçümle başlar. Aynı usul e-YDS, YÖKDİL ve e-YÖKDİL için de geçerlidir.",
    place: ["home"],
  },
  {
    question: "YDS'de kaç soru var?",
    answer:
      "80 soru, 180 dakika. e-YDS, YÖKDİL ve e-YÖKDİL de böyledir. Puan, doğru sayısının 1,25 katıdır. Yanlış doğruyu götürmez.",
    place: ["home", "score"],
  },
  {
    question: "YDS denemesi çözebilir miyim?",
    answer:
      "Evet. Deneme 80 soru ve 180 dakikadır, sıra YDS kitapçığındaki on bölümdedir. Süre işler, şıkkı elersin. Bitince puan, doğru sayısının 1,25 katıdır. Bu ekran ÖSYM’nin kopyası değildir. YÖKDİL’de puan aynıdır, bölüm sayıları aynı değildir.",
    place: ["home"],
  },
  {
    question: "e-YDS simülasyonu var mı?",
    answer:
      "Deneme ekranda girilir, e-YDS’nin oturduğu yere benzer. Soru sırası YDS kitapçığıdır. ÖSYM arayüzünün kopyası değildir. e-YÖKDİL de ekranda girilir; puan kuralı aynı, kitapçık YÖKDİL’indir.",
    place: ["home"],
  },
  {
    question: "YDS kelime nasıl çalışılır?",
    answer:
      "Kart, kaçırdığın sorunun kelimesinden gelir. Bildiğini ertelersin, kaçanı erken görürsün. Ezber listesi değildir.",
    place: ["home"],
  },
  {
    question: "YDS'de hangi soru tipleri var?",
    answer:
      "Kelime bilgisi 1–6, dil bilgisi ve yapı 7–16, paragrafta boşluk 17–26, cümle tamamlama 27–36, çeviri 37–42, okuduğunu anlama 43–62, diyalog 63–67, anlamca yakın cümle 68–71, paragraf tamamlama 72–75, anlam bütünlüğünü bozan cümle 76–80. YÖKDİL’de diyalog ve anlamca yakın cümle yoktur; çeviri 12, okuma 15 sorudur.",
    place: ["home", "score"],
  },
  {
    question: "YDS çalışma programı nasıl oluşturulur?",
    answer:
      "Hedefin, sınav günün, ayırdığın süre ve çözdüğün sorular ertesi günün listesini kurar. Zayıf bölüm, dünün yanlışı ve bir parça yeni soru aynı listede durur. Güçlü bölüm o gün dışarıda kalır.",
    place: ["home"],
  },
  {
    question: "YDS Lab ücretsiz mi?",
    answer:
      "24 soruluk ölçüm ücretsiz. Günde 10 soru ve 1 deneme de ücretsiz. Sınır kalksın dersen 90 gün 1.490 TL, 180 gün 2.490 TL. Sınava az kaldıysa 60 gün 1.990 TL. Aylık abonelik yok.",
    place: ["home"],
  },
  {
    question: "YDS'de yanlış doğruyu götürür mü?",
    answer:
      "Götürmez. Puan, doğru sayının 1,25 ile çarpımıdır. 56 doğru da 70 eder, yanında 20 yanlış olsa da 4 yanlış olsa da. Boş ile yanlışın puana etkisi yoktur. YÖKDİL ve e-YÖKDİL de böyledir.",
    place: ["score"],
  },
  {
    question: "70 puan için kaç doğru gerekir?",
    answer:
      "56 doğru. 80 puan 64 doğru, 65 puan 52 doğru, 90 puan 72 doğrudur. YÖKDİL’de de aynı cetvel geçerlidir. Hedef kurumun barajı ayrıca kontrol edilir.",
    place: ["score"],
  },
  {
    question: "e-YDS ile YDS puanı aynı mıdır?",
    answer:
      "Evet. İkisi de 80 soru ve 180 dakikadır. Puan, doğru sayısının 1,25 katıdır. e-YDS ekranda girilir, YDS kâğıtta. YDS Lab denemesi bu ekranı andırır, ÖSYM arayüzünün kopyası değildir.",
    place: ["score"],
  },
  {
    question: "YÖKDİL puanı nasıl hesaplanır?",
    answer:
      "YDS ile aynı formül: doğru sayısı × 1,25. Yanlış doğruyu götürmez. e-YÖKDİL de böyledir; fark sınavın ekranda olmasıdır. Sağlık, fen ve sosyal ayrı puan cetveli değildir. O alanda yazılmış metin gelir. Bölüm sayıları YDS ile birebir aynı değildir: YÖKDİL’de çeviri 12, dil bilgisi 14, okuma 15 sorudur. Diyalog ve anlamca yakın cümle yoktur.",
    place: ["home", "score"],
  },
  {
    question: "24 soruluk ölçüm resmi puan mıdır?",
    answer:
      "Hayır. 24 soru, 80 soruluk sınavın kısasıdır. Çıkan sayı tahmini bir puandır. ÖSYM sonucu yerine geçmez. Okuma, puanın büyük parçası olduğu için bu ölçümde de payını alır.",
    place: ["home", "score"],
  },
  {
    question: "Soru seçimini bir model mi yapıyor?",
    answer:
      "Hayır. Hangi sorunun geleceğini bir model seçmez. Yayımlanmış sorular, daha önce görmediklerin ve bölümün payı belirler. Açıklama sorunun içinde, yazarın elinden durur.",
    place: ["home"],
  },
];

export function faqsFor(place: FaqPlace) {
  return siteFaqs.filter((item) => item.place.includes(place));
}

export const scoreMarks = [
  { correct: 40, score: 50, note: "E düzeyi eşiği" },
  { correct: 48, score: 60, note: "D" },
  { correct: 52, score: 65, note: "Birçok lisansüstü barajı" },
  { correct: 56, score: 70, note: "Sık görülen hedef" },
  { correct: 60, score: 75, note: "C" },
  { correct: 64, score: 80, note: "B" },
  { correct: 72, score: 90, note: "A eşiği" },
] as const;
