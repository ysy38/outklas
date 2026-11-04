export type Source = {
  id: string;
  cite: string;
  title: string;
  venue: string;
  url: string;
  /** What the source shows, in the terms this site uses it for. */
  finding: string;
};

const list: Source[] = [
  {
    id: "osym",
    cite: "ÖSYM",
    title: "YDS ve YÖKDİL başvuru kılavuzları",
    venue: "Ölçme, Seçme ve Yerleştirme Merkezi",
    url: "https://www.osym.gov.tr/",
    finding: "Sınavın soru sayısı, süresi ve puanın yalnızca doğru sayısından hesaplandığı. Yanlış cevap doğruyu götürmez.",
  },
  {
    id: "cepeda-2006",
    cite: "Cepeda, Pashler, Vul, Wixted ve Rohrer (2006)",
    title: "Distributed practice in verbal recall tasks: A review and quantitative synthesis",
    venue: "Psychological Bulletin, 132(3), 354–380",
    url: "https://doi.org/10.1037/0033-2909.132.3.354",
    finding: "300’ü aşkın deneyi birleştiren meta-analiz. Aynı içeriği araya zaman koyarak çalışmak, tek oturumda yığarak çalışmaktan daha kalıcı. Hatırlanması gereken süre uzadıkça en iyi tekrar aralığı da uzuyor.",
  },
  {
    id: "roediger-2006",
    cite: "Roediger ve Karpicke (2006)",
    title: "Test-enhanced learning: Taking memory tests improves long-term retention",
    venue: "Psychological Science, 17(3), 249–255",
    url: "https://doi.org/10.1111/j.1467-9280.2006.01693.x",
    finding: "Bir metni tekrar okumak yerine kendini sınayan öğrenciler, bir hafta sonra metni daha iyi hatırladı. Kısa vadede ise tekrar okumak daha iyi görünüyordu.",
  },
  {
    id: "karpicke-2008",
    cite: "Karpicke ve Roediger (2008)",
    title: "The critical importance of retrieval for learning",
    venue: "Science, 319(5865), 966–968",
    url: "https://doi.org/10.1126/science.1152408",
    finding: "Yabancı dilde kelime çiftleri. Öğrenildikten sonra da hatırlamaya çalışılan kelimeler bir hafta sonra yaklaşık %80 oranında hatırlandı. Yalnızca tekrar çalışılanlarda bu oran üçte bir civarında kaldı.",
  },
  {
    id: "dunlosky-2013",
    cite: "Dunlosky, Rawson, Marsh, Nathan ve Willingham (2013)",
    title: "Improving students’ learning with effective learning techniques",
    venue: "Psychological Science in the Public Interest, 14(1), 4–58",
    url: "https://doi.org/10.1177/1529100612453266",
    finding: "On çalışma tekniğini karşılaştıran derleme. Kendini sınamak ve aralıklı çalışma “yüksek fayda”, tekrar okuma ve altını çizme “düşük fayda” grubunda.",
  },
  {
    id: "bjork-2013",
    cite: "Bjork, Dunlosky ve Kornell (2013)",
    title: "Self-regulated learning: Beliefs, techniques, and illusions",
    venue: "Annual Review of Psychology, 64, 417–444",
    url: "https://doi.org/10.1146/annurev-psych-113011-143823",
    finding: "İnsanlar bir konuyu kolay ve akıcı biçimde gördüklerinde onu öğrendiklerini sanıyor. Bu his, gerçekte ne kadar öğrenildiğini çoğu zaman abartıyor.",
  },
  {
    id: "webb-2007",
    cite: "Webb (2007)",
    title: "The effects of repetition on vocabulary knowledge",
    venue: "Applied Linguistics, 28(1), 46–65",
    url: "https://doi.org/10.1093/applin/aml048",
    finding: "Bir kelimeyle bağlam içinde kaç kez karşılaşıldığı arttıkça o kelimenin bilgisi de büyüyor. On karşılaşmadan sonra bile bilgi tam değil.",
  },
  {
    id: "nation-2006",
    cite: "Nation (2006)",
    title: "How large a vocabulary is needed for reading and listening?",
    venue: "The Canadian Modern Language Review, 63(1), 59–82",
    url: "https://doi.org/10.3138/cmlr.63.1.59",
    finding: "Yazılı bir metnin kelimelerinin %98’ini tanımak için 8.000–9.000 kelime ailesi gerekiyor.",
  },
  {
    id: "coxhead-2000",
    cite: "Coxhead (2000)",
    title: "A new academic word list",
    venue: "TESOL Quarterly, 34(2), 213–238",
    url: "https://doi.org/10.2307/3587951",
    finding: "Akademik metinlerde sık geçen 570 kelime ailesi. Bu liste, akademik metinlerdeki kelimelerin yaklaşık %10’unu karşılıyor.",
  },
  {
    id: "norris-2000",
    cite: "Norris ve Ortega (2000)",
    title: "Effectiveness of L2 instruction: A research synthesis and quantitative meta-analysis",
    venue: "Language Learning, 50(3), 417–528",
    url: "https://doi.org/10.1111/0023-8333.00136",
    finding: "Yabancı dil öğretimi üzerine 49 çalışmanın meta-analizi. Kuralı açıkça gösteren öğretim, örtük öğretimden daha büyük kazanç sağlıyor.",
  },
  {
    id: "hyland-1998",
    cite: "Hyland (1998)",
    title: "Hedging in scientific research articles",
    venue: "John Benjamins, Pragmatics & Beyond New Series 54",
    url: "https://doi.org/10.1075/pbns.54",
    finding: "Bilimsel yazıda iddialar may, might, suggest, likely gibi sözcüklerle sürekli yumuşatılır. Bu, akademik İngilizcenin en belirgin özelliklerinden biri.",
  },
];

export const sources: Record<string, Source> = Object.fromEntries(list.map((source) => [source.id, source]));

export const sourceAnchor = (id: string) => `kaynak-${id}`;
