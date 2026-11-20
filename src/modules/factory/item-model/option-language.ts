import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { looksTurkish } from "@/modules/analysis/surface";

/**
 * looksTurkish is a letter-density heuristic. A sentence can lack ç, ğ, ı, ö, ş, ü
 * and still be Turkish, or contain one of those letters inside an otherwise English sentence.
 * This check names only the clear cases. Anything else stays unverified.
 */
export type OptionScript = "tr" | "en" | "unverified";

const englishFunction = new Set([
  "the", "of", "that", "which", "although", "because", "would", "have", "been", "they", "their", "them",
  "was", "were", "if", "before", "only", "and", "but", "with", "from", "this", "these", "those", "had",
  "not", "into", "than", "rather", "while", "when", "where", "who", "what", "why",
]);

const turkishFunction = new Set([
  "ve", "ama", "ancak", "fakat", "için", "icin", "bir", "bu", "ile", "daha", "olan", "olarak", "değil", "degil",
  "göre", "gore", "kadar", "sonra", "önce", "yalnızca", "yalnizca", "sadece", "yine", "rağmen", "ragmen",
  "çünkü", "cunku", "diye", "üzere", "uzere", "karşı", "karsi", "dair", "hem",
]);

function tokens(text: string): string[] {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function optionScript(text: string): OptionScript {
  const turkishLetters = looksTurkish(text);
  const words = tokens(text);
  const englishHits = words.filter((word) => englishFunction.has(word)).length;
  const turkishHits = words.filter((word) => turkishFunction.has(word)).length;
  if (turkishLetters && englishHits >= 3 && turkishHits === 0) return "unverified";
  if (turkishLetters && englishHits === 0) return "tr";
  if (turkishLetters && turkishHits > 0 && englishHits === 0) return "tr";
  if (!turkishLetters && englishHits >= 2 && turkishHits === 0) return "en";
  if (!turkishLetters && turkishHits >= 2 && englishHits === 0) return "tr";
  return "unverified";
}

export type TargetLanguageReport = {
  status: "pass" | "fail" | "review";
  failures: string[];
};

export type TargetLanguageDiagnostic = {
  optionId: OptionLabel;
  issueCode: "target_language_mismatch" | "language_unverified";
  script: OptionScript;
  targetLanguage: "tr" | "en";
};

/** Per-option script findings using the exact optionScript rule. Does not alter assessTargetLanguage. */
export function targetLanguageDiagnostics(input: {
  questionType: string;
  targetLanguage: "tr" | "en" | null;
  options: Partial<Record<OptionLabel, string>>;
}): TargetLanguageDiagnostic[] {
  if (input.questionType !== "translation" || !input.targetLanguage) return [];
  const findings: TargetLanguageDiagnostic[] = [];
  for (const label of optionLabels) {
    const text = input.options[label];
    if (!text) continue;
    const script = optionScript(text);
    if (script === "unverified") {
      findings.push({ optionId: label, issueCode: "language_unverified", script, targetLanguage: input.targetLanguage });
    } else if (script !== input.targetLanguage) {
      findings.push({ optionId: label, issueCode: "target_language_mismatch", script, targetLanguage: input.targetLanguage });
    }
  }
  return findings;
}

/** Restatement is unchanged. Translation fails only a clear script clash and holds an unclear sentence. */
export function assessTargetLanguage(input: {
  questionType: string;
  targetLanguage: "tr" | "en" | null;
  options: Record<OptionLabel, string>;
}): TargetLanguageReport {
  if (input.questionType !== "translation" || !input.targetLanguage) return { status: "pass", failures: [] };
  let mismatch = false;
  let unverified = false;
  for (const label of optionLabels) {
    const script = optionScript(input.options[label] ?? "");
    if (script === "unverified") unverified = true;
    else if (script !== input.targetLanguage) mismatch = true;
  }
  if (mismatch) return { status: "fail", failures: ["target_language_mismatch"] };
  if (unverified) return { status: "review", failures: ["language_unverified"] };
  return { status: "pass", failures: [] };
}
