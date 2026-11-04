import { brand } from "@/brand";
import { faqsFor, scoreMarks } from "@/content/seo";
import type { Article } from "./types";

export const hazirlik: Article = {
  path: "/yds-hazirlik",
  eyebrow: "YDS · YÖKDİL hazırlık",
  title: "YDS ve YÖKDİL hazırlık:",
  accent: "önce ölç, sonra tek açığa çalış.",
  metaTitle: "YDS ve YÖKDİL Hazırlık: Nereden ve Nasıl Başlanır?",
  description:
    "YDS ve YÖKDİL’e hazırlanmak için önce hangi bölümde kaç puan kaybettiğini ölç, sonra her gün tek bir açığa çalış. Soru dağılımı, çalışma döngüsü, YÖKDİL farkı ve ücretsiz seviye testi.",
  lead:
    "Önce hangi bölümde kaç puan kaybettiğini ölç. Sonra her gün o açığı kapatacak tek bir işe odaklan, yanlışlarını aralıklarla yeniden çöz ve birkaç haftada bir tam deneme gir. Kelime ezberi de soru çözmek de bu döngünün içinde; ikisi de tek başına bir plan sayılmaz. YÖKDİL, e-YDS ve e-YÖKDİL için de yol aynı.",
  sections: [
    {
      id: "neden-takiliyor",
      title: "Herkes aynı şeyi söylüyor. Peki neden çoğu kişi 50–65 arasında kalıyor?",
      blocks: [
        {
          kind: "p",
          text: "“YDS hazırlık” diye aratınca çıkan yazıların neredeyse hepsi aynı listeyi verir: kelime ezberle, grameri bitir, bol soru çöz, deneme çöz, hata defteri tut. Listede yanlış bir madde yok. Eksik olan, hangisine ne kadar ve hangi gün çalışacağın. Bu listeyi zaten herkes biliyor; insanlar sıralamada takılıyor.",
        },
        {
          kind: "table",
          head: ["Yaygın tavsiye", "Doğru olan kısmı", "Eksik kalan kısmı"],
          rows: [
            [
              "Kelime ezberle",
              "Okuma ve çeviri büyük ölçüde kelimeye dayanır.",
              "Listeden ezberlenen kelime cümlenin içinde çoğu zaman tanınmıyor. Kelime, farklı cümlelerde defalarca karşına çıktıkça yerleşiyor ([Webb, 2007](#kaynak-webb-2007)).",
            ],
            [
              "Grameri bitir",
              "Dil bilgisi ve cümle tamamlama yapıya dayanır.",
              "YDS kural yazdırmıyor, kuralı cümlenin içinde tanımanı istiyor. Asıl gereken, uzun bir cümlede özneyi, yüklemi ve bağlacı bulabilmek.",
            ],
            ["Bol soru çöz", "Soru tipine alışmak hız kazandırır.", "Yanlışın nedenine bakmadan geçersen aynı hatayı yüzlerce soru boyunca tekrarlarsın."],
            ["Her hafta deneme çöz", "Süre ve dayanıklılık ancak tam denemeyle ölçülür.", "Deneme ölçer ama öğretmez. Temel oturmadan girilen deneme yalnızca düşük bir sayı gösterir."],
            [
              "Notlarını tekrar tekrar oku",
              "Konuyu hatırlatır.",
              "On çalışma tekniğini karşılaştıran bir derlemede tekrar okuma ve altını çizme en az işe yarayanlar arasında çıktı. Kendini sınamak ve aralıklı çalışmak en çok işe yarayanlardı ([Dunlosky ve ark., 2013](#kaynak-dunlosky-2013)).",
            ],
            [
              "Saatlerce video izle",
              "Bir konuyu ilk kez görmek için işe yarar.",
              "İzlerken her şey anlaşılır görünür. Bu rahatlık insanın ne kadar öğrendiğini abartmasına yol açıyor ([Bjork ve ark., 2013](#kaynak-bjork-2013)). Sınavda cümleyi kendi başına çözmen gerekecek.",
            ],
          ],
        },
        {
          kind: "p",
          text: "Aynı saati çalışan iki kişiden biri 60’ta kalırken öbürü 75’e çıkabiliyor. Aradaki farkı çoğu zaman saatin kendisi yaratmıyor; o saatin nereye harcandığı yaratıyor.",
        },
      ],
    },
    {
      id: "sinavi-tani",
      title: "Sınavı tanı: puan nereden geliyor?",
      blocks: [
        {
          kind: "p",
          text: "YDS ve YÖKDİL 80 soru, 180 dakika. Her doğru 1,25 puan; yanlış ve boş puanı düşürmüyor ([ÖSYM](#kaynak-osym)). Bölümlerin ağırlığı eşit değil. Okuduğunu anlama YDS’de tek başına 25 puan ediyor, YÖKDİL’de ise çeviri 12 soruyla 15 puan taşıyor. Aşağıdaki tabloda her bölümün adına tıklarsan o soru tipinin adım adım çözümüne gidersin.",
        },
        { kind: "examTable" },
      ],
    },
    {
      id: "dongu",
      title: "Hazırlık döngüsü: 5 adım",
      blocks: [
        {
          kind: "steps",
          items: [
            {
              title: "Ölç",
              body: `${brand.diagnosticQuestions} soruluk [seviye testi](/teshis) her bölümdeki doğru oranını o bölümün sınavdaki soru sayısıyla tartıyor. Örneğin okumada %60 doğru yapıyorsan 20 sorudan yaklaşık 8’ini, yani 10 puanı kaybediyorsun. Kelimede aynı oran 6 sorudan 2–3 soruya denk geliyor. Neye öncelik vereceğin bu hesaptan çıkıyor.`,
            },
            {
              title: "Yanlışın nedenini bul",
              body: "“Bilmiyordum” deyip geçme. Kelimeyi mi bilmiyordun, bağlacın yönünü mü kaçırdın, yoksa şıktaki kapsam değişikliğini mi görmedin? Nedenini bildiğin yanlışı bir sonraki soruda aynı yerden yapmazsın. Her soru tipinde en sık yapılan hataları [bölüm rehberinde](/rehber) topladık.",
            },
            {
              title: "Her gün tek açığa çalış",
              body: "O gün en çok puan kaybettiğin bölümden sorular, önceki yanlışların ve birkaç yeni soru. Zaten iyi olduğun bölüme o gün dokunmana gerek yok.",
            },
            {
              title: "Aralıklarla tekrar et",
              body: "Yanlış yaptığın soru, kelime ya da bağlaç 10 dakika sonra karşına çıkıyor; yine yanlışsa ertesi gün bir daha. Doğru yaptıkça aralık açılıyor: 3, 7, 21 ve 45 gün. Aynı şeyi tek oturuşta defalarca tekrarlamak yerine araya zaman koymak, 300’ü aşkın deneyi birleştiren bir meta-analizde daha kalıcı bulunmuş ([Cepeda ve ark., 2006](#kaynak-cepeda-2006)). Bizdeki işleyişin ayrıntısı [yöntem](/yontem#tekrar) sayfasında.",
            },
            {
              title: "Denemeyle kontrol et",
              body: "80 soru, 180 dakika. [Deneme](/deneme) bitince puanına ve en çok puan kaybettiğin bölüme bak; önümüzdeki haftaların önceliği buna göre değişir. Deneme çözmenin bir yan faydası da var: kendini sınamak, aynı konuyu tekrar okumaktan daha kalıcı öğrenme sağlıyor ([Roediger ve Karpicke, 2006](#kaynak-roediger-2006)).",
            },
          ],
        },
      ],
    },
    {
      id: "dilbilimsel",
      title: "Soru ezberlemek yerine cümleyi okumayı öğren",
      blocks: [
        {
          kind: "p",
          text: "YDS’deki soruların büyük kısmı aslında aynı üç şeyi soruyor. Cümlenin iskeleti ne? İki parça arasında nasıl bir ilişki var? Şık bu ilişkiyi ve iddianın kapsamını koruyor mu? Bu üç kontrolü alışkanlık haline getiren biri, hiç görmediği bir soruda da aynı yolu izler. Binlerce soruyu tek tek ezberlemekten çok daha az yorucu.",
        },
        {
          kind: "list",
          items: [
            "İskelet: araya giren yan cümleleri ayır, asıl özneyi ve yüklemi bul. En çok [dil bilgisi](/rehber/grammar) ve [çeviri](/rehber/translation) sorularında işe yarar.",
            "İlişki: bağlaç zıtlık mı, sebep mi, sonuç mu, koşul mu kuruyor? [Cümle tamamlama](/rehber/sentence) ve [paragrafta boşluk](/rehber/cloze) sorularının çoğu bunu ölçer.",
            "Kapsam: some / most / all, may / must / will, olumsuzluk. [Okuduğunu anlama](/rehber/reading) çeldiricilerinin çoğu tam burayı değiştirir.",
          ],
        },
        {
          kind: "p",
          text: "Kapsamın neden bu kadar önemli olduğunun bir açıklaması var. Akademik İngilizce iddialarını may, suggest, likely gibi sözcüklerle sürekli yumuşatıyor; bu, bilimsel yazının en belirgin özelliklerinden biri ([Hyland, 1998](#kaynak-hyland-1998)). YDS metinleri de çoğunlukla bu türden geldiği için, çeldiricinin en kolay yolu bu yumuşatmayı kaldırmak. Bunu bir örnek cümle üzerinde [YDS taktikleri](/yds-taktikleri) sayfasında gösteriyoruz.",
        },
      ],
    },
    {
      id: "ne-kadar-surer",
      title: "Ne kadar sürer?",
      blocks: [
        {
          kind: "p",
          text: "Süreyi üç şey belirliyor: bugünkü puanın, hedefin ve haftada ayırabildiğin zaman. İşe aradaki farkı doğru sayısına çevirerek başla. 50’den 70’e çıkmak 16 doğru daha demek. O 16 doğrunun hangi bölümden geleceğini bilirsen plan da kısalır. Hedefe göre örnek dağılım [70, 80, 90 sayfasında](/yds-70-80-90-nasil-alinir), temeli zayıf olanlar için sıra ve kaba süreler [sıfırdan hazırlık](/yds-sifirdan-hazirlik) sayfasında.",
        },
        {
          kind: "table",
          head: ["Hedef puan", "Gereken doğru", "Not"],
          rows: scoreMarks.map((mark) => [`${mark.score}`, `${mark.correct}`, mark.note]),
          caption: "80 soru geçerliyken. İptal edilen soru varsa [puan hesaplama](/yds-puan-hesaplama) aracını kullan.",
        },
      ],
    },
    {
      id: "yokdil",
      title: "YÖKDİL’e hazırlanıyorsan ne değişir?",
      blocks: [
        {
          kind: "p",
          text: "Puanlama aynı, dağılım farklı. YÖKDİL’de diyalog ve anlamca yakın cümle sorusu yok. Çeviri 12, dil bilgisi 14, okuma 15 soru. Yani YÖKDİL’de [çeviri](/rehber/translation) tekniği YDS’dekinin iki katı puan taşıyor.",
        },
        {
          kind: "p",
          text: "Sağlık, fen ve sosyal ayrımı ayrı bir puan sistemi anlamına gelmiyor; yalnızca metinlerin konusu değişiyor. Alanının terimlerini bilmek okumayı hızlandırır ama soruyu yine yapı çözer. Bir sağlık metninde de “although” aynı zıtlığı kurar.",
        },
      ],
    },
    {
      id: "outklas",
      title: `${brand.name} bu döngünün neresinde?`,
      blocks: [
        {
          kind: "list",
          items: [
            `Ölçmek: ${brand.diagnosticQuestions} soruluk [seviye testi](/teshis) ücretsiz ve üyelik istemiyor. Puanını bir aralık olarak, bölüm bölüm puan kaybınla birlikte gösteriyor.`,
            "Yanlışın nedeni: Cümle Röntgeni bir soruyu iskelet, kritik ipucu ve çeldiricinin nasıl kurulduğu olarak açıyor.",
            "Her gün tek açık: günlük plan en çok puan kaybettiğin bölümden başlıyor ve ayırabildiğin dakikaya göre kuruluyor.",
            `Tekrar: her gün ${brand.freeDailyWords} kelime ve ${brand.freeDailyConnectors} bağlaç ücretsiz; yanlışların aralıklarla geri geliyor.`,
            `Kontrol: ${brand.freeSimulators} tam [deneme](/deneme) ücretsiz; 80 soru, 180 dakika.`,
          ],
        },
        {
          kind: "p",
          text: "Sıradaki soruyu yapay zekâ seçmiyor. Bunu açık kurallar belirliyor: o bölümdeki doğru oranın, henüz görmediğin sorular ve bölümün sınavdaki ağırlığı. Nasıl karar verdiğimizi [yöntem sayfasında](/yontem) yazdık.",
        },
        {
          kind: "cta",
          text: "Hazırlığın ilk adımı ölçmek. 30 dakikalık test hangi bölümden başlaman gerektiğini gösterir.",
          href: "/teshis",
          label: "Ücretsiz seviye testi →",
        },
      ],
    },
  ],
  faqs: [
    ...faqsFor("prep"),
    {
      question: "YDS’ye kendi kendime hazırlanabilir miyim, kurs şart mı?",
      answer:
        "Şart değil. Kursun sana verdiği üç şey var: bir sıra, yanlışlarına geri bildirim ve düzen. Kendi başına çalışıyorsan bu üçünü başka yoldan kurman gerekiyor. Ölçerek başlayan bir plan, yanlışının nedenini gösteren çözümler ve her gün aynı saatte kısa bir çalışma bu işi görür.",
    },
    {
      question: "YDS için günde kaç saat çalışmalıyım?",
      answer:
        "Herkese uyan bir sayı yok. Her gün süren kısa bir çalışma, haftada bir gün yapılan uzun çalışmadan genellikle daha kalıcı oluyor; aralıklı tekrar araştırmaları da bunu gösteriyor. Önce gerçekten ayırabildiğin süreyi yaz, planı ona göre kur.",
    },
    {
      question: "YÖKDİL’e hazırlık YDS’den farklı mı?",
      answer:
        "Yol aynı, ağırlıklar farklı. YÖKDİL’de diyalog ve anlamca yakın cümle yok; çeviri 12, dil bilgisi 14, okuma 15 soru. Bu yüzden çeviri ve dil bilgisine YDS’dekinden daha çok zaman ayırmak mantıklı.",
    },
  ],
  sources: ["osym", "cepeda-2006", "roediger-2006", "dunlosky-2013", "bjork-2013", "webb-2007", "hyland-1998"],
  related: [
    { label: "YDS ve YÖKDİL taktikleri", href: "/yds-taktikleri" },
    { label: "YDS’ye sıfırdan hazırlık", href: "/yds-sifirdan-hazirlik" },
    { label: "YDS’den 70, 80, 90 nasıl alınır?", href: "/yds-70-80-90-nasil-alinir" },
    { label: "YDS puan hesaplama", href: "/yds-puan-hesaplama" },
    { label: "Bölüm rehberi: 10 soru tipi", href: "/rehber" },
    { label: "Ücretsiz deneme sınavı", href: "/deneme" },
  ],
};
