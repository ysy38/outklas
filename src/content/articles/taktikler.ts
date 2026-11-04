import { brand } from "@/brand";
import type { Article } from "./types";

export const taktikler: Article = {
  path: "/yds-taktikleri",
  eyebrow: "YDS · YÖKDİL taktikleri",
  title: "YDS taktikleri:",
  accent: "önce cümleye, sonra şıkka bak.",
  metaTitle: "YDS ve YÖKDİL Taktikleri: Her Soru Tipinde Ne Aranır?",
  description:
    "YDS ve YÖKDİL taktikleri: yaygın taktiklerin nerede işe yarayıp nerede yanılttığı, her soru tipinde aranacak dil sinyali, 180 dakikalık süre planı ve boş bırakma kuralı.",
  lead:
    "En çok işe yarayan YDS taktiği tek bir kural olarak yazılamıyor. Her soruda aynı üç kontrolü yapıyorsun: cümlenin iskeleti ne, parçalar arasındaki ilişki ne, şık bu ilişkiyi ve iddianın kapsamını koruyor mu? Bu sayfada internette dolaşan taktiklerin nerede işe yarayıp nerede yanılttığını, her soru tipinde neye bakacağını ve 180 dakikayı nasıl böleceğini bulacaksın. YÖKDİL ve e-YÖKDİL için de geçerli.",
  sections: [
    {
      id: "uc-kontrol",
      title: "Üç kontrol: iskelet, ilişki, kapsam",
      blocks: [
        {
          kind: "steps",
          items: [
            {
              title: "İskelet",
              body: "Uzun cümlede araya giren yan cümleleri ve virgüllü ekleri ayır, asıl özneyi ve yüklemi bul. Şıklar çoğu zaman yan cümledeki bir ayrıntıyı cümlenin ana iddiasıymış gibi sunar. Bu kontrolü en çok [dil bilgisi](/rehber/grammar) ve [çeviri](/rehber/translation) sorularında kullanırsın.",
            },
            {
              title: "İlişki",
              body: "İki parçayı bağlayan kelime ilişkinin yönünü söyler. Zıtlık: although, however, whereas. Sebep: because, since, as. Sonuç: so, therefore, thus. Koşul: if, unless, provided that. Amaç: so that, in order to. Yön yanlışsa şık ne kadar akıcı okunursa okunsun yanlıştır. Hangi ilişkide karıştırdığını [bağlaç testinde](/yds-baglac-testi) görebilirsin.",
            },
            {
              title: "Kapsam",
              body: "Niceleyici (some, most, all), kiplik (may, must, will) ve olumsuzluk (not, hardly, no longer) iddianın büyüklüğünü belirler. Akademik metinler iddialarını bu tür sözcüklerle sürekli yumuşatır ([Hyland, 1998](#kaynak-hyland-1998)). Çeldirici de çoğu zaman bu yumuşatmayı kaldırır: most’u all’a, may’i will’e çevirir.",
            },
          ],
        },
        {
          kind: "p",
          text: "Bir cümle üzerinde bakalım:",
        },
        {
          kind: "example",
          sentence: "Although the new treatment reduced symptoms in most patients, researchers warn that its long-term effects remain unknown.",
          lines: [
            { label: "İskelet", text: "researchers warn: araştırmacılar uyarıyor. Asıl iddia virgülden sonra." },
            { label: "İlişki", text: "although: ilk parça ikinciyle zıt. Tedavi işe yaradı ama uzun vadesi belirsiz." },
            { label: "Kapsam", text: "most patients: hastaların hepsi değil. remain unknown: zararlı denmiyor, bilinmiyor." },
            { label: "Çeldirici 1", text: "“The treatment reduced symptoms in all patients.” most → all: kapsam şişirilmiş." },
            { label: "Çeldirici 2", text: "“Researchers have shown that the treatment is harmful in the long term.” Bilinmeyen bir şey kesin bilgiye çevrilmiş." },
            { label: "Çeldirici 3", text: "“Because the treatment reduced symptoms, its long-term effects are known.” Zıtlık sebebe çevrilmiş." },
          ],
        },
        {
          kind: "p",
          text: "Üç çeldiricinin üçü de cümledeki kelimeleri kullanıyor. Kelime benzerliğine bakan biri hepsine kanabilir. Üç kontrolü yapan biri ise her birini birkaç saniyede eler. Bunu ezberlemen gerekmiyor; her soruda aynı sırayla okumayı alışkanlık haline getirmen yeterli.",
        },
      ],
    },
    {
      id: "yaygin-taktikler",
      title: "Yaygın taktikler: nerede işe yarar, nerede yanıltır?",
      blocks: [
        {
          kind: "p",
          text: "İnternette dolaşan taktiklerin çoğu yarı doğru. Hangi durumda işe yaradığını bilmezsen, işe yaramadığı soruda seni yanlış şıkka götürüyor.",
        },
        {
          kind: "table",
          head: ["Taktik", "İşe yaradığı yer", "Yanılttığı yer"],
          rows: [
            [
              "Önce soruyu oku, sonra metne dön",
              "Ayrıntı sorularında aradığın yeri hızlı bulursun.",
              "Ana fikir ve çıkarım sorularında metnin bütününü anlamadan cevap bulunmuyor. Metni bir kez oku, sonra soruya geç. Soru türlerine göre [okuduğunu anlama rehberi](/rehber/reading).",
            ],
            ["Ana fikir ilk ya da son cümlededir", "Birçok paragraf bir konu cümlesiyle açılır.", "Paragraf however, yet, in fact gibi bir dönüşle ilerliyorsa asıl fikir dönüşten sonra gelir."],
            [
              "Metinde geçen kelimeyi içeren şıkkı seç",
              "Bazı ayrıntı sorularında doğru çıkar.",
              "Okumadaki en yaygın çeldirici tam olarak bu: kelime aynı, iddia farklı. Doğru şık aynı fikri çoğu zaman başka kelimelerle söyler.",
            ],
            [
              "always, never, only geçen şık yanlıştır",
              "Akademik metinler temkinli konuşur; kesin ifadeler sık çeldiricidir.",
              "Kural olarak alınmamalı. Metin “only” diyorsa doğru şıkta da kesinlik olur. Kelimeye değil, metnin kapsamına bak.",
            ],
            [
              "Bilmediğin kelimeyi kökten tahmin et",
              "Ek, kelimenin türünü ve bazen yönünü verir: -tion isim, mal- olumsuz.",
              "Anlamı vermez. İki şık aynı türdeyse kök seni ayıramaz; cümlenin olumlu mu olumsuz mu bir anlam istediğine bak. Ayrıntısı [kelime rehberinde](/rehber/vocabulary).",
            ],
            [
              "Şıklardaki bağlaca bakarak ele",
              "Cümle tamamlamada iki-üç şıkkı hızla eler.",
              "Aynı ilişkiyi kuran iki bağlaç arasında kalırsan yapıya bak: despite + isim, although + cümle.",
            ],
            [
              "Bol soru çöz",
              "Soru tipine alışırsın, hızlanırsın.",
              "Yanlışın nedenini bulmazsan aynı hatayı sadece daha hızlı yaparsın. Az soru çözüp her yanlışı çözümlemek çoğu zaman daha çok şey öğretir.",
            ],
          ],
        },
      ],
    },
    {
      id: "soru-tipleri",
      title: "Soru tiplerine göre taktikler",
      blocks: [
        {
          kind: "p",
          text: "Her soru tipi aynı üç kontrolün farklı bir yüzünü ölçüyor. Aşağıda her bölümde neye bakacağını kısaca yazdık. Açıklamalı örnek soru, adım adım çözüm ve en sık yapılan hatalar her bölümün rehber sayfasında.",
        },
        { kind: "sectionTips" },
      ],
    },
    {
      id: "sure",
      title: "Sınav günü: 180 dakikayı böl",
      blocks: [
        {
          kind: "table",
          head: ["Blok", "Soru", "Başlangıç bütçesi"],
          rows: [
            ["1–42: kelime, dil bilgisi, paragrafta boşluk, cümle tamamlama, çeviri", "42", "55 dakika"],
            ["43–62: okuduğunu anlama", "20", "65 dakika"],
            ["63–80: diyalog, anlamca yakın cümle, paragraf tamamlama, anlam bütünlüğü", "18", "40 dakika"],
            ["İşaretlediğin sorular ve kontrol", "—", "20 dakika"],
          ],
          caption: "YDS kitapçık sırasıyla. Bir başlangıç noktası; kendi hızına göre değiştir.",
        },
        {
          kind: "list",
          items: [
            "İlk [denemende](/deneme) her bloğun gerçekte kaç dakika sürdüğünü not et. Sonraki denemede bütçeyi kendi hızına göre düzelt.",
            "İki tur çöz. İlk turda emin olduklarını işaretle. Bir soruda 2 dakikayı geçtiysen en olası şıkkı işaretle, soruyu not al ve geç.",
            "Hiçbir soruyu boş bırakma. Yanlış doğruyu götürmüyor; boş da yanlış da puana sıfır olarak giriyor ([ÖSYM](#kaynak-osym)). Hesabın ayrıntısı [puan hesaplama](/yds-puan-hesaplama) sayfasında.",
            "Kâğıt sınavda cevapları blok blok optik forma geçir. Hepsini son dakikalara bırakırsan süre bittiğinde işaretleyemezsin.",
          ],
        },
      ],
    },
    {
      id: "yokdil",
      title: "YÖKDİL taktikleri: ne değişir?",
      blocks: [
        {
          kind: "list",
          items: [
            "Diyalog ve anlamca yakın cümle yok. Kitapçığın sonunda paragraf tamamlama ve anlam bütünlüğü 6’şar soru.",
            "Çeviri 12 soru, yani 15 puan. İskelet, ilişki ve kapsam kontrolü [çeviride](/rehber/translation) YDS’dekinin iki katı puan getirir.",
            "Dil bilgisi 14 soru. Zaman, edilgen yapı ve yan cümleleri tanımak burada doğrudan puana dönüşür.",
            "Okuma 15 soru. YDS’ye göre daha az, ama metinler senin alanından geliyor.",
            "Alan metinlerinde sağlıkta edilgen yapı, fende sebep-sonuç fiilleri (lead to, result in, trigger), sosyalde zıtlık bağlaçları sık geçer. Alan terimini bilmek hız kazandırır, soruyu yine yapı çözer.",
          ],
        },
      ],
    },
    {
      id: "kendi-hatan",
      title: "Taktiği okumak yetmez, kendi hatanı görmelisin",
      blocks: [
        {
          kind: "p",
          text: "Bir taktiği okumak, onu sınavda uygulayabileceğin anlamına gelmiyor. Okurken her şey mantıklı görünür, ama bu his ne kadar öğrendiğini abartır ([Bjork ve ark., 2013](#kaynak-bjork-2013)). Hangi kontrolü atladığını ancak kendi yanlışlarında görürsün. Kendini soru üzerinde sınamak da tekrar okumaktan daha kalıcı ([Roediger ve Karpicke, 2006](#kaynak-roediger-2006)).",
        },
        {
          kind: "list",
          items: [
            "Cümle Röntgeni bir soruyu açıyor: cümlenin iskeleti, cevabı belirleyen kritik ipucu ve her çeldiricinin seni nasıl kandırmaya çalıştığı.",
            `${brand.diagnosticQuestions} soruluk [seviye testi](/teshis) hangi soru tipinde puan kaybettiğini gösteriyor; taktiğe oradan başlarsın.`,
            "Yanlış yaptığın soru, kelime ve bağlaç aralıklarla geri geliyor. Bir taktik ancak tekrarlandıkça alışkanlığa dönüşür.",
          ],
        },
        {
          kind: "cta",
          text: "Hangi soru tipinde puan kaybettiğini 30 dakikada gör. Üyelik gerekmez.",
          href: "/teshis",
          label: "Ücretsiz seviye testi →",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "YDS’de en çok puan getiren taktik hangisi?",
      answer:
        "İki tane: hiçbir soruyu boş bırakmamak ve okumada kapsamı kontrol etmek. Boş bırakmak hiçbir şey kazandırmaz; işaretlediğin soru doğru çıkarsa puanın artar. Okuma 20 soru ve 25 puan. Oradaki çeldiricilerin çoğu kapsamı değiştirir (most → all, may → will).",
    },
    {
      question: "YDS’de boş bırakmalı mıyım?",
      answer:
        "Hayır. Yanlış doğruyu götürmüyor; boş da yanlış da puana sıfır olarak giriyor. Süre bitmeden her soruyu işaretle. [Puan hesaplama](/yds-puan-hesaplama) sayfasında ayrıntısı var.",
    },
    {
      question: "Okuma sorularına ne kadar süre ayırmalıyım?",
      answer:
        "Başlangıç için 20 soruya yaklaşık 65 dakika, yani metni okumak dahil soru başına 3 dakikadan biraz fazla. Denemelerde kendi süreni ölç. Cümle düzeyindeki sorularda hızlandıkça okumaya daha çok zaman kalır.",
    },
    {
      question: "YÖKDİL taktikleri YDS’den farklı mı?",
      answer:
        "Kontroller aynı, ağırlık farklı. YÖKDİL’de diyalog ve anlamca yakın cümle yok; çeviri 12 soruyla 15 puan ediyor. Bu yüzden çeviri tekniği YÖKDİL’de daha çok puan getiriyor.",
    },
    {
      question: "Taktikle 70 alınır mı?",
      answer:
        "Taktik bildiğini puana çevirir, bilmediğinin yerini tutmaz. Seviye testinde kelime ve dil bilgisinde çok puan kaybediyorsan önce oraya çalış; taktik en çok bu temel oturduktan sonra fark yaratıyor. Hedefe göre hangi bölümden kaç doğru gerektiğini [70, 80, 90 sayfasında](/yds-70-80-90-nasil-alinir) bulabilirsin.",
    },
  ],
  sources: ["osym", "hyland-1998", "bjork-2013", "roediger-2006"],
  related: [
    { label: "YDS ve YÖKDİL hazırlık", href: "/yds-hazirlik" },
    { label: "YDS’den 70, 80, 90 nasıl alınır?", href: "/yds-70-80-90-nasil-alinir" },
    { label: "YDS’ye sıfırdan hazırlık", href: "/yds-sifirdan-hazirlik" },
    { label: "Bölüm rehberi: 10 soru tipi", href: "/rehber" },
    { label: "YDS bağlaç testi", href: "/yds-baglac-testi" },
    { label: "Ücretsiz deneme sınavı", href: "/deneme" },
  ],
};
