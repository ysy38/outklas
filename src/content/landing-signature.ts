/** Signature landing blocks adapted from the Outklas brief; brand stays STARC. */

export const motorPillars = [
  {
    code: "01 · TEŞHİS",
    title: "Darboğaz haritası",
    body: "En çok net kaçırdığın 3 alanı gösterir; herkese aynı programı vermez.",
  },
  {
    code: "02 · MEKANİZMA",
    title: "Cümle Röntgeni",
    body: "Özne + bağlaç + yüklem kilidi. Cümlenin iskeleti görünür hâle gelir.",
  },
  {
    code: "03 · OTOPSİ",
    title: "Çeldirici filtresi",
    body: "İki şık arasında kalmaya son. Yanlış seçeneğin neden cazip göründüğünü açıklar.",
  },
  {
    code: "04 · RİTİM",
    title: "Günlük sprint",
    body: "Her gün kısa, nokta atışı bir görev. Pasif video yok; saf pratik.",
  },
] as const;

export const readingModes = {
  classic: {
    label: "Klasik okuma",
    caption: "Bilinmeyen ara kelimelere takılıp cümleyi 3–4 kez baştan okursun; çalışma belleği yorulur.",
    metrics: [
      ["Odak ritmi", "Dağınık"],
      ["Geri dönüş", "Sürekli tekrar"],
      ["Bellek yükü", "Aşırı yük"],
    ],
  },
  starc: {
    label: "STARC iskelet kilidi",
    caption: "Zihin üç noktaya dokunur: zıtlık bağlacı → ana yüklem → hedef fikir.",
    metrics: [
      ["Odak ritmi", "3 kilit nokta"],
      ["Geri dönüş", "Gerektiğinde"],
      ["Bellek yükü", "Yönetilebilir"],
    ],
  },
} as const;

/** Illustrative x-ray; labeled Örnek on the page. */
export const xrayDemo = {
  raw: "The proposal was rejected, not because it was impractical, but because it failed to address the issue _____ the committee considered most urgent.",
  skeleton: ["The proposal", "was rejected", "not because… but because", "it failed to address", "the issue which…"],
  locks: [
    { tag: "Özne", text: "The proposal" },
    { tag: "Yüklem", text: "was rejected" },
    { tag: "Bağlaç", text: "not because / but because" },
    { tag: "İpucu", text: "which → tanımlayan yan cümle" },
  ],
  answer: "B) which",
  trap: "A) what — boşluktan sonra tam bir yan cümle var; what buraya sığmaz. Cazibe: ‘şey’ anlamı aramak.",
} as const;

export const distractorTypes = [
  { code: "01", title: "Aşırı genelleme", tag: "Kesinlik tuzağı", body: "solely, exclusively, all gibi uç ifadelerle metni sertleştirir." },
  { code: "02", title: "Yan cümlecik yemi", tag: "Odak kaydırma", body: "Despite / Much as içindeki yan fikri ana fikir sanmana yol açar." },
  { code: "03", title: "Metinde olmayan kıyas", tag: "Sahte kıyas", body: "more than / as…as ile metinde olmayan bir karşılaştırma kurar." },
  { code: "04", title: "Ters nedensellik", tag: "Yön tuzağı", body: "X → Y ilişkisini Y → X diye ters çevirir." },
  { code: "05", title: "Modal & olasılık kaydırma", tag: "Derece tuzağı", body: "may → must gibi kesinlik derecesini kaydırır." },
] as const;

export const scienceCards = [
  {
    cite: "Hu & Nation (2000) · Coxhead (2000)",
    title: "Sözcüksel kapsama & AWL",
    body: "Akademik metinlerde bilinen sözcük oranı ve Academic Word List, kelime çalışmasını rastgele listeden ayırır.",
  },
  {
    cite: "John Sweller (1988)",
    title: "Bilişsel yük teorisi",
    body: "Uzun cümlede çalışma belleği taşınca puan düşer. Cümle Röntgeni cümleyi yönetilebilir parçalara böler.",
  },
  {
    cite: "K. Anders Ericsson (1993)",
    title: "Kasıtlı pratik",
    body: "Sürekli 80 soruluk deneme puanı sıçratmaz. Asıl sıçrama, hata mekanizmasına anlık geri bildirimle gitmektir.",
  },
] as const;

export const funnelSteps = [
  {
    title: "Cümle Röntgeni",
    body: "Ücretsiz, hesap gerektirmez. Birkaç cümlede yapı, ipucu ve çeldirici mekanizmasını görürsün. Amaç tam seviye ölçmek değil; merak ve güven uyandırmak.",
  },
  {
    title: "Hesap + genişletilmiş teşhis",
    body: "Bölüm bölüm ilerleyen test. Kelime, dil bilgisi, cümle tamamlama ve paragrafta farklı hata örüntüleri aranır; kaldığın yerden devam edersin.",
  },
  {
    title: "Kişisel teşhis raporu",
    body: "“Kelimen zayıf” demek yerine hangi bağlamlarda ve soru tiplerinde zorlandığını, önce hangi beceriyi çalışman gerektiğini gösterir.",
  },
  {
    title: "Çalışma rotası",
    body: "Hedef puanına ve mevcut durumuna göre günlük görevler. Ücretli plan; ilerleme takibi, yeni teşhisler ve hedefe yönelik çalışmayı açar.",
  },
] as const;

export const roiProfiles = [
  {
    id: "hekim",
    label: "Asistan hekim / TUS",
    text: "YÖKDİL barajını tek dönemde aşmak → daha erken kadro süreci ve dil engeline bağlı gecikmenin kısalması.",
  },
  {
    id: "akademik",
    label: "Doçentlik / doktora",
    text: "Dil engelini kapatmak → akademik süreçte ilerleme ve tez / başvuru takvimine geri kazanılan zaman.",
  },
  {
    id: "kamu",
    label: "Kamu dil tazminatı",
    text: "YDS seviyesini yükseltmek → uzun vadede düzenli dil tazminatı getirisi potansiyeli.",
  },
] as const;

export const architecturePoints = [
  "11 soru tipinin tamamında hata takibi",
  "Kişiselleştirilmiş günlük çalışma planı",
  "Çeldirici filtresiyle şık analizi",
  "Hedefe göre öncelik sırası",
] as const;
