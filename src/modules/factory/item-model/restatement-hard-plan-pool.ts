import { readFileSync } from "node:fs";
import path from "node:path";
import { architectureV2WriterTokenCeiling, callCeilingUsd, type CatalogPrice, type PriceCatalog } from "./architecture-v2";
import { qualityAuthoringLiveAuthorized, qualityAuthoringModels } from "./quality-authoring";
import {
  qualityAuthoringLivePilotWriter,
  restatementHardBenchmark5OutputDir,
  restatementHardBenchmark5Tasks,
} from "./quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";

export const restatementHardPlanPoolVersion = "restatement-hard-plan-pool-v1";
export const restatementHardPlanPoolAuthorization = "restatement-hard-plan-pool-v1";
export const restatementHardPlanPoolOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1";
export const restatementHardPlanPoolLiveAuthorized = true as const;
export const restatementHardPlanPoolSpendCapUsd = 0.02;
export const restatementHardPlanPoolRetry = 0;
export const restatementHardPlanPoolMaxStageACalls = 5;
export const restatementHardPlanPoolMaxStageBCalls = 5;
export const restatementHardPlanPoolJudgeCalls = 0;
export const restatementHardPlanPoolProductionGate = false as const;

export const restatementHardPlanPoolFrozenHashes = {
  benchmarkSummarySha256: "51db881dd691c06bd6348456a1c627196501fbe974171f311305badd8b79d3da",
  qualityAuthoringPromptSha256: "be5a6b975e1704cc44fc67703e651691a6afb8ffc187813a9f28c7ac0edf7ef8",
} as const;

export const restatementHardPlanPoolTasks = restatementHardBenchmark5Tasks;

export const restatementHardPlanPoolRejectedMutations = [
  "until_cessation_implicature",
  "only_to_at_least",
  "invented_event_or_actor",
] as const;

export type PlanPoolStanding = "CONTRADICTED" | "NOT_ENTAILED_COMPATIBLE" | "ENTAILED" | "UNDETERMINED";

export type PlanPoolEditorialPlan = {
  planId: string;
  standing: PlanPoolStanding;
  unique: boolean;
  hostedBySource: boolean;
  untilCessationImplicature: boolean;
  onlyToAtLeast: boolean;
  inventedEventOrActor: boolean;
  althoughToBecause: boolean;
  necFamily: string | null;
};

export type PlanPoolSourceKeyCheck = {
  id: string;
  sourceEntailsKey: boolean;
  keyEntailsSource: boolean;
  keyBlocked: boolean;
  autoFixed: false;
  extraUnentailedClaim: string | null;
  independence: "same-agent editorial; not independent proof";
};

export const restatementHardPlanPoolStage0Original: PlanPoolSourceKeyCheck[] = [
  {
    id: "rhb-archive-cataloguers",
    sourceEntailsKey: true,
    keyEntailsSource: true,
    keyBlocked: false,
    autoFixed: false,
    extraUnentailedClaim: null,
    independence: "same-agent editorial; not independent proof",
  },
  {
    id: "rhb-seed-convoy",
    sourceEntailsKey: true,
    keyEntailsSource: true,
    keyBlocked: false,
    autoFixed: false,
    extraUnentailedClaim: null,
    independence: "same-agent editorial; not independent proof",
  },
  {
    id: "rhb-port-wrecks",
    sourceEntailsKey: false,
    keyEntailsSource: false,
    keyBlocked: true,
    autoFixed: false,
    extraUnentailedClaim: "does not accept",
    independence: "same-agent editorial; not independent proof",
  },
  {
    id: "rhb-ethics-randomization",
    sourceEntailsKey: true,
    keyEntailsSource: true,
    keyBlocked: false,
    autoFixed: false,
    extraUnentailedClaim: null,
    independence: "same-agent editorial; not independent proof",
  },
  {
    id: "rhb-land-registry-housing",
    sourceEntailsKey: true,
    keyEntailsSource: true,
    keyBlocked: false,
    autoFixed: false,
    extraUnentailedClaim: null,
    independence: "same-agent editorial; not independent proof",
  },
];

export function restatementHardPlanPoolOriginalPortKeyBlocked() {
  const writer = JSON.parse(readFileSync(path.join(restatementHardBenchmark5OutputDir, "rhb-port-wrecks.writer.json"), "utf8")) as {
    parsed: { source: string; key: string };
  };
  const key = writer.parsed.key;
  const source = writer.parsed.source;
  return {
    id: "rhb-port-wrecks",
    source,
    key,
    keyContainsDoesNotAccept: /does not accept/i.test(key),
    sourceContainsDoesNotAccept: /does not accept/i.test(source),
    keyBlocked: true as const,
    autoFixed: false as const,
  };
}

