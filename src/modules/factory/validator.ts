import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { looksTurkish, words } from "@/modules/analysis/surface";
import { shingles } from "@/modules/analysis/validate";
import { ref, type NodeRef } from "@/modules/knowledge/graph";
import { discourseForConnector, knowledgeNodes } from "@/modules/knowledge/seed";
import type { GeneratedQuestionCandidate } from "./candidate";
import { connectorSurface } from "./spec-engine";
import type { QuestionSpec } from "./spec";
import { factoryVersions } from "./versions";

export type IssueSeverity = "critical" | "warn";
export type ValidationIssue = { code: string; severity: IssueSeverity; option?: OptionLabel; detail?: string };

export type CandidateValidation = {
  version: typeof factoryVersions.validator;
  status: "pass" | "reject";
  critical: number;
  warnings: number;
  issues: ValidationIssue[];
  metrics: {
    stemWords: number;
    optionWords: Record<OptionLabel, number>;
    connectors: Record<OptionLabel, NodeRef | null>;
    blankPosition: "start" | "end" | "middle" | "none";
    sourceOverlapRuns: number;
  };
};

/** 5-word shingles of historical items. Built offline from local artifacts; the texts themselves never leave the machine. */
export type OriginalityIndex = { size: number; shingles: ReadonlySet<string> };

export function originalityIndex(texts: string[], size = 5): OriginalityIndex {
  const all = new Set<string>();
  for (const text of texts) for (const shingle of shingles(text, size)) all.add(shingle);
  return { size, shingles: all };
}

export type Sibling = { id: string; stem: string; options: Record<OptionLabel, string> };

const known = new Set(knowledgeNodes.map(ref));
const connectorSurfaces = knowledgeNodes
  .filter((node) => node.type === "connector")
  .map((node) => ({ ref: ref(node), surface: node.name.toLocaleLowerCase("en") }))
  .sort((a, b) => b.surface.length - a.surface.length);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const lower = (text: string) => text.toLocaleLowerCase("en");
const normalized = (text: string) => lower(text).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const stopwords = new Set(["the", "and", "that", "this", "with", "from", "have", "has", "had", "were", "was", "their", "they", "them", "there", "which", "would", "could", "about", "into", "than", "then", "been", "being", "more", "most", "such", "some", "many", "much", "also", "only", "very", "when", "what", "while", "where", "these", "those", "other"]);
const contentWords = (text: string) => new Set(words(text).map(lower).filter((word) => word.length >= 4 && !stopwords.has(word)));

/** The graph connector an option opens with (longest surface first), or null. */
export function leadingConnector(option: string): NodeRef | null {
  const text = lower(option.trim());
  return connectorSurfaces.find((entry) => new RegExp(`^${escape(entry.surface)}\\b`).test(text))?.ref ?? null;
}

const hasPhrase = (text: string, phrase: string) => new RegExp(`(^|[^\\p{L}])${escape(lower(phrase))}([^\\p{L}]|$)`, "u").test(lower(text));

function blankPosition(stem: string): CandidateValidation["metrics"]["blankPosition"] {
  const trimmed = stem.trim();
  if (!trimmed.includes("----")) return "none";
  if (trimmed.startsWith("----")) return "start";
  if (/----\s*[.!?]?$/.test(trimmed)) return "end";
  return "middle";
}

