import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import {
  assertBakeoffCall,
  BakeoffBudgetExceeded,
  bakeoffHardBlocks,
  existentialQuantityVariant,
  packBlindOptions,
  parseBakeoffWriterOutput,
  refuseWriterBakeoffLive,
  selectIndependentPlans,
  smokeReusable,
  trapFamily,
  writerBakeoffAuthorization,
  writerBakeoffLiveAuthorized,
  writerBakeoffOutputDir,
  writerBakeoffSmokeSourceId,
  writerBakeoffTargetCapUsd,
  writeWriterBakeoffReadiness,
} from "@/modules/factory/item-model/writer-bakeoff";
import {
  architectureV2WriterBakeoffCandidates,
  architectureV2WriterBakeoffStage2,
  modelDefaults,
} from "./ai/config";
import { loadPrices } from "./ai/prices";
import { misreadingOptionsOutput } from "./ai/prompts/cognitive-trap.v1";
import { writerBakeoffOutput } from "./ai/prompts/writer-bakeoff.v1";
import { openrouterPrecheckModels } from "./stages/item-precheck";
import { runWriterBakeoff } from "./stages/writer-bakeoff";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const gateway = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.gateway.json") });

function reading(mechanism: string, studentMisreading: string) {
  return { misreadingMechanism: mechanism, studentMisreading, actualSemanticDifference: "diff", whyIncorrect: "wrong" };
}

