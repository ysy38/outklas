import { z } from "zod";
import type { OptionLabel } from "@/modules/analysis/contract";
import { looksTurkish, words } from "@/modules/analysis/surface";
import { shingles } from "@/modules/analysis/validate";
import { discourseForConnector } from "@/modules/knowledge/seed";
import type { DistractorSpec } from "./distractor-spec";
import { completeStem, type QuestionSkeleton } from "./skeleton";
import { defaultFactoryThresholds, type FactoryThresholds } from "./thresholds";
import { clauseReuse, hasPhrase, integrityProblems, leadingConnector, normalized, sharedWording, stageValidation, type IssueSeverity, type OriginalityIndex, type StageValidation, type ValidationIssue } from "./validator";
import { factoryVersions } from "./versions";

/** Stage 4 output: one wrong option. The rationale is internal and never shown to learners. */
export const generatedDistractor = z.object({
  text: z.string().min(1).max(300),
  rationale: z.string().max(300),
});
export type GeneratedDistractor = z.infer<typeof generatedDistractor>;

export type PlacedOption = { option: OptionLabel; text: string };

const capitalised = (text: string) => {
  const first = text.trim().charAt(0);
  return first !== "" && first === first.toLocaleUpperCase("en") && first !== first.toLocaleLowerCase("en");
};

/** Deterministic checks on one wrong option. A critical issue regenerates this option only; the judge never sees it. */
export function validateDistractor(input: {
  dspec: DistractorSpec;
  skeleton: QuestionSkeleton;
  text: string;
  accepted: PlacedOption[];
  /** Texts the judge already rejected for this option; a writer that repeats one has ignored the feedback. */
  rejected?: string[];
  originality?: OriginalityIndex;
  thresholds?: FactoryThresholds;
}): StageValidation & { reuse: ReturnType<typeof clauseReuse> } {
  const { dspec, skeleton, accepted } = input;
  const thresholds = input.thresholds ?? defaultFactoryThresholds;
  const text = input.text.trim();
  const issues: ValidationIssue[] = [];
  const add = (code: string, severity: IssueSeverity, detail?: string) => issues.push({ code, severity, option: dspec.option, ...(detail ? { detail } : {}) });

  if (!text) add("option_empty", "critical");
  if (text.includes("----")) add("option_contains_blank", "critical");
  for (const problem of integrityProblems(text)) add("text_integrity", "critical", problem);
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text) || looksTurkish(text)) add("non_english_text", "critical");
  if (/[.,;:!?]$/.test(text)) add("option_punctuation", "critical");
  if (capitalised(text) !== dspec.grammarConstraint.capitalised) add("capitalisation", "critical");

  const connector = leadingConnector(text);
  if (!connector) add("connector_unrecognised", "critical");
  else if (!dspec.relationConstraint.connectors.includes(connector)) add("distractor_connector_mismatch", "critical", connector);
  if (connector && dspec.relationConstraint.mustNotExpress.includes(discourseForConnector(connector) as never)) add("distractor_has_target_relation", "critical", connector);
  if (connector && accepted.some((other) => leadingConnector(other.text) === connector)) add("connector_repeated", "critical", connector);
  for (const marker of dspec.lexicalConstraint.forbiddenWords) if (hasPhrase(text, marker)) add("forbidden_marker_in_distractor", "critical", marker);

  const count = words(text).length;
  const range = dspec.lexicalConstraint.words;
  if (count < range.min * 0.5 || count > range.max * 1.5) add("length_far_out", "critical", String(count));
  else if (count < range.min || count > range.max) add("length_out_of_range", "warn", String(count));
  if (dspec.grammarConstraint.finiteClause && connector && words(text).length < 4) add("not_a_clause", "critical");

  if (normalized(text) === normalized(skeleton.correctAnswer)) add("option_duplicate", "critical", "answer");
  if ((input.rejected ?? []).some((previous) => normalized(previous) === normalized(text))) add("repeats_rejected_attempt", "critical");
  const reuse = clauseReuse(skeleton.correctAnswer, text, thresholds);
  if (reuse.level === "copy") add("answer_clause_reuse", "critical", `${reuse.tokenOverlap}/${reuse.trigramOverlap}`);
  else if (reuse.level === "warn") add("answer_overlap", "warn", `${reuse.tokenOverlap}/${reuse.trigramOverlap}`);
  const shared = sharedWording(skeleton.correctAnswer, text);
  if (shared.length >= thresholds.answerSharedContentWords) add("answer_shared_wording", "critical", shared.join(" "));
  for (const other of accepted) {
    if (normalized(other.text) === normalized(text)) add("option_duplicate", "critical", other.option);
    else if (clauseReuse(other.text, text, thresholds).level === "copy") add("distractor_clause_reuse", "critical", other.option);
  }

  if (input.originality) {
    const runs = [...shingles(completeStem(skeleton.stem, text), input.originality.size)].filter((shingle) => input.originality!.shingles.has(shingle)).length;
    if (runs > 0) add("source_overlap", "critical", String(runs));
  }
  return { ...stageValidation(issues), reuse };
}

