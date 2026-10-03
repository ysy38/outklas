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
    measures: "Altı soru. Çoğu akademik kelime ve eşdizim. Kelimeyi tanımak yetmez; cümlenin istediği işi görmesi gerekir.",
    steps: [
      "Boşluğu kapatıp cümleyi bir kez oku. Ne istendiğini kendi cümlenle söyle.",
      "Şıkları tek tek anlam diye değil, cümlenin içine koyarak dene.",
      "İki şık yakınsa, biri işi büyütür biri küçültür. Cümlenin yönü hangisini istiyor, ona bak.",
    ],
    misses: ["Sözlük anlamı tutunca hemen işaretlemek.", "Eşdizimi tek kelime sanmak. contingent on bir kalıptır, contingent tek başına değil."],
    tip: "Yakın anlamlı şık, doğru şık değildir. Cümle hangisinin işini istiyorsa o kalır.",
  },
  {
    section: "grammar",
    measures: "On soru, yapı. Zaman, bağlaç, ilgi cümlesi, edilgen, edat. Kuralı ezberlemek yetmez; cümle hangi işi istiyor, onu görmek gerekir.",
    steps: [
      "Fiilin zamanına ve öznenin tekil mi çoğul mu olduğuna bak.",
      "Bağlaç varsa, iki yan birbirini sürdürüyor mu, tersine mi çeviriyor, ayır.",
      "Edatı fiille birlikte oku. into hareket ister, on yer ister.",
    ],
    misses: ["Kuralı hatırlayıp cümlenin geri kalanını okumamak.", "Bağlacı kelime sanmak. however yönü çevirir, so sonuç bağlar."],
    tip: "Şıkkı yerine koyduktan sonra cümleyi sesli okur gibi geç. Takılıyorsa yapı tutmamıştır.",
  },
  {
    section: "cloze",
    measures: "İki paragraf, on boşluk. Boşluk tek başına çözülmez. Paragrafın nereye gittiğini görmeden şık seçilmez.",
    steps: [
      "Paragrafı boşluklara takılmadan bir kez oku.",
      "Boşluğun öncesi ile sonrası aynı yönde mi, ters mi, ona bak.",
      "Zamir varsa, kimi gösterdiğini bir önceki cümlede bul.",
    ],
    misses: ["Kelimeyi tanıyınca işaretlemek.", "Yalnız boşluğun solundaki üç kelimeye bakmak.", "Bağlacın iki cümle arasındaki işini atlamak."],
    tip: "Boşluğu doldurmadan önce paragrafın derdini bir cümleyle söyle. Şık o cümleye hizmet etmiyorsa elenir.",
  },
  {
    section: "sentence",
    measures: "On soru. Cümlenin sonu ya da ortası boştur. Eksik parça, cümlenin kurduğu ilişkiyi sürdürmelidir.",
    steps: [
      "Verilen parçadaki bağa bak: çünkü, ama, öyle ki, oysa.",
      "Şıklara geçmeden, boşluğa kendi sözlerinle ne geleceğini söyle.",
      "Doğru gibi duran şık yeni bir konu açıyorsa elenir.",
    ],
    misses: ["Şık düzgün İngilizce diye seçmek.", "Karşıtlık varken sebep yazmak.", "Cümlenin başındaki iddiayı unutup sona bakmak."],
    tip: "Önce ilişkiyi adlandır: sebep, karşıtlık, sonuç, koşul. Şık o adı taşımıyorsa bakma.",
  },
  {
    section: "translation",
    measures: "Altı soru, iki yön. İngilizceden Türkçeye ve Türkçeden İngilizceye. Kelimesi kelimesine değil, cümlenin yükünü taşımak gerekir.",
    steps: [
      "Kaynak cümlede zorunluluk, zaman ve özneyi işaretle.",
      "Şıkta bunlardan biri kaymışsa, gerisi düzgün olsa da elenir.",
      "Türkçe cümlede -meli, -madan, diye gibi ince işleri İngilizcede ayrı ara.",
    ],
    misses: ["Güzel duran cümleyi seçmek.", "Olumsuzu olumluya çevirmek.", "Amaç ile yasağı karıştırmak."],
    tip: "Çeviri şıkkında bir kelime fazla ya da eksikse, o kelime genellikle cümlenin yönünü değiştirmiştir.",
  },
  {
    section: "reading",
    measures: "Beş metin, yirmi soru. Puanın çeyreği buradadır. Metin okunmadan soru çözülmez. Ayrıntı, çıkarım ve ana fikir aynı metnin içinde ayrı işlerdir.",
    steps: [
      "Soruyu okumadan metni bir kez geç. Kim ne yapmış, bir cümleyle tut.",
      "Ayrıntı sorusu satırda yazar. Çıkarım sorusu yazmaz; metnin bıraktığı boşluktadır.",
      "Except ve not sorusunda dört şık metindedir. Metinde olmayanı ara.",
    ],
    misses: ["Metinde geçen kelimeyi görünce şıkkı seçmek.", "Çıkarımı ayrıntı sanmak.", "Bir metindeki cevabı öteki metne taşımak."],
    tip: "Okuma kötü deme. Ayrıntıyı tutup çıkarımı kaçırıyor olabilirsin. İkisi aynı puanı yer, aynı iş değildir.",
  },
  {
    section: "dialogue",
    measures: "Beş kısa konuşma. Eksik söz, konuşanın niyetine uymalıdır. Nezaket, ret, rica ve düzeltme birbirine benzemez.",
    steps: [
      "Konuşanların kim olduğuna ve ne istediğine bak.",
      "Bir önceki cümle soruysa, cevap o soruya değsin.",
      "Şık kibar duruyor diye seçme. Konuşma onu istemiyorsa elenir.",
    ],
    misses: ["Konuyu sürdüren ama niyeti kaçıran şık.", "Soruya cevap vermeyip yeni bir laf açmak."],
    tip: "Boşluktan sonraki cümle ipucudur. Adam teşekkür ediyorsa, önceki söz kabuldür, ret değil.",
  },
  {
    section: "restatement",
    measures: "Dört soru. Verilen cümleye en yakın anlam aranır. Aynı kelimelerle kurulmuş şık genellikle tuzaktır.",
    steps: [
      "Cümlenin yükünü bir kez kendi sözünle yaz: kim, neyi, hangi şartla.",
      "Şıkta özne, zaman ya da olumsuz kaymışsa elenir.",
      "Eş anlamlı kelime, cümlenin işi değiştiyse işe yaramaz.",
    ],
    misses: ["Aynı kelimeyi görünce güvenmek.", "Az ile çoğu, zorunluluk ile ihtimali karıştırmak."],
    tip: "Yakın cümle, aynı kelimelerin dizilişi değildir. İş aynı kalsın, söz değişsin.",
  },
  {
    section: "paragraph",
    measures: "Dört soru. Paragrafta bir cümle yoktur. Gelen cümle, öncekiyle sonrakini birbirine bağlamalıdır.",
    steps: [
      "Boşluğun iki yanındaki cümleleri art arda oku.",
      "Arada sebep mi var, örnek mi, karşıtlık mı, onu söyle.",
      "Yeni bir konu açan ya da paragrafı bitiren şık, ortaya gelmez.",
    ],
    misses: ["Tek başına doğru bir cümleyi seçmek.", "Paragrafın son cümlesini ortaya koymak."],
    tip: "Şıkkı yerine koyunca iki yanındaki cümle hâlâ konuşuyor mu, ona bak. Konuşmuyorsa şık yabancı.",
  },
  {
    section: "irrelevant",
    measures: "Beş soru. Beş cümleden biri paragrafın derdine uymaz. O cümle tek başına yanlış olmak zorunda değildir; yeri yoktur.",
    steps: [
      "Beş cümleyi bir paragraf gibi oku.",
      "Hangi cümle çıkarılınca akış bozulmadan sürüyor, onu bul.",
      "Zamir ve bağlaç, çıkan cümleye mi yoksa kalanlara mı bakıyor, kontrol et.",
    ],
    misses: ["En ilgisiz kelimeyi taşıyan cümleyi seçmek.", "Konuya değen ama sırayı bozan cümleyi içeride bırakmak."],
    tip: "Bozan cümle genellikle doğru bir bilgidir. Yanlış olan, orada durmasıdır.",
  },
];

export function rehberBySection(section: string): Rehber | undefined {
  return rehber.find((item) => item.section === section);
}
