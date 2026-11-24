import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPrices } from "./ai/prices";
import { qualityAuthoringPromptVersion } from "./ai/prompts/quality-authoring.v1";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { restatementHardBenchmark5OutputDir } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import {
  restatementHardFourRelationBriefAuthorization,
  restatementHardFourRelationBriefCeiling,
  restatementHardFourRelationBriefExcludedAsNotContradicted,
  restatementHardFourRelationBriefFrozenHashes,
  restatementHardFourRelationBriefOnlyRelationsLineChanged,
  restatementHardFourRelationBriefOutputDir,
  restatementHardFourRelationBriefProductionGate,
  restatementHardFourRelationBriefSpendCapUsd,
  restatementHardFourRelationBriefTasks,
} from "@/modules/factory/item-model/restatement-hard-four-relation-brief";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { runRestatementHardFourRelationBrief } from "./stages/restatement-hard-four-relation-brief";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

function sha256(relPath: string) {
  return createHash("sha256").update(readFileSync(relPath)).digest("hex");
}

describe("restatement HARD four-relation brief v1", () => {
  it("prepares four CONTRADICTED relations, changes only the relations line, and does not apply a production gate", () => {
    expect(restatementHardFourRelationBriefProductionGate).toBe(false);
    expect(qualityAuthoringPromptVersion).toBe("quality-authoring.design-then-write.v1");
    expect(restatementHardFourRelationBriefTasks).toHaveLength(5);
    expect(restatementHardFourRelationBriefTasks.every((task) => task.prepared && task.packs.length === 4)).toBe(true);
    expect(restatementHardFourRelationBriefOnlyRelationsLineChanged().every((row) => row.otherLinesUnchanged && row.originalRelationCount === 3 && row.nextRelationCount === 4)).toBe(true);
    expect(restatementHardFourRelationBriefExcludedAsNotContradicted).toContain("only_if_to_sufficient");
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardFourRelationBriefOutputDir);
    expect(assembleQualityAuthoring(fourOfSixFixture).qualityAccepted).toBe(false);
    expect(openrouter).not.toBeNull();
    const ceiling = restatementHardFourRelationBriefCeiling(openrouter!.table);
    expect(restatementHardFourRelationBriefSpendCapUsd).toBe(0.02);
    expect(ceiling.preparedCount).toBe(5);
    expect(ceiling.fitsCap).toBe(true);
  });

  it("refuses unauthorized generate and leaves the original benchmark and production prompt unchanged", async () => {
    const blocked = await runRestatementHardFourRelationBrief("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runRestatementHardFourRelationBrief(restatementHardFourRelationBriefAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(sha256(`${restatementHardBenchmark5OutputDir}/summary.json`)).toBe(restatementHardFourRelationBriefFrozenHashes.benchmarkSummarySha256);
    expect(sha256("pipeline/ai/prompts/quality-authoring.v1.ts")).toBe(restatementHardFourRelationBriefFrozenHashes.qualityAuthoringPromptSha256);
  });
});
