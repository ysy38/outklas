import { bandForSlot, type Blueprint, type Layout, type SectionId } from "@/modules/exam/blueprint";
import type { NodeRef } from "@/modules/knowledge/graph";
import { sectionSlug } from "@/modules/knowledge/seed";
import { optionLabels, type OptionLabel } from "./contract";

export type TranslationDirection = "en_tr" | "tr_en";

/** A question rebuilt from OCR. Holds item text, so it only ever lives in local artifacts. */
export type ReconstructedQuestion = {
  number: number;
  section: SectionId;
  layout: Layout;
  stimulusKey: string | null;
  stimulus: string | null;
  stem: string;
  options: Record<OptionLabel, string>;
  translationDirection: TranslationDirection | null;
};

export const structuralFormats = [
  "sentence_blank",
  "passage_numbered_blank",
  "sentence_stem_completion",
  "sentence_translation",
  "passage_question",
  "dialogue_blank",
  "sentence_restatement",
  "passage_sentence_blank",
  "numbered_sentences",
] as const;
export type StructuralFormat = (typeof structuralFormats)[number];

const formatBySection: Record<SectionId, StructuralFormat> = {
  vocabulary: "sentence_blank",
  grammar: "sentence_blank",
  cloze: "passage_numbered_blank",
  sentence: "sentence_stem_completion",
  translation: "sentence_translation",
  reading: "passage_question",
  dialogue: "dialogue_blank",
  restatement: "sentence_restatement",
  situation: "sentence_restatement",
  paragraph: "passage_sentence_blank",
  irrelevant: "numbered_sentences",
};

export type SurfaceFeatures = {
  optionCount: number;
  structuralFormat: StructuralFormat;
  stimulusWordCount: number;
  stemWordCount: number;
  optionWordMean: number;
  optionWordMax: number;
  sentenceCount: number;
  meanSentenceLength: number;
  blankCount: number;
};

const wordPattern = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export const words = (text: string | null | undefined): string[] => (text ?? "").match(wordPattern) ?? [];

export function sentences(text: string | null | undefined): string[] {
  return (text ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[(\p{Lu}"“'‘-])/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => words(sentence).length > 0);
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function surfaceFeatures(question: ReconstructedQuestion): SurfaceFeatures {
  const optionWords = optionLabels.map((label) => words(question.options[label]).length);
  const body = [question.stimulus, question.stem].filter(Boolean).join(" ");
  const bodySentences = sentences(body);
  return {
    optionCount: optionLabels.filter((label) => question.options[label].trim()).length,
    structuralFormat: formatBySection[question.section],
    stimulusWordCount: words(question.stimulus).length,
    stemWordCount: words(question.stem).length,
    optionWordMean: round2(optionWords.reduce((sum, count) => sum + count, 0) / optionWords.length),
    optionWordMax: Math.max(...optionWords),
    sentenceCount: bodySentences.length,
    meanSentenceLength: bodySentences.length ? round2(bodySentences.reduce((sum, sentence) => sum + words(sentence).length, 0) / bodySentences.length) : 0,
    blankCount: (body.match(/-{3,}|_{3,}/g) ?? []).length,
  };
}

/** The question type follows from the booklet position, so it is never taken from the model. */
export function expectedQuestionType(number: number, blueprint: Blueprint, direction: TranslationDirection | null): NodeRef | null {
  const band = bandForSlot(number, blueprint);
  if (!band) return null;
  if (band.section === "translation" && direction) return `question_type:translation_${direction}`;
  return `question_type:${sectionSlug[band.section]}`;
}

const turkishLetters = /[çğıöşüÇĞİÖŞÜ]/g;

/** Turkish text is dense in ç, ğ, ı, ö, ş, ü; English text has almost none. */
export function looksTurkish(text: string): boolean {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  return letters > 0 && (text.match(turkishLetters) ?? []).length / letters > 0.02;
}

/** Lowercased letters and digits only, so the same item hashes the same whatever the OCR punctuation. */
export function normalizeForHash(question: Pick<ReconstructedQuestion, "stimulus" | "stem" | "options">): string {
  return [question.stimulus ?? "", question.stem, ...optionLabels.map((label) => question.options[label])]
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
