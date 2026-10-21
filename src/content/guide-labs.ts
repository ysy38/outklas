import type { SectionId } from "@/modules/exam/blueprint";

export type GuideOption = {
  id: string;
  text: string;
  correct: boolean;
  autopsy: string;
};

export type GuideWorked = {
  passage?: string;
  stem: string;
  prompt?: string;
  options: GuideOption[];
  structural: string[];
  meaning: string[];
  rule: { title: string; body: string };
};

export type GuideLabItem = {
  code: string;
  minutes: string;
  passage?: string;
  stem: string;
  prompt: string;
  options: GuideOption[];
  revealTitle: string;
  structural: string;
  meaning: string;
};

export type GuideSource = {
  cite: string;
  title: string;
  venue: string;
  summary: string;
  productClaim: string;
  doi?: string;
};

export type DeepGuide = {
  section: SectionId;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  lead: string;
  approach: string;
  layersTitle: string;
  layers: { title: string; body: string }[];
  layersNote: string;
  workedTitle: string;
  worked: GuideWorked;
  workedSteps?: { structural: string; meaning: string; autopsy: string };
  nextTitle: string;
  nextSteps: string[];
  beyondTitle: string;
  beyondBody: string;
  lab: GuideLabItem;
  ctaLine: string;
  ctaPrimary: { href: string; label: string };
  ctaSecondary: { href: string; label: string };
  sources?: GuideSource[];
  notebook?: { title: string; fields: string[]; tip: string };
  misses?: { title: string; items: string[] };
  errorKinds?: { title: string; items: string[] };
  disclaimer?: string;
};

