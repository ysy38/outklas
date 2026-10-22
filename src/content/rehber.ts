import type { SectionId } from "@/modules/exam/blueprint";

export type Rehber = {
  section: SectionId;
  measures: string;
  steps: string[];
  misses: string[];
  tip: string;
};

export const rehber: Rehber[] = [
  {
    section: "vocabulary",
    measures:
      "6 soru. Akademik kelime, bağlam ve collocation. Sözlük anlamı yetmez; cümleye oturan birlikteliği ve çeldiricinin neden cazip geldiğini de görmelisin.",
    steps: [
      "Şıklara bakmadan cümleyi oku ve boşluğa ne gelmesi gerektiğini kendi sözlerinle söyle.",
      "Her şıkkı tek tek boşluğa koyup cümleyi baştan oku.",
      "İki şık birbirine yakınsa, cümlenin olumlu mu olumsuz mu bir anlam istediğine bak.",
    ],
    misses: [
      "Sözlük anlamı uyuyor diye hemen işaretlemek.",
      "Kalıbı tek kelime sanmak. Örneğin “contingent on” birlikte kullanılır; “contingent” tek başına aynı anlamı vermez.",
    ],
    tip: "Anlam, bağlam, birliktelik: üç kontrol. Anlamı yakın olan şık her zaman doğru şık değildir.",
  },
  {
    section: "grammar",
    measures:
      "10 soru. Zamanlar, bağlaçlar, ilgi cümleleri, edilgen yapı ve edatlar. Kuralı hatırlamak yetmez; yapısal kanıtı bul, anlamı doğrula, çeldiriciyi gerekçesiyle ele.",
    steps: [
      "Önce fiilin zamanına ve öznenin tekil mi çoğul mu olduğuna bak.",
      "Bağlaç soruluyorsa, iki cümlenin birbirini destekleyip desteklemediğini ya da zıt mı olduğunu belirle.",
      "Edatı fiille birlikte düşün: “into” bir yere girişi, “on” bir şeyin üstünü anlatır.",
    ],
    misses: [
      "Kuralı hatırlayıp cümlenin kalanını okumadan işaretlemek.",
      "Bağlaçların anlamını karıştırmak: “however” zıtlık bildirir, “so” sonuç bildirir.",
    ],
    tip: "Önce yapısal kanıt, sonra anlam, en son şıklar. Despite + -ing ile although + çekimli fiili karıştırma.",
  },
  {
    section: "cloze",
    measures:
      "2 paragraf, 10 boşluk. Tek cümle değil; paragrafın anlam akışı, birliktelikler ve cümleler arası ilişkiler birlikte izlenir.",
    steps: [
      "Boşluklara takılmadan paragrafı baştan sona bir kez oku.",
      "Boşluktan önceki ve sonraki cümle aynı yönde mi ilerliyor, yoksa zıt mı, buna bak.",
      "Zamir varsa, neyi ya da kimi gösterdiğini bir önceki cümlede bul.",
    ],
    misses: [
      "Tanıdık kelimeyi görünce hemen işaretlemek.",
      "Yalnızca boşluğun hemen önündeki birkaç kelimeye bakmak.",
      "Bağlacın iki cümle arasında kurduğu ilişkiyi gözden kaçırmak.",
    ],
    tip: "Her boşluğu hem kendi cümlesi içinde hem paragrafın bütününde değerlendir. İlişkiyi tanı, sonra şıkları ele.",
  },
  {
    section: "sentence",
    measures:
      "10 soru. Verilen bölümle tamamlayıcı arasındaki dilbilgisel ve anlamsal ilişkiyi kurarsın; konu ortaklığı yetmez.",
    steps: [
      "Verilen parçadaki bağlaca bak: because, but, so that, whereas gibi.",
      "Şıklara geçmeden boşluğa ne gelmesi gerektiğini kendi sözlerinle söyle.",
      "Dil bilgisi olarak doğru olsa da konuyu değiştiren şıkkı ele.",
    ],
    misses: [
      "Şık düzgün bir İngilizce cümle diye seçmek.",
      "Zıtlık gereken yerde sebep bildiren şıkkı seçmek.",
      "Cümlenin başındaki fikri unutup yalnızca sonuna odaklanmak.",
    ],
    tip: "Önce anlam beklentisini kur: sebep mi, zıtlık mı, sonuç mu, koşul mu? Kapsamı şişiren şıkları ele.",
  },
  {
    section: "translation",
    measures:
      "6 soru: İngilizceden Türkçeye ve Türkçeden İngilizceye. Kelimeleri değil; sözdizimi, bağlaç, kiplik ve kapsam ilişkilerini koruyan seçeneği bulursun.",
    steps: [
      "Kaynak cümlede zamanı, özneyi ve “-meli, -ebilir” gibi kipleri işaretle.",
      "Bunlardan biri şıkta değişmişse, gerisi ne kadar düzgün olursa olsun o şıkkı ele.",
      "Türkçedeki “-madan, -dığı için, diye” gibi ekleri İngilizce şıkta tek tek ara.",
    ],
    misses: [
      "Kulağa en güzel gelen cümleyi seçmek.",
      "Olumsuz bir cümleyi olumlu çeviren şıkkı fark etmemek.",
      "Amaç bildiren yapıyı yasak bildiren yapıyla karıştırmak.",
    ],
    tip: "Akıcı Türkçe yetmez. Although’u because’a çeviren veya may’i kesinliğe yükselten şıkkı ele.",
  },
  {
    section: "reading",
    measures:
      "5 metin, 20 soru. Puanın dörtte biri buradan gelir. Amaç seçeneği değil, metinsel kanıtı bulmak: açık bilgi, çıkarım ve iddia kapsamı.",
    steps: [
      "Soruları okumadan önce metni bir kez oku ve ana fikri tek cümleyle aklında tut.",
      "Ayrıntı sorusunun cevabı metinde açıkça yazar. Çıkarım sorusunun cevabı yazmaz; metinden çıkarman gerekir.",
      "“Hangisi söylenemez” tipi sorularda dört şık metinde geçer. Metinde olmayanı ara.",
    ],
    misses: [
      "Metinde geçen bir kelimeyi şıkta görünce o şıkkı seçmek.",
      "Çıkarım sorusunu ayrıntı sorusu gibi çözmeye çalışmak.",
      "Bir metnin cevabını başka bir metnin sorusuna taşımak.",
    ],
    tip: "Konuya uygun olmak, metin tarafından desteklenmek değildir. all / every / eliminate gibi kapsam şişiricilerine bak.",
  },
  {
    section: "dialogue",
    measures:
      "5 kısa konuşma. Konuyu değil; konuşmacının amacını, söylem işlevini ve bağlama uygun tepkiyi ölçer. Konuya uygun ama işlevsiz şık tuzaktır.",
    steps: [
      "Konuşanların kim olduğuna ve ne istediklerine bak.",
      "Önceki cümle bir soruysa, seçtiğin şık o soruyu cevaplamalı.",
      "Şık kibar diye seçme; konuşmanın akışına uymuyorsa ele.",
    ],
    misses: ["Konuyu sürdüren ama konuşanın niyetini kaçıran şıkkı seçmek.", "Soruyu cevaplamayıp yeni bir konu açan şıkkı seçmek."],
    tip: "En iyi seçenek aynı konudan söz eden değil, konuşmanın gerektirdiği iletişimsel işi yapan seçenektir.",
  },
  {
    section: "restatement",
    measures:
      "4 soru. Verilen cümleye anlamca en yakın cümle istenir. Kelime benzerliği yetmez; önerme, bağlaç ilişkisi, kiplik ve kapsam korunmalıdır.",
    steps: [
      "Cümlenin anlamını kendi sözlerinle özetle: kim, neyi, hangi koşulda yapıyor?",
      "Şıkta özne, zaman ya da olumsuzluk değişmişse o şıkkı ele.",
      "Eş anlamlı kelime kullanılmış olması yetmez; cümlenin anlamı da aynı kalmalı.",
    ],
    misses: [
      "Aynı kelimeleri görünce o şıkka güvenmek.",
      "“Az” ile “çok”u, “zorunlu” ile “mümkün”ü karıştırmak.",
    ],
    tip: "Although ≈ despite gibi dönüşümler geçerli olabilir; may’i will’e, some’ı all’a çeviren şıkkı ele.",
  },
  {
    section: "paragraph",
    measures:
      "4 soru. Eksik cümle konu benzerliğiyle değil; söylem işlevi ve önceki/sonraki cümlelerle kurduğu mantıksal geçişle seçilir.",
    steps: [
      "Boşluğun önündeki ve arkasındaki cümleleri art arda oku.",
      "Aralarında nasıl bir ilişki var, belirle: sebep mi, örnek mi, zıtlık mı?",
      "Yeni bir konu açan ya da paragrafı bitiren cümle ortaya gelmez.",
    ],
    misses: ["Tek başına doğru olan bir cümleyi seçmek.", "Paragrafın sonuç cümlesini ortaya yerleştirmek."],
    tip: "Sonraki cümleyi atlama. Doğru seçenek hem öncekine bağlanır hem sonrakine zemin hazırlar.",
  },
  {
    section: "irrelevant",
    measures:
      "5 soru. Beş cümleden biri aynı genel konudan söz etse bile paragrafın odağına ve anlam bütünlüğüne katkı sağlamaz.",
    steps: [
      "Beş cümleyi tek bir paragraf gibi oku.",
      "Hangi cümleyi çıkarınca akışın bozulmadığını bul.",
      "Zamir ve bağlaçların hangi cümleye bağlandığını kontrol et.",
    ],
    misses: [
      "En alakasız kelimeyi içeren cümleyi seçmek.",
      "Konuyla ilgili ama sırayı bozan cümleyi gözden kaçırmak.",
    ],
    tip: "Konu benzerliği yetmez. Odağa katkı sunmayan ama “doğru bilgi” içeren cümleyi ayır.",
  },
];

