import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import type { GeneratedQuestionCandidate } from "./candidate";
import { generatedQuestionCandidate } from "./candidate";
import { judgeDecision, judgeThresholds, type JudgeDecision, type JudgeInput } from "./judge";
import type { OptionAcceptability } from "./judge";
import type { QuestionSpec } from "./spec";
import { validateCandidate, type CandidateValidation, type ValidationIssue } from "./validator";

/**
 * Codes written for the connector-clause contract. On concession-in-stem they have no counterpart.
 * Reporting them is not a pass and not a fail. Topic overlap is the same: this form expects it.
 */
const notApplicableCodes = new Set([
  "answer_connector_not_allowed",
  "connector_unrecognised",
  "distractor_connector_mismatch",
  "distractor_has_target_relation",
  "forbidden_marker_in_distractor",
  "sole_concessive_clue",
  "connector_repeated",
  "explanation_language",
  "explanation_missing_connector",
  "explanation_names_other_answer",
  "explanation_too_long",
  "explanation_style",
  "distractor_type_mismatch",
  "misconception_mismatch",
  "stem_overlap",
  "answer_topic_overlap",
]);

export type ContrastiveGates = {
  raw: CandidateValidation;
  applicable: CandidateValidation;
  notApplicable: ValidationIssue[];
};

function recount(raw: CandidateValidation, issues: ValidationIssue[]): CandidateValidation {
  const critical = issues.filter((issue) => issue.severity === "critical").length;
  return { ...raw, status: critical ? "reject" : "pass", critical, warnings: issues.length - critical, issues };
}

/**
 * Runs the existing validator unchanged, then splits codes this archetype does not use.
 * `overlap` is the existing copy-versus-topic mode: a copied clause still rejects; shared topic words do not.
 */
export function contrastiveGates(input: { spec: QuestionSpec; candidate: GeneratedQuestionCandidate; formIssues?: ValidationIssue[] }): ContrastiveGates {
  const raw = validateCandidate({ spec: input.spec, candidate: input.candidate, experiments: ["overlap"] });
  const notApplicable = raw.issues.filter((issue) => notApplicableCodes.has(issue.code));
  const applicable = recount(raw, [...raw.issues.filter((issue) => !notApplicableCodes.has(issue.code)), ...(input.formIssues ?? [])]);
  return { raw, applicable, notApplicable };
}

export function assembleContrastiveCandidate(input: {
  spec: QuestionSpec;
  stem: string;
  correct: string;
  distractors: { text: string; whyPlausible: string; whyInferior: string }[];
  keyCue: string;
}): GeneratedQuestionCandidate {
  if (input.distractors.length !== 4) throw new Error("contrastive candidate needs four distractors");
  const correct = input.spec.answerConstraints.correctOption;
  const rest = optionLabels.filter((label) => label !== correct);
  const options = Object.fromEntries(optionLabels.map((label) => [label, ""])) as Record<OptionLabel, string>;
  options[correct] = input.correct.trim();
  input.distractors.forEach((item, index) => {
    options[rest[index]!] = item.text.trim();
  });
  return generatedQuestionCandidate.parse({
    question: { stem: input.stem.trim(), options },
    correctOption: correct,
    explanation: input.keyCue.trim(),
    distractorRationales: input.distractors.map((item, index) => ({
      option: rest[index]!,
      distractorType: "distractor_type:semantic_mismatch",
      misconception: null,
      whyPlausible: item.whyPlausible,
      whyWrong: item.whyInferior,
    })),
    targetConcept: input.spec.primaryConcept,
    targetSkill: input.spec.targetSkill,
    metadata: {
      connectorByOption: Object.fromEntries(optionLabels.map((label) => [label, ""])) as Record<OptionLabel, string>,
      selfRatedDifficulty: "medium",
    },
  });
}

export type ContrastiveReview = {
  best: OptionLabel;
  second: OptionLabel | null;
  difference: string;
  stemCue: string;
  multipleDefensible: boolean;
  grammarNotes: { option: OptionLabel; note: string }[];
  easilyEliminated: OptionLabel[];
  nearOptions: OptionLabel[];
  hardSupported: boolean;
  hardReason: string;
  confidence: number;
  uncertain: boolean;
};

export type ContrastiveOutcome = "ACCEPT_CANDIDATE" | "REVIEW" | "REJECT";

