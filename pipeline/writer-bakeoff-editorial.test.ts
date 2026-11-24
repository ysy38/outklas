import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { writerBakeoffAuthorization, writerBakeoffLiveAuthorized, writerBakeoffOutputDir, writerBakeoffSmokeSourceId } from "@/modules/factory/item-model/writer-bakeoff";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import {
  editorialPlans,
  writeWriterBakeoffEditorial,
  writerBakeoffEditorialAuthorization,
  writerBakeoffEditorialLiveAuthorized,
  writerBakeoffEditorialOutputDir,
} from "@/modules/factory/item-model/writer-bakeoff-editorial";
import { writerBakeoffSmokeOutputDir, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { modelDefaults } from "./ai/config";
import { runWriterBakeoff } from "./stages/writer-bakeoff";

describe("writer bake-off editorial analysis v1", () => {
  it("rates frozen plans, writes 88 option records, and does not declare a winner", async () => {
    expect(writerBakeoffEditorialLiveAuthorized).toBe(false);
    expect(writerBakeoffLiveAuthorized).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(modelDefaults.generator).toBe("anthropic:claude-haiku-5-5");
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffEditorialOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffCompareOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffSmokeOutputDir);

    const plans = editorialPlans();
    expect(plans).toHaveLength(24);
    expect(plans.every((row) => row.frozenUnchanged && row.humanEditorial === "pending")).toBe(true);
    expect(plans.find((row) => row.sourceId === writerBakeoffSmokeSourceId && row.planId === "p3-AGENT_ROLE")).toMatchObject({
      feasibility: "infeasible",
      priorLabel: "artificial",
      defectKind: "plan",
    });
    expect(plans.filter((row) => row.feasibility === "feasible").length).toBeGreaterThan(10);
    expect(plans.some((row) => row.feasibility === "questionable")).toBe(true);

    const v1Before = writerBakeoffV1Fingerprint();
    const smokeBefore = readFileSync(path.join(writerBakeoffSmokeOutputDir, "summary.json"), "utf8");
    const compareBefore = readFileSync(path.join(writerBakeoffCompareOutputDir, "summary.json"), "utf8");
    const qualityBefore = readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8");

    const report = writeWriterBakeoffEditorial();
    expect(report.version).toBe(writerBakeoffEditorialAuthorization);
    expect(report.providerCalls).toBe(0);
    expect(report.liveAuthorized).toBe(false);
    expect(report.optionUnits).toBe(88);
    expect(report.missingCells).toHaveLength(2);
    expect(report.missingCells.every((row) => row.setting.endsWith("gemini-4-hydrogen") && row.finishReason === "LENGTH")).toBe(true);
    expect(report.humanEditorial).toBe("pending");
    expect(report.editorialAcceptance).toBe(false);
    expect(report.writerClaimIsNotProof).toBe(true);
    expect(report.meaningProven).toBe(false);
    expect(report.decisionTable.winnerDeclared).toBe(false);
    expect(report.decisionTable.rows.every((row) => row.selectNow === false && row.editorialAcceptanceRate === "unknown" && row.costPerAcceptedItem === undefined)).toBe(true);
    expect(report.recordsImmutable).toEqual({
      writerBakeoffV1Unchanged: true,
      platesSmokeUnchanged: true,
      compareUnchanged: true,
      qualityFirstUnchanged: true,
    });
    expect(report.forbiddenDirsIncludeOutput).toBe(true);
    expect(report.productionWriterUnchanged).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(report.recoveryDefault).toBe("off");

    const deepseekPlates = report.specialInvestigations.find((row) => row.id === "deepseek_plates_p3_passive");
    expect(deepseekPlates?.secondDefensibleAnswerRisk).toBe("yes");
    expect(deepseekPlates?.flags).toEqual(expect.arrayContaining(["critical_second_answer_risk", "active_to_passive_equivalence"]));
    const referees = report.specialInvestigations.find((row) => row.id === "deepseek_referees_near_key");
    expect(referees?.options).toHaveLength(4);
    expect(referees?.options?.every((row) => row.second === "yes")).toBe(true);
    const hydrogen = report.specialInvestigations.find((row) => row.id === "hydrogen_en_tr_length");
    expect(hydrogen?.cells?.every((row) => row.finishReason === "LENGTH" && row.outputTokens === 4096 && row.contentEmpty)).toBe(true);
    expect(report.rootCauses.map((row) => row.class)).toEqual(["Planner", "Writer", "Provider/Reasoning", "Selector"]);

    const haiku = report.scorecards.find((row) => row.setting.endsWith("claude-haiku-5.5"));
    const deepseek = report.scorecards.find((row) => row.setting.endsWith("deepseek-v3.2"));
    const hydrogenCard = report.scorecards.find((row) => row.setting.endsWith("gemini-4-hydrogen"));
    const argon = report.scorecards.find((row) => row.setting.endsWith("gemini-4-argon"));
    expect(haiku?.technicalCompletion).toBe(1);
    expect(deepseek?.technicalCompletion).toBe(1);
    expect(argon?.technicalCompletion).toBe(1);
    expect(hydrogenCard?.technicalCompletion).toBeCloseTo(4 / 6);
    expect(hydrogenCard?.optionCount).toBe(16);
    expect([haiku, deepseek, hydrogenCard, argon].every((row) => row?.editorialAcceptanceRate === "unknown" && row?.costPerAcceptedItem === undefined)).toBe(true);

    const boardKey = report.scorecards && JSON.parse(readFileSync(path.join(writerBakeoffEditorialOutputDir, "option-records.json"), "utf8")) as { sourceId: string; setting: string; planId: string; secondDefensibleAnswerRisk: { analyst: string; human: string } }[];
    const deepseekBoardP4 = boardKey.find((row) => row.sourceId === "taxonomy-translation-tr_en" && row.setting.endsWith("deepseek-v3.2") && row.planId === "p4-FOCUS_SCOPE");
    expect(deepseekBoardP4?.secondDefensibleAnswerRisk).toEqual({ analyst: "yes", human: "pending" });
    expect(boardKey.every((row) => row.secondDefensibleAnswerRisk.human === "pending")).toBe(true);

    const whole = JSON.parse(readFileSync(path.join(writerBakeoffEditorialOutputDir, "blind", "whole-set.json"), "utf8")) as { modelNameHidden: boolean; units: { complete: boolean; options: { A: string } | null }[] };
    const units = JSON.parse(readFileSync(path.join(writerBakeoffEditorialOutputDir, "blind", "option-units.json"), "utf8")) as { modelNameHidden: boolean; units: unknown[] };
    const key = JSON.parse(readFileSync(path.join(writerBakeoffEditorialOutputDir, "blind", "key.json"), "utf8")) as { wholeSet: { model: string }[] };
    expect(whole.modelNameHidden).toBe(true);
    expect(units.modelNameHidden).toBe(true);
    expect(whole.units).toHaveLength(24);
    expect(whole.units.filter((row) => row.complete)).toHaveLength(22);
    expect(units.units).toHaveLength(88);
    expect(JSON.stringify(whole.units)).not.toMatch(/claude-haiku|claude-sonnet|deepseek|openrouter:|gemini-4/i);
    expect(JSON.stringify(units.units)).not.toMatch(/claude-haiku|claude-sonnet|deepseek|openrouter:|gemini-4/i);
    expect(key.wholeSet.some((row) => row.model.includes("deepseek"))).toBe(true);
    expect(whole.units.filter((row) => row.complete).every((row) => row.options && row.options.A.length > 0)).toBe(true);

    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(readFileSync(path.join(writerBakeoffSmokeOutputDir, "summary.json"), "utf8")).toBe(smokeBefore);
    expect(readFileSync(path.join(writerBakeoffCompareOutputDir, "summary.json"), "utf8")).toBe(compareBefore);
    expect(readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8")).toBe(qualityBefore);
    expect((await runWriterBakeoff(writerBakeoffAuthorization)).started).toBe(false);
    expect(() => publishToStudentBank()).toThrow(/does not write the student bank/);
  });
});