const unit = z.number().min(0).max(1);

/** Stage 6: an independent reviewer's view of one wrong option, dimension by dimension. */
export const distractorJudgeReport = z.object({
  /** The completed sentence read on its own, before anything else. */
  standaloneSentenceAcceptable: z.boolean(),
  grammaticalValidity: unit,
  /** The clause itself is natural, meaningful English (a gibberish option is too easy). */
  semanticCoherence: unit,
  /** Chance that the option is in fact a correct completion. */
  unintendedCorrectness: unit,
  answerClauseReuse: unit,
  ambiguity: unit,
  /** "Could a competent YDS candidate reasonably select this option as correct?" */
  competentCandidateCouldSelect: z.boolean(),
  confidence: unit,
  reasons: z.array(z.string().max(200)).max(4),
});
export type DistractorJudgeReport = z.infer<typeof distractorJudgeReport>;

export const distractorDecisions = ["ACCEPT", "REGENERATE", "HUMAN_REVIEW"] as const;
export type DistractorDecisionKind = (typeof distractorDecisions)[number];

export type DistractorDecision = { version: typeof factoryVersions.distractorJudge; decision: DistractorDecisionKind; failures: string[]; concerns: string[] };

/**
 * Grammatical and coherent is not enough: the option must also fail as a completed sentence.
 * A confident "a candidate could pick this" regenerates the option; an unsure one goes to a human.
 * Connector role and relation are settled by validateDistractor, so the judge has no say on them.
 */
export function distractorDecision(input: { dspec: DistractorSpec; report: DistractorJudgeReport; thresholds?: FactoryThresholds }): DistractorDecision {
  const { dspec, report } = input;
  const t = (input.thresholds ?? defaultFactoryThresholds).distractorAcceptability;
  const failures: string[] = [];
  const concerns: string[] = [];
  const sure = report.confidence >= t;

  if (report.competentCandidateCouldSelect) (sure ? failures : concerns).push("competent_candidate_could_select");
  if (report.standaloneSentenceAcceptable) (sure ? failures : concerns).push("sentence_acceptable_alone");
  if (report.unintendedCorrectness >= t) failures.push("unintended_correctness");
  else if (report.unintendedCorrectness >= t / 2) concerns.push("unintended_correctness_gray");
  if (report.answerClauseReuse >= t) failures.push("answer_clause_reuse");
  if (dspec.grammarConstraint.mustBeGrammatical && report.grammaticalValidity < t) failures.push("ungrammatical");
  if (dspec.requiredProperties.includes("coherent_clause") && report.semanticCoherence < t) failures.push("incoherent_clause");
  if (report.ambiguity >= t) concerns.push("ambiguous");
  if (!sure) concerns.push("low_confidence");

  return { version: factoryVersions.distractorJudge, decision: failures.length ? "REGENERATE" : concerns.length ? "HUMAN_REVIEW" : "ACCEPT", failures, concerns };
}