/** Boundary scores keep the unused key-seeing score rules quiet. They are not a quality measurement. */
function boundaryReport(spec: QuestionSpec, review: ContrastiveReview) {
  const high = judgeThresholds.approve;
  const keyNote = review.grammarNotes.some((note) => note.option === review.best && note.note.trim());
  let verdict: JudgeInput["report"]["verdict"] = "APPROVE";
  if (review.multipleDefensible) verdict = "REJECT";
  else if (review.uncertain || !review.difference.trim() || !review.stemCue.trim() || keyNote) verdict = "REVIEW";
  const alternatives = review.multipleDefensible && review.second && review.second !== review.best ? [review.second] : [];
  return {
    scores: {
      correctness: high.correctness,
      ambiguityRisk: high.ambiguityRisk,
      distractorQuality: high.distractorQuality,
      targetAlignment: high.targetAlignment,
      difficultyFit: high.difficultyFit,
      grammar: high.grammar,
      semantic: high.semantic,
      ydsAlignment: high.ydsAlignment,
      originalityRisk: high.originalityRisk,
      clueRisk: high.clueRisk,
    },
    alternativeDefensibleOptions: alternatives,
    estimatedDifficulty: spec.difficulty.band,
    verdict,
    reasons: [review.difference.trim() || review.hardReason.trim() || "No concrete difference was named."].slice(0, 6),
  } satisfies JudgeInput["report"];
}

export function contrastiveJudgeInput(input: { spec: QuestionSpec; review: ContrastiveReview; acceptability: OptionAcceptability }): JudgeInput {
  const { review } = input;
  return {
    blindAnswer: review.best,
    blindConfidence: review.confidence,
    blindEvidence: review.stemCue,
    blindUncertain: review.uncertain,
    blindAlternative: review.multipleDefensible ? review.second : null,
    acceptability: input.acceptability,
    report: boundaryReport(input.spec, review),
  };
}

export type ContrastiveDecision = {
  outcome: ContrastiveOutcome;
  decision: JudgeDecision;
  hardVerified: false;
  hardCandidate: boolean;
  scoresAreEvidence: false;
};

/**
 * The existing judgeDecision stays the combiner. This only reads its verdict.
 * A hard claim from the reviewer never sets hardVerified.
 */
export function contrastiveDecision(input: {
  spec: QuestionSpec;
  validation: CandidateValidation;
  review: ContrastiveReview;
  acceptability: OptionAcceptability;
}): ContrastiveDecision {
  const decision = judgeDecision({ spec: input.spec, validation: input.validation, judge: contrastiveJudgeInput(input) });
  const correct = input.spec.answerConstraints.correctOption;
  const near = input.review.nearOptions.filter((label) => label !== correct);
  const hardCandidate =
    input.review.best === correct &&
    !input.review.multipleDefensible &&
    near.length >= 2 &&
    input.review.difference.trim().length > 0 &&
    input.review.stemCue.trim().length > 0 &&
    input.review.easilyEliminated.length < 4;
  const outcome: ContrastiveOutcome = decision.verdict === "REJECT" ? "REJECT" : decision.verdict === "APPROVE" ? "ACCEPT_CANDIDATE" : "REVIEW";
  return { outcome, decision, hardVerified: false, hardCandidate, scoresAreEvidence: false };
}

export function presentOptions(order: OptionLabel[], options: Record<OptionLabel, string>): Record<OptionLabel, string> {
  return Object.fromEntries(optionLabels.map((shown, index) => [shown, options[order[index]!]])) as Record<OptionLabel, string>;
}

export function canonicalLetter(shown: OptionLabel, order: OptionLabel[]): OptionLabel {
  return order[optionLabels.indexOf(shown)]!;
}

/** Stable order so a blind sheet does not show the key in a fixed seat. The seed is the brief id, not the key. */
export function presentationOrder(seed: string): OptionLabel[] {
  const labels = [...optionLabels];
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  for (let index = labels.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 16), 2246822507) >>> 0;
    const swap = state % (index + 1);
    const current = labels[index]!;
    labels[index] = labels[swap]!;
    labels[swap] = current;
  }
  return labels;
}

export function canonicalReview(review: ContrastiveReview, order: OptionLabel[]): ContrastiveReview {
  const map = (label: OptionLabel) => canonicalLetter(label, order);
  return {
    ...review,
    best: map(review.best),
    second: review.second ? map(review.second) : null,
    grammarNotes: review.grammarNotes.map((note) => ({ option: map(note.option), note: note.note })),
    easilyEliminated: review.easilyEliminated.map(map),
    nearOptions: review.nearOptions.map(map),
  };
}
