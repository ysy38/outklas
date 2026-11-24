import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPrices } from "./ai/prices";
import { qualityAuthoringPromptVersion } from "./ai/prompts/quality-authoring.v1";
import { stageAPlanningPromptVersion } from "./ai/prompts/stage-a-planning.v1";
import { stageBWordingPromptVersion } from "./ai/prompts/stage-b-wording.v1";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { restatementHardBenchmark5OutputDir, restatementHardBenchmark5Tasks } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import {
  restatementHardStageAPlanningAuthorization,
  restatementHardStageAPlanningCeiling,
  restatementHardStageAPlanningFrozenHashes,
  restatementHardStageAPlanningMaxStageACalls,
  restatementHardStageAPlanningMaxStageBCalls,
  restatementHardStageAPlanningOutputDir,
  restatementHardStageAPlanningProductionGate,
  restatementHardStageAPlanningSpendCapUsd,
  restatementHardStageAPlanningTasks,
} from "@/modules/factory/item-model/restatement-hard-stage-a-planning";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { runRestatementHardStageAPlanning } from "./stages/restatement-hard-stage-a-planning";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

function sha256(relPath: string) {
  return createHash("sha256").update(readFileSync(relPath)).digest("hex");
}

describe("restatement HARD stage A semantic planning v1", () => {
  it("uses experimental prompts, leaves production closed, and does not fit a conservative ten-call ceiling", () => {
    expect(stageAPlanningPromptVersion).toBe("stage-a-planning.v1");
    expect(stageBWordingPromptVersion).toBe("stage-b-wording.v1");
    expect(qualityAuthoringPromptVersion).toBe("quality-authoring.design-then-write.v1");
    expect(restatementHardStageAPlanningProductionGate).toBe(false);
    expect(restatementHardStageAPlanningTasks).toEqual(restatementHardBenchmark5Tasks);
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardStageAPlanningOutputDir);
    expect(assembleQualityAuthoring(fourOfSixFixture).qualityAccepted).toBe(false);
    expect(openrouter).not.toBeNull();
    const ceiling = restatementHardStageAPlanningCeiling(openrouter!.table);
    expect(restatementHardStageAPlanningMaxStageACalls).toBe(5);
    expect(restatementHardStageAPlanningMaxStageBCalls).toBe(5);
    expect(restatementHardStageAPlanningSpendCapUsd).toBe(0.02);
    expect(ceiling.fitsStageACap).toBe(true);
    expect(ceiling.fitsFullTenCallCap).toBe(false);
    expect(ceiling.fiveStageAUsd!).toBeLessThanOrEqual(0.02);
    expect(ceiling.tenCallUsd!).toBeGreaterThan(0.02);
  });

  it("refuses unauthorized or overwrite generate and does not mutate the original benchmark or production prompt", async () => {
    const blocked = await runRestatementHardStageAPlanning("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runRestatementHardStageAPlanning(restatementHardStageAPlanningAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(overwrite.providerCalls).toBe(0);
    expect(sha256(`${restatementHardBenchmark5OutputDir}/summary.json`)).toBe(restatementHardStageAPlanningFrozenHashes.benchmarkSummarySha256);
    expect(sha256("pipeline/ai/prompts/quality-authoring.v1.ts")).toBe(restatementHardStageAPlanningFrozenHashes.qualityAuthoringPromptSha256);
  });
});