const integrityProblems = (text: string): string[] =>
  [
    /[\u0000-\u001f]/.test(text) ? "control_character" : null,
    /(^|\s)[A-E]\)/.test(text) ? "option_label" : null,
    /[[\]{}<>]|TODO|\.\.\.|…/.test(text) ? "placeholder" : null,
    (text.match(/\(/g) ?? []).length !== (text.match(/\)/g) ?? []).length ? "unbalanced_parentheses" : null,
    (text.match(/"/g) ?? []).length % 2 ? "unbalanced_quotes" : null,
    / {2,}/.test(text) ? "double_space" : null,
  ].filter((value): value is string => value !== null);

/** Deterministic checks; any critical issue rejects the candidate before the judge sees it. */
export function validateCandidate(input: { spec: QuestionSpec; candidate: GeneratedQuestionCandidate; originality?: OriginalityIndex; siblings?: Sibling[] }): CandidateValidation {
  const { spec, candidate } = input;
  const { stem, options } = candidate.question;
  const issues: ValidationIssue[] = [];
  const add = (code: string, severity: IssueSeverity, extra: Omit<ValidationIssue, "code" | "severity"> = {}) => issues.push({ code, severity, ...extra });
  const correct = spec.answerConstraints.correctOption;
  const distractorLabels = optionLabels.filter((label) => label !== correct);

  if (spec.exam !== "yds") add("unsupported_exam", "critical");
  if (spec.questionType !== "question_type:sentence_completion" || spec.structuralFormat !== "sentence_stem_completion") add("unsupported_question_type", "critical", { detail: spec.questionType });

  if (candidate.correctOption !== correct) add("correct_option_mismatch", "critical", { detail: `${candidate.correctOption} ≠ ${correct}` });
  if (candidate.targetConcept !== spec.primaryConcept) add("spec_drift", "critical", { detail: `targetConcept ${candidate.targetConcept}` });
  if (candidate.targetSkill !== spec.targetSkill) add("spec_drift", "critical", { detail: `targetSkill ${candidate.targetSkill}` });

  const optionWords = Object.fromEntries(optionLabels.map((label) => [label, words(options[label]).length])) as Record<OptionLabel, number>;
  const seen = new Map<string, OptionLabel>();
  for (const label of optionLabels) {
    const text = options[label];
    if (!text.trim()) add("option_empty", "critical", { option: label });
    const key = normalized(text);
    if (seen.has(key)) add("option_duplicate", "critical", { option: label, detail: seen.get(key) });
    seen.set(key, label);
    if (text.includes("----")) add("option_contains_blank", "critical", { option: label });
    for (const problem of integrityProblems(text)) add("text_integrity", "critical", { option: label, detail: problem });
    if (/[çğıöşüÇĞİÖŞÜ]/.test(text) || looksTurkish(text)) add("non_english_text", "critical", { option: label });
    if (/[.!?]\s*$/.test(text.trim())) add("option_punctuation", "warn", { option: label });
  }
  for (const [i, a] of optionLabels.entries()) {
    for (const b of optionLabels.slice(i + 1)) {
      const left = contentWords(options[a]);
      const right = contentWords(options[b]);
      const shared = [...left].filter((word) => right.has(word)).length;
      if (left.size && right.size && shared / Math.min(left.size, right.size) > 0.8) add("near_duplicate_options", "warn", { option: b, detail: a });
    }
  }

  const blanks = (stem.match(/----/g) ?? []).length;
  if (blanks !== 1) add("blank_count", "critical", { detail: String(blanks) });
  for (const problem of integrityProblems(stem.replaceAll("----", "BLANK"))) add("text_integrity", "critical", { detail: `stem ${problem}` });
  if (/[çğıöşüÇĞİÖŞÜ]/.test(stem) || looksTurkish(stem)) add("non_english_text", "critical", { detail: "stem" });
  const position = blankPosition(stem);
  if (blanks === 1 && position !== spec.contextConstraints.blankPosition) add("blank_position", position === "middle" ? "critical" : "warn", { detail: position });
  if (!/[.!?]$/.test(stem.trim())) add("stem_punctuation", "warn");
  const upper = optionLabels.map((label) => {
    const first = options[label].trim().charAt(0);
    return first !== "" && first === first.toLocaleUpperCase("en") && first !== first.toLocaleLowerCase("en");
  });
  if (new Set(upper).size > 1) add("inconsistent_capitalisation", "critical", { detail: optionLabels.filter((_, i) => upper[i]).join("") });
  else if (upper[0] !== (spec.contextConstraints.blankPosition === "start")) add("capitalisation", "warn");

  const stemWords = words(stem.replaceAll("----", " ")).length;
  const { stemWords: stemRange, optionWords: optionRange } = spec.contextConstraints;
  if (stemWords < stemRange.min * 0.5 || stemWords > stemRange.max * 1.5) add("length_far_out", "critical", { detail: `stem ${stemWords}` });
  else if (stemWords < stemRange.min || stemWords > stemRange.max) add("length_out_of_range", "warn", { detail: `stem ${stemWords}` });
  for (const label of optionLabels) {
    const count = optionWords[label];
    if (count < optionRange.min * 0.5 || count > optionRange.max * 1.5) add("length_far_out", "critical", { option: label, detail: String(count) });
    else if (count < optionRange.min || count > optionRange.max) add("length_out_of_range", "warn", { option: label, detail: String(count) });
  }
  const distractorMean = distractorLabels.reduce((sum, label) => sum + optionWords[label], 0) / distractorLabels.length;
  if (optionWords[correct] > distractorMean * 1.35 && distractorLabels.every((label) => optionWords[label] < optionWords[correct])) add("length_clue", "warn", { option: correct });

  const stemContent = contentWords(stem);
  const overlap = (label: OptionLabel) => [...contentWords(options[label])].filter((word) => stemContent.has(word)).length;
  if (overlap(correct) >= 2 && distractorLabels.every((label) => overlap(label) + 2 <= overlap(correct))) add("lexical_overlap_clue", "warn", { option: correct });

  const connectors = Object.fromEntries(optionLabels.map((label) => [label, leadingConnector(options[label])])) as Record<OptionLabel, NodeRef | null>;
  const answerConnector = connectors[correct];
  if (!answerConnector || !spec.answerConstraints.connectors.includes(answerConnector)) add("answer_connector_not_allowed", "critical", { option: correct, detail: answerConnector ?? "none" });
  if (answerConnector && hasPhrase(stem, connectorSurface(answerConnector))) add("stem_contains_answer_connector", "warn");
  for (const slot of spec.distractorPlan) {
    const found = connectors[slot.option];
    if (!found) add("connector_unrecognised", "critical", { option: slot.option });
    else if (!slot.connectors.includes(found)) add("distractor_connector_mismatch", "critical", { option: slot.option, detail: `${found} ∉ ${slot.expresses}` });
    if (found && spec.discourseRelation && discourseForConnector(found) === spec.discourseRelation) add("distractor_has_target_relation", "critical", { option: slot.option });
    for (const marker of spec.vocabularyConstraints.forbiddenInDistractors) {
      if (hasPhrase(options[slot.option], marker)) add("forbidden_marker_in_distractor", "critical", { option: slot.option, detail: marker });
    }
  }
  const body = (label: OptionLabel) => {
    const connector = connectors[label];
    const text = options[label].trim();
    return connector ? text.slice(connectorSurface(connector).length) : text;
  };
  const answerBody = contentWords(body(correct));
  for (const label of distractorLabels) {
    const own = contentWords(body(label));
    const shared = [...own].filter((word) => answerBody.has(word)).length;
    if (own.size && answerBody.size && shared / Math.min(own.size, answerBody.size) >= 0.8) add("connector_swap", "critical", { option: label });
  }
  const used = Object.values(connectors).filter((value): value is NodeRef => !!value);
  if (new Set(used).size !== used.length) add("connector_repeated", "warn");
  for (const label of optionLabels) {
    const said = candidate.metadata.connectorByOption[label]?.trim();
    if (said && connectors[label] && lower(said) !== connectorSurface(connectors[label]!)) add("connector_self_report", "warn", { option: label, detail: said });
  }

  const rationaleLabels = candidate.distractorRationales.map((entry) => entry.option).sort();
  if (rationaleLabels.join() !== [...distractorLabels].sort().join()) add("rationale_options", "critical", { detail: rationaleLabels.join("") });
  for (const entry of candidate.distractorRationales) {
    for (const value of [entry.distractorType, entry.misconception]) if (value && !known.has(value)) add("unknown_ref", "critical", { option: entry.option, detail: value });
    const slot = spec.distractorPlan.find((item) => item.option === entry.option);
    if (!slot) continue;
    if (entry.distractorType !== slot.distractorType) add("distractor_type_mismatch", "critical", { option: entry.option, detail: entry.distractorType });
    if ((entry.misconception ?? null) !== slot.misconception) add("misconception_mismatch", "warn", { option: entry.option, detail: entry.misconception ?? "null" });
  }
  for (const value of [candidate.targetConcept, candidate.targetSkill]) if (!known.has(value)) add("unknown_ref", "critical", { detail: value });

  const explanation = candidate.explanation;
  if (!looksTurkish(explanation)) add("explanation_language", "warn");
  const named = explanation.match(/doğru\s+(?:cevap|yanıt|seçenek|şık)[^A-E]{0,24}\b([A-E])\b/i)?.[1];
  if (named && named.toUpperCase() !== correct) add("explanation_names_other_answer", "critical", { detail: named });
  if (answerConnector && !hasPhrase(explanation, connectorSurface(answerConnector))) add("explanation_missing_connector", "warn");
  if (words(explanation).length > spec.explanationRequirements.maxWords * 1.5) add("explanation_too_long", "warn", { detail: String(words(explanation).length) });

  const text = [stem, ...optionLabels.map((label) => options[label])].join(" \n ");
  let sourceOverlapRuns = 0;
  if (input.originality) {
    for (const shingle of shingles(text, input.originality.size)) if (input.originality.shingles.has(shingle)) sourceOverlapRuns += 1;
    if (sourceOverlapRuns > 0) add("source_overlap", "critical", { detail: String(sourceOverlapRuns) });
  }
  for (const sibling of input.siblings ?? []) {
    if (normalized(sibling.stem) === normalized(stem)) add("duplicate_of_sibling", "critical", { detail: sibling.id });
    else {
      const theirs = shingles([sibling.stem, ...optionLabels.map((label) => sibling.options[label])].join(" \n "), 8);
      if ([...shingles(text, 8)].some((shingle) => theirs.has(shingle))) add("sibling_overlap", "warn", { detail: sibling.id });
    }
  }

  const critical = issues.filter((issue) => issue.severity === "critical").length;
  return {
    version: factoryVersions.validator,
    status: critical ? "reject" : "pass",
    critical,
    warnings: issues.length - critical,
    issues,
    metrics: { stemWords, optionWords, connectors, blankPosition: position, sourceOverlapRuns },
  };
}
