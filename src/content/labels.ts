const distractors: Record<string, string> = {
  CONTEXT_MISMATCH: "cümlenin bağlamına uymuyor",
  COLLOCATION_ERROR: "kelime bu kalıpla kullanılmıyor",
  VOCAB_SIMILAR_MEANING: "anlamı yakın ama cümleye oturmuyor",
  LOGICAL_ERROR: "anlam mantıklı değil",
  CONNECTOR_ERROR: "bağlaç yanlış ilişki kuruyor",
  GRAMMAR_TRAP: "dil bilgisi tuzağı",
  REFERENCE_ERROR: "zamir yanlış şeyi gösteriyor",
  TRANSLATION_SHIFT: "çeviride anlam değişiyor",
};

export function distractorText(code: string | null | undefined) {
  if (!code) return null;
  return distractors[code] ?? code;
}

export const bucketLabel = {
  weak: "zayıf bölüm",
  review: "tekrar",
  target: "hedef",
  strength: "güçlü",
  novel: "yeni",
} as const;

const skillNames: Record<string, string> = {
  vocabulary: "Kelime",
  "academic-vocabulary": "Akademik kelime",
  collocation: "Eşdizim",
  grammar: "Dil bilgisi",
  tenses: "Zaman",
  connectors: "Bağlaç",
  conditionals: "Koşul",
  relative: "İlgi cümlesi",
  passive: "Edilgen",
  prepositions: "Edat",
  cloze: "Paragrafta boşluk",
  "cloze-context": "Paragraftaki bağlam",
  sentence: "Cümle tamamlama",
  "sentence-link": "Cümle içi bağlantı",
  translation: "Çeviri",
  "translation-en-tr": "İngilizceden Türkçeye",
  "translation-tr-en": "Türkçeden İngilizceye",
  reading: "Okuma",
  detail: "Ayrıntı",
  inference: "Çıkarım",
  reference: "Zamirin gösterdiği",
  "main-idea": "Ana fikir",
  purpose: "Yazarın amacı",
  dialogue: "Diyalog",
  "dialogue-intent": "Konuşanın niyeti",
  situation: "Duruma uygun ifade",
  "situation-line": "Duruma uygun söz",
  restatement: "Anlamca yakın cümle",
  "restatement-shift": "Anlam farkını görme",
  paragraph: "Paragraf tamamlama",
  "paragraph-flow": "Paragrafın akışı",
  irrelevant: "Anlam bütünlüğünü bozan cümle",
  "irrelevant-break": "Akışı bozan cümleyi bulma",
};

export function skillName(id: string, fallback?: string) {
  return skillNames[id] ?? fallback ?? id;
}

export const modeLabel: Record<string, string> = {
  diagnostic: "Seviye testi",
  practice: "Günlük çalışma",
  simulator: "Deneme",
};

export const sessionStatusLabel: Record<string, string> = {
  active: "devam ediyor",
  submitted: "tamamlandı",
};
