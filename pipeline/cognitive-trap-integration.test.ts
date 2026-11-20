import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleItem } from "@/modules/factory/item-model/assemble";
import { benchmarkCeilings, runItemBenchmark, benchmarkAuthorization, freezeBenchmarkPlan } from "@/modules/factory/item-model/benchmark";
import { pilotDisjointFromFirstSample } from "@/modules/factory/item-model/cognitive-trap-pilot";
import { sourceSentence, trapItems } from "@/modules/factory/item-model/cognitive-trap";
import { cognitiveTrapStrategyAuthorization, resolveDistractorStrategy, selectCognitiveDistractors } from "@/modules/factory/item-model/distractor-strategy";
import { screenExamSurface } from "@/modules/factory/item-model/gold";
import { assertPrecheckStart, precheckCeilings } from "@/modules/factory/item-model/precheck";
import { precheckAuthorization } from "@/modules/factory/item-model/precheck";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { modelDefaults } from "./ai/config";
import { loadPrices } from "./ai/prices";
import { distractorSystem } from "./ai/prompts/item-model.v1";
import { misreadingSystem } from "./ai/prompts/cognitive-trap.v1";
import { itemFactoryCognitivePilot, trapCostEstimate } from "./stages/cognitive-trap";
import { loadOfficialComparisonCorpus } from "./stages/item-precheck";

const evidenceDir = ".data/analysis/_factory/cognitive-trap/openrouter-v1";
const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function cognitive(text: string, mechanism: string, risk: "none" | "second_answer" = "none", shift: "cause" | "none" = "cause") {
  return {
    candidateText: text,
    errorMechanism: mechanism,
    shiftTarget: shift,
    whyPlausible: "A reader can attach the clause to the wrong relation.",
    whyInferior: "The source keeps the original relation.",
    sourceEvidence: "proposition",
    semanticRisk: risk,
    studentMisreading: `The reader treats ${text.slice(0, 24)} as the claim.`,
    temptingEvidence: "Both parts of the sentence are visible.",
    actualSemanticDifference: "The relation between the parts changes.",
    whyIncorrect: "The source does not say that.",
  };
}

