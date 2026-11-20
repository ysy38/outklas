import path from "node:path";
import { describe, expect, it } from "vitest";
import { assessMediumRepro, mediumReproItems } from "@/modules/factory/item-model/medium-repro";
import { loadPrices } from "./ai/prices";
import { qualityCallGraph, qualityCostEstimate } from "./stages/cognitive-trap";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

describe("medium quality reproducibility sources", () => {
  it("prepares four unused medium items and does not start a run", () => {
    const plan = assessMediumRepro();
    expect(plan.ready, plan.failures.join(", ")).toBe(true);
    expect(plan.providerCalls).toBe(0);
    expect(plan.studentBankWrites).toBe(0);
    expect(plan.goldApproved).toBe(false);
    expect(mediumReproItems().map((entry) => entry.item.designTarget)).toEqual(["medium", "medium", "medium", "medium"]);
    for (const gate of plan.gates) {
      expect(gate.proceed).toBe(true);
      expect(gate.meaning).toBe("unverified");
      expect(gate.observedDifficulty).toBeNull();
      expect(gate.meaningProven).toBe(false);
    }
  });

  it("prices the existing Cognitive Trap First ceiling and does not call a provider", () => {
    expect(prices).not.toBeNull();
    const calls = qualityCallGraph(4);
    expect(calls).toEqual({ writerCalls: 8, judgeCalls: 4, maxCalls: 12 });
    const ceiling = qualityCostEstimate(prices!, 4);
    expect(ceiling).not.toBeNull();
    expect(ceiling!).toBeGreaterThan(0);
  });
});