export const deepGuides: Partial<Record<SectionId, DeepGuide>> = {
  grammar: {
    section: "grammar",
    seoTitle: "YDS Grammar: Dil Bilgisi ve Yapı Soruları | outklas.",
    seoDescription:
      "YDS ve YÖKDİL dil bilgisi sorularını sözdizimi, bağlaçlar, zamanlar ve çeldirici analiziyle öğren. Açıklamalı örnek soru çöz.",
    h1: "YDS Grammar: Dil Bilgisi ve Yapı Soruları Nasıl Çözülür?",
    lead: "YDS ve YÖKDİL dil bilgisi sorularında yalnızca kuralı hatırlamak yetmez. Cümlenin hangi yapıyı gerektirdiğini, seçeneklerin bu yapıyla nasıl ilişkilendiğini ve anlamın hangi yönde ilerlediğini birlikte değerlendirmelisin.",
    approach: "outklas. yaklaşımı basit: Önce yapısal kanıtı bul, sonra anlamı doğrula, en son şıkları ele.",
    layersTitle: "Dil bilgisi sorularında neyi ölçüyorsun?",
    layers: [
      { title: "Sözdizimi", body: "Boşluktan önce ve sonra hangi dilsel birimler var?" },
      { title: "Biçimbilim", body: "Fiil hangi biçimde olmalı? Örneğin gerund mı, infinitive mi?" },
      { title: "Zaman ve görünüş", body: "Eylem ne zaman gerçekleşiyor ve nasıl sunuluyor?" },
      {
        title: "Bağlaçlar ve anlamsal ilişkiler",
        body: "İki fikir neden, sonuç, karşıtlık veya koşul ilişkisi içinde mi?",
      },
      {
        title: "Edat ve sözcük birliktelikleri",
        body: "Belirli bir fiil ya da sıfat hangi yapıyla kullanılıyor?",
      },
    ],
    layersNote:
      "Her soruda bütün bu katmanları aynı anda çözmeye çalışma. Önce boşluğun gerektirdiği yapıyı belirle; ardından cümlenin anlamıyla uyuşup uyuşmadığını kontrol et.",
    workedTitle: "Örnek soru: Yapıyı gör, kuralı hatırla",
    worked: {
      stem: "Despite _____ several methodological limitations, the study was widely cited in subsequent research.",
      options: [
        { id: "A", text: "A) have", correct: false, autopsy: "Bu biçim burada edattan sonra bağımsız bir fiil olarak kullanılamaz." },
        { id: "B", text: "B) having", correct: true, autopsy: "Despite bir edattır; eylem ifade etmek için ardından -ing yapısı gelir." },
        { id: "C", text: "C) had", correct: false, autopsy: "Çekimli fiil biçimidir; mevcut yapının gerektirdiği tamamlayıcı değildir." },
        { id: "D", text: "D) to have", correct: false, autopsy: "Infinitive biçimi bu kullanımda uygun değildir." },
        { id: "E", text: "E) has had", correct: false, autopsy: "Özne ve zaman bakımından çekimli fiildir; despite sonrasında bu şekilde kullanılamaz." },
      ],
      structural: [
        "Despite bir edattır (preposition). Ardından isim öbeği gelebilir: despite the limitations, despite the evidence.",
        "Bir eylemi ifade etmek istediğimizde edatın ardından -ing biçimindeki bir yapı kullanılabilir: despite having limited resources.",
        "Bu nedenle boşlukta having uygundur.",
      ],
      meaning: [
        "Çalışmanın çeşitli yöntemsel sınırlılıkları vardı.",
        "Buna rağmen sonraki araştırmalarda sıkça alıntılandı.",
        "Despite bu karşıtlığı kurar. Cümlenin ikinci kısmı, ilk kısımdaki olumsuz koşula rağmen gerçekleşen sonucu verir.",
      ],
      rule: {
        title: "Bu sorudan çıkarılacak kural",
        body: "Despite + noun phrase / -ing clause. Buna karşılık although bir yan cümle bağlacıdır ve ardından özne ile çekimli fiil gelir: Despite having limited resources, the team continued. / Although the team had limited resources, it continued. İki yapı benzer bir karşıtlık anlamı kurar; dil bilgisel olarak aynı yapıya sahip değildir.",
      },
    },
    nextTitle: "Bir sonraki soruda ne yapmalısın?",
    nextSteps: [
      "Boşluğun sağını ve solunu incele.",
      "Bir edat mı, bağlaç mı, yardımcı fiil mi gerekiyor?",
      "Seçeneği yerleştir ve cümlenin anlamını kontrol et.",
      "Yanlış seçenekleri yalnızca “kulağa yanlış geliyor” diye değil, hangi yapısal veya anlamsal kanıtla elendiğini açıklayarak değerlendir.",
    ],
    beyondTitle: "Kuralı bilmekten fazlası",
    beyondBody:
      "Bir soruyu doğru yapmak, o kuralı her bağlamda doğru uygulayabildiğin anlamına gelmez. Bu nedenle yanlışlarını konu başlığına göre değil, mümkün olduğunda hata mekanizmasına göre de incele: yapı tanıma, zaman ilişkisi, bağlaç anlamı veya seçenekler arasındaki biçim farkı.",
    lab: {
      code: "Grammar Lab · 02",
      minutes: "Yaklaşık 30 saniye",
      stem: "The researchers repeated the experiment _____ the initial results could be verified by an independent team.",
      prompt: "Boşluğa hangi seçenek gelmelidir?",
      options: [
        {
          id: "A",
          text: "A) despite",
          correct: false,
          autopsy: "Despite karşıtlık kurar; burada amaç/sonuç ilişkisi aranıyor. Ayrıca despite ardından tipik olarak isim / -ing gelir, çekimli bir yan cümle değil.",
        },
        {
          id: "B",
          text: "B) so that",
          correct: true,
          autopsy: "So that amaç bildirir: deneyi tekrarlama nedeni, sonuçların bağımsız bir ekipçe doğrulanabilmesidir.",
        },
        {
          id: "C",
          text: "C) whereas",
          correct: false,
          autopsy: "Whereas karşıtlık / karşılaştırma kurar; burada iki fikir zıt değil, amaç ilişkisi var.",
        },
        {
          id: "D",
          text: "D) unless",
          correct: false,
          autopsy: "Unless koşul (…madıkça) kurar; cümlenin ikinci yarısı bir koşul değil, amaçtır.",
        },
        {
          id: "E",
          text: "E) nevertheless",
          correct: false,
          autopsy: "Nevertheless bağlaç değil, cümle bağlacı / bağlayıcı zarftır; bu boşluğun sözdizimine oturmaz ve ilişki tipi de yanlıştır.",
        },
      ],
      revealTitle: "Cevap ve dilbilimsel açıklama",
      structural: "Boşluktan sonra özne + çekimli fiil (the initial results could be verified…) geliyor. Amaç bağlacı so that bu yapıyı doğal karşılar.",
      meaning: "Araştırmacılar deneyi, ilk sonuçların bağımsız doğrulanabilmesi için tekrarladı. İlişki: amaç.",
    },
    ctaLine: "outklas. ile cümleyi parçala, yapıyı bul ve çeldiriciyi gerekçesiyle ele.",
    ctaPrimary: { href: "/teshis", label: "Ücretsiz Cümle Röntgenini dene →" },
    ctaSecondary: { href: "/kelime", label: "Günlük alıştırmaya bak" },
  },

  vocabulary: {
    section: "vocabulary",
    seoTitle: "YDS Vocabulary: Akademik Kelimeler ve Örnek Sorular | outklas.",
    seoDescription:
      "YDS ve YÖKDİL kelime sorularını bağlam, collocation ve çeldirici analiziyle çöz. Akademik kelimeleri açıklamalı örneklerle öğren.",
    h1: "YDS Vocabulary: Akademik Kelimeler Nasıl Öğrenilir?",
    lead: "YDS ve YÖKDİL kelime sorularında bir kelimenin sözlük anlamını bilmek her zaman yeterli değildir. Kelimenin cümledeki anlamını, birlikte kullanıldığı sözcükleri ve diğer seçeneklerden nasıl ayrıldığını da değerlendirmelisin.",
    approach:
      "Örneğin consistent ve compatible bazı bağlamlarda Türkçeye benzer sözcüklerle çevrilebilir. Ancak bir araştırma sonucunun önceki bulgularla tutarlı olduğunu anlatırken kullanılan kalıp çoğunlukla consistent with previous findings olur.",
    layersTitle: "outklas. yaklaşımında kelimeyi üç katmanda inceliyoruz",
    layers: [
      { title: "Anlam", body: "Kelime burada ne ifade ediyor?" },
      { title: "Bağlam", body: "Cümlenin hangi anlamı gerektirdiğini hangi ipuçları gösteriyor?" },
      { title: "Birliktelik", body: "Kelime hangi sözcüklerle doğal ve anlamlı bir yapı kuruyor?" },
    ],
    layersNote: "Kelimeyi ezber listesinden değil, cümlenin gerektirdiği ilişkiden seç.",
    workedTitle: "Örnek soru: Kelimeyi bağlamda seç",
    workedSteps: {
      structural: "1. Bağlamı oku",
      meaning: "2. Sözcük birlikteliğini incele",
      autopsy: "3. Çeldirici otopsisi",
    },
    worked: {
      stem: "The results were largely _____ with earlier findings, although the size of the effect differed across studies.",
      options: [
        { id: "A", text: "A) consistent", correct: true, autopsy: "consistent with: bir şeyle tutarlı / uyumlu olmak. Cümlenin istediği ilişki budur." },
        { id: "B", text: "B) consecutive", correct: false, autopsy: "Art arda gelen anlamındadır. Sonuçların önceki bulgularla uyumlu olduğunu söylemez." },
        { id: "C", text: "C) considerate", correct: false, autopsy: "Başkalarının ihtiyaçlarını gözeten, düşünceli anlamına gelir; genellikle kişiler veya davranışlar için kullanılır." },
        { id: "D", text: "D) compulsory", correct: false, autopsy: "Zorunlu anlamındadır; sonuçların bulgularla ilişkisini ifade etmez." },
        { id: "E", text: "E) conspicuous", correct: false, autopsy: "Dikkat çeken, belirgin anlamına gelir; burada aranan ilişkiyi kurmaz." },
      ],
      structural: [
        "Cümlenin ilk bölümü, sonuçların önceki bulgularla nasıl bir ilişki içinde olduğunu soruyor.",
        "İkinci bölümde etki büyüklüğünün araştırmalar arasında farklılaştığı belirtiliyor.",
        "Genel örüntü tutarlı olabilirken etki büyüklüğü değişebilir; bu iki bilgi çelişmek zorunda değildir.",
      ],
      meaning: [
        "consistent with earlier findings / the evidence / previous observations doğal birlikteliklerdir.",
        "Burada yalnızca consistent kelimesini değil, onun with ile kurduğu anlam ilişkisini de öğreniyoruz.",
      ],
      rule: {
        title: "Bu sorudan çıkarılacak ders",
        body: "Kelime sorusunda üç kontrol yap: Anlam cümlenin genel mesajına uyuyor mu? Sözcük, boşluğun çevresindeki kelimelerle uygun bir birliktelik kuruyor mu? Cümledeki karşıtlık, neden-sonuç veya sınırlama ilişkisi seçeneği destekliyor mu?",
      },
    },
    nextTitle: "Kelimeyi ezberlemek değil, hatırlayabilmek",
    nextSteps: [
      "Bir kelimeyi liste üzerinde tekrar tekrar görmek, onu sınav bağlamında doğru seçebileceğini garanti etmez.",
      "Kendini kelimeyi hatırlamaya zorlayan kısa alıştırmalar ve öğrenilen kelimelere zaman aralıklarıyla yeniden dönmek daha işlevsel bir düzen kurabilir.",
      "Araştırmalar aralıklı tekrarın ve hatırlama pratiğinin kalıcılığı destekleyebildiğini gösterir; her kelime ve her öğrenen için tek bir ideal aralık yoktur.",
    ],
    beyondTitle: "Kelime Neşteri",
    beyondBody:
      "Kelimeyi bağlamında gör, doğru seçeneği gerekçelendir ve çeldiricinin neden cazip geldiğini öğren. Yanlışını yalnızca listeye ekleme; nedenini ayır.",
    lab: {
      code: "Vocabulary Lab · 02",
      minutes: "Yaklaşık 30 saniye",
      stem: "The new policy aims to _____ the gap between the skills graduates possess and those employers require.",
      prompt: "Cümledeki anlam ve sözcük birlikteliğine en uygun fiili seç.",
      options: [
        {
          id: "A",
          text: "A) bridge",
          correct: true,
          autopsy: "bridge the gap: iki şey arasındaki boşluğu kapatmak / azaltmak. Mezun becerileri ile işveren beklentisi arasındaki fark için doğal kalıptır.",
        },
        {
          id: "B",
          text: "B) emerge",
          correct: false,
          autopsy: "Ortaya çıkmak anlamındadır; bir boşluğu kapatma eylemini anlatmaz ve the gap ile doğal birliktelik kurmaz.",
        },
        {
          id: "C",
          text: "C) impose",
          correct: false,
          autopsy: "Dayatmak / yüklemek anlamındadır; gap ile birlikte kullanıldığında istenen anlamı vermez.",
        },
        {
          id: "D",
          text: "D) derive",
          correct: false,
          autopsy: "Türetmek / elde etmek anlamındadır; boşluğu kapatma fikrini karşılamaz.",
        },
        {
          id: "E",
          text: "E) undergo",
          correct: false,
          autopsy: "Geçirmek / maruz kalmak anlamındadır; özne politika olsa bile the gap ile uygun birliktelik kurmaz.",
        },
      ],
      revealTitle: "Cevap ve kelime analizi",
      structural: "aims to + fiil + the gap… kalıbı bir boşluğu kapatma eylemi ister. bridge the gap akademik metinde sık görülen birlikteliktir.",
      meaning: "Yeni politika, mezunların sahip olduğu beceriler ile işverenlerin istediği beceriler arasındaki farkı kapatmayı hedefliyor.",
    },
    notebook: {
      title: "Kelime defterini nasıl tutmalısın?",
      fields: [
        "Kelime: consistent",
        "Temel anlam: tutarlı, uyumlu",
        "Birliktelik: consistent with the evidence",
        "Kendi örneğin: The findings are consistent with the proposed explanation.",
      ],
      tip: "Ardından kelimeyi notlarına bakmadan hatırlamaya çalış. Daha sonra aynı kelimeyi farklı bir cümlede görerek bağlama göre kullanımını kontrol et.",
    },
    errorKinds: {
      title: "Yanlışın nedenini ayır",
      items: [
        "Kelimenin anlamını bilmiyor muydun?",
        "İki yakın anlamlı seçenek arasında mı kaldın?",
        "Kelime birlikteliğini mi tanıyamadın?",
        "Cümlenin genel anlamını mı kaçırdın?",
      ],
    },
    sources: [
      {
        cite: "Kim & Webb (2022)",
        title: "The Effects of Spaced Practice on Second Language Learning",
        venue: "Language Learning, 72(1), 269-319",
        summary:
          "İkinci dil öğreniminde aralıklı çalışmayı inceleyen meta-analiz; 48 deney ve 3.411 katılımcının verilerini birleştiriyor. Aralıklı çalışmanın genel olarak olumlu etkisini, gecikmeli testlerde daha uzun aralıkların önemini ve etkinin uygulama koşullarına göre değişebildiğini raporluyor.",
        productClaim:
          "Bu kaynaktan çıkarabileceğimiz makul ürün kararı, kelimeleri yalnızca art arda göstermek yerine aralıklı tekrar ve hatırlama alıştırmaları tasarlamaktır. Araştırma, outklas.’ın belirli bir tekrar takviminin kesin olarak en iyi olduğunu veya puanları belirli bir miktar artırdığını kanıtlamaz.",
        doi: "https://doi.org/10.1111/lang.12479",
      },
    ],
    ctaLine: "outklas. Kelime Neşteri: Kelimeyi bağlamında gör, doğru seçeneği gerekçelendir ve çeldiricinin neden cazip geldiğini öğren.",
    ctaPrimary: { href: "/kelime", label: "Ücretsiz kelime alıştırmasıyla başla →" },
    ctaSecondary: { href: "/teshis", label: "Seviye testini dene" },
  },

  cloze: {
    section: "cloze",
    seoTitle: "YDS Cloze Test: Paragrafta Boşluk Doldurma | outklas.",
    seoDescription:
      "YDS ve YÖKDİL paragrafta boşluk doldurma sorularını bağlam, bağlaç, gramer ve kelime analiziyle çöz. Açıklamalı cloze test alıştırmaları yap.",
    h1: "YDS Paragrafta Boşluk Doldurma: Cloze Test Nasıl Çözülür?",
    lead: "YDS ve YÖKDİL paragrafta boşluk doldurma sorularında doğru kelimeyi veya ifadeyi seçmek için yalnızca boşluğun çevresindeki birkaç kelimeye bakmak yeterli olmayabilir. Paragrafın konusu, cümleler arasındaki mantıksal ilişkiler ve dilbilgisel yapı birlikte değerlendirilmelidir.",
    approach: "Cloze test çözmenin temel ilkesi: Her boşluğu hem kendi cümlesi içinde hem de paragrafın bütünü içinde değerlendir.",
    layersTitle: "Cloze test hangi becerileri gerektirir?",
    layers: [
      { title: "Sözdizimi", body: "Boşluk hangi sözcük türünü veya dilbilgisel yapıyı gerektiriyor?" },
      { title: "Anlambilim", body: "Seçenek, cümlenin vermek istediği anlamla uyuşuyor mu?" },
      { title: "Sözcük birliktelikleri", body: "Kelime, çevresindeki sözcüklerle doğal bir kullanım oluşturuyor mu?" },
      {
        title: "Söylem ilişkileri",
        body: "Cümleler arasında karşıtlık, neden-sonuç, ekleme veya örnekleme ilişkisi var mı?",
      },
      {
        title: "Metinsel bağdaşıklık",
        body: "Zamirler, bağlaçlar ve tekrar eden kavramlar metnin hangi bölümüne gönderme yapıyor?",
      },
    ],
    layersNote:
      "Bu ipuçlarının hepsi her soruda aynı ölçüde önemli değildir. Önce boşluğun hangi tür bilgiyi gerektirdiğini belirle.",
    workedTitle: "Örnek soru: Bağlamdaki ilişkiyi yakala",
    workedSteps: {
      structural: "1. Cümlenin mantığını belirle",
      meaning: "2. Dilbilimsel kanıt",
      autopsy: "3. Çeldirici otopsisi",
    },
    worked: {
      stem: "Many cities are investing in public transport to reduce traffic congestion. Expanding bus and rail networks can make commuting more convenient. However, these investments are unlikely to produce lasting benefits _____ they are accompanied by measures that discourage excessive car use.",
      options: [
        {
          id: "A",
          text: "A) unless",
          correct: true,
          autopsy: "Unless, -medikçe / -madığı sürece anlamı taşıyan bir koşul bağlacıdır. Faydanın ortaya çıkması için gereken koşulu ifade eder.",
        },
        {
          id: "B",
          text: "B) because",
          correct: false,
          autopsy: "Neden bildirir; burada yatırımların neden fayda sağlamadığını açıklayan bir neden sunulmuyor.",
        },
        {
          id: "C",
          text: "C) once",
          correct: false,
          autopsy: "-dığı zaman / bir kez anlamıyla zaman ilişkisi kurar; koşullu uyarıyı karşılamaz.",
        },
        {
          id: "D",
          text: "D) although",
          correct: false,
          autopsy: "Karşıtlık bildiren bir yan cümle bağlacıdır; cümlenin istediği koşul ilişkisini kurmaz.",
        },
        {
          id: "E",
          text: "E) so that",
          correct: false,
          autopsy: "Amaç bildirir; bu cümlede amaç değil, gerekli koşul anlatılmaktadır.",
        },
      ],
      structural: [
        "Paragraf, toplu taşımaya yapılan yatırımların faydalarından söz ediyor; ardından bu faydaların hangi koşulda ortaya çıkmayacağını belirtiyor.",
        "Bu yatırımların kalıcı fayda sağlaması beklenmez, _____ aşırı otomobil kullanımını azaltan önlemlerle desteklenirler.",
        "Buradaki ilişki bir koşul ilişkisidir.",
      ],
      meaning: [
        "Unless, -medikçe / -madığı sürece anlamı taşıyan bir koşul bağlacıdır.",
        "Unless demand changes, prices may remain high. / The policy may fail unless it receives public support.",
        "Cümlede de toplu taşıma yatırımlarının kalıcı fayda sağlaması, otomobil kullanımını azaltan önlemlere bağlıdır.",
      ],
      rule: {
        title: "Bu sorudan çıkarılacak yöntem",
        body: "Boşluğu görür görmez seçenekleri ezberden eşleştirme. Önce sor: İki fikir arasındaki ilişki ne? Ardından dilbilgisel yapıyı kontrol et. Anlamca yakın görünen iki bağlaç arasında kaldığında, cümlenin mantıksal ilişkisini açıkça ifade edebilen seçeneği tercih et.",
      },
    },
    nextTitle: "Cloze test için dört adımlı çözüm",
    nextSteps: [
      "Paragrafın konusunu belirle. Her kelimeyi çevirmeye çalışmadan metnin genel olarak ne anlattığını kavra.",
      "Boşluğun türünü teşhis et. Kelime mi, bağlaç mı, fiil biçimi mi, edat mı, yoksa sözcük birlikteliği mi gerekiyor?",
      "İlişkiyi tanımla. Karşıtlık, neden, sonuç, koşul, zaman veya amaç ilişkilerinden hangisi var?",
      "Paragrafı yeniden oku. Seçeneğin yalnızca tek cümleye değil, paragrafın anlam bütünlüğüne de uyduğunu doğrula.",
    ],
    misses: {
      title: "En sık yapılan hatalar",
      items: [
        "Yalnızca boşluğun hemen önündeki kelimeye bakmak.",
        "Cümlenin dilbilgisel olarak doğru olmasını, anlam bakımından da doğru olduğu sanmak.",
        "Bağlaçların Türkçe karşılıklarını ezberleyip aralarındaki kullanım farklarını gözden kaçırmak.",
        "Her boşluğu sırayla çözmek zorunda olduğunu düşünmek.",
        "Seçenek yerleştirildikten sonra paragrafın tamamını yeniden okumamak.",
      ],
    },
    beyondTitle: "Daha etkili çalışma",
    beyondBody:
      "Her yanlış cevabı bir hata kategorisine ayır: kelime anlamı, dilbilgisel yapı, sözcük birlikteliği, bağlaç ve mantıksal ilişki, paragraf bağlamı. Böylece yalnızca kaç soru yanlış yaptığını değil, hangi nedenle yanlış yaptığını da takip edebilirsin.",
    errorKinds: {
      title: "Yanlışını hangi kategoride tut?",
      items: [
        "Kelime anlamı",
        "Dilbilgisel yapı",
        "Sözcük birlikteliği",
        "Bağlaç ve mantıksal ilişki",
        "Paragraf bağlamı",
      ],
    },
    lab: {
      code: "Cloze Lab · 01",
      minutes: "Yaklaşık 30 saniye",
      stem: "Although urban trees can lower local temperatures, their cooling effect _____ factors such as tree density, water availability and the surrounding built environment.",
      prompt: "Boşluğa en uygun seçeneği belirle.",
      options: [
        {
          id: "A",
          text: "A) depends on",
          correct: true,
          autopsy:
            "depends on factors such as… doğal bir birlikteliktir. Soğutma etkisinin ağaç yoğunluğu, su ve çevresel yapı gibi etkenlere bağlı olduğunu söyler.",
        },
        {
          id: "B",
          text: "B) contrasts with",
          correct: false,
          autopsy: "Karşıtlık kurar; cümle etkiyi faktörlerle karşılaştırmıyor, etkiyi bu faktörlere bağlıyor.",
        },
        {
          id: "C",
          text: "C) is independent of",
          correct: false,
          autopsy: "Bağımsız olduğunu iddia eder; oysa cümle soğutma etkisinin bu faktörlere göre değiştiğini anlatıyor.",
        },
        {
          id: "D",
          text: "D) occurs instead of",
          correct: false,
          autopsy: "Yerine geçme ilişkisi kurar; factors such as… ile doğal bir kullanım oluşturmaz.",
        },
        {
          id: "E",
          text: "E) continues in spite of",
          correct: false,
          autopsy: "Rağmen anlamı verir; burada karşıtlık değil, bağımlılık / koşulluluk ilişkisi aranıyor.",
        },
      ],
      revealTitle: "Yanıtı analiz et",
      structural: "Boşluktan sonra factors such as… geliyor. depends on factors such as… akademik metinde sık ve doğal bir kalıptır.",
      meaning:
        "Kent ağaçları yerel sıcaklığı düşürebilir; fakat soğutma etkisi ağaç yoğunluğu, su bulunabilirliği ve çevredeki yapılaşmaya bağlı olarak değişir.",
    },
    sources: [
      {
        cite: "Graesser, Millis & Zwaan (1997)",
        title: "Discourse Comprehension",
        venue: "Annual Review of Psychology, 48, 163-189",
        summary:
          "Bağlantılı metin okurken yüzey kodu, önerme düzeyi, durum modeli ve yerel/küresel bağdaşıklık gibi katmanların birlikte kurulduğunu özetler. Anlama, yalnızca tek bir cümle parçasına değil, cümleler arası bağlantılara ve çıkarımlara da dayanır.",
        productClaim:
          "Makul ürün kararı: cloze boşluklarını yalnızca komşu kelimelerle sınırlamamak; paragraf konusu, bağlaç ilişkisi ve bağdaşıklık ipuçlarını birlikte sormak. Bu derleme, outklas.’ın belirli bir cloze taktiğinin puanı kesin artırdığını kanıtlamaz.",
        doi: "https://doi.org/10.1146/annurev.psych.48.1.163",
      },
    ],
    disclaimer:
      "Bu sayfadaki sorular outklas. için özgün örneklerdir; çıkmış ÖSYM soruları değildir. Sınav formatı ve soru dağılımı için nihai kaynak ÖSYM kılavuzu ve kitapçığıdır.",
    ctaLine: "outklas. Cloze Lab: Boşluğu doldur, kanıtı bul ve çeldiriciyi gerekçesiyle ele.",
    ctaPrimary: { href: "/teshis", label: "Ücretsiz alıştırmayla test et →" },
    ctaSecondary: { href: "/bugun", label: "Günlük çalışmaya bak" },
  },

  sentence: {
    section: "sentence",
    seoTitle: "YDS Cümle Tamamlama: Açıklamalı Sorular ve Taktikler | outklas.",
    seoDescription:
      "YDS ve YÖKDİL cümle tamamlama sorularını bağlaç, anlam ilişkisi, gramer ve çeldirici analiziyle çöz. Örnek sorularla pratik yap.",
    h1: "YDS Cümle Tamamlama: Doğru Seçenek Nasıl Bulunur?",
    lead: "YDS ve YÖKDİL cümle tamamlama sorularında verilen cümle başlangıcını anlamca ve dilbilgisel olarak tamamlayan seçeneği bulman gerekir. Ancak seçeneklerin hepsi konuya uygun görünebilir. Doğru cevabı belirleyen, yalnızca ortak konu değil, iki bölüm arasında kurulan ilişkinin doğruluğudur.",
    approach:
      "outklas. yaklaşımında cümlenin ilk bölümünü bir anlam beklentisi oluşturmak için kullanırız. Ardından seçenekleri bu beklentiye, dilbilgisel yapıya ve mantıksal ilişkiye göre eleriz.",
    layersTitle: "Cümle tamamlama hangi becerileri gerektirir?",
    layers: [
      { title: "Sözdizimi", body: "Verilen bölüm hangi dilbilgisel yapıyı gerektiriyor?" },
      { title: "Anlambilim", body: "Tamamlayıcı bölüm, ilk bölümün anlamıyla uyuşuyor mu?" },
      {
        title: "Mantıksal ilişki",
        body: "İki bölüm neden, sonuç, karşıtlık, koşul, amaç veya zaman ilişkisi içinde mi?",
      },
      { title: "Kiplik ve zaman", body: "Cümlenin olasılık, zorunluluk, beklenti veya zaman anlamı korunuyor mu?" },
      {
        title: "Kapsam",
        body: "Seçenek, verilen ifadeden daha güçlü ya da daha geniş bir iddia mı ortaya atıyor?",
      },
    ],
    layersNote: "Konuya uygun görünen her seçenek doğru değildir. Önce ilişkiyi, sonra kapsamı kontrol et.",
    workedTitle: "Örnek soru: İki bölüm arasındaki ilişkiyi kur",
    workedSteps: {
      structural: "1. İlk bölümün oluşturduğu beklentiyi bul",
      meaning: "2. Dilbilgisel yapıyı kontrol et",
      autopsy: "3. Çeldirici otopsisi",
    },
    worked: {
      stem: "Although the new treatment has shown promising results in early trials, _____.",
      options: [
        {
          id: "A",
          text: "A) researchers need larger studies to determine whether it is safe and effective",
          correct: true,
          autopsy:
            "Umut verici erken sonuçlarla, güvenlilik ve etkililiği belirlemek için daha büyük çalışmalara ihtiyaç duyulması arasında anlamlı bir ödünleme ilişkisi vardır.",
        },
        {
          id: "B",
          text: "B) the researchers published their findings before the treatment was developed",
          correct: false,
          autopsy: "Araştırma bulgularının tedavi geliştirilmeden önce yayımlandığını iddia eder. Bu bilgi verilen bölümden çıkarılamaz.",
        },
        {
          id: "C",
          text: "C) it has already been proven effective for every patient",
          correct: false,
          autopsy:
            "Erken denemelerde umut verici sonuçlar görülmesini, her hasta için etkinliğin kanıtlanmasıyla eş tutar. Bu, ilk bölümün desteklediğinden çok daha güçlü bir iddiadır.",
        },
        {
          id: "D",
          text: "D) early trials are unnecessary when a treatment is widely discussed",
          correct: false,
          autopsy: "Erken denemelerin gereksiz olduğunu savunur. İlk bölüm bu sonucu desteklemez.",
        },
        {
          id: "E",
          text: "E) the treatment was designed to replace all existing medical procedures",
          correct: false,
          autopsy: "Tedavinin tüm mevcut uygulamaların yerini almak üzere tasarlandığını ileri sürer; bu amaç veya kapsam bilgisi cümlede bulunmaz.",
        },
      ],
      structural: [
        "Although bir ödünleme / karşıtlık ilişkisi kurar.",
        "İlk bölümde tedavinin erken denemelerde umut verici sonuçlar gösterdiği belirtiliyor.",
        "Devamında, bu olumlu bulguya rağmen henüz çözülmemiş bir nokta gelmesi beklenir; daha fazla araştırmaya ihtiyaç duyulması bu yapıyla uyumludur.",
      ],
      meaning: [
        "Although + subject + verb yapısı bir yan cümle oluşturur ve ana cümleyle tamamlanır.",
        "Although the evidence is limited, further research is possible. / Although the results are promising, important questions remain.",
        "Verilen başlangıç, seçeneklerden biriyle birleştirildiğinde tam ve dilbilgisel olarak doğru bir cümle oluşturmalıdır.",
      ],
      rule: {
        title: "Bu sorudan çıkarılacak ders",
        body: "Bir seçeneğin konuyla ilgili olması yeterli değildir. Seçeneğin (1) verilen bölümle doğru mantıksal ilişkiyi kurması, (2) cümleyi dilbilgisel olarak tamamlaması, (3) ilk bölümün desteklemediği yeni veya aşırı güçlü bir iddia eklememesi gerekir.",
      },
    },
    nextTitle: "Cümle tamamlama için dört adım",
    nextSteps: [
      "İlişkiyi tahmin et. Seçenekleri okumadan önce verilen bölümün nasıl bir devam beklediğini belirle.",
      "Yapıyı incele. Boşlukta tam bir ana cümle mi, yan cümle mi, yoksa belirli bir dilbilgisel tamamlayıcı mı gerekiyor?",
      "Anlamı test et. Seçenek ilk bölümle neden, sonuç, karşıtlık, koşul veya amaç ilişkilerinden hangisini kuruyor?",
      "Tam cümleyi oku. Seçeneği başlangıca ekleyerek hem dilbilgisini hem de anlamı kontrol et.",
    ],
    misses: {
      title: "En sık yapılan hatalar",
      items: [
        "Yalnızca aynı konu hakkında konuşan seçeneği işaretlemek.",
        "Although, because, unless, so that gibi ifadelerin oluşturduğu ilişkileri karıştırmak.",
        "Seçeneğin cümleye eklediği iddianın kapsamını kontrol etmemek.",
        "Zaman ve kiplik ifadelerini göz ardı etmek.",
        "İlk bölümle tamamlayıcı bölümün mantıksal uyumunu sınamamak.",
      ],
    },
    beyondTitle: "Yanlışlarını nasıl analiz etmelisin?",
    beyondBody:
      "Yanlış cevabını yapısal uyumsuzluk, yanlış mantıksal ilişki, anlam çelişkisi, aşırı genelleme veya kapsam hatası, zaman ve kiplik uyuşmazlığı kategorilerinden biriyle eşleştir. Bu sınıflandırma, yalnızca doğru cevabı öğrenmek yerine hangi tür kanıtı kaçırdığını görmene yardım eder.",
    errorKinds: {
      title: "Hata kategorileri",
      items: [
        "Yapısal uyumsuzluk",
        "Yanlış mantıksal ilişki",
        "Anlam çelişkisi",
        "Aşırı genelleme veya kapsam hatası",
        "Zaman ve kiplik uyuşmazlığı",
      ],
    },
    lab: {
      code: "Sentence Lab · 01",
      minutes: "Yaklaşık 30 saniye",
      stem: "Because many coastal ecosystems are sensitive to changes in water temperature, _____.",
      prompt: "Cümleyi anlamca en tutarlı biçimde tamamlayan seçeneği seç.",
      options: [
        {
          id: "A",
          text: "A) even small temperature increases can affect the species living there",
          correct: true,
          autopsy:
            "Because neden bildirir. Kıyı ekosistemlerinin su sıcaklığına duyarlı olması, küçük sıcaklık artışlarının bile oradaki türleri etkileyebileceği sonucunu destekler.",
        },
        {
          id: "B",
          text: "B) all marine species respond to temperature in exactly the same way",
          correct: false,
          autopsy: "Tüm deniz türlerinin aynı şekilde tepki verdiğini iddia eder. İlk bölüm bu genellemeyi desteklemez.",
        },
        {
          id: "C",
          text: "C) scientists have stopped studying changes in ocean conditions",
          correct: false,
          autopsy: "Bilim insanlarının çalışmaları bıraktığını söyler; verilen neden-sonuç beklentisiyle ilişkisi yoktur.",
        },
        {
          id: "D",
          text: "D) coastal ecosystems are unaffected by environmental variation",
          correct: false,
          autopsy: "Duyarlı oldukları bilgisiyle çelişir; unaffected ilk bölümün anlamını tersine çevirir.",
        },
        {
          id: "E",
          text: "E) water temperature is unrelated to the distribution of marine organisms",
          correct: false,
          autopsy: "Sıcaklığın tür dağılımıyla ilgisiz olduğunu ileri sürer; because ile kurulan neden ilişkisini bozar.",
        },
      ],
      revealTitle: "Yanıtı analiz et",
      structural: "Because + clause, ardından nedenin sonucu olan bir ana cümle ister. A seçeneği bu sonucu verir.",
      meaning:
        "Birçok kıyı ekosistemi su sıcaklığı değişimlerine duyarlıdır; bu yüzden küçük sıcaklık artışları bile orada yaşayan türleri etkileyebilir.",
    },
    sources: [
      {
        cite: "Clifton & Duffy (2001)",
        title: "Sentence and Text Comprehension: Roles of Linguistic Structure",
        venue: "Annual Review of Psychology, 52, 167-196",
        summary:
          "Okuyucuların cümle ve metin anlamada sözdizimsel, sözcüksel, anlamsal ve söylemsel yapıyı birlikte kullandığını gözden geçirir. Anlama, yalnızca konu benzerliğine değil, dilbilgisel yapı ile bağlamın etkileşimine de bağlıdır.",
        productClaim:
          "Makul ürün kararı: cümle tamamlamada önce bağlacın kurduğu ilişkiyi ve dilbilgisel tamamlayıcıyı sormak; konu ortaklığını tek başına yeterli görmemek. Bu derleme, outklas.’ın belirli bir seçim sırasının sınav puanını kesin yükselttiğini kanıtlamaz.",
        doi: "https://doi.org/10.1146/annurev.psych.52.1.167",
      },
    ],
    disclaimer:
      "Bu sayfadaki sorular outklas. için özgün örneklerdir; çıkmış ÖSYM soruları değildir. Cloze test ile cümle tamamlama farklı soru biçimleridir; güncel dağılım için ÖSYM kaynaklarına bak.",
    ctaLine: "outklas. Sentence Lab: Cümleyi tamamla, anlam ilişkisini doğrula ve çeldiricinin neden işlemediğini öğren.",
    ctaPrimary: { href: "/teshis", label: "Ücretsiz alıştırmayla test et →" },
    ctaSecondary: { href: "/bugun", label: "Günlük çalışmaya bak" },
  },

  translation: {
    section: "translation",
    seoTitle: "YDS Çeviri Soruları: Açıklamalı Örnekler | outklas.",
    seoDescription:
      "YDS ve YÖKDİL çeviri sorularını anlam, sözdizimi, bağlaç, kiplik ve çeldirici analiziyle çöz. Açıklamalı sorularla pratik yap.",
    h1: "YDS Çeviri Soruları: Doğru Seçenek Nasıl Bulunur?",
    lead: "YDS çeviri sorularında doğru seçenek, kaynak cümlenin yalnızca kelimelerini değil; dilbilgisel yapısını, anlam ilişkilerini ve iddia kapsamını da korumalıdır.",
    approach:
      "outklas. çeviri yaklaşımı: Önce cümlenin iskeletini çıkar, sonra anlam ilişkilerini belirle ve son olarak seçeneklerin neyi değiştirdiğini incele. Kelimeleri değil, anlam ilişkilerini çevir.",
    layersTitle: "Çeviri sorularında hangi kanıtları aramalısın?",
    layers: [
      { title: "Sözdizimi", body: "Ana cümle ve yan cümleler arasındaki ilişki korunuyor mu?" },
      { title: "Anlambilim", body: "Cümledeki eylem, durum ve ilişkiler aynı anlamı taşıyor mu?" },
      { title: "Zaman ve görünüş", body: "Eylemin ne zaman gerçekleştiği ve nasıl sunulduğu değişmiş mi?" },
      { title: "Kiplik", body: "Olasılık, zorunluluk veya kesinlik derecesi korunuyor mu?" },
      {
        title: "Olumsuzluk ve kapsam",
        body: "Olumsuzluk hangi ifadeyi etkiliyor? “Her zaman”, “yalnızca” veya “büyük ölçüde” gibi sınırlayıcılar korunmuş mu?",
      },
    ],
    layersNote:
      "Bir seçenekteki kelimeler tanıdık olabilir. Ancak neden-sonuç ilişkisinin karşıtlığa dönüşmesi, bir koşulun kesin bir sonuca çevrilmesi veya olasılığın kesinlik gibi sunulması anlamı değiştirir.",
    workedTitle: "Açıklamalı örnek soru",
    workedSteps: {
      structural: "1. Cümle röntgeni",
      meaning: "2. Korunan ilişkiler",
      autopsy: "3. Çeldirici otopsisi",
    },
    worked: {
      stem: "Although the policy was introduced to reduce waste, its effectiveness depends largely on whether local authorities enforce it consistently.",
      prompt: "Bu cümlenin anlamını en doğru biçimde karşılayan Türkçe çeviri hangisidir?",
      options: [
        {
          id: "A",
          text: "A) Politika atığı azalttığı için uygulamaya konmuştur ve etkililiği yerel yetkililerin onu her zaman desteklemesine bağlıdır.",
          correct: false,
          autopsy:
            "İlişki değişimi: Although karşıtlık kurarken because neden bildirir. Ayrıca “tutarlı biçimde uygulamak” ile “her zaman desteklemek” aynı anlama gelmez.",
        },
        {
          id: "B",
          text: "B) Politika atığı azaltmak amacıyla uygulamaya konmuş olsa da, etkililiği büyük ölçüde yerel yetkililerin politikayı tutarlı biçimde uygulayıp uygulamamasına bağlıdır.",
          correct: true,
          autopsy:
            "Although ödünlemesini, to reduce amacını, depends largely on koşulluluğunu ve whether … consistently belirsizliğini birlikte korur.",
        },
        {
          id: "C",
          text: "C) Yerel yetkililer politikayı tutarlı biçimde uyguladıkları sürece, politikanın atığı azaltmak amacıyla uygulamaya konmuş olması gerekmez.",
          correct: false,
          autopsy: "Mantıksal kayma: Uygulamaya ilişkin koşulu, politikanın başlangıçtaki amacıyla ilgili gereklilik gibi sunar.",
        },
        {
          id: "D",
          text: "D) Politika atığı azaltmak amacıyla uygulamaya konmuştur; bu nedenle yerel yetkililerin onu tutarlı biçimde uygulayıp uygulamaması etkililiğini etkilemez.",
          correct: false,
          autopsy: "Anlamın tersine çevrilmesi: Kaynak cümle etkililiğin uygulamaya bağlı olduğunu söylerken seçenek bunun etkisiz olduğunu iddia eder.",
        },
        {
          id: "E",
          text: "E) Politika atığı azaltmayı başarmış olsa da, yerel yetkililer onu yalnızca tutarlı biçimde uygulamak zorundadır.",
          correct: false,
          autopsy:
            "Zaman ve kapsam hatası: Kaynak cümle politikanın atığı azaltmayı başardığını söylemez; “büyük ölçüde bağlı olma” da “yalnızca … zorunda olma” anlamına gelmez.",
        },
      ],
      structural: [
        "Although: Karşıtlık / ödünleme ilişkisi kurar (“… olsa da”).",
        "was introduced to reduce: Politikanın hangi amaçla uygulamaya konduğunu belirtir.",
        "depends largely on: Etkililiğin büyük ölçüde bir koşula bağlı olduğunu söyler.",
        "whether … enforce it consistently: Yerel yetkililerin politikayı tutarlı biçimde uygulayıp uygulamaması meselesini ifade eder.",
      ],
      meaning: [
        "Karşıtlık (although) neden ilişkisine (because) dönüşmemeli.",
        "“Büyük ölçüde bağlı” ifadesi “etkisiz” veya “yalnızca zorunlu”a çevrilmemeli.",
        "Amaç (to reduce) başarı iddiasına (başarmış) yükseltilmemeli.",
      ],
      rule: {
        title: "Çeviride dört kontrol",
        body: "1) Ana cümleyi ve yan cümleleri ayır. 2) Bağlaçların kurduğu mantıksal ilişkiyi belirle. 3) Zamanı, olumsuzluğu ve kesinlik derecesini kontrol et. 4) Her seçenekte kaynak cümlede olmayan bir iddia eklenip eklenmediğini incele. Bir seçeneğin akıcı Türkçe olması yeterli değildir; anlamı değiştirmeden doğal Türkçe kurması gerekir.",
      },
    },
    nextTitle: "Çeviride dört kontrol",
    nextSteps: [
      "Ana cümleyi ve yan cümleleri ayır.",
      "Bağlaçların kurduğu mantıksal ilişkiyi belirle.",
      "Zamanı, olumsuzluğu ve kesinlik derecesini kontrol et.",
      "Her seçenekte kaynak cümlede olmayan bir iddia eklenip eklenmediğini incele.",
    ],
    misses: {
      title: "En sık yapılan hatalar",
      items: [
        "Tanıdık kelimeleri görünce hemen işaretlemek.",
        "Although / because / so gibi ilişkileri karıştırmak.",
        "Olasılığı (may, not necessarily) kesinliğe çevirmek.",
        "Kaynakta olmayan bir başarı veya zorunluluk iddiası eklemek.",
      ],
    },
    beyondTitle: "Anlamı değiştirmeden çevir",
    beyondBody:
      "Akıcı Türkçe tek başına doğru cevap değildir. Doğru seçenek, kaynak cümlenin iskeletini ve anlam ilişkilerini bozmadan yeniden kurar. Yanlışını ilişki değişimi, kapsam şişirme, kiplik kayması veya tersine çevirme olarak sınıflandır.",
    errorKinds: {
      title: "Yanlışını hangi kanıt hatasına bağla?",
      items: [
        "İlişki değişimi (karşıtlık ↔ neden)",
        "Kapsam / olumsuzluk kayması",
        "Kiplik veya zaman hatası",
        "Anlamın tersine çevrilmesi",
        "Kaynakta olmayan iddia ekleme",
      ],
    },
    lab: {
      code: "Translation Lab · 01",
      minutes: "Anlam ve yapı · yaklaşık 45 saniye",
      stem: "The findings do not necessarily indicate that the intervention failed; rather, they suggest that its effects may vary across populations.",
      prompt: "Cümlenin anlamını en doğru biçimde karşılayan çeviriyi seç.",
      options: [
        {
          id: "A",
          text: "A) Bulgular, müdahalenin başarısız olduğunu kesin olarak gösterir; ancak etkileri farklı toplumlarda değişmez.",
          correct: false,
          autopsy:
            "do not necessarily indicate ifadesini “kesin olarak gösterir”e çevirir; may vary belirsizliğini de “değişmez” diye tersine çevirir.",
        },
        {
          id: "B",
          text: "B) Bulgular müdahalenin başarısız olmadığını kanıtlar ve bütün toplumlarda aynı etkiyi yarattığını gösterir.",
          correct: false,
          autopsy:
            "“Kanıtlar” ve “bütün toplumlarda aynı etki” kaynak cümlenin sınırlı, ihtiyatlı iddiasını aşırı güçlendirir ve bozar.",
        },
        {
          id: "C",
          text: "C) Bulgular, müdahalenin mutlaka başarısız olduğu anlamına gelmez; aksine, etkilerinin farklı topluluklarda değişebileceğine işaret eder.",
          correct: true,
          autopsy:
            "not necessarily, rather ve may vary yapılarını korur: kesin başarısızlık iddiası yok; etkilerin topluluklara göre değişebileceği önerilir.",
        },
        {
          id: "D",
          text: "D) Müdahalenin etkileri toplumlar arasında değiştiği için bulgular onun başarısız olduğunu göstermez.",
          correct: false,
          autopsy:
            "Kaynak cümledeki “aksi yönde öneri”yi neden-sonuç ilişkisine çevirir; rather ile kurulan düzeltme ilişkisi kaybolur.",
        },
        {
          id: "E",
          text: "E) Bulgular, müdahalenin etkilerinin bütün toplumlarda değiştiğini ve bu nedenle başarısız olduğunu kanıtlar.",
          correct: false,
          autopsy:
            "may vary belirsizliğini “bütün toplumlarda değişti” kesinliğine çevirir ve başarısızlık sonucunu kaynakta olmayan biçimde ekler.",
        },
      ],
      revealTitle: "Çevirimi analiz et",
      structural: "not necessarily + rather + may vary: ihtiyatlı olumsuzluk, düzeltme ve olasılık birlikte korunmalı.",
      meaning:
        "Bulgular başarısızlığı kesin göstermez; aksine etkilerin topluluklara göre değişebileceğine işaret eder. İlişki: düzeltme / sınırlama, kesin kanıt değil.",
    },
    sources: [
      {
        cite: "Dinçer, Antonova-Unlu & Kumcu (2022)",
        title: "Assessing the use of multiple-choice translation items in English proficiency tests",
        venue: "Applied Linguistics Review, 13(4), 461-475",
        summary:
          "YDS’deki çoktan seçmeli çeviri maddelerinin algılanan zorluğunu ve ölçme geçerliliğini inceler. Bulgular, çeviri maddelerinin diğer bölümlere göre daha kolay algılandığını ve genel teste kıyasla daha ılımlı bir dış geçerlik gösterdiğini raporlar; bu maddelerin puanı şişirebileceğine dikkat çeker.",
        productClaim:
          "Makul ürün kararı: çeviri alıştırmasında kelime eşlemesi değil, bağlaç, kiplik ve kapsam ilişkilerini bozan çeldiricileri görünür kılmak. Bu çalışma, outklas.’ın belirli bir çeviri taktiğinin YDS puanını kesin yükselttiğini kanıtlamaz.",
        doi: "https://doi.org/10.1515/applirev-2019-0064",
      },
    ],
    disclaimer:
      "Bu sayfadaki sorular outklas. için özgün örneklerdir; çıkmış ÖSYM soruları değildir. Sınav formatı için nihai kaynak ÖSYM kılavuzu ve kitapçığıdır.",
    ctaLine: "outklas. Translation Lab: İskeleti çıkar, ilişkiyi koru ve çeldiricinin neyi değiştirdiğini gör.",
    ctaPrimary: { href: "/teshis", label: "Ücretsiz alıştırmayla test et →" },
    ctaSecondary: { href: "/bugun", label: "Günlük çalışmaya bak" },
  },

  reading: {
    section: "reading",
    seoTitle: "YDS Okuduğunu Anlama: Paragraf Soruları | outklas.",
    seoDescription:
      "YDS ve YÖKDİL okuduğunu anlama sorularını ana fikir, çıkarım, ayrıntı ve metinsel kanıt analiziyle çöz. Açıklamalı paragraf soruları çöz.",
    h1: "YDS Okuduğunu Anlama: Paragraf Soruları Nasıl Çözülür?",
    lead: "YDS ve YÖKDİL okuduğunu anlama sorularında amaç, paragraftaki her kelimeyi Türkçeye çevirmek değildir. Asıl amaç; metnin ana fikrini, belirli ayrıntıları, neden-sonuç ilişkilerini ve yazarın iddiasının sınırlarını doğru belirlemektir.",
    approach:
      "outklas. okuma yaklaşımı: Sorunun ne istediğini belirle, ilgili metinsel kanıtı bul ve seçenekleri bu kanıtın desteklediği kapsam içinde değerlendir. Seçeneği değil, metindeki kanıtı takip et.",
    layersTitle: "Okuduğunu anlama sorularında hangi beceriler ölçülür?",
    layers: [
      { title: "Ana fikir", body: "Paragrafın temel mesajı nedir?" },
      { title: "Ayrıntı", body: "Metinde hangi bilgi açıkça verilmiştir?" },
      { title: "Çıkarım", body: "Metindeki bilgilerden hangi sonuç makul biçimde çıkarılabilir?" },
      { title: "Gönderim", body: "It, they, this, such gibi ifadeler hangi kavrama gönderme yapar?" },
      {
        title: "Söylem ilişkisi",
        body: "Cümleler arasında karşıtlık, açıklama, örnekleme veya sonuç ilişkisi var mı?",
      },
      { title: "İddia kapsamı", body: "Yazar “bazı” mı diyor, “çoğu” mu, yoksa “tümü” mü?" },
    ],
    layersNote:
      "Bir seçenek metindeki konuyla ilgili olabilir ama yine de yanlış olabilir. Çünkü konuya uygun olmak, metin tarafından desteklenmekle aynı şey değildir.",
    workedTitle: "Açıklamalı paragraf sorusu",
    workedSteps: {
      structural: "1. Metindeki kanıtı bul",
      meaning: "2. Kapsam kontrolü",
      autopsy: "3. Çeldirici otopsisi",
    },
    worked: {
      passage:
        "Urban green roofs are increasingly used to reduce heat absorption in densely built areas. By covering rooftops with vegetation, cities can create surfaces that remain cooler than conventional roofing materials under certain conditions. Green roofs may also retain some rainwater, reducing the amount that immediately enters drainage systems. However, their performance depends on factors such as substrate depth, plant selection and local climate. As a result, green roofs should not be treated as a universal substitute for broader urban water-management and heat-reduction strategies.",
      stem: "Which of the following can be inferred from the passage?",
      prompt: "Metinden çıkarılabilecek en doğru sonucu seç.",
      options: [
        {
          id: "A",
          text: "A) Green roofs eliminate the need for conventional urban drainage systems.",
          correct: false,
          autopsy:
            "Aşırı genelleme: Metin yağmur suyunun drenaj sistemlerine hemen ulaşan miktarının azalabileceğini söyler; drenaj sistemlerinin gereksiz hâle geldiğini söylemez.",
        },
        {
          id: "B",
          text: "B) Every green roof performs equally well regardless of local climate.",
          correct: false,
          autopsy: "Metinle çelişki: Performansın yerel iklime bağlı olduğu açıkça belirtilmiştir.",
        },
        {
          id: "C",
          text: "C) Green roofs can provide environmental benefits, but their effectiveness depends on design and local conditions.",
          correct: true,
          autopsy:
            "Doğru çıkarım: Faydaları (ısı / yağmur suyu) ve bu faydaların tasarım ile yerel koşullara bağlılığını birlikte korur.",
        },
        {
          id: "D",
          text: "D) The main purpose of green roofs is to prevent all rainfall from entering drainage systems.",
          correct: false,
          autopsy:
            "Amaç ve miktar hatası: Metin yağmur suyunun bir kısmının tutulabileceğini söyler; bütün yağışın engellendiğini veya bunun tek temel amaç olduğunu söylemez.",
        },
        {
          id: "E",
          text: "E) Cities that install green roofs no longer need other strategies to reduce urban heat.",
          correct: false,
          autopsy:
            "Kapsam hatası: Son cümle, yeşil çatıların daha geniş stratejilerin evrensel bir ikamesi olarak görülmemesi gerektiğini açıkça belirtir.",
        },
      ],
      structural: [
        "Yeşil çatılar, belirli koşullarda ısı emilimini azaltabilir ve yağmur suyunun bir bölümünü tutabilir.",
        "Performansları bitki seçimi, alt tabaka derinliği ve yerel iklim gibi etkenlere bağlıdır.",
        "C seçeneği bu iki bilgiyi birlikte korur: fayda vardır, ancak etkililik koşullara bağlıdır.",
      ],
      meaning: [
        "Doğru çıkarım metinde kelimesi kelimesine yazılmak zorunda değildir; ama metindeki bilgilerle gerekçelendirilebilir olmalıdır.",
        "all, every, never, eliminate, only gibi ifadeler seçeneğin kapsamını şişirip şişirmediğini kontrol etmek için yararlıdır.",
        "Kendi bilgilerinle mantıklı görünen bir sonuç, metin desteklemiyorsa doğru değildir.",
      ],
      rule: {
        title: "Çıkarım sorularında temel kural",
        body: "Doğru çıkarım, metinde kelimesi kelimesine yazılmak zorunda değildir; ancak metindeki bilgilerle gerekçelendirilebilir olmalıdır. Konuya uygun olmak, metin tarafından desteklenmekle aynı şey değildir.",
      },
    },
    nextTitle: "Paragraf sorularını dört adımda çöz",
    nextSteps: [
      "Soru kökünü sınıflandır. Ana fikir mi, ayrıntı mı, çıkarım mı, gönderim mi soruluyor?",
      "İlgili kanıtı bul. Bütün paragrafı yeniden çevirmek yerine, soruyla ilişkili cümleleri incele.",
      "Seçeneklerin kapsamını kontrol et. “Bazı”yı “tümü”ne, “olabilir”i “kesinlikle olur”a dönüştüren seçeneklere dikkat et.",
      "Kanıtla doğrula. Doğru seçenek metindeki bir veya birkaç ifadeyle desteklenebilmeli; yanlış seçenek çelişki, aşırı genelleme veya desteklenmeyen çıkarım içermelidir.",
    ],
    misses: {
      title: "En sık yapılan hatalar",
      items: [
        "Paragrafın konusunu anlamayı, ana fikri bulmakla karıştırmak.",
        "Metinde geçen bir kelimeyi içerdiği için seçeneği doğru kabul etmek.",
        "Metnin söylemediği bir sonucu kendi genel bilgisine dayanarak çıkarmak.",
        "Olasılığı kesinliğe dönüştüren seçenekleri fark etmemek.",
        "Bir ayrıntıyı paragrafın ana fikri sanmak.",
      ],
    },
    beyondTitle: "Metinsel kanıtı takip et",
    beyondBody:
      "Okuma bölümünde “doğru cevabı bul” yetmez; “doğru cevabın metinsel kanıtını bul” gerekir. Yanlışını çelişki, aşırı genelleme, desteklenmeyen çıkarım veya kapsam hatası olarak ayır.",
    errorKinds: {
      title: "Yanlışını hangi kanıt hatasına bağla?",
      items: [
        "Metinle çelişki",
        "Aşırı genelleme / kapsam şişirme",
        "Desteklenmeyen çıkarım",
        "Ayrıntıyı ana fikir sanma",
        "Olasılığı kesinliğe çevirme",
      ],
    },
    lab: {
      code: "Reading Lab · 01",
      minutes: "Çıkarım · B2-C1 · yaklaşık 60 saniye",
      passage:
        "Some universities have introduced recorded lectures to give students greater flexibility. Students can revisit difficult sections and study at times that suit their schedules. Nevertheless, recorded lectures do not automatically improve learning outcomes. Their value may depend on how students use them and whether the recordings are integrated with other learning activities, such as discussion and practice.",
      stem: "Which of the following is best supported by the passage?",
      prompt: "Metinsel kanıtı en iyi koruyan seçeneği seç.",
      options: [
        {
          id: "A",
          text: "A) Recorded lectures are more effective than classroom teaching for all students.",
          correct: false,
          autopsy: "Metin sınıf öğretimiyle genel bir üstünlük karşılaştırması yapmaz; “all students” kapsamını da şişirir.",
        },
        {
          id: "B",
          text: "B) Students who use recorded lectures always achieve better results.",
          correct: false,
          autopsy:
            "do not automatically improve learning outcomes ifadesiyle çelişir; always kesinliği metinde yoktur.",
        },
        {
          id: "C",
          text: "C) Recorded lectures can offer flexibility, but their educational value may depend on how they are used.",
          correct: true,
          autopsy:
            "Esneklik faydasını ve “otomatik iyileşme yok / kullanıma bağlı değer” sınırını birlikte koruyan desteklenen çıkarımdır.",
        },
        {
          id: "D",
          text: "D) Universities should replace discussion and practice with recorded lectures.",
          correct: false,
          autopsy:
            "Metin tartışma ve pratiği kayıtlarla bütünleştirmenin değerini vurgular; bunların yerini alma önerisi yoktur.",
        },
        {
          id: "E",
          text: "E) Recorded lectures have no educational value unless students watch every recording more than once.",
          correct: false,
          autopsy:
            "“Hiç değeri yok” ve “her kaydı birden fazla izleme” koşulları metinde yoktur; aşırı genelleme ve uydurma koşuldur.",
        },
      ],
      revealTitle: "Metinsel kanıtı göster",
      structural:
        "Esneklik (revisit / schedules) + Nevertheless otomatik iyileşme yok + value may depend on use / integration: fayda ile koşul birlikte.",
      meaning:
        "Kayıtlı dersler esneklik sunabilir; ancak öğrenme değeri kullanıma ve diğer etkinliklerle bütünleşmeye bağlı olabilir. Desteklenen çıkarım budur.",
    },
    sources: [
      {
        cite: "Platas-García, Castro-Manzano & Reyes-Meza (2020)",
        title: "Reading comprehension as a complex phenomenon",
        venue: "Ricerche di Pedagogia e Didattica, 15(2), 17-37",
        summary:
          "Okuduğunu anlamayı ölçme, çıkarım ve yabancı dil boyutlarıyla inceler. Test özelliklerinin (uzunluk, karmaşıklık, çıkarım) performans üzerinde etkili olabildiğini; çıkarım türlerinin açıkça tanımlanmasının çoktan seçmeli okuma değerlendirmesinde önemli olduğunu vurgular.",
        productClaim:
          "Makul ürün kararı: çıkarım sorularında açık kanıt ile desteklenen çıkarımı ayırmak; all / every / eliminate gibi kapsam şişiricilerini çeldirici olarak göstermek. Bu çalışma, outklas.’ın belirli bir okuma rotasının puanı kesin artırdığını kanıtlamaz.",
        doi: "https://doi.org/10.6092/issn.1970-2221/9401",
      },
    ],
    disclaimer:
      "Bu sayfadaki sorular outklas. için özgün örneklerdir; çıkmış ÖSYM soruları değildir. ÖSYM’nin yayımladığı sınav sorularını kullanırken telif ve kullanım koşullarına ayrıca dikkat edilmelidir.",
    ctaLine: "outklas. Reading Lab: Metinsel kanıtı bul, çıkarımı sınırlandır ve çeldiricinin hangi noktada metinden uzaklaştığını gör.",
    ctaPrimary: { href: "/teshis", label: "Ücretsiz alıştırmayla test et →" },
    ctaSecondary: { href: "/bugun", label: "Günlük çalışmaya bak" },
  },
};

export function deepGuideFor(section: string): DeepGuide | undefined {
  return deepGuides[section as SectionId];
}
