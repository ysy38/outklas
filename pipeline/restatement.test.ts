import { describe, expect, it } from "vitest";
import { fidelityDecision, type FidelityReport } from "./ai/prompts/restatement.v1";

const row = (option: "A" | "B" | "C" | "D" | "E", preserves: boolean, brk: FidelityReport["options"][number]["break"]): FidelityReport["options"][number] => ({
  option,
  preservesMeaning: preserves,
  break: brk,
  reason: "r",
});

describe("restatement fidelity decision", () => {
  it("keeps an item whose only faithful option is the key", () => {
    const report: FidelityReport = {
      options: [row("A", true, "none"), row("B", false, "quantifier"), row("C", false, "scope"), row("D", false, "causal"), row("E", false, "temporal")],
    };
    expect(fidelityDecision(report, "A").decision).toBe("KEEP");
  });

  it("revises when a second option also preserves the source", () => {
    const report: FidelityReport = {
      options: [row("A", true, "none"), row("B", true, "none"), row("C", false, "scope"), row("D", false, "causal"), row("E", false, "temporal")],
    };
    const decision = fidelityDecision(report, "A");
    expect(decision.decision).toBe("REVISE");
    expect(decision.problems).toContain("not_single_answer");
    expect(decision.problems).toContain("second_answer_B");
  });

  it("revises when the claimed key does not preserve the source", () => {
    const report: FidelityReport = {
      options: [row("A", false, "quantifier"), row("B", false, "scope"), row("C", false, "causal"), row("D", false, "temporal"), row("E", false, "modality")],
    };
    expect(fidelityDecision(report, "A").problems).toContain("key_not_faithful");
  });
});
