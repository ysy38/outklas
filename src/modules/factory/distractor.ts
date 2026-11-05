import { z } from "zod";
import type { OptionLabel } from "@/modules/analysis/contract";
import { looksTurkish, words } from "@/modules/analysis/surface";
import { shingles } from "@/modules/analysis/validate";
import { discourseForConnector } from "@/modules/knowledge/seed";
import { contextIssues, mainClauseFrame } from "./context";
import type { DistractorSpec } from "./distractor-spec";
import { experimentGeneration, type ExperimentSet } from "./experiments";
import { completeStem, type QuestionSkeleton } from "./skeleton";
import { defaultFactoryThresholds, type FactoryThresholds } from "./thresholds";
import {
  clauseReuse,
  hasPhrase,
  integrityProblems,
  keyOverlap,
  leadingConnector,
  longestSharedPhrase,
  normalized,
  sharedWording,
  stageValidation,
  stemEcho,
  stemOverlap,
  type IssueSeverity,
  type OriginalityIndex,
  type StageValidation,
  type ValidationIssue,
} from "./validator";
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
  experiments?: ExperimentSet;
}): StageValidation & { reuse: ReturnType<typeof clauseReuse>; lexical: LexicalDiagnostics } {
  const { dspec, skeleton, accepted } = input;
  const thresholds = input.thresholds ?? defaultFactoryThresholds;
  const experiments = input.experiments ?? [];
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
  const echo = stemEcho(skeleton.stem, text);
  const lexical = { stemContentWords: echo, longestStemPhrase: longestSharedPhrase(skeleton.stem, text) };
  if (experiments.includes("overlap")) {
    const key = keyOverlap(skeleton.stem, skeleton.correctAnswer, text, thresholds);
    if (key.level === "copied") add("answer_shared_wording", "critical", key.keyOwn.join(" "));
    else if (key.level === "topic") add("answer_topic_overlap", "warn", key.shared.join(" "));
    const stem = stemOverlap(skeleton.stem, text, thresholds);
    if (stem.level === "copied") add("stem_echo", "critical", stem.longestPhrase || stem.shared.join(" "));
    else if (stem.level === "topic") add("stem_overlap", "warn", stem.shared.join(" "));
  } else {
    const shared = sharedWording(skeleton.correctAnswer, text);
    if (shared.length >= thresholds.answerSharedContentWords) add("answer_shared_wording", "critical", shared.join(" "));
    if (echo.length >= thresholds.stemSharedContentWords) add("stem_echo", experiments.includes("lexical") ? "warn" : "critical", echo.join(" "));
  }
  if (experiments.includes("compatibility") && dspec.temporalConstraint) {
    const frame = dspec.temporalConstraint.mainClauseFrame ?? mainClauseFrame(skeleton.stem);
    for (const issue of contextIssues({ expresses: dspec.relationConstraint.targetRelation, frame, text })) add(issue.code, issue.severity, issue.detail);
  }
  for (const other of accepted) {
    if (normalized(other.text) === normalized(text)) add("option_duplicate", "critical", other.option);
    else if (clauseReuse(other.text, text, thresholds).level === "copy") add("distractor_clause_reuse", "critical", other.option);
  }

  if (input.originality) {
    const runs = [...shingles(completeStem(skeleton.stem, text), input.originality.size)].filter((shingle) => input.originality!.shingles.has(shingle)).length;
    if (runs > 0) add("source_overlap", "critical", String(runs));
  }
  return { ...stageValidation(issues), reuse, lexical };
}

/** Measured for every option; under the lexical experiment they are shown to writer and judge instead of rejecting. */
export type LexicalDiagnostics = { stemContentWords: string[]; longestStemPhrase: string };

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
  /** Chance that even a weak candidate dismisses it at a glance (absurd, off-topic, a plain negation): too easy to be worth an option. */
  obviouslyWrong: unit,
  /** "Could a competent YDS candidate reasonably select this option as correct?" */
  competentCandidateCouldSelect: z.boolean(),
  confidence: unit,
  reasons: z.array(z.string().max(200)).max(4),
});
export type DistractorJudgeReport = z.infer<typeof distractorJudgeReport>;

/** Extra dimensions of the experimental judge (distractor-judge.v4); each belongs to one experiment. */
export const experimentalJudgeFields = {
  contrast: {
    /** Ignoring how the option was meant to fail: does the relation its connector signals hold between it and the main clause? */
    relationHolds: unit,
    /** The option negates, reverses or contradicts a statement of the stem instead of bringing its own content. */
    negatesStem: z.boolean(),
  },
  plausibility: {
    /** The option's scenario is realistic in this context (unusual content only when the context justifies it). */
    contextualPlausibility: unit,
    tenseCompatible: z.boolean(),
    /** World knowledge alone rules the option out, without reading how it connects to the main clause. */
    worldKnowledgeAloneEliminates: z.boolean(),
  },
  lexical: {
    /** The option is a surface rewrite of the stem (same words or phrases rearranged) rather than its own idea. */
    superficialRewrite: unit,
  },
  opposition: {},
  /** No judge field: time-frame fit is decided by the deterministic tense rules (distractor-judge.v5's contextCompatible asked whether the relation holds). */
  compatibility: {},
  relation: {
    relationHolds: unit,
    /** Read naturally, the completed sentence expresses the item's own target relation (for example concession), whatever the connector. */
    targetRelationReading: unit,
    /** Some plausible reading (another sense of the connector, a looser reading of the content) makes the completed sentence correct. */
    alternativeReadingCorrect: unit,
  },
  overlap: {},
} as const;

