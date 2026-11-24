import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringPromptVersion, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { restatementHardBenchmark5OutputDir } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { restatementHardFourRelationBriefOutputDir } from "@/modules/factory/item-model/restatement-hard-four-relation-brief";
import { restatementHardPlanPoolOutputDir } from "@/modules/factory/item-model/restatement-hard-plan-pool";
import { restatementHardStageAPlanningOutputDir } from "@/modules/factory/item-model/restatement-hard-stage-a-planning";
import {
  restatementHardStage0BriefPairCounts,
  restatementHardStage0Catalog,
  restatementHardStage0PaidLlmCalls,
  restatementHardStage0SourceKeyFrozenHashes,
  restatementHardStage0SourceKeyOutputDir,
  restatementHardStage0SourceKeyProductionGate,
  restatementHardStage0SourceKeyLiveAuthorized,
  restatementHardStage0Locks,
} from "@/modules/factory/item-model/restatement-hard-stage-0-source-key";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";

function sha256(relPath: string) {
  return createHash("sha256").update(readFileSync(relPath)).digest("hex");
}

describe("restatement HARD Stage 0 source-key integrity v1", () => {
  it("is offline, does not open production, and keeps seed and port pair types distinct", () => {
    expect(restatementHardStage0SourceKeyLiveAuthorized).toBe(false);
    expect(restatementHardStage0SourceKeyProductionGate).toBe(false);
    expect(restatementHardStage0PaidLlmCalls).toBe(0);
    expect(restatementHardStage0Locks()).toMatchObject({
      qualityAccepted: false,
      meaningProven: false,
      hardCalibrationStatus: "not_run",
      studentBankWrites: 0,
      autoFixed: false,
    });
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityAuthoringPromptVersion).toBe("quality-authoring.design-then-write.v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardStage0SourceKeyOutputDir);
    expect(assembleQualityAuthoring(fourOfSixFixture).qualityAccepted).toBe(false);

    const catalog = restatementHardStage0Catalog();
    expect(catalog).toHaveLength(20);
    expect(new Set(catalog.map((row) => row.pairHash)).size).toBe(20);
    expect(restatementHardStage0BriefPairCounts().every((row) => row.uniquePairs === 4)).toBe(true);
    expect(catalog.every((row) => row.requiresIndependentReview && row.status !== undefined && !row.autoFixed)).toBe(true);

    const seedCf = catalog.find((row) => row.variantId === "seed.four-relation");
    const seedBecause = catalog.find((row) => row.variantId === "seed.plan-pool");
    expect(seedCf?.status).toBe("EQUIVALENT_CANDIDATE");
    expect(seedBecause?.status).toBe("NON_EQUIVALENT");
    expect(seedCf?.pairHash).not.toBe(seedBecause?.pairHash);

    const portAlthough = catalog.find((row) => row.variantId === "port.benchmark-5");
    const portRejecting = catalog.find((row) => row.variantId === "port.plan-pool");
    expect(portAlthough?.status).toBe("NON_EQUIVALENT");
    expect(portRejecting?.status).toBe("EQUIVALENT_CANDIDATE");
    expect(portAlthough?.pairHash).not.toBe(portRejecting?.pairHash);

    const ethicsFour = catalog.find((row) => row.variantId === "ethics.four-relation");
    const ethicsPool = catalog.find((row) => row.variantId === "ethics.plan-pool");
    expect(ethicsFour?.sourceHash).toBe(ethicsPool?.sourceHash);
    expect(ethicsFour?.keyHash).not.toBe(ethicsPool?.keyHash);
    expect(ethicsPool?.status).toBe("NON_EQUIVALENT");
  });

  it("does not mutate prior experiment records or the production prompt", () => {
    expect(sha256(`${restatementHardBenchmark5OutputDir}/summary.json`)).toBe(restatementHardStage0SourceKeyFrozenHashes.benchmarkSummarySha256);
    expect(sha256("pipeline/ai/prompts/quality-authoring.v1.ts")).toBe(restatementHardStage0SourceKeyFrozenHashes.qualityAuthoringPromptSha256);
    expect(sha256(`${restatementHardFourRelationBriefOutputDir}/summary.json`)).toBe(restatementHardStage0SourceKeyFrozenHashes.fourRelationSummarySha256);
    expect(sha256(`${restatementHardPlanPoolOutputDir}/stage-a-summary.json`)).toBe(restatementHardStage0SourceKeyFrozenHashes.planPoolStageASummarySha256);
    expect(sha256(`${restatementHardStageAPlanningOutputDir}/stage-a-summary.json`)).toBe(restatementHardStage0SourceKeyFrozenHashes.stageAPlanningSummarySha256);
  });
});
