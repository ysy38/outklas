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
      "6 soru: İngilizceden Türkçeye ve Türkçeden İngilizceye. Kelimesi kelimesine değil, anlamı eksiksiz aktaran şıkkı bulman gerekir.",
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
    tip: "Bir şıkta fazladan ya da eksik bir kelime varsa dikkat et; çoğu zaman cümlenin anlamını değiştiren o kelimedir.",
  },
  {
    section: "reading",
    measures:
      "5 metin, 20 soru. Puanın dörtte biri buradan gelir. Ayrıntı, çıkarım ve ana fikir soruları aynı metinden gelse de farklı beceriler ister.",
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
    tip: "“Okumam kötü” deme. Belki ayrıntı sorularını yapıyor ama çıkarım sorularında puan kaybediyorsundur. Hangisi olduğunu bilmek, neye çalışacağını gösterir.",
  },
  {
    section: "dialogue",
    measures:
      "5 kısa konuşma. Boşluğa gelecek söz, konuşan kişinin niyetine uymalıdır. Rica etmek, reddetmek ve düzeltmek farklı şeylerdir.",
    steps: [
      "Konuşanların kim olduğuna ve ne istediklerine bak.",
      "Önceki cümle bir soruysa, seçtiğin şık o soruyu cevaplamalı.",
      "Şık kibar diye seçme; konuşmanın akışına uymuyorsa ele.",
    ],
    misses: ["Konuyu sürdüren ama konuşanın niyetini kaçıran şıkkı seçmek.", "Soruyu cevaplamayıp yeni bir konu açan şıkkı seçmek."],
    tip: "Boşluktan sonraki cümle en büyük ipucudur. Karşıdaki kişi teşekkür ediyorsa, önceki söz bir kabuldür, ret değil.",
  },
  {
    section: "restatement",
    measures:
      "4 soru. Verilen cümleye anlamca en yakın cümle istenir. Aynı kelimelerle kurulmuş şıklar çoğu zaman tuzaktır.",
    steps: [
      "Cümlenin anlamını kendi sözlerinle özetle: kim, neyi, hangi koşulda yapıyor?",
      "Şıkta özne, zaman ya da olumsuzluk değişmişse o şıkkı ele.",
      "Eş anlamlı kelime kullanılmış olması yetmez; cümlenin anlamı da aynı kalmalı.",
    ],
    misses: [
      "Aynı kelimeleri görünce o şıkka güvenmek.",
      "“Az” ile “çok”u, “zorunlu” ile “mümkün”ü karıştırmak.",
    ],
    tip: "Anlamca yakın cümle, aynı kelimelerin farklı sırayla dizilmesi değildir. Kelimeler değişebilir ama anlam aynı kalmalı.",
  },
  {
    section: "paragraph",
    measures:
      "4 soru. Paragraftan bir cümle çıkarılmıştır. Boşluğa gelen cümle, önceki ve sonraki cümleyi birbirine bağlamalıdır.",
    steps: [
      "Boşluğun önündeki ve arkasındaki cümleleri art arda oku.",
      "Aralarında nasıl bir ilişki var, belirle: sebep mi, örnek mi, zıtlık mı?",
      "Yeni bir konu açan ya da paragrafı bitiren cümle ortaya gelmez.",
    ],
    misses: ["Tek başına doğru olan bir cümleyi seçmek.", "Paragrafın sonuç cümlesini ortaya yerleştirmek."],
    tip: "Şıkkı yerine koyduktan sonra paragrafı baştan oku. Akış kopuyorsa o şık yanlıştır.",
  },
  {
    section: "irrelevant",
    measures:
      "5 soru. Beş cümleden biri paragrafın konusuna uymaz. Bu cümle kendi içinde yanlış değildir; sadece o paragrafa ait değildir.",
    steps: [
      "Beş cümleyi tek bir paragraf gibi oku.",
      "Hangi cümleyi çıkarınca akışın bozulmadığını bul.",
      "Zamir ve bağlaçların hangi cümleye bağlandığını kontrol et.",
    ],
    misses: [
      "En alakasız kelimeyi içeren cümleyi seçmek.",
      "Konuyla ilgili ama sırayı bozan cümleyi gözden kaçırmak.",
    ],
    tip: "Akışı bozan cümle genellikle doğru bir bilgi içerir. Sorun bilginin kendisinde değil, orada durmasındadır.",
  },
];

export function rehberBySection(section: string): Rehber | undefined {
  return rehber.find((item) => item.section === section);
}
