import { brand } from "@/brand";
import { allowanceRows, readingCeilingRows, splitRows } from "@/content/target-scores";
import type { Article } from "./types";

export const hedefPuan: Article = {
  path: "/yds-70-80-90-nasil-alinir",
  eyebrow: "YDS · YÖKDİL · hata bütçesi",
  title: "YDS’de 70, 80 ve 90:",
  accent: "üç bant, üç ayrı hata bütçesi.",
  metaTitle: "YDS 70, 80, 90: 56 / 64 / 72 Doğru ve Band Band Hata Hakkı",
  description:
    "YDS ve YÖKDİL’de 70=56 doğru, 80=64, 90=72. Okuma tavanı hesabı: 20 okuma sorusunda 8 doğruyla 90 matematiksel olarak kapanır. Her bandın tuttuğu hata türü ve YÖKDİL çeviri bütçesi.",
  lead:
    "Bu sayfa hazırlık döngüsü değil; o [YDS hazırlık](/yds-hazirlik) sayfasında. Sıfırdan sıra da değil; o [ilk 12 haftada](/yds-sifirdan-hazirlik). Burada tek hesap var: 70, 80 ve 90 aynı sınavın üç farklı bütçesi. 70 için 56 doğru (24 hata hakkı), 80 için 64 (16 hak), 90 için 72 (8 hak). Yanlış doğruyu götürmez ([ÖSYM](#kaynak-osym)). Bandı kaçıran şey genelde “daha çok çalışmak” değil, hata hakkını pahalı bir bölüme harcamaktır.",
  sections: [
    {
      id: "uc-butce",
      title: "Üç bant = üç bütçe",
      blocks: [
        {
          kind: "p",
          text: "Her doğru 1,25 puan. Hedefi “kaç yanlış yapabilirim” diye okumak daha kullanışlı: hakkın yanlış ve boşların toplamıdır.",
        },
        {
          kind: "table",
          head: ["Hedef puan", "En az doğru", "Hata hakkı", "Düzey"],
          rows: allowanceRows(),
          caption: "80 soru geçerliyken. İptal edilen soru varsa [puan hesaplama](/yds-puan-hesaplama) aracını kullan.",
        },
        {
          kind: "list",
          items: [
            "70 bir cümle sınavıdır. Hakkın 24. Asıl kaçak: bağlaç yönü ve zaman. Çeldiricinin ince katmanı henüz asıl dert değil.",
            "80 bir çeldirici sınavıdır. Hakkın 16. Çoğu aday soruyu iki şıkka indirir, puanı orada kaybeder.",
            "90 bir dayanıklılık sınavıdır. Hakkın 8, bölüm başına neredeyse bir. Son 20 dakikadaki okuma yorgunluğu, bilgiden pahalıya gelir.",
          ],
        },
      ],
    },
    {
      id: "okuma-tavani",
      title: "Okuma tavanı: 8/20 ile 90 kapanır",
      blocks: [
        {
          kind: "p",
          text: "YDS’de okuma 20 soru, geri kalan 60. Geri kalanın hepsini doğru yapsan bile okuma skorun tavanı kilitler. Bu tablo uydurma bir “strateji” değil; 60 + okuma doğrusu, çarpı 1,25.",
        },
        {
          kind: "table",
          head: ["Okuma doğrusu", "Toplam doğru (kalan 60 tam)", "Puan", "Tavan"],
          rows: readingCeilingRows(),
          caption: "Kalan 60 soruda hiç yanlış yok varsayımı. Gerçekte orada da hata olur; tablo tavanı gösterir, vaat etmez.",
        },
        {
          kind: "p",
          text: "Okumada 8 doğru, kalan her şey tam olsa bile 68 doğru = 85 puan. 90 için 72 doğru gerekir; yani okumada en az 12/20, üstelik kalan 60’ta sıfır hata ile. 80 için tavan daha rahat: teoride 4/20 okuma yeter, pratikte kalan 60’ı temiz tutmak 4 okuma kadar zor. 70 için okumayı tamamen bırakmak matematiksel olarak mümkün (56/60 başka yerden) ama 20 soruyu boş bırakmak 25 puanı çöpe atmak.",
        },
      ],
    },
    {
      id: "dagilim",
      title: "Hata hakkını bölümlere yaz",
      blocks: [
        {
          kind: "p",
          text: "Her bölüm aynı oranda iyileşmek zorunda değil. Her doğru 1,25. Aşağıdaki dağılım YDS için bir örnek; senin dağılımın seviye testindeki doğru oranına göre değişir.",
        },
        {
          kind: "table",
          head: ["Bölüm (soru)", "70 için doğru", "80 için doğru", "90 için doğru"],
          rows: splitRows("yds"),
          caption: "Örnek. 70’te okumada 6 yanlış hakkın var; 90’da bu hak 2.",
        },
      ],
    },
    {
      id: "yetmis",
      title: "70: ilk 42 soruyu ucuza kapat",
      blocks: [
        {
          kind: "p",
          text: "50–65 bandında sık görülen kaçak: kelimeyi tanıyorsun, cümle ikiye bölününce ilişkiyi kaçırıyorsun. Zıtlık isteyen yere sebep, çeviride may ile must. 70 için 24 hata hakkı büyük görünür; bunun 8–10’unu okumaya ayırıp cümle sorularını temizleyenler 70’i okumadan “kurtarmaya” çalışanlardan ucuza çıkar.",
        },
        {
          kind: "list",
          items: [
            "Önce [kelime](/rehber/vocabulary), [dil bilgisi](/rehber/grammar), [boşluk](/rehber/cloze), [cümle tamamlama](/rehber/sentence), [çeviri](/rehber/translation): 42 soru, 52,5 puan.",
            "Bağlaçları liste ezberi değil ilişki türü olarak çalış. [Bağlaç testi](/yds-baglac-testi) hangisinde karıştırdığını gösterir.",
            "Okumada ayrıntı sorusu en ucuz puan: cevap metinde yazılı.",
            "Kelimeyi her gün cümlenin içinde hatırlamaya çalış. Öğrenildikten sonra da hatırlamaya zorlanan kelimeler bir hafta sonra ~%80, yalnızca tekrar edilenler ~1/3 ([Karpicke ve Roediger, 2008](#kaynak-karpicke-2008)).",
          ],
        },
      ],
    },
    {
      id: "seksen",
      title: "80: son iki şıkta hangi mekanizma var?",
      blocks: [
        {
          kind: "p",
          text: "70’i geçen biri soruyu iki şıkka indirir. 16 hata hakkının çoğu orada biter. 80, yeni konu öğrenmek değil; çeldiricinin hangi katmandan geldiğini adlandırmaktır. Üç katmanın örneği [çeldirici yazısında](/blog/yds-yokdil-celdirici-nasil-tespit-edilir).",
        },
        {
          kind: "list",
          items: [
            "Kapsam şişirme: most → all, may → will, some → every. Akademik metin iddiayı yumuşatır ([Hyland, 1998](#kaynak-hyland-1998)); şık metinden sertse elenir.",
            "Ters ilişki: sebep-sonuç yer değiştirmiş, zıtlık sebebe dönmüş.",
            "Sahte olumsuzluk: metinde olmayan not, ya da metindeki not’un düşmesi.",
            "Kelime cımbızı: metindeki kelime aynen durur, cümle başka şey söyler.",
            "Soru 63–80: [diyalog](/rehber/dialogue), [anlamca yakın](/rehber/restatement), [paragraf tamamlama](/rehber/paragraph), [anlam bütünlüğü](/rehber/irrelevant). Örnek 80 dağılımında buradan 4 yanlış var; 16 hakkın dörtte biri.",
          ],
        },
      ],
    },
    {
      id: "doksan",
      title: "90: 8 hak, son 20 dakika",
      blocks: [
        {
          kind: "p",
          text: "8 hata = bölüm başına en fazla bir. Okuma tavanı tablosu 12/20 okuma olmadan 90’ın kilitlendiğini gösteriyor. Bu bantta yeni gramer konusu nadiren belirleyici. Belirleyici olan: işaretleme, iki şıkta metne dönmeden karar, son 20 dakikada okuma hızı.",
        },
        {
          kind: "list",
          items: [
            "Her denemeden sonra yanlışları ayır: bilgi, ilişki, kapsam, dikkat, süre. 90’da dikkat+süre payı çoğu zaman bilgiden büyük.",
            "Okumada cevabı “bence” ile değil, dayandığı cümleyle işaretle. Ayrıntı [okuma rehberinde](/rehber/reading).",
            "[Denemeyi](/deneme) 180 dakikada bitir, son 20’yi kontrole bırak. Süre planı [taktikler](/yds-taktikleri#sure) sayfasında.",
          ],
        },
      ],
    },
    {
      id: "yokdil",
      title: "YÖKDİL’de 80: çeviride 2’den fazla yanlış, bütçeyi yer",
      blocks: [
        {
          kind: "p",
          text: "Hesap aynı, ağırlık değil. Çeviri 12 soru = 15 puan. 80’de 16 hata hakkın var; çeviride 4 yanlış 5 puandır, hakkın neredeyse üçte biri. Dil bilgisi 14 soru. Diyalog ve restatement yok; o haklar burada harcanmaz, çeviri ve dil bilgisine kayar.",
        },
        {
          kind: "table",
          head: ["Bölüm (soru)", "70 için doğru", "80 için doğru", "90 için doğru"],
          rows: splitRows("yokdil"),
          caption: "Örnek. YÖKDİL 80 hedefinde çeviride 2’den fazla yanlış, 16 hakkın büyük dilimini tek bölüme yakar.",
        },
      ],
    },
    {
      id: "olc",
      title: "Kendi tavanını ölç",
      blocks: [
        {
          kind: "p",
          text: `${brand.diagnosticQuestions} soruluk seviye testi bölüm bölüm doğru oranını ölçer, sınavdaki soru sayısıyla çarpar. Rapor “çalış” demez; hedefine en ucuz puanın hangi bölümden geleceğini sıralar. Okumada 8/20 ise 90’ı kovalamadan önce o tavanı konuşmak gerekir.`,
        },
        {
          kind: "cta",
          text: "Hedefine kaç doğru kaldığını ve o doğruların hangi bölümden geleceğini gör.",
          href: "/teshis",
          label: "Ücretsiz seviye testi →",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "YDS 70 için kaç net gerekir?",
      answer: "56 doğru. Yanlış ve boşların toplamı 24’ü geçmesin. YÖKDİL ve e-YDS’de de aynı. Net değil doğru: yanlış doğruyu götürmez.",
    },
    {
      question: "YDS 80 almak için kaç yanlış yapılabilir?",
      answer: "16. 80 için 64 doğru. Hakkını çeviri veya okumada toplu yakmak 80’i, 70’ten daha pahalıya kapatır.",
    },
    {
      question: "Okuma zayıfken 80 alınır mı?",
      answer:
        "Matematik: kalan 60 soru tam, okuma 4/20 olsa bile 64 doğru = 80. Pratikte kalan 60’ı temiz tutmak zor. Okuma 8/20 ve kalan yerlerde de 8 hata varsa 64’e inersin; 80 kaçar.",
    },
    {
      question: "YDS 90 için okumadan kaç yanlış yapılır?",
      answer:
        "Tavan hesabı: kalan 60 tamken okumada en fazla 8 yanlış (12 doğru) 90’ı açık tutar. Kalan yerde de hata varsa okuma hakkı 8’in altına iner.",
    },
    {
      question: "YÖKDİL 80 için çeviride kaç yanlış hakkı var?",
      answer:
        "Bütçenin bütünü 16. Çeviri 12 soru, 15 puan. 4 çeviri yanlışı 5 puan eder; 16 hakkın üçte birine yakın. Örnek dağılımda 80 için çeviride 10 doğru, yani 2 yanlış.",
    },
  ],
  sources: ["osym", "karpicke-2008", "hyland-1998"],
  related: [
    { label: "YDS puan hesaplama", href: "/yds-puan-hesaplama" },
    { label: "YDS’ye sıfırdan: ilk 12 hafta", href: "/yds-sifirdan-hazirlik" },
    { label: "YDS ve YÖKDİL hazırlık döngüsü", href: "/yds-hazirlik" },
    { label: "YDS ve YÖKDİL taktikleri", href: "/yds-taktikleri" },
    { label: "Çeldirici nasıl tespit edilir?", href: "/blog/yds-yokdil-celdirici-nasil-tespit-edilir" },
    { label: "Okuduğunu anlama rehberi", href: "/rehber/reading" },
  ],
};
