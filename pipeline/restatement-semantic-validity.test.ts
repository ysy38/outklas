import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringPromptVersion, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { restatementHardBenchmark5OutputDir } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { restatementHardPlanToWordingOutputDir } from "@/modules/factory/item-model/restatement-hard-plan-to-wording";
import { restatementHardSourceFeasibilityOutputDir } from "@/modules/factory/item-model/restatement-hard-source-feasibility";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { shownDifference } from "@/modules/factory/item-model/whole-set";
import {
  restatementDistractorPolicies,
  restatementSemanticValidityCases,
  restatementSemanticValidityContract,
  restatementSemanticValidityFrozenHashes,
  restatementSemanticValidityOutputDir,
  restatementSemanticValidityProductionGate,
  restatementSemanticValidityProductionPolicy,
  restatementSemanticValidityUnresolvedBeforePolicy,
} from "@/modules/factory/item-model/restatement-semantic-validity";

function sha256(relPath: string) {
  return createHash("sha256").update(readFileSync(relPath)).digest("hex");
}

describe("restatement semantic validity contract v1", () => {
  it("is classification only and does not open a production gate or pick a policy", () => {
    expect(restatementSemanticValidityProductionGate).toBe(false);
    expect(restatementSemanticValidityProductionPolicy).toBeNull();
    expect(restatementSemanticValidityContract.productionPolicySelected).toBeNull();
    expect(restatementSemanticValidityContract.meaningProven).toBe(false);
    expect(restatementSemanticValidityContract.qualityAccepted).toBe(false);
    expect(restatementSemanticValidityContract.hardCalibrationStatus).toBe("not_run");
    expect(restatementDistractorPolicies.strict.validDistractorIf).toBe("CONTRADICTED");
    expect(restatementDistractorPolicies.examOriented.requiredSeparateRisks).toEqual([
      "secondAnswerRisk",
      "ambiguityRisk",
      "extraSourceInformationRisk",
      "studentChallengeRisk",
    ]);
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityAuthoringPromptVersion).toBe("quality-authoring.design-then-write.v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementSemanticValidityOutputDir);
    expect(assembleQualityAuthoring(fourOfSixFixture).qualityAccepted).toBe(false);
  });

  it("classifies the six mutations without forcing exam-oriented accept and without treating heuristics as proof", () => {
    expect(restatementSemanticValidityCases.map((row) => [row.id, row.vsSource])).toEqual([
      ["until-to-after", "NOT_ENTAILED_COMPATIBLE"],
      ["although-to-because", "NOT_ENTAILED_COMPATIBLE"],
      ["only-to-at-least", "ENTAILED"],
      ["only-if-to-sufficient", "NOT_ENTAILED_COMPATIBLE"],
      ["counterfactual-to-factual", "NOT_ENTAILED_COMPATIBLE"],
      ["authority-accepts", "NOT_ENTAILED_COMPATIBLE"],
    ]);
    const accepts = restatementSemanticValidityCases.find((row) => row.id === "authority-accepts");
    expect(accepts?.vsKey).toBe("CONTRADICTED");
    expect(accepts?.requiresIndependentReview).toBe(true);
    expect(restatementSemanticValidityCases.every((row) => row.proofStatus === "not_independently_proven")).toBe(true);
    expect(restatementSemanticValidityCases.every((row) => row.examOrientedDistractor === "not_forced")).toBe(true);
    expect(restatementSemanticValidityCases.find((row) => row.id === "only-to-at-least")?.strictDistractor).toBe("no");
    expect(restatementSemanticValidityUnresolvedBeforePolicy).toHaveLength(7);
    expect(
      shownDifference(
        "The office held back the chart until both crews had delivered their readings.",
        "The office remained withheld after both crews had delivered their readings.",
      ),
    ).toBeNull();
  });

  it("does not mutate prior experiment records or the production prompt", () => {
    expect(sha256(`${restatementHardBenchmark5OutputDir}/summary.json`)).toBe(restatementSemanticValidityFrozenHashes.benchmarkSummarySha256);
    expect(sha256(`${restatementHardSourceFeasibilityOutputDir}/source-feasibility.json`)).toBe(restatementSemanticValidityFrozenHashes.feasibilityJsonSha256);
    expect(sha256(`${restatementHardPlanToWordingOutputDir}/summary.json`)).toBe(restatementSemanticValidityFrozenHashes.planToWordingSummarySha256);
    expect(sha256("pipeline/ai/prompts/quality-authoring.v1.ts")).toBe(restatementSemanticValidityFrozenHashes.qualityAuthoringPromptSha256);
  });
});
