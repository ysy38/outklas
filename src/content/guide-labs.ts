import type { SectionId } from "@/modules/exam/blueprint";

export type GuideOption = {
  id: string;
  text: string;
  correct: boolean;
  autopsy: string;
};

export type GuideWorked = {
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
};

export function deepGuideFor(section: string): DeepGuide | undefined {
  return deepGuides[section as SectionId];
}
