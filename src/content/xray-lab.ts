export type LabDomain = "sosyal" | "saglik" | "fen";
export type LabMode = "raw" | "skeleton" | "syntax";

export type LabOption = {
  id: string;
  text: string;
  correct: boolean;
  title: string;
  explanation: string;
};

export type LabSentence = {
  meta: string;
  loads: { raw: number; skeleton: number; syntax: number };
  mainVerb: string;
  raw: { text: string; verb?: boolean }[];
  skeleton: { text: string; kind: "filler" | "core" | "lock" }[];
  syntax: { text: string; tone: "contrast" | "mute" | "subject" | "idea" | "condition" | "time" }[];
  words: { word: string; info: string }[];
  diagnosis: Record<LabMode, string>;
  options: LabOption[];
};

export const labDomains: { id: LabDomain; label: string }[] = [
  { id: "sosyal", label: "Sosyal / YDS" },
  { id: "saglik", label: "Sağlık (TUS/YÖKDİL)" },
  { id: "fen", label: "Fen / Mühendislik" },
];

export const labModes: { id: LabMode; label: string }[] = [
  { id: "raw", label: "01. Ham sınav cümlesi" },
  { id: "skeleton", label: "02. Dolguları sil" },
  { id: "syntax", label: "03. Sentaktik röntgen" },
];

