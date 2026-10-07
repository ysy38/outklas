import { extractionConfidence } from "@/modules/analysis/acceptance";
import { optionLabels } from "@/modules/analysis/contract";
import { looksTurkish, words, type ReconstructedQuestion } from "@/modules/analysis/surface";
import type { OcrStats, Rebuilt } from "./reconstruct";

export const thresholds = {
  /** Character error rate between the Tesseract and Gemini readings of one question. */
  maxDisagreement: 0.02,
  minMeanConfidence: 80,
  maxLowConfidenceShare: 0.05,
  maxTokenLength: 24,
};

export type ExtractionStatus = "ok" | "needs_review" | "failed";

export type QuestionCheck = {
  number: number;
  status: ExtractionStatus;
  flags: string[];
  disagreement: number | null;
  meanConfidence: number | null;
  lowConfidenceShare: number | null;
  extractionConfidence: number;
};

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[b.length];
}

export const comparable = (text: string) => text.replace(/\s+/g, " ").trim();

export function charErrorRate(reference: string, hypothesis: string): number {
  const ref = comparable(reference);
  return ref.length ? levenshtein(ref, comparable(hypothesis)) / ref.length : hypothesis.trim() ? 1 : 0;
}

export function wordErrorRate(reference: string, hypothesis: string): number {
  const ref = words(reference);
  const hyp = words(hypothesis);
  if (!ref.length) return hyp.length ? 1 : 0;
  let previous = Array.from({ length: hyp.length + 1 }, (_, index) => index);
  for (let i = 1; i <= ref.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= hyp.length; j += 1) current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[hyp.length] / ref.length;
}

export const questionText = (question: ReconstructedQuestion, withStimulus = true) =>
  [withStimulus ? (question.stimulus ?? "") : "", question.stem, ...optionLabels.map((label) => `${label}) ${question.options[label]}`)].filter(Boolean).join("\n");

const balanced = (text: string, open: string, close: string) => text.split(open).length === text.split(close).length;