export type ExperimentalJudgeReport = DistractorJudgeReport &
  Partial<{
    relationHolds: number;
    negatesStem: boolean;
    contextualPlausibility: number;
    tenseCompatible: boolean;
    worldKnowledgeAloneEliminates: boolean;
    superficialRewrite: number;
    targetRelationReading: number;
    alternativeReadingCorrect: number;
  }>;

/**
 * The judge contract for a set of experiments: the baseline report plus each experiment's fields. Under the contrast
 * or relation experiment the reasons come first and the verdict last, so the verdict is written after, and must agree with, the reasoning.
 */
export function distractorJudgeReportFor(experiments: ExperimentSet): z.ZodType<ExperimentalJudgeReport> {
  if (!experiments.length) return distractorJudgeReport;
  const { reasons, competentCandidateCouldSelect, confidence, ...scores } = distractorJudgeReport.shape;
  const extra = Object.assign({}, ...experiments.map((name) => experimentalJudgeFields[name])) as Record<string, z.ZodType>;
  return (experiments.includes("contrast") || experiments.includes("relation")
    ? z.object({ reasons, ...scores, ...extra, competentCandidateCouldSelect, confidence })
    : z.object({ ...scores, ...extra, competentCandidateCouldSelect, confidence, reasons })) as unknown as z.ZodType<ExperimentalJudgeReport>;
}

export const distractorDecisions = ["ACCEPT", "REGENERATE", "HUMAN_REVIEW"] as const;
export type DistractorDecisionKind = (typeof distractorDecisions)[number];

export type DistractorJudgeVersion = typeof factoryVersions.distractorJudge | typeof factoryVersions.distractorJudgeExperimental | typeof factoryVersions.distractorJudgeRevision;

export const distractorJudgeVersionFor = (experiments: ExperimentSet): DistractorJudgeVersion =>
  ({ baseline: factoryVersions.distractorJudge, first: factoryVersions.distractorJudgeExperimental, second: factoryVersions.distractorJudgeRevision })[experimentGeneration(experiments)];
export type DistractorDecision = { version: DistractorJudgeVersion; decision: DistractorDecisionKind; failures: string[]; concerns: string[] };

/**
 * Grammatical and coherent is not enough: the option must also fail as a completed sentence.
 * A confident "a candidate could pick this" regenerates the option; an unsure one goes to a human.
 * Which connector opens the option is settled by validateDistractor; whether its relation holds is the judge's
 * separate relationHolds dimension (contrast and relation experiments), never a reading of the planned failure mode.
 * A connector of the planned role is never enough: under the relation experiment an option is also regenerated when
 * it reads as the item's target relation or when another plausible reading of its connector makes it correct.
 */
export function distractorDecision(input: { dspec: DistractorSpec; report: ExperimentalJudgeReport; thresholds?: FactoryThresholds; experiments?: ExperimentSet }): DistractorDecision {
  const { dspec, report } = input;
  const experiments = input.experiments ?? [];
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
  if (report.obviouslyWrong >= t) failures.push("too_obvious");
  if (experiments.includes("contrast")) {
    if ((report.relationHolds ?? 0) >= t) failures.push("relation_holds");
    if (report.negatesStem) (sure ? failures : concerns).push("negates_stem");
  }
  if (experiments.includes("plausibility")) {
    if ((report.contextualPlausibility ?? 1) < t) failures.push("implausible_scenario");
    // Under compatibility the deterministic tense rules (validateDistractor) reject real clashes before this call; the
    // judge's tense flag alone also fires when the tense fits and only the relation fails, as a wrong option must.
    if (dspec.temporalConstraint && report.tenseCompatible === false) {
      if (experiments.includes("compatibility")) concerns.push("tense_judged_incompatible");
      else failures.push("tense_incompatible");
    }
    if (report.worldKnowledgeAloneEliminates) (sure ? failures : concerns).push("eliminable_by_world_knowledge");
  }
  if (experiments.includes("lexical") && (report.superficialRewrite ?? 0) >= t) failures.push("superficial_rewrite");
  if (experiments.includes("relation")) {
    if (!experiments.includes("contrast") && (report.relationHolds ?? 0) >= t) failures.push("relation_holds");
    if ((report.targetRelationReading ?? 0) >= t) failures.push("reads_as_target_relation");
    if ((report.alternativeReadingCorrect ?? 0) >= t) failures.push("alternative_reading_correct");
    else if ((report.alternativeReadingCorrect ?? 0) >= t / 2) concerns.push("alternative_reading_gray");
  }
  if (report.ambiguity >= t) concerns.push("ambiguous");
  if (!sure) concerns.push("low_confidence");

  return { version: distractorJudgeVersionFor(experiments), decision: failures.length ? "REGENERATE" : concerns.length ? "HUMAN_REVIEW" : "ACCEPT", failures, concerns };
}
