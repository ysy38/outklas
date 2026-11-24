import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPrices } from "./ai/prices";
import { qualityAuthoringPromptVersion } from "./ai/prompts/quality-authoring.v1";
import { stageAPlanPoolPromptVersion } from "./ai/prompts/stage-a-plan-pool.v1";
import { stageAPlanningPromptVersion } from "./ai/prompts/stage-a-planning.v1";
import { stageBWordingPromptVersion } from "./ai/prompts/stage-b-wording.v1";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { restatementHardBenchmark5OutputDir, restatementHardBenchmark5Tasks } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import {
  restatementHardPlanPoolAuthorization,
  restatementHardPlanPoolCeiling,
  restatementHardPlanPoolMaxStageACalls,
  restatementHardPlanPoolMaxStageBCalls,
  restatementHardPlanPoolOriginalPortKeyBlocked,
  restatementHardPlanPoolOutputDir,
  restatementHardPlanPoolProductionGate,
  restatementHardPlanPoolSpendCapUsd,
  restatementHardPlanPoolStage0Original,
  restatementHardPlanPoolTasks,
  restatementHardPlanPoolFrozenHashes,
  selectPlanPool,
} from "@/modules/factory/item-model/restatement-hard-plan-pool";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { runRestatementHardPlanPoolStageA } from "./stages/restatement-hard-plan-pool";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

function sha256(relPath: string) {
  return createHash("sha256").update(readFileSync(relPath)).digest("hex");
}

describe("restatement HARD semantic plan pool v1", () => {
  it("keeps production closed, blocks the original port key, and does not fit a conservative ten-call ceiling", () => {
    expect(stageAPlanPoolPromptVersion).toBe("stage-a-plan-pool.v1");
    expect(stageAPlanningPromptVersion).toBe("stage-a-planning.v1");
    expect(stageBWordingPromptVersion).toBe("stage-b-wording.v1");
    expect(qualityAuthoringPromptVersion).toBe("quality-authoring.design-then-write.v1");
    expect(restatementHardPlanPoolProductionGate).toBe(false);
    expect(restatementHardPlanPoolTasks).toEqual(restatementHardBenchmark5Tasks);
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardPlanPoolOutputDir);
    expect(assembleQualityAuthoring(fourOfSixFixture).qualityAccepted).toBe(false);
    expect(restatementHardPlanPoolStage0Original.filter((row) => row.keyBlocked)).toEqual([
      expect.objectContaining({ id: "rhb-port-wrecks", extraUnentailedClaim: "does not accept", autoFixed: false }),
    ]);
    const port = restatementHardPlanPoolOriginalPortKeyBlocked();
    expect(port.keyContainsDoesNotAccept).toBe(true);
    expect(port.sourceContainsDoesNotAccept).toBe(false);
    expect(port.keyBlocked).toBe(true);
    expect(port.autoFixed).toBe(false);
    expect(openrouter).not.toBeNull();
    const ceiling = restatementHardPlanPoolCeiling(openrouter!.table);
    expect(restatementHardPlanPoolMaxStageACalls).toBe(5);
    expect(restatementHardPlanPoolMaxStageBCalls).toBe(5);
    expect(restatementHardPlanPoolSpendCapUsd).toBe(0.02);
    expect(ceiling.fitsStageACap).toBe(true);
    expect(ceiling.fitsFullTenCallCap).toBe(false);
    expect(ceiling.fiveStageAUsd!).toBeLessThanOrEqual(0.02);
    expect(ceiling.tenCallUsd!).toBeGreaterThan(0.02);
    const necFill = selectPlanPool(
      [
        { planId: "p1", standing: "CONTRADICTED", unique: true, hostedBySource: true, untilCessationImplicature: false, onlyToAtLeast: false, inventedEventOrActor: false, althoughToBecause: false, necFamily: null },
        { planId: "p2", standing: "CONTRADICTED", unique: true, hostedBySource: true, untilCessationImplicature: false, onlyToAtLeast: false, inventedEventOrActor: false, althoughToBecause: false, necFamily: null },
        { planId: "p3", standing: "CONTRADICTED", unique: true, hostedBySource: true, untilCessationImplicature: false, onlyToAtLeast: false, inventedEventOrActor: false, althoughToBecause: false, necFamily: null },
        { planId: "p4", standing: "NOT_ENTAILED_COMPATIBLE", unique: true, hostedBySource: true, untilCessationImplicature: false, onlyToAtLeast: false, inventedEventOrActor: false, althoughToBecause: false, necFamily: "necessary_to_sufficient" },
        { planId: "p5", standing: "ENTAILED", unique: true, hostedBySource: true, untilCessationImplicature: false, onlyToAtLeast: true, inventedEventOrActor: false, althoughToBecause: false, necFamily: null },
        { planId: "p6", standing: "NOT_ENTAILED_COMPATIBLE", unique: true, hostedBySource: true, untilCessationImplicature: true, onlyToAtLeast: false, inventedEventOrActor: false, althoughToBecause: false, necFamily: null },
      ],
      false,
    );
    expect(necFill.selectedIds).toEqual(["p1", "p2", "p3", "p4"]);
    expect(necFill.fourDefensiblePlans).toBe(true);
    expect(necFill.fourContradictedPlans).toBe(false);
    expect(necFill.constructionPassAllowed).toBe(false);
    expect(necFill.independentlyVerifiedPass).toBe(false);
    expect(necFill.stageBEligible).toBe(true);
    expect(selectPlanPool(necFill.selectedIds.map((planId) => ({ planId, standing: "CONTRADICTED", unique: true, hostedBySource: true, untilCessationImplicature: false, onlyToAtLeast: false, inventedEventOrActor: false, althoughToBecause: false, necFamily: null })), true).stageBEligible).toBe(false);
  });

  it("refuses unauthorized generate and does not mutate the original benchmark or production prompt", async () => {
    const blocked = await runRestatementHardPlanPoolStageA("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runRestatementHardPlanPoolStageA(restatementHardPlanPoolAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(sha256(`${restatementHardBenchmark5OutputDir}/summary.json`)).toBe(restatementHardPlanPoolFrozenHashes.benchmarkSummarySha256);
    expect(sha256("pipeline/ai/prompts/quality-authoring.v1.ts")).toBe(restatementHardPlanPoolFrozenHashes.qualityAuthoringPromptSha256);
  });
});
