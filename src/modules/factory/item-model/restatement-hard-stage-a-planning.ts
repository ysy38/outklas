import path from "node:path";
import { architectureV2WriterTokenCeiling, callCeilingUsd, type CatalogPrice, type PriceCatalog } from "./architecture-v2";
import { qualityAuthoringLiveAuthorized, qualityAuthoringModels } from "./quality-authoring";
import { qualityAuthoringLivePilotWriter, restatementHardBenchmark5Tasks } from "./quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";

export const restatementHardStageAPlanningVersion = "restatement-hard-stage-a-planning-v1";
export const restatementHardStageAPlanningAuthorization = "restatement-hard-stage-a-planning-v1";
export const restatementHardStageAPlanningOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1";
export const restatementHardStageAPlanningLiveAuthorized = true as const;
export const restatementHardStageAPlanningSpendCapUsd = 0.02;
export const restatementHardStageAPlanningRetry = 0;
export const restatementHardStageAPlanningMaxStageACalls = 5;
export const restatementHardStageAPlanningMaxStageBCalls = 5;
export const restatementHardStageAPlanningJudgeCalls = 0;
export const restatementHardStageAPlanningProductionGate = false as const;

export const restatementHardStageAPlanningFrozenHashes = {
  benchmarkSummarySha256: "51db881dd691c06bd6348456a1c627196501fbe974171f311305badd8b79d3da",
  qualityAuthoringPromptSha256: "be5a6b975e1704cc44fc67703e651691a6afb8ffc187813a9f28c7ac0edf7ef8",
} as const;

export const restatementHardStageAPlanningTasks = restatementHardBenchmark5Tasks;

export function restatementHardStageAPlanningCeiling(prices: PriceCatalog) {
  const row = prices[qualityAuthoringLivePilotWriter];
  const perCallUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling)
    : null;
  const fiveStageAUsd = perCallUsd != null ? perCallUsd * restatementHardStageAPlanningMaxStageACalls : null;
  const tenCallUsd = perCallUsd != null ? perCallUsd * (restatementHardStageAPlanningMaxStageACalls + restatementHardStageAPlanningMaxStageBCalls) : null;
  return {
    writer: qualityAuthoringLivePilotWriter,
    perCallUsd,
    fiveStageAUsd,
    tenCallUsd,
    capUsd: restatementHardStageAPlanningSpendCapUsd,
    retry: restatementHardStageAPlanningRetry,
    maxStageACalls: restatementHardStageAPlanningMaxStageACalls,
    maxStageBCalls: restatementHardStageAPlanningMaxStageBCalls,
    judgeCalls: restatementHardStageAPlanningJudgeCalls,
    fitsStageACap: fiveStageAUsd != null && fiveStageAUsd <= restatementHardStageAPlanningSpendCapUsd,
    fitsFullTenCallCap: tenCallUsd != null && tenCallUsd <= restatementHardStageAPlanningSpendCapUsd,
  };
}

export function refuseRestatementHardStageAPlanning(reason: string, code: string) {
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
    productionGate: restatementHardStageAPlanningProductionGate,
    reason,
    code,
    liveAuthorized: restatementHardStageAPlanningLiveAuthorized,
    qualityAuthoringStageLiveAuthorized: qualityAuthoringLiveAuthorized,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
    authorization: restatementHardStageAPlanningAuthorization,
  };
}

export function restatementHardStageAPlanningProtectedDirs() {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter(
    (dir) => path.resolve(dir) !== path.resolve(restatementHardStageAPlanningOutputDir),
  );
}
