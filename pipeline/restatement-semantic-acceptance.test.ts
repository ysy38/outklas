import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringPromptVersion, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { restatementHardBenchmark5OutputDir } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import {
  restatementConservativeExamOrientedPolicy,
  restatementConservativeOfflineItems,
  restatementConservativeOfflineTotals,
  restatementSemanticAcceptanceFrozenHashes,
  restatementSemanticAcceptanceOutputDir,
  restatementSemanticAcceptanceProductionApplied,
  restatementSemanticAcceptanceProductionGate,
} from "@/modules/factory/item-model/restatement-semantic-acceptance";
import { restatementSemanticValidityOutputDir, restatementSemanticValidityProductionPolicy } from "@/modules/factory/item-model/restatement-semantic-validity";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";

function sha256(relPath: string) {
  return createHash("sha256").update(readFileSync(relPath)).digest("hex");
}

describe("restatement semantic acceptance policy v1", () => {
  it("stays experimental and does not apply Conservative Exam-Oriented to production", () => {
    expect(restatementSemanticAcceptanceProductionApplied).toBe(false);
    expect(restatementSemanticAcceptanceProductionGate).toBe(false);
    expect(restatementConservativeExamOrientedPolicy.productionApplied).toBe(false);
    expect(restatementConservativeExamOrientedPolicy.independentReviewRan).toBe(false);
    expect(restatementConservativeExamOrientedPolicy.sameAgentIsNotIndependentReview).toBe(true);
    expect(restatementConservativeExamOrientedPolicy.constructionTarget.meetingCountsIsNotAcceptance).toBe(true);
    expect(restatementSemanticValidityProductionPolicy).toBeNull();
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityAuthoringPromptVersion).toBe("quality-authoring.design-then-write.v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementSemanticAcceptanceOutputDir);
    expect(assembleQualityAuthoring(fourOfSixFixture).qualityAccepted).toBe(false);
  });

  it("does not turn the five benchmark items into more usable questions than Strict", () => {
    const totals = restatementConservativeOfflineTotals();
    expect(totals.fourthPadded).toBe(false);
    expect(totals.strictConstructionPass).toBe(0);
    expect(totals.conservativeConstructionPass).toBe(0);
    expect(totals.itemsWhereConservativeAddsUsableQuestion).toBe(0);
    expect(totals.strictAcceptedDistractors).toBe(9);
    expect(totals.conservativeAcceptedDistractors).toBe(9);
    expect(totals.conditionalIdentified).toBe(4);
    expect(totals.conditionalAccepted).toBe(0);
    expect(totals.finding).toBe("relabel_not_yield");
    expect(restatementConservativeOfflineItems.every((row) => row.strictConstruction === "FAIL" && row.conservativeConstruction === "FAIL")).toBe(true);
    expect(restatementConservativeOfflineItems.find((row) => row.id === "rhb-port-wrecks")?.keyVsSource).toBe("key_adds_unentailed_negation");
    expect(restatementConservativeOfflineItems.find((row) => row.id === "rhb-seed-convoy")?.secondAnswerRisk).toBe("high");
  });

  it("leaves the benchmark, validity contract JSON, and production prompt unchanged", () => {
    expect(sha256(`${restatementHardBenchmark5OutputDir}/summary.json`)).toBe(restatementSemanticAcceptanceFrozenHashes.benchmarkSummarySha256);
    expect(sha256(`${restatementSemanticValidityOutputDir}/semantic-validity-contract.json`)).toBe(
      restatementSemanticAcceptanceFrozenHashes.semanticValidityContractSha256,
    );
    expect(sha256("pipeline/ai/prompts/quality-authoring.v1.ts")).toBe(restatementSemanticAcceptanceFrozenHashes.qualityAuthoringPromptSha256);
  });
});
