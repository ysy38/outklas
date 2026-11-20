import type { Article } from "./types";

export const celdiriciTespiti: Article = {
  path: "/blog/yds-yokdil-celdirici-nasil-tespit-edilir",
  eyebrow: "YDS · YÖKDİL · Çeldirici Analizi",
  title: "YDS ve YÖKDİL’de İki Şık Arasında Kalma Sorunu:",
  accent: "Çeldirici Nasıl Tespit Edilir?",
  metaTitle: "YDS ve YÖKDİL’de İki Şık Arasında Kalma Sorunu: Çeldirici Nasıl Tespit Edilir?",
  description:
    "YDS ve YÖKDİL'de iki şık arasında kalma sorununu çözmek için dilbilgisel, sözdizimsel ve anlamsal çeldirici tespit yöntemleri ve örnek soru otopsisi.",
  lead:
    "Sınav salonunda o anı mutlaka yaşamışsınızdır: Cümle tamamlama veya paragraf sorusunu okursunuz, beş şıktan üçünü yirmi saniyede elersiniz ama kalan iki şık arasında iki dakika boyunca gidip gelirsiniz. İkisi de kulağa mantıklı gelir, ikisinin de kelimelerini biliyorsunuzdur. Sonunda birini işaretlersiniz ve cevap anahtarına baktığınızda yine diğerinin doğru olduğunu görürsünüz.\n\nBu durum kelime eksiğinden ya da dikkatsizlikten kaynaklanmaz. Doğrudan ÖSYM’nin soru yazım tekniğiyle, yani çeldirici mühendisliğiyle ilgilidir.\n\nÇeldirici (distractor), çoktan seçmeli bir sınavda konuya yüzeysel hakim olan adayı doğru cevaptan uzaklaştırmak için kasıtlı olarak kurgulanmış yanlış seçenektir. YDS ve YÖKDİL hazırlığını klasik soru bankalarından ayıran Outklas (outklas.com) yaklaşımında bu yanlış seçenekler rastgele hatalar olarak değil; dilbilgisel, sözdizimsel ve anlamsal olmak üzere üç farklı tuzak katmanı olarak ele alınır. Bir soruda hangi katmana yenildiğinizi görmediğiniz sürece, binlerce soru çözseniz bile aynı tuzağa tekrar tekrar düşersiniz.",
  sections: [
    {
      id: "osym-3-katmanli-celdirici-muhendisligi",
      title: "ÖSYM’nin 3 Katmanlı Çeldirici Mühendisliği",
      blocks: [
        {
          kind: "p",
          text: "ÖSYM soru yazarları yanlış şıkları doldurmak için rastgele cümleler yazmaz. Her yanlış şık, adayın okuma hızındaki belirli bir açığı yakalamak üzere tasarlanır:",
        },
        {
          kind: "steps",
          items: [
            {
              title: "1. Dilbilgisel (Grammatical) Çeldiriciler",
              body: "En kolay elenmesi gereken ama aceleyle okunduğunda puan götüren katmandır. Cümlenin anlamı kulağa harika gelir fakat yapısal bir kural ihlali vardır. Örneğin soru kökünde zaten Although gibi bir yan cümle bağlacı varken şıkkın başına because veya but getirilmesi, edat (preposition) arkasından tam cümle gelmesi ya da kısaltma (reduction) kurallarının bozulması bu gruba girer.",
            },
            {
              title: "2. Sözdizimsel (Syntactic) Çeldiriciler",
              body: "Burada cümle tek başına gramatik olarak doğrudur ama soru köküyle dikiş tutmaz. En sık karşılaşılan iki tuzak zaman uyumu (tense agreement) ve referans zamiri (pronoun reference) kaymasıdır. Soru kökünde tekil bir kavramdan (the treatment) bahsedilirken şıkta çoğul bir zamire (they) atıf yapılması veya geçmişte kapanmış bir olayın gelecek zaman bildiren bir ana cümleye bağlanması sözdizimsel çeldiricidir.",
            },
            {
              title: "3. Anlamsal (Semantic) Çeldiriciler",
              body: "Adayları iki şık arasında bırakan asıl katman burasıdır. Dilbilgisi kusursuzdur, zaman ve zamir uyumu yerindedir; ancak cümlenin mantıksal yönü veya iddia şiddeti bozuktur. ÖSYM bu katmanda özellikle üç yöntem kullanır:",
            },
          ],
        },
        {
          kind: "list",
          items: [
            "Bağlaç yönünü ters çevirme: Zıtlık bağlacı kurulmasına rağmen olumlu bir yargıyı yine olumlu bir yargıyla devam ettirme.",
            "Aşırı genelleme (Overgeneralization): Soru kökünde “bazı vakalarda görüldü” denirken, şıkta all, never, completely, definitive gibi kesinlik bildiren kelimelerle anlamı şişirme.",
            "Konu kayması (Topic shift): Soru kökündeki anahtar kelimeleri birebir tekrar edip cümlenin odağını bambaşka bir alt başlığa çekme.",
          ],
        },
      ],
    },
    {
      id: "uygulamali-ornek-soru-otopsisi",
      title: "Uygulamalı Örnek: Tek Soruda 3 Çeldirici Nasıl Elenir?",
      blocks: [
        {
          kind: "p",
          text: "Teoriyi gerçek bir YDS/YÖKDİL cümle tamamlama kurgusu üzerinde görelim:",
        },
        {
          kind: "example",
          sentence:
            "Although early clinical trials suggested that the new antiviral compound could halt viral replication within 48 hours, ----.",
          lines: [
            {
              label: "Çeviri",
              text: "Erken dönem klinik deneyler yeni antiviral bileşiğin viral çoğalmayı 48 saat içinde durdurabileceğini öne sürse de, ----.",
            },
            {
              label: "1. İpucu (Bağlaç)",
              text: "Cümle Although (zıtlık) bağlacıyla başlıyor; devamında bu umut verici sonucun aksine bir kısıtlama, yan etki veya başarısızlık gelmeli.",
            },
            {
              label: "2. İpucu (Özne)",
              text: "Özneyi takip edersek deneyler (trials) çoğul, ilaç bileşiği (the new antiviral compound) ise tekildir.",
            },
            {
              label: "3. İpucu (Zaman)",
              text: "Zaman akışı geçmişte (suggested / could halt) başlamıştır.",
            },
          ],
        },
        {
          kind: "p",
          text: "Şimdi dört seçeneği çeldirici katmanlarına göre tek tek inceleyelim:",
        },
        {
          kind: "steps",
          items: [
            {
              title: "A) because subsequent trials failed to confirm the same efficacy in larger patient groups",
              body: "Teşhis — Dilbilgisel Çeldirici: Anlam çok mantıklı görünür ama cümle başında zaten Although yan cümle bağlacı vardır. Ana cümlenin başına because getirdiğinizde cümle iki yan cümleden oluşur ve ana yüklemsiz kalır. Sadece kelimeleri okuyup anlam çıkaran aday burada elenir.",
            },
            {
              title: "B) they were immediately approved for widespread clinical use before any safety data existed",
              body: "Teşhis — Sözdizimsel Çeldirici: Şıkkın başındaki they zamiri, soru kökündeki çoğul trials (deneyler) kelimesine gider. Oysa klinik kullanım onayı alabilecek olan şey “deneyler” değil, tekil olan compound (bileşik) olmalıdır. Referans takibi yapmayan aday bu şıkka düşer.",
            },
            {
              title: "C) the pharmaceutical team celebrated the breakthrough as a definitive cure for all respiratory infections",
              body: "Teşhis — Anlamsal Çeldirici: Gramer ve özne-yüklem uyumu kusursuzdur. Ancak Although zıtlık beklerken cümle yine olumlu bir kutlama haberiyle devam eder. Üstelik “all respiratory infections” (tüm solunum yolu enfeksiyonları) ifadesi metinde hiç geçmeyen bir aşırı genellemedir.",
            },
            {
              title: "D) larger follow-up studies revealed severe hepatic side effects that prevented its clinical approval",
              body: "Doğru Cevap: Zıtlık mantığını tam karşılar (erken başarıya karşılık ciddi yan etki), tekil its zamiriyle compound kelimesine hatasız gönderme yapar ve revealed fiiliyle zaman uyumunu korur.",
            },
          ],
        },
      ],
    },
    {
      id: "neden-soru-cozmek-yetmez",
      title: "Neden Sadece Soru Çözmek Çeldirici Körlüğünü Gidermez?",
      blocks: [
        {
          kind: "p",
          text: "Klasik soru bankalarında bir soruyu yanlış yaptığınızda arkasındaki çözüm kitapçığında genellikle şu yazar: “Doğru cevap D şıkkıdır çünkü cümlede zıtlık bağlacı vardır.” Bu açıklama size A şıkkındaki çift bağlaç tuzağına mı, B şıkkındaki zamir kaymasına mı, yoksa C şıkkındaki aşırı genellemeye mi yenildiğinizi söylemez.",
        },
        {
          kind: "p",
          text: "Üstelik çalışan akademisyenler, lisansüstü öğrencileri ve profesyoneller için [100 saatlik pasif video dersler izlemek](/blog/yds-yokdil-100-saatlik-video-devri-neden-kapandi) bu sorunu çözmez; çünkü kuralı bilmekle sınav anında çeldiriciyi fark etmek iki ayrı bilişsel beceridir.",
        },
        {
          kind: "p",
          text: "Outklas’ın adaptif çalışma motoru tam olarak bu boşluğu kapatmak için tasarlandı. Sistem yalnızca doğru ve yanlış sayınızı tutmaz; her hatalı cevabınızda hangi çeldirici türüne düştüğünüzü etiketler. Eğer son günlerde sözdizimsel zamir kaymalarına veya zıtlık bağlaçlarındaki anlamsal tuzaklara takılıyorsanız, karşınıza rastgele karma testler çıkarmak yerine doğrudan o çeldirici tipini hedefleyen sorular getirir. Süreci desteklemek için [etkileşimli gramer rehberi](/rehber/grammar) ve bağlam odaklı [akademik kelime çalışmaları](/rehber/vocabulary) ile kuralları ezberlemek yerine soru üzerinde refleks haline getirmenizi sağlar.",
        },
        {
          kind: "p",
          text: "Bu hazırlık serimizin ilk yazısı olan 100 saatlik video izleme devrinin kapanışını ve Bloom 2 Sigma analizini Medium üzerinden okumak ve paylaşmak için [Medium makalemizi ziyaret edebilirsiniz](https://medium.com/@info_97122/yds-ve-y%C3%B6kdi%CC%87le-100-saat-video-i%CC%87zleyerek-haz%C4%B1rlanma-devri-bitti-c69ba56c27cf).",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "YDS ve YÖKDİL’de iki şık arasında kalmamak için ilk neye bakılmalıdır?",
      answer:
        "Önce anlam çevirisine dalmak yerine cümlenin yapısal iskeletini (bağlaç yönü, zaman uyumu ve özne-zamir eşleşmesini) kontrol etmek gerekir. Şıkların büyük bölümü daha anlam analizine geçmeden dilbilgisel ve sözdizimsel çeldirici elemeleriyle devreden çıkar.",
    },
    {
      question: "ÖSYM sorularında en sık kullanılan anlamsal çeldirici hangisidir?",
      answer:
        "En yaygın anlamsal tuzak, soru kökünde sınırlı bir çerçevede verilen bilgiyi şıkta all, never, only, completely gibi kesinlik bildiren ifadelerle aşırı genellemek veya zıtlık bağlacı kurulmasına rağmen paralel anlamlı bir yargı sunmaktır.",
    },
    {
      question: "Çeldirici analizi yaparak çalışmak netleri ne kadar sürede etkiler?",
      answer:
        "Körlemesine yüzlerce soru çözmek yerine günde 25-30 dakika boyunca yanlış yapılan soruların çeldirici türünü (dilbilgisel, sözdizimsel veya anlamsal) sınıflandırarak ilerlemek, genellikle 2 ila 3 hafta içinde iki şık arasında kalma oranını belirgin biçimde düşürür.",
    },
    {
      question: "Outklas’taki çeldirici tespiti sistemi hangi soru tiplerinde çalışır?",
      answer:
        "Çeldirici analizi mantığı özellikle cümle tamamlama, bağlaç soruları, çeviri, paragraf tamamlama ve okuduğunu anlama sorularında adayın hangi tuzak katmanına takıldığını tespit ederek kişiselleştirilmiş soru akışı üretir.",
    },
  ],
  sources: [],
  related: [
    { label: "100 saatlik video izleme devri neden kapandı?", href: "/blog/yds-yokdil-100-saatlik-video-devri-neden-kapandi" },
    { label: "Bu seriyi Medium üzerinden oku", href: "https://medium.com/@info_97122/yds-ve-y%C3%B6kdi%CC%87le-100-saat-video-i%CC%87zleyerek-haz%C4%B1rlanma-devri-bitti-c69ba56c27cf" },
    { label: "YDS ve YÖKDİL hazırlık döngüsü", href: "/yds-hazirlik" },
    { label: "YDS taktikleri ve üç kontrol", href: "/yds-taktikleri" },
    { label: "YDS akademik gramer rehberi", href: "/rehber/grammar" },
    { label: "YDS akademik kelime rehberi", href: "/rehber/vocabulary" },
  ],
};
