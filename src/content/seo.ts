export const siteFaqs = [
  {
    question: "YDS'de yanlış doğruyu götürür mü?",
    answer:
      "Götürmez. Puan, doğru sayının 1,25 ile çarpımıdır. 56 doğru da 70 eder, yanında 20 yanlış olsa da 4 yanlış olsa da. Boş ile yanlışın puana etkisi yoktur.",
  },
  {
    question: "70 puan için kaç doğru gerekir?",
    answer: "56 doğru. 80 puan 64 doğru, 65 puan 52 doğru, 90 puan 72 doğrudur. Hedef kurumun barajı ayrıca kontrol edilir.",
  },
  {
    question: "e-YDS ile YDS puanı aynı mıdır?",
    answer:
      "Evet, ikisi de 80 soru ve 180 dakikadır; puan aynı cetvelden gelir. Fark ekran, takvim ve sınavın yapıldığı yerdir. YDS Lab denemesi bu ekranı andırır, ÖSYM arayüzünün kopyası değildir.",
  },
  {
    question: "Teşhis sonucu resmi puan mıdır?",
    answer:
      "Hayır. 24 soruluk bir tahmindir ve aralık olarak verilir. Okuma, puanın çeyreği olduğu için teşhiste de payını alır. ÖSYM sonucu yerine geçmez.",
  },
  {
    question: "Soru seçimini bir model mi yapıyor?",
    answer:
      "Hayır. Sırayı bir model kurmaz. Yayımlanmış sorular, daha önce görmediklerin, zorluk ve bölüm kotası belirler. Açıklama sorunun içinde, yazarın elinden durur.",
  },
] as const;

export const scoreMarks = [
  { correct: 40, score: 50, note: "E düzeyi eşiği" },
  { correct: 48, score: 60, note: "D" },
  { correct: 52, score: 65, note: "Birçok lisansüstü barajı" },
  { correct: 56, score: 70, note: "Sık görülen hedef" },
  { correct: 60, score: 75, note: "C" },
  { correct: 64, score: 80, note: "B" },
  { correct: 72, score: 90, note: "A eşiği" },
] as const;
