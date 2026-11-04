import { brand } from "@/brand";
import { allowanceRows, splitRows } from "@/content/target-scores";
import type { Article } from "./types";

export const hedefPuan: Article = {
  path: "/yds-70-80-90-nasil-alinir",
  eyebrow: "YDS · YÖKDİL hedef puan",
  title: "YDS’den 70, 80, 90:",
  accent: "hata hakkını nereye harcayacaksın?",
  metaTitle: "YDS’den 70, 80, 90 Nasıl Alınır? Kaç Doğru, Hangi Bölüm",
  description:
    "YDS ve YÖKDİL’de 70 için 56, 80 için 64, 90 için 72 doğru gerekir. Hata hakkını hangi bölümde harcayacağın, her bantta seni tutan hata türü ve hedefe göre çalışma önceliği.",
  lead:
    "YDS’de 70 için 56, 80 için 64, 90 için 72 doğru gerekir; YÖKDİL’de de aynı. Tersinden bakınca daha kullanışlı olur: 70 için 24, 80 için 16, 90 için 8 soruluk hata hakkın var. Hedefe ulaşmanın yolu bu hakkı bilerek harcamaktır: puan kaybını en ucuza kapatacağın bölümden başlamak ve her bantta seni tutan hata türünü tanımak.",
  sections: [
    {
      id: "hata-hakki",
      title: "Hedefe göre doğru sayısı ve hata hakkı",
      blocks: [
        {
          kind: "p",
          text: "Puan yalnızca doğru sayısından hesaplanıyor: her doğru 1,25 puan, yanlış doğruyu götürmüyor ([ÖSYM](#kaynak-osym)). Bu yüzden hedefi “kaç yanlış yapabilirim” diye düşünmek daha kolay.",
        },
        {
          kind: "table",
          head: ["Hedef puan", "En az doğru", "Hata hakkı", "Düzey"],
          rows: allowanceRows(),
          caption: "80 soru geçerliyken. Hata hakkı yanlış ve boşların toplamıdır. İptal edilen soru varsa [puan hesaplama](/yds-puan-hesaplama) aracını kullan.",
        },
      ],
    },
    {
      id: "dagilim",
      title: "Hata hakkını bölümlere dağıt",
      blocks: [
        {
          kind: "p",
          text: "Her bölümü aynı oranda iyileştirmek zorunda değilsin. Hangi bölümden gelirse gelsin her doğru 1,25 puandır. Bir bölümde %90’a çıkmak, diğerinde %60’ta kalmayı telafi eder. Aşağıdaki tablo YDS için bir örnek dağılım:",
        },
        {
          kind: "table",
          head: ["Bölüm (soru)", "70 için doğru", "80 için doğru", "90 için doğru"],
          rows: splitRows("yds"),
          caption: "Örnektir. Kendi dağılımın, seviye testinde hangi bölümde ne kadar doğru yaptığına göre değişir.",
        },
        {
          kind: "p",
          text: "Tabloda dikkat edilecek nokta okuma: 70 hedefinde 20 sorudan 14’ü yeterli, yani 6 yanlış hakkın var. 90 hedefinde bu hak 2’ye düşer. Okuma ne kadar zayıfsa, diğer bölümlerde o kadar az hata yapman gerekir.",
        },
      ],
    },
    {
      id: "yetmis",
      title: "70 için: cümle düzeyini sağlamlaştır",
      blocks: [
        {
          kind: "p",
          text: "50–65 bandında sık rastlanan durum şu: kelimeyi tanıyorsun ama cümle iki parçaya ayrılınca aradaki ilişkiyi kaçırıyorsun. Zıtlık isteyen yere sebep koyuyorsun, çeviride “may” ile “must” arasındaki farkı atlıyorsun.",
        },
        {
          kind: "list",
          items: [
            "Önce ilk 42 soru: [kelime](/rehber/vocabulary), [dil bilgisi](/rehber/grammar), [paragrafta boşluk](/rehber/cloze), [cümle tamamlama](/rehber/sentence) ve [çeviri](/rehber/translation). Toplam 52,5 puan ve her biri bir okuma sorusundan kısa sürüyor. Buradaki hata oranını düşürürsen okumaya da süre kalır.",
            "Bağlaçları tek tek ezberleme, ilişki türüne göre çalış: zıtlık, sebep, sonuç, koşul, amaç. [Bağlaç testi](/yds-baglac-testi) hangisinde karıştırdığını gösterir.",
            "Okumada önce ayrıntı sorularına odaklan. Cevabı metinde açıkça yazan sorular en ucuz puan.",
            "Kelimeyi her gün ve cümlenin içinde çalış; 70’in önündeki en sık engel hâlâ kelime. Listeyi tekrar okumak yerine anlamı hatırlamaya çalış. Bir deneyde bu sayede bir hafta sonra hatırlanan kelime oranı üçte birden %80 civarına çıkmış ([Karpicke ve Roediger, 2008](#kaynak-karpicke-2008)).",
          ],
        },
      ],
    },
    {
      id: "seksen",
      title: "80 için: çeldiricinin nasıl çalıştığını gör",
      blocks: [
        {
          kind: "p",
          text: "70 bandındaki biri çoğu soruyu iki şıkka indirebiliyor. Puanı da bu son iki şıkta kaybediyor. 80’e çıkmak, bu iki şık arasında doğru kararı vermeyi öğrenmek demek. Bunun yolu da çeldiricinin hangi mekanizmayla yazıldığını tanımaktan geçiyor.",
        },
        {
          kind: "list",
          items: [
            "Kapsam: most → all, may → will, some → every. Akademik metinler iddiayı yumuşatarak kurar ([Hyland, 1998](#kaynak-hyland-1998)). Şık metinden daha büyük bir iddiada bulunuyorsa ele.",
            "Ters ilişki: metindeki sebep-sonuç yer değiştirmiş ya da zıtlık sebebe çevrilmiş.",
            "Sahte olumsuzluk: metinde olmayan bir “not” ekleyen ya da tersine metindeki olumsuzluğu düşüren şık.",
            "Kelime cımbızlama: metindeki kelimeyi aynen kullanan ama başka bir şey söyleyen şık.",
            "Son 18 soru, yani 63–80 arası [diyalog](/rehber/dialogue), [anlamca yakın cümle](/rehber/restatement), [paragraf tamamlama](/rehber/paragraph) ve [anlam bütünlüğü](/rehber/irrelevant) sorularının hepsi çeldirici mantığına dayanıyor. Örnek dağılımda 80 için buradan 4 yanlış var.",
          ],
        },
        {
          kind: "p",
          text: "Bu mekanizmaları bir örnek cümle üzerinde [YDS taktikleri](/yds-taktikleri) sayfasında gösteriyoruz.",
        },
      ],
    },
    {
      id: "doksan",
      title: "90 için: hata türünü sıfıra yaklaştır",
      blocks: [
        {
          kind: "p",
          text: "8 hata hakkı, bölüm başına neredeyse en fazla bir yanlış demek. Bu bantta belirleyici olan bilgiden çok tutarlılık: son 20 dakikada okuma yorgunluğu, işaretleme hatası, iki şıkta kalınca metne dönmeden karar vermek.",
        },
        {
          kind: "list",
          items: [
            "Her denemeden sonra yanlışlarını nedenine göre ayır: bilgi (kelime ya da yapı), ilişki, kapsam, dikkat, süre. 90 bandında dikkat ve süre payı genellikle bilgiden büyüktür.",
            "Okumada her cevabın dayandığı cümleyi bul ve “bence” diye değil, metindeki kanıta göre işaretle. Soru türlerine göre ayrıntı [okuduğunu anlama rehberinde](/rehber/reading).",
            "[Denemeyi](/deneme) gerçek sürede çöz ve son 20 dakikayı kontrole ayır. Süre planı için [taktikler](/yds-taktikleri#sure) sayfasına bak.",
          ],
        },
      ],
    },
    {
      id: "yokdil",
      title: "YÖKDİL’de 70, 80, 90",
      blocks: [
        {
          kind: "p",
          text: "Hesap aynı, dağılım farklı. Diyalog ve anlamca yakın cümle yok; çeviri 12, dil bilgisi 14, okuma 15 soru. Örnek dağılım:",
        },
        {
          kind: "table",
          head: ["Bölüm (soru)", "70 için doğru", "80 için doğru", "90 için doğru"],
          rows: splitRows("yokdil"),
          caption: "Örnektir. YÖKDİL’de çeviri 15 puan taşıdığı için 80 hedefinde çeviride 2’den fazla yanlış, hata hakkının büyük kısmını tek bölüme harcamak olur.",
        },
      ],
    },
    {
      id: "olc",
      title: "Önce hangi bölümden kaç puan kaybettiğini ölç",
      blocks: [
        {
          kind: "p",
          text: `Yukarıdaki dağılımlar örnek. Seninkini görmek için ${brand.diagnosticQuestions} soruluk seviye testi bölüm bölüm doğru oranını ölçer ve sınavdaki ağırlığıyla çarpar. Rapor bölümleri puan kaybına göre sıralar; hedefine en ucuza nereden yaklaşacağını gösterir.`,
        },
        {
          kind: "cta",
          text: "Hedefine kaç doğru uzak olduğunu ve o doğruların hangi bölümden geleceğini gör.",
          href: "/teshis",
          label: "Ücretsiz seviye testi →",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "YDS’den 70 almak için kaç doğru gerekir?",
      answer: "56 doğru. Yanlış ve boşların toplamı 24’ü geçmemeli. YÖKDİL ve e-YDS’de de aynı.",
    },
    {
      question: "YDS’de 80 için kaç yanlış hakkım var?",
      answer: "16. 80 için 64 doğru gerekir; kalan 16 soru yanlış ya da boş olabilir. Yanlış doğruyu götürmez.",
    },
    {
      question: "Okumayı bırakıp diğer bölümlerle 70 alınır mı?",
      answer:
        "Hesap olarak mümkün ama gerçekçi değil. Okumada hiç doğru yapmazsan diğer 60 sorudan 56’sını bilmen gerekir. Okumayı bırakmak yerine ayrıntı sorularından başla; cevabı metinde açıkça yazar.",
    },
    {
      question: "YDS’den 70 almak için ne kadar çalışmalıyım?",
      answer:
        "Bugünkü puanına bağlı. 60’tan 70’e çıkmak 8 doğru, 45’ten 70’e çıkmak 20 doğru demek. Başlangıç noktana göre kaba süreleri [sıfırdan hazırlık](/yds-sifirdan-hazirlik) sayfasında bulursun.",
    },
    {
      question: "90 için hangi bölüm en önemli?",
      answer:
        "Okuma: 20 soru, 25 puan. Örnek dağılımda 90 için buradan 2 yanlış var. Ama 90’ı belirleyen çoğu zaman tek bir bölüm değil, bütün bölümlerde aynı dikkat düzeyini 180 dakika boyunca korumaktır.",
    },
  ],
  sources: ["osym", "karpicke-2008", "hyland-1998"],
  related: [
    { label: "YDS puan hesaplama", href: "/yds-puan-hesaplama" },
    { label: "YDS ve YÖKDİL taktikleri", href: "/yds-taktikleri" },
    { label: "YDS ve YÖKDİL hazırlık", href: "/yds-hazirlik" },
    { label: "YDS’ye sıfırdan hazırlık", href: "/yds-sifirdan-hazirlik" },
    { label: "Okuduğunu anlama rehberi", href: "/rehber/reading" },
    { label: "Ücretsiz deneme sınavı", href: "/deneme" },
  ],
};
