import { generatorJudgeIndependent } from "../provenance";
import { factoryVersions } from "../versions";
import { readingModel, restatementModel, translationModel } from "./registry";
import { editorialThresholds } from "./rubric";

export const benchmarkAuthorization = "item-model-benchmark-v1";

/** Caps the first batch must stay inside. A higher limit is refused. */
export const benchmarkCeilings = {
  types: ["restatement", "translation", "reading_comprehension"] as const,
  perType: 30,
  total: 90,
  callsPerItem: 4,
  maxCalls: 360,
  maxRegenerations: 0,
  perCandidateUsdCap: 0.2,
  totalUsdCap: 18,
  publishToStudentBank: false,
  autoStart: false,
} as const;

export type BenchmarkPlan = {
  id: typeof benchmarkAuthorization;
  types: typeof benchmarkCeilings.types;
  perType: number;
  total: number;
  callsPerItem: number;
  maxCalls: number;
  maxRegenerations: number;
  perCandidateUsdCap: number;
  totalUsdCap: number;
  publishToStudentBank: false;
  autoStart: false;
  models: { generator: string; judge: string };
  promptVersions: { restatement: string; translation: string; reading: string; judge: string };
  rubric: typeof editorialThresholds;
  standard: "outklas_engineering";
};

export type BudgetLimits = { maxCalls?: number; maxRegenerations?: number; maxCostUsd?: number };

export function freezeBenchmarkPlan(models: { generator: string; judge: string }): BenchmarkPlan {
  if (!generatorJudgeIndependent({ generatorModel: models.generator, judgeModel: models.judge })) {
    throw new Error("benchmark generator and judge must be different models");
  }
  return {
    id: benchmarkAuthorization,
    ...benchmarkCeilings,
    models: { generator: models.generator, judge: models.judge },
    promptVersions: {
      restatement: restatementModel.promptVersion,
      translation: translationModel.promptVersion,
      reading: readingModel.promptVersion,
      judge: factoryVersions.judge,
    },
    rubric: editorialThresholds,
    standard: "outklas_engineering",
  };
}

export function assertBenchmarkBudget(limits: BudgetLimits): void {
  if (limits.maxCalls === undefined || limits.maxCalls > benchmarkCeilings.maxCalls) {
    throw new Error(`benchmark requires maxCalls at most ${benchmarkCeilings.maxCalls}`);
  }
  if (limits.maxRegenerations !== 0) throw new Error("benchmark requires maxRegenerations 0");
  if (limits.maxCostUsd === undefined || limits.maxCostUsd > benchmarkCeilings.totalUsdCap) {
    throw new Error(`benchmark requires maxCostUsd at most ${benchmarkCeilings.totalUsdCap}`);
  }
}

function assertFrozen(plan: BenchmarkPlan): void {
  const frozen = freezeBenchmarkPlan(plan.models);
  const same =
    plan.id === frozen.id &&
    plan.perType === frozen.perType &&
    plan.total === frozen.total &&
    plan.maxCalls === frozen.maxCalls &&
    plan.maxRegenerations === frozen.maxRegenerations &&
    plan.totalUsdCap === frozen.totalUsdCap &&
    plan.publishToStudentBank === false &&
    plan.autoStart === false &&
    plan.promptVersions.restatement === frozen.promptVersions.restatement &&
    plan.promptVersions.translation === frozen.promptVersions.translation &&
    plan.promptVersions.reading === frozen.promptVersions.reading &&
    plan.promptVersions.judge === frozen.promptVersions.judge &&
    plan.types.length === frozen.types.length;
  if (!same) throw new Error("benchmark prompt versions are frozen");
}

/**
 * Checks the frozen plan and the spend caps, then stops.
 * No provider runner is attached, so the 90-item batch cannot start from here.
 */
export function runItemBenchmark(input: { authorization: string; limits: BudgetLimits; plan: BenchmarkPlan; overrides?: unknown }): {
  started: false;
  reason: string;
  plan: BenchmarkPlan;
} {
  if (input.authorization !== benchmarkAuthorization) throw new Error("benchmark authorization required");
  if (input.overrides !== undefined) throw new Error("benchmark refuses prompt, model, or threshold overrides");
  assertFrozen(input.plan);
  assertBenchmarkBudget(input.limits);
  return { started: false, reason: "safety lock: the 90-item profile has no runner; the batch was not started", plan: input.plan };
}

export const factoryReuse = {
  used: ["judgeDecision", "generatorJudgeIndependent", "shingles", "integrityProblems", "SpendBudget", "loadSpendLimits", "DnaQuestion", "modelDefaults"],
  notUsed: ["validateCandidate", "familyBlueprints", "skeleton generation", "contrastive", "complete-first", "direct-sonnet", "restatement smoke"],
} as const;
