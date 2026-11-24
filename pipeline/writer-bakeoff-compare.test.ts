import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import {
  refuseWriterBakeoffLive,
  writerBakeoffAuthorization,
  writerBakeoffLiveAuthorized,
  writerBakeoffOutputDir,
  writerBakeoffSmokeSourceId,
} from "@/modules/factory/item-model/writer-bakeoff";
import {
  activeToPassiveEquivalence,
  artificialRoleSwap,
  auditFrozenPlans,
  evaluateWriterOption,
  projectedBakeoffSpendUsd,
  remainingCallCeilingUsd,
  remainingScoringTasks,
  unrecordedHaikuHit,
  writerBakeoffCompareAuthorization,
  writerBakeoffCompareMaxCalls,
  writerBakeoffCompareOutputDir,
  writerBakeoffCompareSpendCapUsd,
  writerBakeoffRemainingSourceIds,
} from "@/modules/factory/item-model/writer-bakeoff-compare";
import { platesSmokeTask, writerBakeoffSmokeOutputDir, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { architectureV2WriterBakeoffCandidates } from "./ai/config";
import { loadPrices } from "./ai/prices";
import { runWriterBakeoff } from "./stages/writer-bakeoff";
import { runWriterBakeoffRemainingFive } from "./stages/writer-bakeoff-compare";
import { runWriterBakeoffTechnicalSmoke } from "./stages/writer-bakeoff-smoke";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

describe("writer bake-off remaining five v1", () => {
  it("audits frozen plates AGENT_ROLE as a plan defect, reuses smoke, and keeps the twenty-call ceiling under $0.62", async () => {
    expect(writerBakeoffLiveAuthorized).toBe(false);
    expect(writerBakeoffCompareMaxCalls).toBe(20);
    expect(writerBakeoffCompareSpendCapUsd).toBe(0.62);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffCompareOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffSmokeOutputDir);
    expect([...writerBakeoffRemainingSourceIds]).not.toContain(writerBakeoffSmokeSourceId);
    expect(remainingScoringTasks().map((task) => task.id)).toEqual([...writerBakeoffRemainingSourceIds]);
    expect(remainingScoringTasks().every((task) => task.planHash.length === 12)).toBe(true);

    const audit = auditFrozenPlans();
    const platesAgent = audit.find((row) => row.sourceId === writerBakeoffSmokeSourceId && row.planId === "p3-AGENT_ROLE");
    expect(platesAgent?.feasibility).toBe("artificial");
    expect(platesAgent?.defectKind).toBe("plan");
    expect(platesAgent?.frozenUnchanged).toBe(true);
    expect(audit.every((row) => row.frozenUnchanged)).toBe(true);

    const plates = platesSmokeTask();
    const deepseekPassive = "If the glass plates had been sealed before the humidity rose, the two earliest negatives would still have been printable.";
    expect(activeToPassiveEquivalence(plates.source, deepseekPassive)).toBe(true);
    const deepseekEval = evaluateWriterOption({
      source: plates.source,
      key: plates.key,
      targetLanguage: null,
      plan: plates.plans[2]!,
      planFeasibility: "artificial",
      candidate: { candidateText: deepseekPassive, planId: "p3-AGENT_ROLE", studentMisreading: "x", semanticRisk: "none" },
    });
    expect(deepseekEval.flags).toEqual(expect.arrayContaining(["critical_second_answer_risk", "active_to_passive_equivalence"]));
    expect(deepseekEval.writerExecutionQuality.wrongAnswerQuality).toBe("fail");
    expect(deepseekEval.writerClaimIsNotProof).toBe(true);
    expect(artificialRoleSwap("If the glass plates had sealed the conservators before the humidity rose, the two earliest negatives would still have been printable.")).toBe(true);
    expect(artificialRoleSwap("Had the rising humidity sealed the two earliest negatives before the conservators intervened, the glass plates would have remained printable.")).toBe(true);

    expect(openrouter).not.toBeNull();
    const ceiling = remainingCallCeilingUsd(openrouter!.table, architectureV2WriterBakeoffCandidates);
    expect(ceiling.twentyCallUsd!).toBeGreaterThan(0.43);
    expect(ceiling.twentyCallUsd!).toBeLessThan(0.44);
    const unrecorded = unrecordedHaikuHit(openrouter!.table);
    expect(unrecorded.persisted).toBe(false);
    expect(unrecorded.conservativeCeilingUsd!).toBeGreaterThan(0.002);
    const projection = projectedBakeoffSpendUsd({
      recordedSmokeUsd: 0.032856,
      unrecordedHaikuUsd: unrecorded.conservativeCeilingUsd,
      remainingTwentyUsd: ceiling.twentyCallUsd,
    });
    expect(projection.fitsCap).toBe(true);
    expect(projection.projectedTotalUsd!).toBeLessThan(writerBakeoffCompareSpendCapUsd);

    const before = writerBakeoffV1Fingerprint();
    const smokeBefore = readFileSync(path.join(writerBakeoffSmokeOutputDir, "summary.json"), "utf8");
    const qualityBefore = readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8");
    expect((await runWriterBakeoffRemainingFive("nope")).started).toBe(false);
    const overwriteResult = await runWriterBakeoffRemainingFive(writerBakeoffCompareAuthorization, writerBakeoffOutputDir);
    expect("reason" in overwriteResult ? overwriteResult.reason : "").toMatch(/overwrite/);
    expect((await runWriterBakeoffRemainingFive(writerBakeoffCompareAuthorization, writerBakeoffSmokeOutputDir)).started).toBe(false);
    const smokeResult = await runWriterBakeoffTechnicalSmoke("writer-bakeoff-technical-smoke-v1");
    expect("reason" in smokeResult ? smokeResult.reason : "").toMatch(/already stored/);
    expect(writerBakeoffV1Fingerprint()).toBe(before);
    expect(readFileSync(path.join(writerBakeoffSmokeOutputDir, "summary.json"), "utf8")).toBe(smokeBefore);
    expect(readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8")).toBe(qualityBefore);
    expect(() => publishToStudentBank()).toThrow(/does not write the student bank/);
    expect((await runWriterBakeoff(writerBakeoffAuthorization)).started).toBe(false);
    expect(refuseWriterBakeoffLive(writerBakeoffAuthorization).reason).toBe("live bake-off is closed");
  });
});
