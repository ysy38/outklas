import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import {
  recoveredCandidateAuditOutputDir,
  writeRecoveredCandidateAudit,
} from "@/modules/factory/item-model/recovered-candidate-audit";

describe("recovered candidate quality audit v1", () => {
  it("rebuilds the TR→EN five from frozen writer texts, reruns the gate, and does not invent a judge", () => {
    expect(qualityFirstPilotForbiddenDirs).toContain(recoveredCandidateAuditOutputDir);
    const livePath = path.join(qualityFirstPilotOutputDir, "summary.json");
    const before = readFileSync(livePath, "utf8");
    const report = writeRecoveredCandidateAudit();
    expect(readFileSync(livePath, "utf8")).toBe(before);
    expect(report.providerCalls).toBe(0);
    expect(report.recoveredSet.recoveredDistractorTexts).toEqual([
      "Some complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.",
      "Not every complaint has been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.",
      "No complaints have been forwarded to the prosecutor's office; only two official records were read aloud, and only at the hearing rather than elsewhere.",
      "No complaints have been forwarded to the prosecutor's office; only two official records were submitted at the hearing.",
    ]);
    expect(report.recoveredSet.keyLetter).toBe("A");
    expect(report.recoveredSet.options?.A).toBe(report.recoveredSet.key);
    expect(report.recoveredSet.options?.B).toBe(report.recoveredSet.recoveredDistractorTexts[0]);
    expect(report.recoveredSet.options?.C).toBe(report.recoveredSet.recoveredDistractorTexts[1]);
    expect(report.recoveredSet.options?.D).toBe(report.recoveredSet.recoveredDistractorTexts[2]);
    expect(report.recoveredSet.options?.E).toBe(report.recoveredSet.recoveredDistractorTexts[3]);
    expect(report.gates.selectorStatus).toBe("selected");
    expect(report.gates.wholeSet?.meaningProven).toBe(false);
    expect(report.gates.wholeSet?.approvesTarget).toBe(false);
    expect(report.gates.judge.status).toBe("not_run");
    expect(report.gates.judge.liveVerdict).toBeNull();
    expect(report.distractors).toHaveLength(4);
    expect(report.distractors.every((row) => row.writerDifferenceIsNotProof)).toBe(true);
    expect(report.metrics.recoveredReplay.liveQualitySuccess).toBe(false);
    expect(report.metrics.recoveredReplay.judgeApproved).toBe(0);
    expect(report.metrics.recoveredReplay.editoriallyAccepted).toBe(0);
    expect(report.metrics.recoveredReplay.structuralCompletion).toBe(1);
    expect(report.proposedWriterContract.promptUnchanged).toBe(true);
    expect(report.proposedWriterContract.appliedThisRound).toBe(false);
    expect(report.onlyCompleteConcentration.shortOptions.some((row) => row.misreadingMechanism === "COUNTERFACTUAL_FACTUAL")).toBe(true);
    expect(report.onlyCompleteConcentration.shortOptions.some((row) => row.misreadingMechanism === "PURPOSE_RESULT" || row.misreadingMechanism === "AGENT_ROLE")).toBe(true);
    const written = JSON.parse(readFileSync(path.join(recoveredCandidateAuditOutputDir, "five.json"), "utf8")) as { options: Record<string, string> };
    expect(Object.keys(written.options)).toEqual(["A", "B", "C", "D", "E"]);
    expect(JSON.parse(before).metrics.firstPassYield).toBe(0.75);
  });
});