describe("cognitive trap integration", () => {
  it("locks the first comparison and shows the two medium candidates came from method B", () => {
    const summary = JSON.parse(readFileSync(`${evidenceDir}/summary.json`, "utf8")) as { providerCalls: number; costUsd: number; studentBankWrites: number };
    expect(summary.providerCalls).toBe(28);
    expect(summary.costUsd).toBe(0.128807);
    expect(summary.studentBankWrites).toBe(0);
    const passes = ["restatement-2", "translation-en_tr-2"] as const;
    for (const id of passes) {
      const record = JSON.parse(readFileSync(`${evidenceDir}/${id}.json`, "utf8")) as {
        key: string;
        arms: { A: { status: string; options: Record<string, string> | null }; B: { status: string; options: Record<string, string> | null; readings: { studentMisreading: string; explanationIsNotProof?: true }[] } };
      };
      expect(record.arms.B.status).toBe("five_options");
      expect(record.arms.B.readings.length).toBeGreaterThanOrEqual(4);
      expect(record.arms.B.readings.every((reading) => reading.studentMisreading.length > 0)).toBe(true);
      const bWrong = Object.values(record.arms.B.options ?? {});
      const aWrong = Object.values(record.arms.A.options ?? {});
      const bMean = bWrong.reduce((sum, text) => sum + words(text), 0) / bWrong.length;
      const aMean = aWrong.reduce((sum, text) => sum + words(text), 0) / aWrong.length;
      expect(bMean).toBeLessThanOrEqual(aMean);
      expect(record.key.length).toBeGreaterThan(20);
    }
  });

  it("keeps baseline as the default and leaves reading on that path", () => {
    expect(resolveDistractorStrategy({ questionType: "restatement" })).toEqual({ strategy: "baseline_v34", failure: null });
    expect(resolveDistractorStrategy({ requested: "cognitive_trap_first", questionType: "restatement" }).failure).toBe("strategy_unauthorized");
    expect(resolveDistractorStrategy({ requested: "cognitive_trap_first", authorization: cognitiveTrapStrategyAuthorization, questionType: "reading_comprehension" }).strategy).toBe("baseline_v34");
    expect(resolveDistractorStrategy({ requested: "cognitive_trap_first", authorization: cognitiveTrapStrategyAuthorization, questionType: "translation" }).strategy).toBe("cognitive_trap_first");
    expect(distractorSystem).toContain("Return exactly eight candidates");
    expect(misreadingSystem).not.toContain("Return exactly eight");
    expect(() => assertPrecheckStart({ authorization: precheckAuthorization, distractorStrategy: "cognitive_trap_first" })).toThrow(/baseline_v34/);
    expect(precheckCeilings.maxCalls).toBe(41);
    expect(precheckCeilings.totalUsdCap).toBe(2.05);
    expect(benchmarkCeilings.maxCalls).toBe(360);
    expect(benchmarkCeilings.totalUsdCap).toBe(18);
    const plan = freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge });
    expect(runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan }).started).toBe(false);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
  });

  it("rejects a second answer, an equivalent option, a surface edit, and a short pool", () => {
    const key = "The harbor would not have needed to request a delay if the inspectors had finished the coastal survey earlier.";
    const mechanisms = ["causal_direction", "modality_shift", "polarity_reversal", "tense_shift"];
    const full = [
      cognitive("The inspectors did finish the survey earlier, so the harbor did not request a delay.", "causal_direction"),
      cognitive("The harbor requested a delay because the inspectors finished the survey earlier.", "modality_shift"),
      cognitive("The inspectors will finish the survey earlier, so the harbor will not request a delay.", "polarity_reversal"),
      cognitive("Finishing earlier was only one of several conditions, so the harbor might still have requested a delay.", "tense_shift"),
    ];
    const selected = selectCognitiveDistractors({ candidates: full, keyText: key, allowedMechanisms: mechanisms });
    expect(selected.status).toBe("selected");
    expect(selected.explanationIsNotProof).toBe(true);
    expect(selectCognitiveDistractors({ candidates: [...full.slice(0, 3), cognitive(key, "causal_direction", "second_answer")], keyText: key, allowedMechanisms: mechanisms }).status).toBe("insufficient");
    expect(selectCognitiveDistractors({ candidates: [...full.slice(0, 3), cognitive("The harbor would not have needed a delay if the inspectors had finished the coastal survey earlier.", "causal_direction", "none", "none")], keyText: key, allowedMechanisms: mechanisms }).removed.map((entry) => entry.reason)).toContain("surface_edit");
    expect(selectCognitiveDistractors({ candidates: full.slice(0, 3), keyText: key, allowedMechanisms: mechanisms }).status).toBe("insufficient");
  });

  it("does not change the source or the key when the strategy changes", () => {
    const item = trapItems()[1]!;
    const sentence = sourceSentence(item);
    const distractors = [
      cognitive("The inspectors did finish the coastal survey earlier, so the harbor did not need a delay.", "causal_direction"),
      cognitive("The harbor requested a delay because the inspectors finished the coastal survey earlier.", "modality_shift"),
      cognitive("The inspectors will finish the coastal survey earlier, so the harbor will not need a delay.", "polarity_reversal"),
      cognitive("Finishing the coastal survey earlier was only one condition, so the harbor might still have requested a delay.", "tense_shift"),
    ];
    const shared = { id: item.id, modelId: "restatement.meaning_equivalence", source: item.source, core: item.core, distractors, correctOption: "A" as const, generatorModel: "writer-test", judgeModel: null, judge: null, officialTexts: [], selfScoreClaim: null };
    const baseline = assembleItem({ ...shared, distractorStrategy: "baseline_v34" });
    const trap = assembleItem({ ...shared, distractorStrategy: "cognitive_trap_first", strategyAuthorization: cognitiveTrapStrategyAuthorization });
    const blocked = assembleItem({ ...shared, distractorStrategy: "cognitive_trap_first" });
    expect(baseline.production.distractorStrategy).toBe("baseline_v34");
    expect(trap.production.distractorStrategy).toBe("cognitive_trap_first");
    expect(blocked.failure).toBe("strategy_unauthorized");
    expect(baseline.core?.correctAnswer).toBe(item.core.correctAnswer);
    expect(trap.core?.correctAnswer).toBe(item.core.correctAnswer);
    expect(sourceSentence({ ...item, source: baseline.source })).toBe(sentence);
    expect(sourceSentence({ ...item, source: trap.source })).toBe(sentence);
  });

  it("prepares a disjoint pilot under the calculated cap and does not start it", async () => {
    expect(pilotDisjointFromFirstSample()).toBe(true);
    const corpus = loadOfficialComparisonCorpus() ?? [];
    const { pilotItems } = await import("@/modules/factory/item-model/cognitive-trap-pilot");
    for (const item of pilotItems()) {
      const text = item.source.kind === "translation" ? item.source.sourceSentence : item.source.kind === "restatement" ? item.source.proposition : "";
      expect(screenExamSurface({ instructions: "", content: `${text}\n${item.core.correctAnswer}` }, corpus).status).toBe("clear");
    }
    const estimate = trapCostEstimate(prices!, 6);
    expect(estimate).not.toBeNull();
    expect(estimate!).toBeGreaterThan(0);
    expect(estimate!).toBeLessThan(1);
    const refused = await itemFactoryCognitivePilot("not-authorized");
    expect(refused.started).toBe(false);
    expect(refused.providerCalls).toBe(0);
    expect(refused.studentBankWrites).toBe(0);
  });
});
