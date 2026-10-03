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
  weak: "zayıf bant",
  review: "tekrar",
  target: "hedef",
  strength: "güçlü",
  novel: "yeni",
} as const;

export const modeLabel: Record<string, string> = {
  diagnostic: "Teşhis",
  practice: "Pratik",
  simulator: "Deneme",
};

export const sessionStatusLabel: Record<string, string> = {
  active: "açık",
  submitted: "bitti",
};
