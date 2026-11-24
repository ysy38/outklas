import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import {
  rootCauseFixAcceptanceLiveAuthorized,
  rootCauseFixAcceptanceOutputDir,
  rootCauseFixAcceptanceProviderCalls,
  writeRootCauseFixAcceptance,
} from "@/modules/factory/item-model/root-cause-fix-acceptance";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffEditorialOutputDir } from "@/modules/factory/item-model/writer-bakeoff-editorial";
import { writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffSmokeOutputDir, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { writerBakeoffEditorialFingerprint } from "@/modules/factory/item-model/root-cause-audit";

describe("cognitive trap root cause fix acceptance v1", () => {
  it("writes an offline acceptance pack on eight frozen sources without live API", () => {
    expect(rootCauseFixAcceptanceLiveAuthorized).toBe(false);
    expect(rootCauseFixAcceptanceProviderCalls).toBe(0);
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(rootCauseFixAcceptanceOutputDir);

    const v1Before = writerBakeoffV1Fingerprint();
    const smokeBefore = fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]);
    const compareBefore = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const editorialBefore = writerBakeoffEditorialFingerprint();
    const qualityBefore = qualityFirstPilotFingerprint();
    const freezeBefore = readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8");
    const qualitySummaryBefore = readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8");

    const report = writeRootCauseFixAcceptance();
    expect(report.version).toBe("cognitive-trap-root-cause-fix-acceptance-v1");
    expect(report.comparisonTable).toHaveLength(8);
    expect(report.comparisonTable.filter((row) => row.role === "scoring")).toHaveLength(6);
    expect(report.comparisonTable.filter((row) => row.role === "negative_control")).toHaveLength(2);
    expect(report.meaningProven).toBe(false);
    expect(report.qualityProven).toBe(false);
    expect(report.readyForSmallLiveQualityTest).toBe("not_ready_flag_off");
    expect(report.recordsImmutable.writerBakeoffV1Unchanged).toBe(true);
    expect(report.recordsImmutable.qualityFirstUnchanged).toBe(true);
    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"])).toBe(smokeBefore);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compareBefore);
    expect(writerBakeoffEditorialFingerprint()).toBe(editorialBefore);
    expect(qualityFirstPilotFingerprint()).toBe(qualityBefore);
    expect(readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8")).toBe(freezeBefore);
    expect(readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8")).toBe(qualitySummaryBefore);

    const plates = report.comparison.find((row) => row.sourceId === "quality-first-restatement-counterfactual")!;
    expect(plates.spanAuditPass).toBe(true);
    expect(plates.v1Plans.status).toBe("source_insufficient_traps");
    expect(plates.v1Plans.selected.map((plan) => plan.mechanismId)).not.toContain("AGENT_ROLE");
    expect(plates.v1Plans.selected.map((plan) => plan.mechanismId)).toContain("CONDITION_DIRECTION");
    expect(plates.duplicateIndependenceKeyInSelected).toBeNull();

    const board = report.comparison.find((row) => row.sourceId === "taxonomy-translation-tr_en")!;
    expect(board.v1Plans.selected.map((plan) => plan.mechanismId)).toContain("CONDITION_DIRECTION");
    expect(board.v6Eligible).toBe(true);

    for (const row of report.comparison) {
      expect(row.duplicateIndependenceKeyInSelected).toBeNull();
      if (row.v1Plans.status !== "ok") continue;
      for (const task of row.writerTasks) {
        expect(task.preserve.length).toBeGreaterThanOrEqual(2);
        expect(new Set(task.preserve).size).toBe(task.preserve.length);
      }
    }

    const insufficient = report.insufficientTraps.map((row) => row.sourceId);
    expect(insufficient).toContain("quality-first-restatement-counterfactual");
    expect(insufficient).toContain("quality-first-restatement-epistemic");
    expect(insufficient).toContain("quality-first-translation-tr_en");

    const prompts = JSON.parse(readFileSync(path.join(rootCauseFixAcceptanceOutputDir, "writer-prompt-examples.json"), "utf8")) as {
      sourceId: string;
      prompt: string;
    }[];
    expect(prompts).toHaveLength(8);
    expect(prompts.find((row) => row.sourceId === "taxonomy-restatement-medium")!.prompt).toMatch(/SEMANTIC FRAME/);
    expect(prompts.find((row) => row.sourceId === "quality-first-restatement-counterfactual")!.prompt).not.toMatch(
      /modality_epistemic: would still have been printable/,
    );
  });
});