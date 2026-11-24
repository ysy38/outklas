import { brand } from "@/brand";
import type { Article } from "./types";

export const sifirdan: Article = {
  path: "/yds-sifirdan-hazirlik",
  eyebrow: "YDS · YÖKDİL · gerçek sıfır",
  title: "YDS'ye sıfırdan hazırlık:",
  accent: "cümleyi çözemiyorsan ilk 12 hafta.",
  metaTitle: "YDS'ye Sıfırdan Hazırlık: Cümleyi Okuyamıyorsan İlk 12 Hafta",
  description:
    "YDS ve YÖKDİL'e gerçek sıfırdan başlayanlar için: üç cümlelik yer tespiti, ilk 12 haftanın saat hesabı, gramer kitabında atlanacaklar ve neden okuma ile denemeye erken girilmez.",
  lead:
    "Bu sayfa \"YDS'ye nasıl çalışılır\" özeti değil. O döngü [hazırlık sayfasında](/yds-hazirlik). Burada soru şu: İngilizce cümlede asıl fiili henüz göremiyorsan, ilk 12 haftada neyi bilinçli olarak erteleyeceksin? Sıfırdan başlayanların çoğu vakti sınavın sormadığı işe harcıyor: konuşma, yazma, kural ezberi, erken deneme. YDS ve YÖKDİL senden İngilizce üretmeni beklemiyor; 20–35 kelimelik bir cümlede özneyi, yüklemi ve bağlacı bulmanı bekliyor.",
  sections: [
    {
      id: "gercek-sifir",
      title: "Önce \"sıfır\"ın gerçekten sıfır mı, onu ayır",
      blocks: [
        {
          kind: "p",
          text: "İnsanlar \"sıfırdan başlıyorum\" deyince çoğunlukla 45–55 bandını kastediyorlar. O bant sıfır değil; sadece sınavı tanımıyor. Gerçek sıfır, aşağıdaki üç cümleden ilkinde bile yüklemi işaretleyememektir. Kalemi al, her cümlede asıl fiili bul. Sözlüğe bakma.",
        },
        {
          kind: "example",
          sentence: "1. The committee approved the proposal.  2. The results published last year have been widely cited.  3. Although several studies conducted in the early 2000s suggested that rapid urbanization would erode traditional networks, later archival work demonstrated that extended families adapted.",
          lines: [
            {
              label: "Cümle 1",
              text: "Yüklem approved. Bunu göremiyorsan gerçek sıfırdasın. İlk işin zamanlar, edilgen yapı ve kısa cümlede özne–yüklem. Soru çözme birkaç hafta sonra.",
            },
            {
              label: "Cümle 2",
              text: "Yüklem have been cited; published bir sıfat. Bunu kaçırıyorsan lise/üniversite temelin var ama uzun cümlede kayboluyorsun. Cümle çözümleme ve kelimeyle başla, soru tiplerine erken geçme.",
            },
            {
              label: "Cümle 3",
              text: "Although bir zıtlık kuruyor; asıl yargı later archival work demonstrated. Bunu görüp şıklarda yine ikide kalıyorsan dilin var, sınavın yok. Bu sayfa sana göre değil: [taktikler](/yds-taktikleri) ve [70-80-90 hata hakkı](/yds-70-80-90-nasil-alinir).",
            },
          ],
        },
        {
          kind: "p",
          text: `Tahmin etmek zorunda değilsin. ${brand.diagnosticQuestions} soruluk [seviye testi](/teshis) yaklaşık ${brand.diagnosticMinutes} dakika. Sıfıra yakınsan puan düşük çıkar; burada önemli olan puan değil, cümle 1'de mi 3'te mi olduğun.`,
        },
      ],
    },
    {
      id: "ilk-100-saat",
      title: "İlk 100 saat nereye gidecek?",
      blocks: [
        {
          kind: "p",
          text: "Günde 1 saat, haftada 6 gün: 12 hafta ≈ 72 saat. Günde 90 dakika: ≈ 108 saat. \"Kaç ayda bitiyor?\" sorusunun dürüst cevabı ay değil, bu saatin nereye gittiği. Aşağıdaki dağılım gerçek sıfır içindir; cümle 2'deysen 1. ve 2. satırı yarıya indirip 3. satırı öne al.",
        },
        {
          kind: "table",
          head: ["Blok", "≈ saat", "Ne çalışılır", "Ne çalışılmaz"],
          rows: [
            ["Cümle iskeleti", "35", "Zamanlar, edilgen, who/which/that, that/whether, if/unless, bağlaç yönü", "Speaking, writing, IELTS/TOEFL kitabı, kural ezberi yarışması"],
            ["Kelime, cümlenin içinde", "25", "Her gün 10 kelime + fiil+edat (depend on, result in); yanlış olan 3–7–21 günde geri gelir", "570'lik Academic Word List'i baştan ezberlemek, 8.000 kelime hedefi"],
            ["Cümle soruları", "25", "Kelime, dil bilgisi, boşluk, cümle tamamlama, çeviri: YDS'de ilk 42 soru = 52,5 puan", "80 soruluk deneme, 1.500 kelimelik okuma"],
            ["İlk okuma teması", "15", "Kısa paragraf, süre tutmadan, cevabın dayandığı cümleyi işaretleyerek", "Süreye karşı 20 soruluk okuma seti"],
          ],
          caption: "Toplam ~100 saat. Deneme bu tablonun dışında: cümle sorularında iskeleti görmeden 180 dakikalık deneme yalnızca düşük bir sayı üretir.",
        },
        {
          kind: "p",
          text: "Yazılı bir metni rahat okumak için kelimelerin yaklaşık %98'ini tanımak gerekiyor; bu da 8.000–9.000 kelime ailesi ([Nation, 2006](#kaynak-nation-2006)). Bu sayı gerçek sıfıra ilk hedef olarak yazılmaz. Sınavda şık ve bağlam işin büyük kısmını küçültüyor. İlk 100 saatte kovalanacak şey o 8.000 değil: cümlede fiili görmek ve her gün az kelimeyi farklı cümlelerde tekrar görmek. Bir kelimeyle bağlam içinde kaç kez karşılaşıldığı arttıkça bilgi büyüyor; on karşılaşmadan sonra bile tam olmuyor ([Webb, 2007](#kaynak-webb-2007)).",
        },
      ],
    },
    {
      id: "gramer-kitabi",
      title: "Gramer kitabında neyi atlayacaksın?",
      blocks: [
        {
          kind: "p",
          text: "Kuralı açıkça görmek işe yarıyor; 49 çalışmayı birleştiren bir meta-analiz de bunu destekliyor ([Norris ve Ortega, 2000](#kaynak-norris-2000)). Yine de kitabı bitirmek hedef değil. YDS kural yazdırmıyor, kuralı 30 kelimelik cümlenin içinde tanımanı istiyor. Aşağıdakiler ilk 12 haftada bilinçli olarak ertelenir:",
        },
        {
          kind: "list",
          items: [
            "İnce farklar: wish / if only, inversion, cleft sentences. Sınav bunları sormuyor diye değil; henüz iskeleti görmeden bunlara gitmek sırayı bozuyor.",
            "Üretim alıştırması: \"şu kurala göre beş cümle yaz.\" Sınav yazmanı istemiyor. Aynı kuralı bir YDS cümlesinde işaretlemek çok daha verimli.",
            "Tense tablosunu ezberleyip cümleye bakmamak. Asıl iş, The results published last year have been cited cümlesinde hangisinin yüklem olduğunu bulmak.",
            "Academic Word List'in 570 ailesini sıra numarasından gitmek ([Coxhead, 2000](#kaynak-coxhead-2000)). Liste kötü değil; sıfırın ilk işi değil. Önce cümlede işini gören fiiller ve bağlaçlar.",
          ],
        },
        {
          kind: "p",
          text: "On çalışma tekniğini karşılaştıran derlemede tekrar okuma ve altını çizme en az işe yarayanlar arasında; kendini sınamak ve aralıklı çalışma en çok işe yarayanlar arasında ([Dunlosky ve ark., 2013](#kaynak-dunlosky-2013)). Gramer notunu üçüncü kez okumak yerine, dün gördüğün kuralı yeni bir cümlede bulmaya çalış.",
        },
      ],
    },
    {
      id: "ilk-12-hafta",
      title: "12 haftalık sıra (gerçek sıfır)",
      blocks: [
        {
          kind: "table",
          head: ["Hafta", "İskelet", "Kelime / bağlaç", "Soru"],
          rows: [
            ["1–2", "Yüklemi bul; present / past / present perfect; edilgen", "Günlük 10 kelime, 10 bağlaç: zıtlık ve sebep", "Yok. Sadece cümlede fiili işaretle."],
            ["3–4", "who / which / that; isim cümlesi (that, whether)", "Fiil+edat: depend on, contribute to, result in, lead to", "5 kısa dil bilgisi sorusu, süre yok"],
            ["5–6", "if / unless / although / despite", "Zıtlık ve koşul bağlaçlarını karıştırmamak", "10 cümle tamamlama; her yanlışta bağlacın yönünü yaz"],
            ["7–8", "Çeviride zaman ve olumsuzluk", "may / must / will farkını kelime kartına değil cümleye bağla", "6 çeviri + 6 kelime sorusu"],
            ["9–10", "Paragrafta boşluk: cümleler arası ilişki", "Aynı kelimeyi üçüncü cümlede gör", "10 boşluk; süre hâlâ yok"],
            ["11–12", "Kısa okuma, cevabın cümlesini işaretle", "Önceki yanlışlar 3 ve 7 günde geri gelir", "İlk kez süre tut: 8–10 okuma sorusu, 25 dakika"],
          ],
          caption: "Cümle 2'de başlıyorsan 1–4. haftaları iki haftaya sıkıştır. Cümle 3'teysen bu tabloyu kullanma.",
        },
        {
          kind: "p",
          text: "Aynı 100 saati tek oturuma yığmak yerine günlere yaymak daha kalıcı ([Cepeda ve ark., 2006](#kaynak-cepeda-2006)). Bu yüzden \"hafta sonu 6 saat\" yerine \"her gün 50–70 dakika\" yazıyoruz. Video izlerken her şey anlaşılır görünür; bu his çoğu zaman abartılıdır ([Bjork ve ark., 2013](#kaynak-bjork-2013)). Sınavda cümleyi kendi başına çözeceksin.",
        },
      ],
    },
    {
      id: "neden-deneme-yok",
      title: "Neden henüz deneme yok?",
      blocks: [
        {
          kind: "p",
          text: "80 soru, 180 dakika, okuma 20 soru. İskeleti görmeden girilen deneme üç şey üretir: düşük puan, \"ben yapamıyorum\" hissi ve yanlış bir öncelik (okumaya daha çok saat ayırmak). Okuma 25 puan ama cümle çözümlemesinin üzerine biner. Cümle soruları YDS'de 42 soru ve 52,5 puan; YÖKDİL'de çeviri 12, dil bilgisi 14 soru olduğu için bu taban daha da kalın.",
        },
        {
          kind: "list",
          items: [
            "Denemeye geçiş işareti: rastgele 10 cümle tamamlama sorusunda bağlacın yönünü 7'sinde doğru görmek.",
            "İkinci işaret: bir çeviri cümlesinde özneyi ve yüklemi sözlüğe bakmadan ayırmak.",
            "Tam [deneme](/deneme) bu iki işaretten sonra. Erken deneme ölçmez, korkutur.",
          ],
        },
      ],
    },
    {
      id: "yokdil-sifir",
      title: "YÖKDİL'e sıfırdan: alan kelimesi öne alınır, sıra değişmez",
      blocks: [
        {
          kind: "p",
          text: "Sıra aynı. Fark 7–12. haftada. YÖKDİL'de diyalog ve anlamca yakın cümle yok; çeviri 12, dil bilgisi 14, okuma 15. Alanının (sağlık, fen, sosyal) 30–40 tekrar eden ismini kelime listene 5. haftadan itibaren ekle — genel haber İngilizcesi değil, kendi metninde her gün geçenler. Although sağlık metninde de zıtlık kurar.",
        },
      ],
    },
    {
      id: "outklas",
      title: `Sıfırdan başlayan için ${brand.name} neyi öne alır?`,
      blocks: [
        {
          kind: "list",
          items: [
            "Seviye testi cümle 1 / 2 / 3 ayrımını puanı bir aralık olarak vererek somutlaştırıyor. Üyelik gerekmez.",
            `Her gün ${brand.freeDailyWords} kelime ve ${brand.freeDailyConnectors} bağlaç ücretsiz; kelime cümlenin içinde, yanlış 10 dakika sonra ve 3–7–21 günde geri gelir.`,
            "Cümle Röntgeni ilk 35 saatin işini (iskelet, bağlaç, çeldirici) gerçek bir cümlede açıyor.",
            "Günlük plan ayırabildiğin dakikaya göre kurulur; henüz deneme dayatmaz.",
          ],
        },
        {
          kind: "cta",
          text: "Üç cümlelik yer tespiti yetmezse 30 dakikalık test hangi bölümden başlayacağını gösterir.",
          href: "/teshis",
          label: "Ücretsiz seviye testi →",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "YDS'ye hiç İngilizce bilmeden başlanır mı?",
      answer:
        "Başlanır, ama ilk iş soru çözmek değil. Kısa cümlede fiili göremiyorsan birkaç hafta yalnızca iskelet ve günlük kelime. Konuşma ve yazma bu sınavın ölçtüğü şey değil.",
    },
    {
      question: "YDS sıfırdan kaç ay sürer?",
      answer:
        "Gerçek sıfır, günde 1–1,5 saat, 60 civarı için kabaca 6–9 ay; 70 için 9–12 ay. Lise temelin varsa süre yarıya iner. Ay değil, ilk 100 saatin nereye gittiği belirler.",
    },
    {
      question: "Sıfırdan YDS'ye önce gramer mi kelime mi?",
      answer:
        "İkisi birlikte, ama ağırlık ilk haftalarda iskelette. Kelime her gün az ve cümlenin içinde. Gramer kitabını bitirip sonra kelimeye geçmek, aralıklı tekrarın tersine işler.",
    },
    {
      question: "A2 ile YDS'ye girilir mi?",
      answer:
        "A2, cümle 1–2 aralığıdır. Direkt 80 soruluk denemeye girilmez. Önce fiili görmek, sonra cümle soruları; okuma en son.",
    },
    {
      question: "Sıfırdan YÖKDİL mi daha kolay?",
      answer:
        "Puanlama aynı. YÖKDİL'de okuma daha az, çeviri ve dil bilgisi daha çok; metin senin alandan gelir. Hangisinin geçerli olduğunu başvuru kılavuzu söyler, his değil.",
    },
  ],
  sources: ["norris-2000", "nation-2006", "webb-2007", "coxhead-2000", "cepeda-2006", "bjork-2013", "dunlosky-2013"],
  related: [
    { label: "YDS ve YÖKDİL hazırlık döngüsü", href: "/yds-hazirlik" },
    { label: "YDS'den 70, 80, 90: hata hakkı", href: "/yds-70-80-90-nasil-alinir" },
    { label: "YDS ve YÖKDİL taktikleri", href: "/yds-taktikleri" },
    { label: "Dil bilgisi rehberi", href: "/rehber/grammar" },
    { label: "Kelime bilgisi rehberi", href: "/rehber/vocabulary" },
    { label: "YDS bağlaç testi", href: "/yds-baglac-testi" },
  ],
};
