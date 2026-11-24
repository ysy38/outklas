import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { restatementHardBenchmark5OutputDir } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import {
  restatementHardBenchmark5FrozenHashes,
  restatementHardRejectedTrapPatterns,
  restatementHardSourceFeasibilityLiveAuthorized,
  restatementHardSourceFeasibilityLocks,
  restatementHardSourceFeasibilityOutputDir,
  restatementHardSourceFeasibilityProductionGate,
  restatementHardSourceFeasibilityTable,
} from "@/modules/factory/item-model/restatement-hard-source-feasibility";

function sha256(relPath: string) {
  return createHash("sha256").update(readFileSync(relPath)).digest("hex");
}

describe("restatement HARD source feasibility v1", () => {
  it("is analysis-only and does not open production, bank, or a feasibility gate", () => {
    expect(restatementHardSourceFeasibilityProductionGate).toBe(false);
    expect(restatementHardSourceFeasibilityLiveAuthorized).toBe(false);
    expect(restatementHardSourceFeasibilityLocks.meaningProven).toBe(false);
    expect(restatementHardSourceFeasibilityLocks.qualityAccepted).toBe(false);
    expect(restatementHardSourceFeasibilityLocks.studentBankWrites).toBe(0);
    expect(restatementHardSourceFeasibilityLocks.hardCalibrationStatus).toBe("not_run");
    expect(restatementHardSourceFeasibilityLocks.productionGate).toBe(false);
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardSourceFeasibilityOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardBenchmark5OutputDir);
    const assembled = assembleQualityAuthoring(fourOfSixFixture);
    expect(assembled.qualityAccepted).toBe(false);
  });

  it("classifies all five briefs as H2 with four feasible plans and does not treat unsafe until/only patterns as plans", () => {
    expect(restatementHardSourceFeasibilityTable).toHaveLength(5);
    expect(restatementHardSourceFeasibilityTable.every((row) => row.hypothesis === "H2")).toBe(true);
    expect(restatementHardSourceFeasibilityTable.every((row) => row.feasibleIndependentPlans === 4)).toBe(true);
    expect(restatementHardSourceFeasibilityTable.map((row) => row.writerValid)).toEqual([3, 2, 3, 3, 2]);
    expect(restatementHardRejectedTrapPatterns).toEqual([
      "until_cessation_or_then_released_implicature",
      "until_on_concurrent_continuing_state_as_endpoint",
      "exclusive_only_to_at_least",
      "compatible_extra_or_weaker_information",
    ]);
  });

  it("leaves the 5-brief benchmark records unchanged", () => {
    expect(sha256(`${restatementHardBenchmark5OutputDir}/summary.json`)).toBe(restatementHardBenchmark5FrozenHashes.summarySha256);
    expect(sha256(`${restatementHardBenchmark5OutputDir}/editorial-evaluation.json`)).toBe(
      restatementHardBenchmark5FrozenHashes.editorialEvaluationSha256,
    );
    expect(sha256(`${restatementHardBenchmark5OutputDir}/restatement-hard-benchmark-5-v1.md`)).toBe(restatementHardBenchmark5FrozenHashes.reportSha256);
  });
});
