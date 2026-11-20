import { z } from "zod";
import { optionLabels } from "@/modules/analysis/contract";
import type { FactoryThresholds } from "./thresholds";
import { difficultyBands } from "./spec";

/** What `judgeDecision` reads. A sentence-completion spec satisfies it. Other item models do not invent one. */
export type JudgeSpecView = {
  answerConstraints: { correctOption: (typeof optionLabels)[number] };
  difficulty: { band: (typeof difficultyBands)[number] };
};

/** What `judgeDecision` reads from a validator. A full candidate validation satisfies it. */
export type JudgeValidationView = {
  status: "pass" | "reject";
  issues: { code: string; severity: "critical" | "warn" }[];
};
import { factoryVersions } from "./versions";

export const verdicts = ["APPROVE", "REVIEW", "REJECT"] as const;
export type Verdict = (typeof verdicts)[number];

const unit = z.number().min(0).max(1);

/** Higher is better for every score except the three *Risk fields. */
export const judgeScores = z.object({
  correctness: unit,
  ambiguityRisk: unit,
  distractorQuality: unit,
  targetAlignment: unit,
  difficultyFit: unit,
  grammar: unit,
  semantic: unit,
  ydsAlignment: unit,
  originalityRisk: unit,
  clueRisk: unit,
});
export type JudgeScores = z.infer<typeof judgeScores>;

export const judgeReport = z.object({
  scores: judgeScores,
  /** Options other than the key that a strong candidate could defend. */
  alternativeDefensibleOptions: z.array(z.enum(optionLabels)).max(4),
  estimatedDifficulty: z.enum(["easy", "medium", "hard"]),
  verdict: z.enum(verdicts),
  reasons: z.array(z.string().max(300)).max(6),
});
export type JudgeReport = z.infer<typeof judgeReport>;

/**
 * Each completed sentence judged on its own, without the key.
 * acceptable is a publishable sentence. relationCoherent is that sentence's connector.
 * Neither is a second answer among the five options.
 */
export const optionAcceptability = z.object({
  sentences: z
    .array(
      z.object({
        option: z.enum(optionLabels),
        acceptable: z.boolean(),
        relationCoherent: z.boolean().optional(),
        confidence: unit,
        reason: z.string().max(300),
      }),
    )
    .length(optionLabels.length),
});
export type OptionAcceptability = z.infer<typeof optionAcceptability>;

export type JudgeInput = {
  blindAnswer: (typeof optionLabels)[number];
  blindConfidence: number;
  /** Stem wording the solver named. Undefined means this caller did not ask. An empty string means the solver gave none. The text is never treated as verified. */
  blindEvidence?: string;
  /** The solver says the stem does not settle the choice. */
  blindUncertain?: boolean;
  /** Another option the solver finds as suitable as its own letter. */
  blindAlternative?: (typeof optionLabels)[number] | null;
  acceptability: OptionAcceptability;
  report: JudgeReport;
  /** Options whose own distractor judge was unsure; the item cannot be approved without a human. */
  distractorReviews?: (typeof optionLabels)[number][];
  /** Plan-review concerns already recorded on the attempts. They stay concerns. */
  planConcerns?: string[];
};

export type JudgeDecision = {
  version: typeof factoryVersions.judge;
  verdict: Verdict;
  modelVerdict: Verdict;
  blindAnswer: (typeof optionLabels)[number];
  blindAgrees: boolean;
  acceptableOptions: (typeof optionLabels)[number][];
  /** Sentences whose connector relation holds on their own. Not a five-option ranking. */
  relationCoherentOptions: (typeof optionLabels)[number][];
  /** Free-text rationale is never a proof. This stays unverified. */
  reasoningStatus: "unverified";
  failures: string[];
  concerns: string[];
  qualityScore: number;
};

const planReviewConcernCodes = new Set(["review_missing", "planned_second_answer", "planned_second_answer_uncertain", "plan_ground_unanchored", "plan_ground_uncertain", "plan_restatement_as_inference"]);

/** Plan-review concerns already on the attempts. A stem-only low confidence is not relabelled as one. */
export function planReviewConcerns(attempts: { stage: string; judge: { concerns: string[] } | null }[]): string[] {
  const found: string[] = [];
  const add = (code: string) => {
    if (!found.includes(code)) found.push(code);
  };
  for (const attempt of attempts) {
    const concerns = attempt.judge?.concerns ?? [];
    const plan = concerns.filter((code) => planReviewConcernCodes.has(code));
    if (attempt.stage === "distractorPlan") {
      for (const code of concerns) if (planReviewConcernCodes.has(code) || code === "low_confidence") add(code);
    } else if (plan.length) {
      for (const code of plan) add(code);
      if (concerns.includes("low_confidence")) add("low_confidence");
    }
  }
  return found;
}

/** Critical failures reject whatever the weighted score; gray zones send the item to a human. */
export const judgeThresholds = {
  reject: { correctness: 0.6, grammar: 0.6, semantic: 0.6, distractorQuality: 0.4, targetAlignment: 0.5, ambiguityRisk: 0.5, clueRisk: 0.6, originalityRisk: 0.6 },
  approve: { correctness: 0.85, grammar: 0.85, semantic: 0.8, distractorQuality: 0.7, targetAlignment: 0.75, difficultyFit: 0.6, ydsAlignment: 0.7, ambiguityRisk: 0.2, clueRisk: 0.3, originalityRisk: 0.3 },
} as const;

