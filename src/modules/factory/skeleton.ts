import { z } from "zod";
import { looksTurkish, words } from "@/modules/analysis/surface";
import { shingles } from "@/modules/analysis/validate";
import { knowledgeEdges } from "@/modules/knowledge/seed";
import { relationConnectors } from "./families";
import { connectorSurface } from "./spec-engine";
import type { QuestionSpec } from "./spec";
import { blankPosition, clauseReuse, hasPhrase, integrityProblems, leadingConnector, normalized, stageValidation, type IssueSeverity, type OriginalityIndex, type StageValidation, type ValidationIssue } from "./validator";

/** Stage 1 output: the item without wrong options. No explanation, no taxonomy. */
export const questionSkeleton = z.object({
  /** Only for formats with a passage; sentence completion has none. */
  context: z.string().max(1500).nullable(),
  stem: z.string().min(1).max(500),
  correctAnswer: z.string().min(1).max(300),
});
export type QuestionSkeleton = z.infer<typeof questionSkeleton>;

const contextFormats = new Set<string>(["passage_numbered_blank", "passage_question", "passage_sentence_blank", "numbered_sentences", "dialogue_blank"]);
const english = (text: string) => !/[çğıöşüÇĞİÖŞÜ]/.test(text) && !looksTurkish(text);
const capitalised = (text: string) => {
  const first = text.trim().charAt(0);
  return first !== "" && first === first.toLocaleUpperCase("en") && first !== first.toLocaleLowerCase("en");
};

/** The completed sentence a learner reads with `option` in the blank. */
export const completeStem = (stem: string, option: string) => stem.replace("----", option.trim());

/** Deterministic checks on stage 1. Any critical issue discards the skeleton and the whole item is written again. */
export function validateSkeleton(input: { spec: QuestionSpec; skeleton: QuestionSkeleton; originality?: OriginalityIndex; siblingStems?: string[] }): StageValidation {
  const { spec, skeleton } = input;
  const issues: ValidationIssue[] = [];
  const add = (code: string, severity: IssueSeverity, detail?: string) => issues.push({ code, severity, ...(detail ? { detail } : {}) });
  const stem = skeleton.stem.trim();
  const answer = skeleton.correctAnswer.trim();

  if (spec.questionType !== "question_type:sentence_completion" || spec.structuralFormat !== "sentence_stem_completion") add("unsupported_question_type", "critical", spec.questionType);
  const needsContext = contextFormats.has(spec.structuralFormat);
  if (needsContext && !skeleton.context?.trim()) add("empty_context", "critical");
  if (!needsContext && skeleton.context?.trim()) add("unexpected_context", "critical");

  const blanks = (stem.match(/----/g) ?? []).length;
  if (blanks !== 1) add("blank_count", "critical", String(blanks));
  const position = blankPosition(stem);
  if (blanks === 1 && position !== spec.contextConstraints.blankPosition) add("blank_position", "critical", position);
  for (const problem of integrityProblems(stem.replaceAll("----", "BLANK"))) add("text_integrity", "critical", `stem ${problem}`);
  if (!english(stem)) add("non_english_text", "critical", "stem");
  if (spec.contextConstraints.blankPosition === "start" && !/^----,\s+\S/.test(stem)) add("stem_punctuation", "critical", "start blank needs '----, '");
  if (spec.contextConstraints.blankPosition === "end" && !/\S\s+----\.$/.test(stem)) add("stem_punctuation", "critical", "end blank needs ' ----.'");
  if (spec.contextConstraints.blankPosition === "end" && !capitalised(stem)) add("stem_capitalisation", "critical");

  const stemWords = words(stem.replaceAll("----", " ")).length;
  const range = spec.contextConstraints.stemWords;
  if (stemWords < range.min * 0.5 || stemWords > range.max * 1.5) add("length_far_out", "critical", `stem ${stemWords}`);
  else if (stemWords < range.min || stemWords > range.max) add("length_out_of_range", "warn", `stem ${stemWords}`);

  if (answer.includes("----")) add("answer_contains_blank", "critical");
  for (const problem of integrityProblems(answer)) add("text_integrity", "critical", `answer ${problem}`);
  if (!english(answer)) add("non_english_text", "critical", "answer");
  if (/[.,;:!?]$/.test(answer)) add("answer_punctuation", "critical");
  if (capitalised(answer) !== (spec.contextConstraints.blankPosition === "start")) add("answer_capitalisation", "critical");
  const connector = leadingConnector(answer);
  if (!connector || !spec.answerConstraints.connectors.includes(connector)) add("answer_connector_not_allowed", "critical", connector ?? "none");
  if (connector && spec.grammarPattern && !knowledgeEdges.some((edge) => edge.type === "has_pattern" && edge.from === connector && edge.to === spec.grammarPattern)) {
    add("grammar_pattern_mismatch", "critical", connector);
  }
  const body = connector ? answer.slice(connectorSurface(connector).length).trim() : answer;
  if (words(body).length < 3) add("answer_not_clause", "critical");
  const answerWords = words(answer).length;
  const optionRange = spec.contextConstraints.optionWords;
  if (answerWords < optionRange.min * 0.5 || answerWords > optionRange.max * 1.5) add("length_far_out", "critical", `answer ${answerWords}`);
  else if (answerWords < optionRange.min || answerWords > optionRange.max) add("length_out_of_range", "warn", `answer ${answerWords}`);

  const leaks = [...(spec.discourseRelation ? relationConnectors(spec.discourseRelation).map(connectorSurface) : []), ...spec.vocabularyConstraints.forbiddenInDistractors];
  const leaked = leaks.find((marker) => hasPhrase(stem.replaceAll("----", " "), marker));
  if (leaked) add("answer_leak_in_stem", "critical", leaked);
  if (clauseReuse(answer, stem.replaceAll("----", " ")).level === "copy") add("answer_echoed_in_stem", "critical");

  if (input.originality) {
    const runs = [...shingles(completeStem(stem, answer), input.originality.size)].filter((shingle) => input.originality!.shingles.has(shingle)).length;
    if (runs > 0) add("source_overlap", "critical", String(runs));
  }
  if ((input.siblingStems ?? []).some((other) => normalized(other) === normalized(stem))) add("duplicate_of_sibling", "critical");
  return stageValidation(issues);
}
