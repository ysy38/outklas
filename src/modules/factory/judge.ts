import { z } from "zod";
import { optionLabels } from "@/modules/analysis/contract";
import type { CandidateValidation } from "./validator";
import type { QuestionSpec } from "./spec";
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

export type JudgeInput = { blindAnswer: (typeof optionLabels)[number]; blindConfidence: number; report: JudgeReport };

export type JudgeDecision = {
  version: typeof factoryVersions.judge;
  verdict: Verdict;
  modelVerdict: Verdict;
  blindAnswer: (typeof optionLabels)[number];
  blindAgrees: boolean;
  failures: string[];
  concerns: string[];
  qualityScore: number;
};

/** Critical failures reject whatever the weighted score; gray zones send the item to a human. */
export const judgeThresholds = {
  reject: { correctness: 0.6, grammar: 0.6, semantic: 0.6, distractorQuality: 0.4, targetAlignment: 0.5, ambiguityRisk: 0.5, clueRisk: 0.6, originalityRisk: 0.6 },
  approve: { correctness: 0.85, grammar: 0.85, semantic: 0.8, distractorQuality: 0.7, targetAlignment: 0.75, difficultyFit: 0.6, ydsAlignment: 0.7, ambiguityRisk: 0.2, clueRisk: 0.3, originalityRisk: 0.3 },
} as const;

const weights = { grammar: 0.15, semantic: 0.15, correctness: 0.2, distractorQuality: 0.15, difficultyFit: 0.1, originality: 0.1, ydsAlignment: 0.15 } as const;

const rank: Record<Verdict, number> = { APPROVE: 0, REVIEW: 1, REJECT: 2 };
const worst = (...list: Verdict[]) => list.reduce((a, b) => (rank[b] > rank[a] ? b : a));

/** Combines the judge's own verdict with fixed rules. The rules can only make the verdict stricter, never looser. */
export function judgeDecision(input: { spec: QuestionSpec; validation: CandidateValidation; judge: JudgeInput }): JudgeDecision {
  const { spec, validation, judge } = input;
  const { scores } = judge.report;
  const failures: string[] = [];
  const concerns: string[] = [];
  const correct = spec.answerConstraints.correctOption;

  if (validation.status !== "pass") failures.push("validator_rejected");
  const blindAgrees = judge.blindAnswer === correct;
  if (!blindAgrees) failures.push(`blind_answer_${judge.blindAnswer}`);
  else if (judge.blindConfidence < 0.6) concerns.push("blind_low_confidence");
  const alternatives = judge.report.alternativeDefensibleOptions.filter((label) => label !== correct);
  if (alternatives.length) failures.push(`second_defensible_${alternatives.join("")}`);

  const low = judgeThresholds.reject;
  for (const key of ["correctness", "grammar", "semantic", "distractorQuality", "targetAlignment"] as const) if (scores[key] < low[key]) failures.push(`${key}_low`);
  for (const key of ["ambiguityRisk", "clueRisk", "originalityRisk"] as const) if (scores[key] > low[key]) failures.push(`${key}_high`);

  const high = judgeThresholds.approve;
  for (const key of ["correctness", "grammar", "semantic", "distractorQuality", "targetAlignment", "difficultyFit", "ydsAlignment"] as const) if (scores[key] < high[key]) concerns.push(`${key}_gray`);
  for (const key of ["ambiguityRisk", "clueRisk", "originalityRisk"] as const) if (scores[key] > high[key]) concerns.push(`${key}_gray`);
  if (judge.report.estimatedDifficulty !== spec.difficulty.band) concerns.push(`difficulty_${judge.report.estimatedDifficulty}`);
  if (validation.warnings > 0) concerns.push("validator_warnings");

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
    failures,
    concerns,
    qualityScore: Math.round(qualityScore * 1000) / 1000,
  };
}
