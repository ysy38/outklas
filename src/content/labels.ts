const distractors: Record<string, string> = {
  CONTEXT_MISMATCH: "bağlam tutmuyor",
  COLLOCATION_ERROR: "eşdizim tutmuyor",
  VOCAB_SIMILAR_MEANING: "anlamı yakın, işi değil",
  LOGICAL_ERROR: "mantık ters",
  CONNECTOR_ERROR: "bağlaç yanlış",
  GRAMMAR_TRAP: "yapı tuzağı",
  REFERENCE_ERROR: "gönderim şaşıyor",
  TRANSLATION_SHIFT: "çeviri kayıyor",
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
  "cloze-context": "Paragrafın akışı",
  sentence: "Cümle tamamlama",
  "sentence-link": "Cümlenin bağı",
  translation: "Çeviri",
  "translation-en-tr": "İngilizceden Türkçeye",
  "translation-tr-en": "Türkçeden İngilizceye",
  reading: "Okuma",
  detail: "Ayrıntı",
  inference: "Çıkarım",
  reference: "Gönderim",
  "main-idea": "Ana fikir",
  purpose: "Yazarın amacı",
  dialogue: "Diyalog",
  "dialogue-intent": "Konuşanın niyeti",
  situation: "Duruma uygun ifade",
  "situation-line": "Durumda söylenecek söz",
  restatement: "Anlamca yakın cümle",
  "restatement-shift": "Anlam kayması",
  paragraph: "Paragraf tamamlama",
  "paragraph-flow": "Paragrafın akışı",
  irrelevant: "Anlamı bozan cümle",
  "irrelevant-break": "Akışın koptuğu yer",
};

export function skillName(id: string, fallback?: string) {
  return skillNames[id] ?? fallback ?? id;
}

export const modeLabel: Record<string, string> = {
  diagnostic: "Teşhis",
  practice: "Pratik",
  simulator: "Deneme",
};

export const sessionStatusLabel: Record<string, string> = {
  active: "açık",
  submitted: "bitti",
};
