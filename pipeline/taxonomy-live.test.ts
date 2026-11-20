import path from "node:path";
import { describe, expect, it } from "vitest";
import { benchmarkAuthorization, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import { sourceSentence } from "@/modules/factory/item-model/cognitive-trap";
import { screenExamSurface } from "@/modules/factory/item-model/gold";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { selectMisreadingMechanisms } from "@/modules/factory/item-model/misreading-mechanisms";
import {
  assessTaxonomyLive,
  priorTaxonomySources,
  taxonomyKeyGate,
  taxonomyLiveAuthorization,
  taxonomyLiveForbiddenDirs,
  taxonomyLiveItems,
  taxonomyLiveOutputDir,
} from "@/modules/factory/item-model/taxonomy-live";
import { loadPrices } from "./ai/prices";
import { qualityCallGraph, qualityCostEstimate, itemFactoryTaxonomyLive } from "./stages/cognitive-trap";
import { loadOfficialComparisonCorpus } from "./stages/item-precheck";
import { itemFactoryBenchmark } from "./stages/item-factory";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

describe("semantic taxonomy live profile", () => {
  it("fixes four new academic keys before any distractor call", () => {
    const plan = assessTaxonomyLive();
    expect(plan.ready).toBe(true);
    expect(plan.failures).toEqual([]);
    const entries = taxonomyLiveItems();
    expect(entries.map((entry) => entry.designTarget)).toEqual(["medium", "hard", "medium", "hard"]);
    expect(entries.map((entry) => entry.item.direction)).toEqual([null, null, "en_tr", "tr_en"]);
    const used = priorTaxonomySources();
    const corpus = loadOfficialComparisonCorpus() ?? [];
    expect(corpus.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const sentence = sourceSentence(entry.item);
      expect(used.has(sentence)).toBe(false);
      expect(entry.meaningMap.preserved.length).toBeGreaterThan(0);
      expect(entry.meaningMap.relations.length).toBeGreaterThan(1);
      const gate = taxonomyKeyGate(entry.item);
      expect(gate.proceed).toBe(true);
      expect(gate.meaningProven).toBe(false);
      expect(gate.approvesTarget).toBe(false);
      expect(selectMisreadingMechanisms(sentence, entry.item.questionType).status).toBe("selected");
      expect(screenExamSurface({ instructions: "", content: `${sentence}\n${entry.item.core.correctAnswer}` }, corpus).status).toBe("clear");
    }
    const copied = taxonomyLiveItems()[1]!;
    const blocked = taxonomyKeyGate({ ...copied.item, core: { ...copied.item.core, correctAnswer: sourceSentence(copied.item).replace("editors", "reviewers") } });
    expect(blocked.proceed).toBe(false);
    expect(blocked.failure).toBe("key_equivalence_uncertain");
  });

  it("computes the ceiling and refuses to start without the live token", async () => {
    expect(prices).not.toBeNull();
    const estimate = qualityCostEstimate(prices!, taxonomyLiveItems().length);
    const graph = qualityCallGraph(taxonomyLiveItems().length);
    expect(graph).toEqual({ writerCalls: 8, judgeCalls: 4, maxCalls: 12 });
    expect(estimate).not.toBeNull();
    expect(estimate!).toBeGreaterThan(0);
    expect(estimate!).toBeLessThan(1);
    const refused = await itemFactoryTaxonomyLive("not-authorized");
    expect(refused.started).toBe(false);
    expect(refused.executed).toBe(false);
    expect(refused.providerCalls).toBe(0);
    expect(refused.studentBankWrites).toBe(0);
    expect(refused.benchmarkStarted).toBe(false);
    expect(taxonomyLiveAuthorization).toBe("semantic-taxonomy-live-v1");
    expect(taxonomyLiveOutputDir).not.toBe(taxonomyLiveForbiddenDirs[2]);
    expect(taxonomyLiveForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/quality-v1");
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    expect(itemFactoryBenchmark("not-the-token").started).toBe(false);
    const locked = runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan: freezeBenchmarkPlan({ generator: "writer-test", judge: "judge-test" }) });
    expect(locked.started).toBe(false);
    expect(locked.reason).toMatch(/not started/);
  });
});