export function selectPlanPool(plans: PlanPoolEditorialPlan[], keyBlocked: boolean) {
  const rejected = plans.filter(
    (plan) =>
      !plan.unique ||
      !plan.hostedBySource ||
      plan.untilCessationImplicature ||
      plan.onlyToAtLeast ||
      plan.inventedEventOrActor ||
      plan.standing === "ENTAILED" ||
      plan.standing === "UNDETERMINED",
  );
  const contradicted = plans.filter(
    (plan) =>
      plan.standing === "CONTRADICTED" &&
      plan.unique &&
      plan.hostedBySource &&
      !plan.untilCessationImplicature &&
      !plan.onlyToAtLeast &&
      !plan.inventedEventOrActor,
  );
  const conditionalNec = plans.filter(
    (plan) =>
      plan.standing === "NOT_ENTAILED_COMPATIBLE" &&
      plan.unique &&
      plan.hostedBySource &&
      !plan.untilCessationImplicature &&
      !plan.onlyToAtLeast &&
      !plan.inventedEventOrActor &&
      plan.necFamily != null &&
      plan.necFamily !== "none",
  );
  const selected = [...contradicted, ...conditionalNec].slice(0, 4);
  const usesNec = selected.some((plan) => plan.standing !== "CONTRADICTED");
  return {
    rejectedIds: rejected.map((plan) => plan.planId),
    contradictedIds: contradicted.map((plan) => plan.planId),
    conditionalNecIds: conditionalNec.map((plan) => plan.planId),
    selectedIds: selected.map((plan) => plan.planId),
    selectedValidPlans: selected.length,
    fourDefensiblePlans: selected.length === 4,
    fourContradictedPlans: contradicted.length >= 4,
    usesNec,
    keyBlocked,
    stageBEligible: selected.length === 4 && !keyBlocked,
    constructionPassAllowed: selected.length === 4 && contradicted.length >= 4 && !keyBlocked && !usesNec,
    independentlyVerifiedPass: false as const,
  };
}

export function restatementHardPlanPoolCeiling(prices: PriceCatalog) {
  const row = prices[qualityAuthoringLivePilotWriter];
  const perCallUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling)
    : null;
  const fiveStageAUsd = perCallUsd != null ? perCallUsd * restatementHardPlanPoolMaxStageACalls : null;
  const tenCallUsd = perCallUsd != null ? perCallUsd * (restatementHardPlanPoolMaxStageACalls + restatementHardPlanPoolMaxStageBCalls) : null;
  return {
    writer: qualityAuthoringLivePilotWriter,
    perCallUsd,
    fiveStageAUsd,
    tenCallUsd,
    capUsd: restatementHardPlanPoolSpendCapUsd,
    retry: restatementHardPlanPoolRetry,
    maxStageACalls: restatementHardPlanPoolMaxStageACalls,
    maxStageBCalls: restatementHardPlanPoolMaxStageBCalls,
    judgeCalls: restatementHardPlanPoolJudgeCalls,
    fitsStageACap: fiveStageAUsd != null && fiveStageAUsd <= restatementHardPlanPoolSpendCapUsd,
    fitsFullTenCallCap: tenCallUsd != null && tenCallUsd <= restatementHardPlanPoolSpendCapUsd,
  };
}

export function refuseRestatementHardPlanPool(reason: string, code: string) {
  return {
    started: false,
    executed: false,
    providerCalls: 0,
    stageACalls: 0,
    stageBCalls: 0,
    judgeCalls: 0,
    studentBankWrites: 0 as const,
    qualityAccepted: false as const,
    meaningProven: false as const,
    hardCalibrationStatus: "not_run" as const,
    productionGate: restatementHardPlanPoolProductionGate,
    reason,
    code,
    liveAuthorized: restatementHardPlanPoolLiveAuthorized,
    qualityAuthoringStageLiveAuthorized: qualityAuthoringLiveAuthorized,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
    authorization: restatementHardPlanPoolAuthorization,
  };
}

export function restatementHardPlanPoolProtectedDirs() {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter(
    (dir) => path.resolve(dir) !== path.resolve(restatementHardPlanPoolOutputDir),
  );
}