export function rehberBySection(section: string): Rehber | undefined {
  return rehber.find((item) => item.section === section);
}

export type RehberNeighbor = { section: SectionId; title: string };

/** Previous / next rehber section in exam order for in-guide navigation. */
export function rehberNeighbors(section: string): { prev?: RehberNeighbor; next?: RehberNeighbor } {
  const order = rehber.map((item) => item.section);
  const index = order.indexOf(section as SectionId);
  if (index < 0) return {};
  const titleFor = (id: SectionId) => {
    const note = rehberBySection(id);
    const labels: Partial<Record<SectionId, string>> = {
      vocabulary: "Kelime bilgisi",
      grammar: "Dil bilgisi ve yapı",
      cloze: "Paragrafta boşluk doldurma",
      sentence: "Cümle tamamlama",
      translation: "Çeviri",
      reading: "Okuduğunu anlama",
      dialogue: "Diyalog tamamlama",
      restatement: "Anlamca yakın cümle",
      paragraph: "Paragraf tamamlama",
      irrelevant: "Anlam bütünlüğünü bozan cümle",
    };
    return labels[id] ?? note?.section ?? id;
  };
  return {
    prev: index > 0 ? { section: order[index - 1]!, title: titleFor(order[index - 1]!) } : undefined,
    next: index < order.length - 1 ? { section: order[index + 1]!, title: titleFor(order[index + 1]!) } : undefined,
  };
}
