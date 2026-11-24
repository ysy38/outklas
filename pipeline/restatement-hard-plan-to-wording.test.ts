import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPrices } from "./ai/prices";
import { qualityAuthoringPromptVersion } from "./ai/prompts/quality-authoring.v1";
import { planToWordingPromptVersion } from "./ai/prompts/plan-to-wording.v1";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { restatementHardBenchmark5OutputDir } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { restatementHardSourceFeasibilityOutputDir } from "@/modules/factory/item-model/restatement-hard-source-feasibility";
import {
  restatementHardPlanToWordingAuthorization,
  restatementHardPlanToWordingCeiling,
  restatementHardPlanToWordingFrozenHashes,
  restatementHardPlanToWordingMaxCalls,
  restatementHardPlanToWordingOutputDir,
  restatementHardPlanToWordingPrecheck,
  restatementHardPlanToWordingProductionGate,
  restatementHardPlanToWordingSpendCapUsd,
  restatementHardPlanToWordingTasks,
} from "@/modules/factory/item-model/restatement-hard-plan-to-wording";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { runRestatementHardPlanToWording } from "./stages/restatement-hard-plan-to-wording";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

function sha256(relPath: string) {
  return createHash("sha256").update(readFileSync(relPath)).digest("hex");
}

describe("restatement HARD plan-to-wording v1", () => {
  it("uses a separate wording prompt, leaves production locks closed, and marks four plans invalid without replacing them", () => {
    expect(planToWordingPromptVersion).toBe("plan-to-wording.v1");
    expect(qualityAuthoringPromptVersion).toBe("quality-authoring.design-then-write.v1");
    expect(restatementHardPlanToWordingProductionGate).toBe(false);
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardPlanToWordingOutputDir);
    expect(assembleQualityAuthoring(fourOfSixFixture).qualityAccepted).toBe(false);
    expect(restatementHardPlanToWordingTasks).toHaveLength(5);
    const precheck = restatementHardPlanToWordingPrecheck();
    expect(precheck.map((row) => row.validSuppliedPlans)).toEqual([3, 3, 3, 3, 4]);
    expect(precheck.flatMap((row) => row.invalidPlans.map((plan) => plan.id))).toEqual(["A2", "S1", "P3", "E3"]);
    expect(precheck.filter((row) => row.canMeetFourValidBar)).toHaveLength(1);
  });

  it("fits the $0.02 ceiling and refuses unauthorized or overwrite generate", async () => {
    expect(restatementHardPlanToWordingMaxCalls).toBe(5);
    expect(restatementHardPlanToWordingSpendCapUsd).toBe(0.02);
    expect(openrouter).not.toBeNull();
    const ceiling = restatementHardPlanToWordingCeiling(openrouter!.table);
    expect(ceiling.fitsCap).toBe(true);
    expect(ceiling.fiveCallUsd!).toBeLessThanOrEqual(0.02);
    const blocked = await runRestatementHardPlanToWording("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runRestatementHardPlanToWording(restatementHardPlanToWordingAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(overwrite.providerCalls).toBe(0);
  });

  it("does not mutate the original benchmark, feasibility records, or production prompt", () => {
    expect(sha256(`${restatementHardBenchmark5OutputDir}/summary.json`)).toBe(restatementHardPlanToWordingFrozenHashes.benchmarkSummarySha256);
    expect(sha256(`${restatementHardSourceFeasibilityOutputDir}/source-feasibility.json`)).toBe(restatementHardPlanToWordingFrozenHashes.feasibilityJsonSha256);
    expect(sha256("pipeline/ai/prompts/quality-authoring.v1.ts")).toBe(restatementHardPlanToWordingFrozenHashes.qualityAuthoringPromptSha256);
  });
});