describe("writer bake-off execution readiness v1", () => {
  it("freezes independent plans, rejects padding and unsupported ids, and stays off live", async () => {
    expect(openrouter).not.toBeNull();
    expect(gateway).not.toBeNull();
    expect(writerBakeoffLiveAuthorized).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(modelDefaults.generator).toBe("anthropic:claude-haiku-5-5");
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(openrouterPrecheckModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffOutputDir);

    expect(trapFamily("PURPOSE_RESULT")).toBe(trapFamily("PURPOSE_TIME"));
    expect(trapFamily("QUANTITY_SCOPE")).toBe(trapFamily("quantity_shift"));
    expect(existentialQuantityVariant("Some complaints were forwarded to the prosecutor.")).toBe(true);
    expect(existentialQuantityVariant("Not every complaint was forwarded to the prosecutor.")).toBe(true);

    const padded = selectIndependentPlans([
      reading("QUANTITY_SCOPE", "Some complaints were forwarded."),
      reading("NEGATION_SCOPE", "Not every complaint was forwarded."),
      reading("FOCUS_SCOPE", "They were read only at the hearing."),
    ]);
    expect(padded.status).toBe("source_insufficient_traps");
    expect(padded.independentRelationCount).toBe(2);
    expect(padded.paddedToFour).toBe(false);
    expect(padded.droppedVariants).toHaveLength(1);

    const four = selectIndependentPlans([
      reading("COUNTERFACTUAL_FACTUAL", "The sealing happened."),
      reading("TEMPORAL_ORDER", "Humidity rose first."),
      reading("AGENT_ROLE", "The plates sealed the conservators."),
      reading("TEMPORAL_SCOPE", "Sealing was during the later fall in humidity."),
    ]);
    expect(four.status).toBe("ok");
    expect(four.plans).toHaveLength(4);

    const production = misreadingOptionsOutput(["quantity_scope", "scope_widening", "modality_shift", "polarity_reversal"]);
    const candidate = { candidateText: "x", errorMechanism: "quantity_scope" as const, shiftTarget: "quantity" as const, semanticRisk: "none" as const, studentMisreading: "y" };
    expect(production.safeParse({ candidates: Array(3).fill(candidate) }).success).toBe(false);
    expect(production.safeParse({ candidates: Array(4).fill(candidate) }).success).toBe(true);
    expect(writerBakeoffOutput(2).safeParse({ candidates: [{ candidateText: "a", planId: "p1", studentMisreading: "m", semanticRisk: "none" }] }).success).toBe(false);
    expect(writerBakeoffOutput(2).safeParse({
      candidates: [
        { candidateText: "a", planId: "p1", studentMisreading: "m", semanticRisk: "none" },
        { candidateText: "b", planId: "p2", studentMisreading: "n", semanticRisk: "none" },
      ],
    }).success).toBe(true);

    expect(parseBakeoffWriterOutput("not-json", 4).status).toBe("parse_failure");
    expect(parseBakeoffWriterOutput({ candidates: [{ candidateText: "a", planId: "p1", studentMisreading: "m", semanticRisk: "none" }] }, 2).reason).toBe("count_mismatch");

    expect(bakeoffHardBlocks({
      source: "No complaints have been forwarded.",
      key: "No complaints have been forwarded.",
      option: "No complaints have been forwarded.",
      targetLanguage: "en",
    })).toContain("key_equivalence");

    expect(() => assertBakeoffCall(0.49, 0.02, writerBakeoffTargetCapUsd)).toThrow(BakeoffBudgetExceeded);
    expect(assertBakeoffCall(0.2, 0.05, writerBakeoffTargetCapUsd)).toBeUndefined();

    const livePath = path.join(qualityFirstPilotOutputDir, "summary.json");
    const before = readFileSync(livePath, "utf8");
    const report = writeWriterBakeoffReadiness({
      openrouterPrices: openrouter!.table,
      gatewayPrices: gateway!.table,
      requestedWriters: architectureV2WriterBakeoffCandidates,
    });
    expect(readFileSync(livePath, "utf8")).toBe(before);
    expect(report.liveAuthorized).toBe(false);
    expect(report.readyForLiveBakeOff).toBe(false);
    expect(report.providerCalls).toBe(0);
    expect(report.studentBankWrites).toBe(0);
    expect(report.equalEightItemComparison).toBe(false);
    expect(report.negativeControlIds).toContain("quality-first-translation-tr_en");
    expect(report.scoringIds).not.toContain("quality-first-translation-tr_en");
    expect(report.scoringIds).toHaveLength(report.tasks.filter((task) => task.role === "scoring").length);
    expect(report.scoringIds.length).toBeLessThan(8);
    expect(report.tasks.every((task) => task.paddedToFour === false)).toBe(true);
    expect(report.tasks.filter((task) => task.role === "scoring").every((task) => task.plans.length === 4)).toBe(true);
    expect(new Set(report.tasks.filter((task) => task.role === "scoring").map((task) => task.planHash)).size).toBe(report.scoringIds.length);
    expect(architectureV2WriterBakeoffCandidates).toEqual([
      "openrouter:anthropic/claude-haiku-5.5",
      "openrouter:deepseek/deepseek-v3.2",
      "openrouter:google/gemini-4-hydrogen",
      "openrouter:google/gemini-4-argon",
    ]);
    expect(architectureV2WriterBakeoffStage2).toContain("openrouter:google/gemini-4-neon");
    expect(architectureV2WriterBakeoffCandidates).not.toContain("openrouter:google/gemini-4-neon");
    expect(report.adapter.eligibleWriters).toEqual([...architectureV2WriterBakeoffCandidates]);
    expect(report.adapter.rejectedWriters).toEqual([]);
    expect(report.adapter.noSubstitution).toBe(true);
    expect(report.adapter.jsonSchemaHonored).toBe("unverified");
    expect(openrouter!.table["openrouter:google/gemini-4-hydrogen"]?.in).toBe(1.5);
    expect(openrouter!.table["openrouter:google/gemini-4-hydrogen"]?.out).toBe(7.5);
    expect(openrouter!.table["openrouter:google/gemini-4-hydrogen"]?.note).toMatch(/not neon/);
    expect(openrouter!.table["openrouter:google/gemini-4-neon"]?.in).toBe(3);
    expect(openrouter!.table["openrouter:google/gemini-4-neon"]?.out).toBe(15);
    expect(openrouter!.table["openrouter:deepseek/deepseek-v3.2"]?.in).toBe(0.26);
    expect(openrouter!.table["openrouter:deepseek/deepseek-v3.2"]?.out).toBe(0.38);
    expect(openrouter!.table["openrouter:deepseek/deepseek-v3.2"]?.note).toMatch(/not v3\.2-exp/);
    expect(report.scoringIds).toContain(writerBakeoffSmokeSourceId);
    expect(report.callGraph.plannerCalls).toBe(0);
    expect(report.callGraph.judgeCalls).toBe(0);
    expect(report.callGraph.smokeCalls).toBe(4);
    expect(report.callGraph.comparisonCalls).toBe(report.scoringIds.length * 4);
    expect(report.callGraph.reusableTotalCalls).toBe(report.scoringIds.length * 4);
    expect(report.callGraph.discardedSmokeTotalCalls).toBe(4 + report.scoringIds.length * 4);
    expect(report.callGraph.maxCalls).toBe(28);
    expect(report.callGraph.reuseSmokeIfContractHolds).toBe(true);
    expect(report.budget.fitsTargetCap).toBe(false);
    expect(report.budget.bakeoffCeilingUsd!).toBeGreaterThan(writerBakeoffTargetCapUsd);
    expect(report.budget.bakeoffCeilingUsd!).toBeGreaterThan(0.52);
    expect(report.budget.bakeoffCeilingUsd!).toBeLessThan(0.53);
    expect(report.budget.smokeCeilingUsd!).toBeGreaterThan(0.08);
    expect(report.budget.smokeCeilingUsd!).toBeLessThan(0.09);
    expect(report.budget.worstCaseCeilingUsd!).toBeGreaterThan(0.61);
    expect(report.budget.worstCaseCeilingUsd!).toBeLessThan(0.62);
    expect(report.budget.recommendedCapUsd).toBe(0.62);
    expect(report.budget.fourRequestedModelCeilingUsd).toBe(report.budget.bakeoffCeilingUsd);
    expect(report.tasks.map((task) => ({ id: task.id, role: task.role, sourceHash: task.sourceHash, keyHash: task.keyHash, frameHash: task.frameHash, planHash: task.planHash }))).toEqual([
      { id: "quality-first-restatement-counterfactual", role: "scoring", sourceHash: "86ba6cfe14a3", keyHash: "1248b62dce8a", frameHash: "5fa1357a86ae", planHash: "ef5b0cfa97b5" },
      { id: "taxonomy-restatement-hard", role: "scoring", sourceHash: "eade7eab4e27", keyHash: "2f66835fde6e", frameHash: "c756cf4df982", planHash: "fb58de8669ad" },
      { id: "quality-first-restatement-epistemic", role: "negative_control", sourceHash: "b7703fb7a9dd", keyHash: "1bfdd229cb7e", frameHash: "0537dbe6d86b", planHash: "b3b0e687c2de" },
      { id: "taxonomy-restatement-medium", role: "scoring", sourceHash: "b199616d95f2", keyHash: "60592b76937f", frameHash: "ed3cbfa0045c", planHash: "d4bd9c1700bf" },
      { id: "quality-first-translation-en_tr", role: "scoring", sourceHash: "7d00f9a077ab", keyHash: "7c87898fed05", frameHash: "66d808f5a28f", planHash: "4ade0ecd7b6f" },
      { id: "taxonomy-translation-en_tr", role: "scoring", sourceHash: "93d4cf131b16", keyHash: "b0bf1f8e7153", frameHash: "ca280289ffdb", planHash: "056cf48a85c9" },
      { id: "quality-first-translation-tr_en", role: "negative_control", sourceHash: "647496316357", keyHash: "d339e3b7b003", frameHash: "18ca8bceaedc", planHash: "91e69146153a" },
      { id: "taxonomy-translation-tr_en", role: "scoring", sourceHash: "21faf08d7af7", keyHash: "ad0b8aafcf00", frameHash: "b5cd0e162027", planHash: "0e6bdf684d9c" },
    ]);
    const okSmoke = {
      candidates: [
        { candidateText: "The office showed some households had been visited.", planId: "p1", studentMisreading: "every is read as some", semanticRisk: "none" },
        { candidateText: "The office showed no household had been visited.", planId: "p2", studentMisreading: "polarity is reversed", semanticRisk: "none" },
        { candidateText: "Households visited the office after the census closed.", planId: "p3", studentMisreading: "agent and time swap", semanticRisk: "none" },
        { candidateText: "The office will show every household was visited.", planId: "p4", studentMisreading: "tense is moved forward", semanticRisk: "none" },
      ],
    };
    expect(smokeReusable({
      raw: okSmoke,
      planCount: 4,
      source: "The office showed every household had been visited.",
      key: "The office confirmed that every household had been visited.",
      targetLanguage: null,
    }).reusable).toBe(true);
    expect(smokeReusable({ raw: "not-json", planCount: 4, source: "s", key: "k", targetLanguage: null }).reusable).toBe(false);
    copyFileSync(path.resolve("pipeline/ai/openrouter.bakeoff-writers.json"), path.join(writerBakeoffOutputDir, "openrouter-catalog.json"));
    expect(report.judgeModelUnchanged).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(report.blind.modelNameHidden).toBe(true);

    const packed = packBlindOptions({
      seed: 7,
      items: [{
        sourceId: "demo",
        source: "The office showed every household had been visited.",
        key: "The office did not infer a fall.",
        model: "openrouter:anthropic/claude-haiku-5.5",
        options: [{
          planId: "p1",
          change: "quantity",
          preserve: ["negation"],
          forbidden: ["new actor"],
          expectedStudentMisreading: "every is read as some",
          text: "The office showed some households had been visited.",
        }],
      }],
    });
    expect(JSON.stringify(packed.pack)).not.toMatch(/claude-haiku|deepseek|openrouter:|gemini-4/i);
    expect(packed.key[0]?.model).toBe("openrouter:anthropic/claude-haiku-5.5");

    expect(refuseWriterBakeoffLive("nope").providerCalls).toBe(0);
    const live = await runWriterBakeoff(writerBakeoffAuthorization);
    expect(live.started).toBe(false);
    expect(live.executed).toBe(false);
    expect(live.providerCalls).toBe(0);
    expect(live.recoveryCalls).toBe(0);
    expect(JSON.parse(before).metrics.firstPassYield).toBe(0.75);
  });
});
