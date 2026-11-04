import { brand } from "@/brand";
import type { Article } from "./types";

export const sifirdan: Article = {
  path: "/yds-sifirdan-hazirlik",
  eyebrow: "YDS · YÖKDİL sıfırdan",
  title: "YDS’ye sıfırdan hazırlık:",
  accent: "hangi sırayla, ne kadar sürede?",
  metaTitle: "YDS’ye Sıfırdan Nasıl Hazırlanılır? Sıra ve Süre",
  description:
    "YDS ve YÖKDİL’e sıfırdan hazırlanacaksan: nereden başlanır, hangi sırayla çalışılır, kaç ay sürer, ilk 4 haftada ne yapılır. Gerçekçi süre tablosu ve ücretsiz seviye testi.",
  lead:
    "Sıfırdan başlayanlar en çok vakti sınavın sormadığı işlere harcıyor: konuşma, yazma, kural ezberi. YDS ve YÖKDİL senden İngilizce üretmeni beklemiyor; okuduğun cümleyi doğru çözümlemeni bekliyor. Önerdiğimiz sıra şu: önce cümlenin iskeletini kuran yapılar ve bağlaçlar, bunlarla aynı anda her gün az ama düzenli kelime, sonra cümle düzeyindeki soru tipleri, en son okuma ve deneme. Ne kadar süreceğini başlangıç noktan belirliyor, o yüzden önce onu ölç.",
  sections: [
    {
      id: "sifir-neresi",
      title: "Önce senin “sıfır”ın neresi, onu bul",
      blocks: [
        {
          kind: "table",
          head: ["Durumun", "Belirtisi", "İlk iş"],
          rows: [
            ["Gerçek sıfır", "Kısa bir İngilizce cümlede fiili bulamıyorsun.", "Temel yapılar: zamanlar, edilgen yapı, yan cümleler. Soru çözmeye birkaç hafta sonra geç."],
            ["Lise ya da üniversite temeli", "Cümleyi tanıyorsun ama uzun cümlede kayboluyorsun; kelime eksik.", "Cümle çözümleme ve kelimeyle başla, soru tiplerine erkenden geç."],
            ["Dili biliyorsun, sınavı bilmiyorsun", "Metni anlıyorsun ama şıklarda ikide kalıyorsun.", "Doğrudan soru tipleri ve çeldirici mantığı. Birkaç hafta içinde tam deneme. [Taktikler](/yds-taktikleri) sayfasından başla."],
          ],
        },
        {
          kind: "p",
          text: `Kendini bu tabloya göre tahmin etmek zorunda değilsin. ${brand.diagnosticQuestions} soruluk [seviye testi](/teshis) yaklaşık ${brand.diagnosticMinutes} dakika sürüyor ve hangi bölümde ne kadar puan kaybettiğini gösteriyor. Sıfıra yakınsan sonuç düşük çıkacak, bu gayet normal. Bu testte puandan çok nereden başlayacağın önemli.`,
        },
      ],
    },
    {
      id: "sira",
      title: "Sıfırdan hazırlığın sırası",
      blocks: [
        {
          kind: "steps",
          items: [
            {
              title: "Cümlenin iskeletini kuran yapılar",
              body: "YDS kuralı yazdırmıyor, cümlenin içinde tanımanı istiyor. Önce şunları tanıyabilir hale gel: zamanlar ve edilgen yapı, sıfat cümlecikleri (who, which, that), isim cümlecikleri (what, whether, that), koşul cümleleri ve bağlaçlar. Kuralı açıkça görerek çalışmanın işe yaradığını 49 çalışmayı birleştiren bir meta-analiz de destekliyor ([Norris ve Ortega, 2000](#kaynak-norris-2000)). Yine de amaç bir gramer kitabını bitirmek olmamalı; uzun bir cümlede asıl özneyi ve yüklemi bulabildiğinde bu adım tamamdır. Soru tipine göre anlatım [dil bilgisi rehberinde](/rehber/grammar).",
            },
            {
              title: "Her gün kelime, cümlenin içinde",
              body: "Yazılı bir metni rahat anlamak için kelimelerinin yaklaşık %98’ini tanımak gerekiyor; bu da 8.000–9.000 kelime ailesine karşılık geliyor ([Nation, 2006](#kaynak-nation-2006)). Bu sayı gözünü korkutmasın, sınavda şıklar ve bağlam işini kolaylaştırıyor. Ama kelimenin neden her gün ve az az çalışılması gerektiğini de açıklıyor. Kelimeyi listede değil, bir cümlenin içinde gör ve şıklar arasından anlamını seç; aynı kelimeyle farklı cümlelerde karşılaştıkça bilgin derinleşir ([Webb, 2007](#kaynak-webb-2007)). Akademik metinlerde sık geçen 570 kelime ailesi iyi bir başlangıç listesi ([Coxhead, 2000](#kaynak-coxhead-2000)). Fiili edatıyla birlikte öğren: depend on, contribute to, result in.",
            },
            {
              title: "Cümle düzeyindeki soru tipleri",
              body: "Kelime, dil bilgisi, paragrafta boşluk, cümle tamamlama ve çeviri ilk 42 soruyu oluşturuyor; toplamı 52,5 puan. Birinci adımda kazandığın beceri doğrudan buraya yansır. Okumadan önce bunlara geç: puanın yarısından fazlası burada ve okumada gereken cümle çözümlemesi de burada hızlanır. Her birinin çözüm adımları rehberde: [kelime](/rehber/vocabulary), [paragrafta boşluk](/rehber/cloze), [cümle tamamlama](/rehber/sentence), [çeviri](/rehber/translation).",
            },
            {
              title: "Okuma, paragraf soruları, deneme",
              body: "Okuma 20 soru ve 25 puan. Önce süre tutmadan çalış ve her cevabın dayandığı cümleyi metinde işaretle; sonra süre tutmaya başla ([okuduğunu anlama rehberi](/rehber/reading)). Tam [denemeye](/deneme) cümle düzeyindeki sorularda oturduktan sonra geç. Erken çözülen deneme sadece düşük bir sayı gösterir.",
            },
          ],
        },
      ],
    },
    {
      id: "kac-ay",
      title: "Kaç ayda hazırlanılır?",
      blocks: [
        {
          kind: "p",
          text: "Kesin bir süre yok; ÖSYM de böyle bir süre vermiyor. Süreyi bugünkü puanın, hedefin ve haftada ayırabildiğin zaman belirliyor. Aşağıdaki aralıklar, günde yaklaşık 1–1,5 saat düzenli çalışan biri için kaba bir çerçeve. Söz olarak değil, fikir vermesi için yazdık.",
        },
        {
          kind: "table",
          head: ["Başlangıç", "60 civarı için", "70 ve üstü için"],
          rows: [
            ["Gerçek sıfır", "6–9 ay", "9–12 ay"],
            ["Lise ya da üniversite temeli", "3–5 ay", "5–7 ay"],
            ["Dili biliyor, sınavı bilmiyor", "1–2 ay", "2–4 ay"],
          ],
          caption: "Kaba tahmindir. Senin süren seviye testinden sonra, sınav tarihine göre kurulan planda netleşir.",
        },
        {
          kind: "p",
          text: "Süreyi kısaltan şey, saati artırmaktan çok o saatin nereye gittiği. Aynı içeriği tek oturuma yığmak yerine günlere yaymak da daha kalıcı ([Cepeda ve ark., 2006](#kaynak-cepeda-2006)). Puan farkını doğru sayısına çevirmek de işe yarar: 50’den 70’e çıkmak 16 doğru daha demek. O 16 doğrunun hangi bölümden gelebileceğini [70, 80, 90 sayfasında](/yds-70-80-90-nasil-alinir) gösteriyoruz.",
        },
      ],
    },
    {
      id: "ilk-4-hafta",
      title: "İlk 4 hafta",
      blocks: [
        {
          kind: "table",
          head: ["Hafta", "Odak", "Her gün"],
          rows: [
            ["1", "Seviye testi; zamanlar ve edilgen yapı", "20 dakika yapı, 10 kelime, 10 bağlaç"],
            ["2", "Sıfat ve isim cümlecikleri; uzun cümlede özne ve yüklemi bulmak", "25 dakika yapı, 10 kelime, 5 dil bilgisi sorusu"],
            ["3", "Bağlaçlar: zıtlık, sebep, sonuç, koşul, amaç", "20 dakika bağlaç, 10 kelime, 10 cümle tamamlama sorusu"],
            ["4", "Çeviri ve kelime soruları; ilk tekrarlar", "6 çeviri, 6 kelime sorusu, önceki yanlışlar"],
          ],
          caption: "Gerçek sıfırdan başlıyorsan her haftayı iki haftaya yay. Üçüncü haftadan önce [bağlaç testini](/yds-baglac-testi) çözmek hangi ilişkide zorlandığını gösterir.",
        },
      ],
    },
    {
      id: "hatalar",
      title: "Sıfırdan başlayanların en sık yaptığı hatalar",
      blocks: [
        {
          kind: "list",
          items: [
            "Gramer kitabını baştan sona bitirmeye çalışmak. Sınav konu listesini sormuyor, cümlede tanıyıp tanımadığına bakıyor.",
            "Listeden kelime ezberlemek. Bağlamsız ezberlenen kelime sınavda çoğu zaman tanınmıyor.",
            "Temel oturmadan her hafta deneme çözmek. Düşük puan moral bozar ve yeni bir şey öğretmez.",
            "İzlemeyi çalışmak sanmak. Video konuyu tanıtır; öğrenme, soruyu kendin çözümlediğinde oluyor ([Bjork ve ark., 2013](#kaynak-bjork-2013)).",
            "Okumayı sona bırakıp hiç başlamamak. 20 soru, 25 puan; ertelendikçe en büyük kayıp burada birikir.",
          ],
        },
      ],
    },
    {
      id: "yokdil",
      title: "YÖKDİL’e sıfırdan hazırlanıyorsan",
      blocks: [
        {
          kind: "p",
          text: "Sıra aynı, fark üçüncü adımda. YÖKDİL’de çeviri 12, dil bilgisi 14 soru; diyalog ve anlamca yakın cümle yok. Bu yüzden cümle düzeyindeki sorular YÖKDİL’de daha da ağır basıyor. Alan metinlerini (sağlık, fen, sosyal) dördüncü adımda, okumaya geçtiğinde ekle.",
        },
      ],
    },
    {
      id: "outklas",
      title: `Sıfırdan başlayan için ${brand.name} ne yapar?`,
      blocks: [
        {
          kind: "list",
          items: [
            "Seviye testi nereden başlayacağını gösteriyor ve puanı tek bir sayı yerine bir aralık olarak veriyor.",
            `Her gün ${brand.freeDailyWords} kelime ve ${brand.freeDailyConnectors} bağlaç ücretsiz. Kelime cümlenin içinde geliyor, yanlışların aralıklarla tekrar karşına çıkıyor.`,
            "Cümle Röntgeni bir cümleyi iskelet, ilişki ve çeldirici olarak açıyor; birinci adımdaki beceriyi gerçek bir soru üzerinde çalıştırıyor.",
            "Günlük plan ayırabildiğin dakikaya ve sınav tarihine göre kuruluyor.",
          ],
        },
        {
          kind: "cta",
          text: "Sıfırın neresi olduğunu 30 dakikada gör. Üyelik gerekmez.",
          href: "/teshis",
          label: "Ücretsiz seviye testi →",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "YDS’ye 3 ayda sıfırdan hazırlanılır mı?",
      answer:
        "Gerçek sıfırdan 3 ayda 60–70 bandına çıkmak zor. Lise ya da üniversiteden gelen bir temelin varsa 3 ay 60 civarı için gerçekçi olabilir. Önce nerede olduğunu ölç; plan ona göre kısalır ya da uzar.",
    },
    {
      question: "Önce gramer mi, kelime mi?",
      answer:
        "İkisi birlikte. İlk haftalarda yapıya daha çok zaman ayır, kelimeyi ise her gün az ve sürekli çalış. Kelimeyi bekletip sonra toplu ezberlemek, her gün az az çalışmaktan daha az kalıcı oluyor.",
    },
    {
      question: "Sıfırdan YDS için kurs şart mı?",
      answer:
        "Şart değil, ama bir sıraya ve geri bildirime ihtiyacın var. Kendi başına çalışıyorsan ölçerek başla, yanlışlarının nedenini gör ve her gün kısa da olsa çalış.",
    },
    {
      question: "Hangi kaynakla başlamalıyım?",
      answer:
        "Kaynaktan önce sıra önemli. Tek bir temel gramer kaynağı ve günlük kelime yeterli. Soru tiplerini görmek için en güvenilir kaynak, ÖSYM’nin yayımladığı çıkmış soru kitapçıkları.",
    },
    {
      question: "Sıfırdan YÖKDİL mi daha kolay, YDS mi?",
      answer:
        "Puanlama aynı, fark soru dağılımında. YÖKDİL’de okuma daha az, çeviri ve dil bilgisi daha çok; metinler de kendi alanından geliyor. Hangi sınavın geçerli olduğu başvurduğun kuruma bağlı, önce onu kontrol et.",
    },
  ],
  sources: ["norris-2000", "nation-2006", "webb-2007", "coxhead-2000", "cepeda-2006", "bjork-2013"],
  related: [
    { label: "YDS ve YÖKDİL hazırlık", href: "/yds-hazirlik" },
    { label: "YDS ve YÖKDİL taktikleri", href: "/yds-taktikleri" },
    { label: "YDS’den 70, 80, 90 nasıl alınır?", href: "/yds-70-80-90-nasil-alinir" },
    { label: "Dil bilgisi rehberi", href: "/rehber/grammar" },
    { label: "Kelime bilgisi rehberi", href: "/rehber/vocabulary" },
    { label: "YDS bağlaç testi", href: "/yds-baglac-testi" },
  ],
};