export const sentences: Record<LabDomain, LabSentence> = {
  sosyal: {
    meta: "YDS Sosyal Bilimler · 31 kelime · Zıtlık + isim cümleciği · Örnek",
    loads: { raw: 92, skeleton: 24, syntax: 38 },
    mainVerb: "demonstrate",
    raw: [
      { text: "Despite the widespread assumption among early twentieth-century sociologists that rapid urbanization would inevitably erode traditional kinship bonds, recent archival findings " },
      { text: "demonstrate", verb: true },
      { text: " that extended family networks actually adapted and thrived." },
    ],
    skeleton: [
      { text: "Despite the widespread assumption among early twentieth-century sociologists that rapid urbanization would inevitably erode traditional kinship bonds, ", kind: "filler" },
      { text: "recent findings demonstrate that family networks thrived.", kind: "core" },
    ],
    syntax: [
      { text: "[ZITLIK: Despite the widespread assumption]", tone: "contrast" },
      { text: " [among sociologists that urbanization would erode bonds,] ", tone: "mute" },
      { text: "[ANA ÖZNE + YÜKLEM: recent findings demonstrate]", tone: "subject" },
      { text: " [ANA FİKİR: that family networks adapted and thrived.]", tone: "idea" },
    ],
    words: [
      { word: "Despite", info: "Zıtlık edatı (−e rağmen). Eşdeğerleri: In spite of, Notwithstanding, Much as (+cümle)." },
      { word: "inevitably", info: "Zarf · kaçınılmaz olarak. Çeldirici ikizi: unavoidably / invariably." },
      { word: "erode", info: "Fiil · aşındırmak, zayıflatmak. Eşdeğerleri: undermine, weaken." },
      { word: "thrived", info: "Fiil · gelişmek, serpilmek. Eşdeğerleri: flourish, prosper." },
    ],
    diagnosis: {
      raw: "Birçok aday cümlenin ilk yarısındaki ‘urbanization would inevitably erode’ ifadesini gerçek yargı sanıyor. Oysa o kısım yalnızca Despite ile çürütülen eski bir varsayım.",
      skeleton: "31 kelimelik cümleden dolguyu sildik. Geriye omurga kaldı: ‘Son bulgular aile ağlarının güçlendiğini gösteriyor.’",
      syntax: "Despite / Much as / Notwithstanding ile başlayan yan cümle yemdir. Gözün virgülden sonraki özne ve ana fiile kilitlenmeli.",
    },
    options: [
      {
        id: "A",
        text: "A) Rapid urbanization in the early 20th century completely destroyed traditional family ties.",
        correct: false,
        title: "Tuzak: yem cümlecik + aşırı genelleme (completely)",
        explanation: "Despite the assumption that… kısmındaki yanlış varsayımı doğru bilgi gibi şıkka koymuş ve completely gibi uç bir kelime eklemiş.",
      },
      {
        id: "B",
        text: "B) Contrary to earlier sociological beliefs, extended family structures managed to survive and flourish.",
        correct: true,
        title: "Doğru · sentaktik ve anlamsal eşleşme",
        explanation: "Despite the assumption ≈ Contrary to earlier beliefs · adapted and thrived ≈ managed to survive and flourish.",
      },
      {
        id: "C",
        text: "C) Sociologists have always agreed that archival findings are more reliable than urbanization theories.",
        correct: false,
        title: "Tuzak: sahte kıyas + always",
        explanation: "Metinde geçen kelimeleri avlayan adayları çeker; metinde böyle bir güvenilirlik kıyaslaması yok.",
      },
    ],
  },
  saglik: {
    meta: "YÖKDİL Sağlık / TUS · 29 kelime · ortaç kısaltması · Örnek",
    loads: { raw: 89, skeleton: 21, syntax: 35 },
    mainVerb: "reduces",
    raw: [
      { text: "Administered within the first golden hour following acute ischemic stroke, recombinant tissue plasminogen activator significantly " },
      { text: "reduces", verb: true },
      { text: " long-term neurological disability, provided that intracranial hemorrhage has been definitively ruled out." },
    ],
    skeleton: [
      { text: "Administered within the first golden hour following acute ischemic stroke, ", kind: "filler" },
      { text: "tPA significantly reduces disability, ", kind: "core" },
      { text: "provided that hemorrhage is ruled out.", kind: "lock" },
    ],
    syntax: [
      { text: "[KISALTMA: Administered within the first golden hour,]", tone: "mute" },
      { text: " [ANA ÖZNE + YÜKLEM: tPA significantly reduces disability,]", tone: "subject" },
      { text: " [KOŞUL: provided that hemorrhage has been ruled out.]", tone: "condition" },
    ],
    words: [
      { word: "Administered", info: "Pasif kısaltma (When it is administered). Tıp metinlerinde sık giriş yapısı." },
      { word: "provided that", info: "Koşul bağlacı · −mesi şartıyla (only if / as long as)." },
      { word: "ruled out", info: "Phrasal verb · dışlamak, ekarte etmek." },
    ],
    diagnosis: {
      raw: "Cümle Administered… diye fiilimsi ile başlıyor. Aday özneyi ilk kelimede aradığı için kayboluyor ve sondaki provided that koşulunu kaçırıyor.",
      skeleton: "Tıbbi terim kalabalığını sildiğimizde geriye net bir klinik kural kalıyor.",
      syntax: "Cümle sonundaki provided that (= only if) cevabı belirleyen kilit bağlaçtır.",
    },
    options: [
      {
        id: "A",
        text: "A) The treatment is effective in minimizing neurological damage only if brain bleeding is excluded beforehand.",
        correct: true,
        title: "Doğru · koşul bağlacı yakalandı",
        explanation: "reduces disability ≈ minimizing damage · provided that hemorrhage is ruled out ≈ only if brain bleeding is excluded.",
      },
      {
        id: "B",
        text: "B) Intracranial hemorrhage is mostly triggered by administering activator drugs during the first hour.",
        correct: false,
        title: "Tuzak: ters nedensellik",
        explanation: "Metindeki kelimeleri harmanlayıp ters bir yan etki uydurmuş. İlaç kanamayı tetiklemiyor; kanama yoksa veriliyor.",
      },
      {
        id: "C",
        text: "C) Regardless of when it is given, the drug prevents all neurological complications after a stroke.",
        correct: false,
        title: "Tuzak: zıt kutup (regardless of vs within the first hour)",
        explanation: "Metin ‘ilk altın saat içinde’ diyor; şık ‘ne zaman verilirse verilsin’ diyerek zıt kutup kuruyor.",
      },
    ],
  },
  fen: {
    meta: "YÖKDİL Fen · 30 kelime · devrik yapı & nedensellik · Örnek",
    loads: { raw: 94, skeleton: 25, syntax: 40 },
    mainVerb: "consider",
    raw: [
      { text: "Not until quantum coherence could be maintained at room temperature without cryogenic cooling did solid-state physicists " },
      { text: "consider", verb: true },
      { text: " scalable photonic processors commercially viable for mainstream computing." },
    ],
    skeleton: [
      { text: "Only after coherence was maintained ", kind: "lock" },
      { text: "at room temperature without cryogenic cooling ", kind: "filler" },
      { text: "did physicists consider processors viable.", kind: "core" },
    ],
    syntax: [
      { text: "[ZAMAN: Not until quantum coherence could be maintained…]", tone: "time" },
      { text: " [DEVRİK ANA YÜKLEM: did physicists consider]", tone: "subject" },
      { text: " [SONUÇ: photonic processors commercially viable.]", tone: "idea" },
    ],
    words: [
      { word: "Not until… did", info: "Devrik kalıp · ancak … olduktan sonra (= Only after / Only when)." },
      { word: "maintained", info: "Fiil · sürdürmek, korumak." },
      { word: "viable", info: "Sıfat (AWL) · uygulanabilir, geçerli." },
    ],
    diagnosis: {
      raw: "Not until… ile başlayan cümlelerde adaylar Not görünce cümleyi olumsuz sanıyor. Oysa kalıp ‘Ancak X olduktan sonra Y gerçekleşti’ demektir.",
      skeleton: "Teknik sıfatları attığımızda kalıp net: ‘Ancak koherans korunduktan sonra fizikçiler işlemcileri uygulanabilir gördü.’",
      syntax: "Restatement sorularında Not until… did… doğru şıkta Only after / Only when ile eşleşir.",
    },
    options: [
      {
        id: "A",
        text: "A) Physicists still do not believe that photonic processors can work at room temperature.",
        correct: false,
        title: "Tuzak: Not’tan sahte olumsuzluk",
        explanation: "Not until ifadesini olumsuz yargı sanan adaylar için klasik yem.",
      },
      {
        id: "B",
        text: "B) Cryogenic cooling remains the only way to make quantum processors commercially profitable.",
        correct: false,
        title: "Tuzak: kelime cımbızlama",
        explanation: "Metin without cryogenic cooling derken bu şık tam tersini söylüyor.",
      },
      {
        id: "C",
        text: "C) Scalable photonic processors were viewed as commercially practical only after room-temperature quantum coherence was achieved.",
        correct: true,
        title: "Doğru · Not until = Only after",
        explanation: "ÖSYM denklemi: Not until X did Y ≡ Y happened only after X.",
      },
    ],
  },
};