const weights = { grammar: 0.15, semantic: 0.15, correctness: 0.2, distractorQuality: 0.15, difficultyFit: 0.1, originality: 0.1, ydsAlignment: 0.15 } as const;

const rank: Record<Verdict, number> = { APPROVE: 0, REVIEW: 1, REJECT: 2 };
const worst = (...list: Verdict[]) => list.reduce((a, b) => (rank[b] > rank[a] ? b : a));

/** Combines the judge's own verdict with fixed rules. The rules can only make the verdict stricter, never looser. */
export function judgeDecision(input: { spec: JudgeSpecView; validation: JudgeValidationView; judge: JudgeInput; thresholds?: FactoryThresholds }): JudgeDecision {
  const { spec, validation, judge } = input;
  const { scores } = judge.report;
  const failures: string[] = [];
  const concerns: string[] = [];
  const correct = spec.answerConstraints.correctOption;

  if (validation.status !== "pass") failures.push("validator_rejected");
  const blindAgrees = judge.blindAnswer === correct;
  const solverUnsure = judge.blindConfidence < 0.6 || judge.blindUncertain === true;
  if (!blindAgrees) failures.push(`blind_answer_${judge.blindAnswer}`);
  else if (solverUnsure) concerns.push("blind_low_confidence");
  if (judge.blindEvidence !== undefined && judge.blindEvidence.trim().length === 0) concerns.push("blind_evidence_missing");
  const alternatives = judge.report.alternativeDefensibleOptions.filter((label) => label !== correct);
  const named = judge.blindAlternative;
  if (blindAgrees && named && named !== correct) {
    if (solverUnsure) concerns.push(`blind_second_uncertain_${named}`);
    else if (!alternatives.includes(named)) alternatives.push(named);
  }
  if (alternatives.length) failures.push(`second_defensible_${alternatives.join("")}`);

  const seen = new Set(judge.acceptability.sentences.map((entry) => entry.option));
  if (seen.size !== optionLabels.length) failures.push("acceptability_incomplete");
  for (const entry of judge.acceptability.sentences) {
    if (entry.option !== correct) continue;
    if (!entry.acceptable) failures.push("key_unacceptable");
    if (entry.relationCoherent === false) failures.push("key_relation_incoherent");
  }

  const low = judgeThresholds.reject;
  for (const key of ["correctness", "grammar", "semantic", "distractorQuality", "targetAlignment"] as const) if (scores[key] < low[key]) failures.push(`${key}_low`);
  for (const key of ["ambiguityRisk", "clueRisk", "originalityRisk"] as const) if (scores[key] > low[key]) failures.push(`${key}_high`);

  const high = judgeThresholds.approve;
  for (const key of ["correctness", "grammar", "semantic", "distractorQuality", "targetAlignment", "difficultyFit", "ydsAlignment"] as const) if (scores[key] < high[key]) concerns.push(`${key}_gray`);
  for (const key of ["ambiguityRisk", "clueRisk", "originalityRisk"] as const) if (scores[key] > high[key]) concerns.push(`${key}_gray`);
  if (judge.report.estimatedDifficulty !== spec.difficulty.band) concerns.push(`difficulty_${judge.report.estimatedDifficulty}`);
  // A soft length miss stays on the validation record. It blocks admission only together with another warning.
  const blockingWarnings = validation.issues.filter((issue) => issue.severity === "warn" && issue.code !== "length_out_of_range");
  if (blockingWarnings.length > 0) concerns.push("validator_warnings");
  for (const option of judge.distractorReviews ?? []) concerns.push(`distractor_review_${option}`);
  for (const code of judge.planConcerns ?? []) if (!failures.includes(code) && !concerns.includes(code)) concerns.push(code);

  const ruled: Verdict = failures.length ? "REJECT" : concerns.length ? "REVIEW" : "APPROVE";
  const qualityScore =
    scores.grammar * weights.grammar +
    scores.semantic * weights.semantic +
    scores.correctness * weights.correctness +
    scores.distractorQuality * weights.distractorQuality +
    scores.difficultyFit * weights.difficultyFit +
    (1 - scores.originalityRisk) * weights.originality +
    scores.ydsAlignment * weights.ydsAlignment;

  return {
    version: factoryVersions.judge,
    verdict: worst(ruled, judge.report.verdict),
    modelVerdict: judge.report.verdict,
    blindAnswer: judge.blindAnswer,
    blindAgrees,
    acceptableOptions: judge.acceptability.sentences.filter((entry) => entry.acceptable).map((entry) => entry.option).sort(),
    relationCoherentOptions: judge.acceptability.sentences.filter((entry) => entry.relationCoherent === true).map((entry) => entry.option).sort(),
    reasoningStatus: "unverified",
    failures,
    concerns,
    qualityScore: Math.round(qualityScore * 1000) / 1000,
  };
}