/** Structural checks on one reconstructed question; none of them trust the OCR. */
export function structuralFlags(question: ReconstructedQuestion): string[] {
  const flags: string[] = [];
  const body = [question.stimulus ?? "", question.stem].join("\n");
  const all = [body, ...optionLabels.map((label) => question.options[label])].join("\n");
  for (const label of optionLabels) if (!question.options[label].trim()) flags.push(`empty_option_${label}`);

  const blanks = (body.match(/----/g) ?? []).length;
  const emptyTurns = (body.match(/^[A-Za-z][A-Za-z .'-]{0,28}:\s*[–—−-]\s*$/gm) ?? []).length;
  switch (question.section) {
    case "vocabulary":
    case "grammar":
      if ((question.stem.match(/----/g) ?? []).length < 1) flags.push("blank_missing");
      break;
    case "sentence":
      if ((question.stem.match(/----/g) ?? []).length !== 1) flags.push(`blank_count_${(question.stem.match(/----/g) ?? []).length}`);
      break;
    case "dialogue":
      if (blanks + emptyTurns !== 1) flags.push(`blank_count_${blanks + emptyTurns}`);
      break;
    case "cloze":
      if (!question.stimulus) flags.push("passage_missing");
      else if (!new RegExp(`\\(${question.number}\\)\\s*----`).test(question.stimulus)) flags.push("cloze_blank_missing");
      break;
    case "reading":
      if (!question.stimulus) flags.push("passage_missing");
      if (!question.stem.trim()) flags.push("stem_missing");
      break;
    case "paragraph":
      if ((question.stimulus?.match(/----/g) ?? []).length !== 1) flags.push("paragraph_blank_missing");
      break;
    case "irrelevant": {
      const numerals = ["I", "II", "III", "IV", "V"];
      const marked = numerals.filter((numeral) => question.stimulus?.includes(`(${numeral})`)).length;
      if (marked < 4) for (const numeral of numerals) if (!question.stimulus?.includes(`(${numeral})`)) flags.push(`sentence_${numeral}_missing`);
      if (optionLabels.some((label, index) => question.options[label].replace(/\W/g, "") !== numerals[index])) flags.push("numbered_options");
      break;
    }
    case "translation": {
      const stemTurkish = looksTurkish(question.stem);
      const optionsTurkish = optionLabels.filter((label) => looksTurkish(question.options[label])).length;
      if (stemTurkish ? optionsTurkish > 0 : optionsTurkish < 5) flags.push("translation_direction");
      break;
    }
    default:
      break;
  }
  if (!question.stem.trim() && !question.stimulus) flags.push("no_text");
  if (!balanced(all, "(", ")")) flags.push("unbalanced_parentheses");
  if ((all.match(/"/g) ?? []).length % 2) flags.push("unbalanced_quotes");
  const tokens = all.split(/\s+/);
  if (tokens.some((token) => token.replace(/[^\p{L}]/gu, "").length > thresholds.maxTokenLength)) flags.push("merged_words");
  if (tokens.some((token) => /\p{L}[^\p{L}\s'\-.,;:!?()"/]+\p{L}/u.test(token))) flags.push("mixed_token");
  if (tokens.some((token) => token !== "----" && !/^-+$/.test(token) && /^[^\p{L}\p{N}()"'\-–.,;:!?/%]+$/u.test(token))) flags.push("junk_token");
  if (question.section !== "translation" && /[ğışĞŞİ]/.test(body + all)) flags.push("unexpected_turkish_letter");
  if (/\[\?\]/.test(all)) flags.push("unreadable_word");
  return flags;
}

export function ocrConfidence(stats: OcrStats) {
  return stats.words ? { mean: stats.confidenceSum / stats.words, lowShare: stats.lowConfidenceWords / stats.words } : { mean: null, lowShare: null };
}

/**
 * Recorded but not blocking on their own: a Tesseract-only passage that passed every structural and confidence check
 * is still checked end to end by the blind solve against the answer key.
 */
export const warningFlags = new Set(["single_reading", "no_tesseract_reading"]);

const reconstructWarning = (flag: string) => flag.startsWith("reconstruct: unattached text");

/**
 * Combines both readings: structural flags on the primary text and disagreement against the raw OCR. Tesseract's own
 * confidence only matters where nothing independent confirms its text.
 */
export function checkQuestion(primary: Rebuilt, ocr: Rebuilt | undefined, segmentationMissing: boolean): QuestionCheck {
  const flags = [...structuralFlags(primary.question), ...primary.warnings.map((warning) => `reconstruct: ${warning}`)];
  if (segmentationMissing) flags.push("segmentation_gap");
  const confidence = ocr ? ocrConfidence(ocr.ocr) : { mean: null, lowShare: null };
  const disagreement = ocr && ocr !== primary ? charErrorRate(questionText(primary.question), questionText(ocr.question)) : null;
  if (!ocr) flags.push("no_tesseract_reading");
  if (ocr && ocr !== primary && primary.fallbackLines > 0) flags.push("single_reading");
  if (disagreement !== null && disagreement > thresholds.maxDisagreement) flags.push("ocr_disagreement");
  const tesseractOnly = disagreement === null || primary.fallbackLines > 0;
  if (tesseractOnly && confidence.mean !== null && confidence.mean < thresholds.minMeanConfidence) flags.push("low_ocr_confidence");
  if (tesseractOnly && confidence.lowShare !== null && confidence.lowShare > thresholds.maxLowConfidenceShare) flags.push("many_low_confidence_words");
  const fatal = flags.some((flag) => flag === "no_text" || flag.startsWith("empty_option") || flag === "passage_missing");
  const blocking = flags.filter((flag) => !warningFlags.has(flag) && !reconstructWarning(flag));
  const status: ExtractionStatus = fatal ? "failed" : blocking.length ? "needs_review" : "ok";
  return {
    number: primary.question.number,
    status,
    flags,
    disagreement: disagreement === null ? null : Math.round(disagreement * 10_000) / 10_000,
    meanConfidence: confidence.mean === null ? null : Math.round(confidence.mean * 10) / 10,
    lowConfidenceShare: confidence.lowShare === null ? null : Math.round(confidence.lowShare * 1000) / 1000,
    extractionConfidence: extractionConfidence({
      status,
      blockingFlags: blocking.length,
      warningFlags: flags.filter((flag) => warningFlags.has(flag) || reconstructWarning(flag)).length,
    }),
  };
}
