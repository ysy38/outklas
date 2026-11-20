import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { OptionLabel } from "@/modules/analysis/contract";
import { benchmarkAuthorization, benchmarkCeilings, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import type { SourceRecord } from "@/modules/factory/item-model/contract";
import { precheckAuthorization, precheckMaxCalls, smokeAuthorization, smokeCeilings, smokeGraphCalls, smokeLimits } from "@/modules/factory/item-model/precheck";
import { modelDefaults } from "./ai/config";
import type { AIProvider, ModelResponse } from "./ai/types";
import { executeCoreSmoke, itemFactoryCoreSmoke, itemFactoryPrecheck } from "./stages/item-precheck";

const answer = "The harbor vote was postponed.";
const turkishAnswer = "Liman oylaması ertelendi.";
const prices = { source: "test", table: { "writer-test": { in: 1, out: 1 }, "fixture:writer-test": { in: 1, out: 1 } } };
const models = { generator: "writer-test", judge: "judge-test" };
const officialTexts = ["zzz-official-comparison-corpus-marker"];
const sources: SourceRecord[] = [{ sourceId: "src-harbor", locator: { kind: "doi", value: "10.1000/harbor" }, topic: "harbors", factNotes: "A council delayed one harbor vote after a report.", usageRights: "granted", role: "production_notes" }];
const passage = `The council delayed the vote after the report. Harbor records remained limited to that plan. ${Array.from({ length: 150 }, (_, index) => `Note${index}`).join(" ")}.`;

function harborPlan() {
  return [1, 2, 3, 4].map((number) => ({
    propositionId: `p${number}`,
    evidenceSpanId: `span-${number}`,
    testedProposition: [`The council delayed one harbor vote.`, `Records stayed limited to the plan.`, `The report arrived before the decision.`, `The limit covered that harbor plan.`][number - 1] ?? `Harbor claim ${number}.`,
    cognitiveOperation: number === 2 ? "infer" : "locate",
    questionFunction: number === 2 ? "inference" : "detail",
  }));
}

function sourceBody(user: string) {
  if (user.includes("translation.meaning_preservation")) {
    const english = user.includes("DIRECTION: en_tr");
    return english
      ? { sourceSentence: "The council delayed the vote on the harbor plan.", sourceLanguage: "en", targetLanguage: "tr", roles: ["agent:council"], scope: "harbor plan" }
      : { sourceSentence: "Kurul, liman planının oylamasını erteledi.", sourceLanguage: "tr", targetLanguage: "en", roles: ["agent:council"], scope: "harbor plan" };
  }
  if (user.includes("reading.evidence_based")) return { sourceId: "src-harbor", passage, questionPlan: harborPlan() };
  return { proposition: "The council delayed the vote on the harbor plan.", scope: "the harbor plan only", modality: "stated fact", polarity: "affirmative", tense: "past", argumentStructure: "council delayed vote" };
}

function coreBody(user: string) {
  const reading = user.includes("reading.evidence_based");
  const translation = user.includes("translation.meaning_preservation");
  const slot = Number(user.match(/QUESTION SLOT: (\d)/)?.[1] ?? "1");
  const planned = harborPlan()[slot - 1] ?? harborPlan()[0]!;
  return {
    stem: reading ? `What does claim ${slot} say about the harbor?` : translation ? "Kurul, liman planının oylamasını erteledi." : "The council delayed the vote on the harbor plan.",
    correctAnswer: user.includes('"targetLanguage":"tr"') ? turkishAnswer : answer,
    constructEvidence: "The postponed vote keeps the same claim.",
    correctnessRationale: "The frame stays intact.",
    sourceReferences: reading ? [planned.evidenceSpanId] : translation ? ["source_sentence"] : ["proposition"],
    meaningDelta: "preserved",
    ...(reading
      ? { questionFunction: planned.questionFunction, evidenceSpan: { id: planned.evidenceSpanId, quote: "The council delayed the vote after the report." }, propositionId: planned.propositionId, testedProposition: planned.testedProposition, cognitiveOperation: planned.cognitiveOperation }
      : {}),
  };
}

function provider(bodies: (system: string, user: string) => unknown, calls: string[]): AIProvider {
  return {
    name: "fixture",
    async generate(request) {
      const user = request.parts.map((part) => ("text" in part ? part.text : "")).join("\n");
      calls.push(request.system ?? "");
      const response: ModelResponse = { text: JSON.stringify(bodies(request.system ?? "", user)), model: request.model, usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, reasoningTokens: 7 } };
      return response;
    },
  };
}

describe("core smoke", () => {
  it("stops after the key, stays inside ten calls, and does not accept the eleventh", async () => {
    const calls: string[] = [];
    const run = await executeCoreSmoke({
      authorization: smokeAuthorization,
      providerFor: () => provider((system, user) => (system.startsWith("ITEM MODEL SOURCE") ? sourceBody(user) : coreBody(user)), calls),
      prices,
      models,
      officialTexts,
      sources,
      cacheSalt: `core-smoke-${Date.now()}-full`,
    });
    expect(smokeGraphCalls).toBe(11);
    expect(smokeCeilings.maxCalls).toBe(10);
    expect(smokeCeilings.totalUsdCap).toBe(0.5);
    expect(calls).toHaveLength(10);
    expect(calls.every((system) => system.startsWith("ITEM MODEL SOURCE") || system.startsWith("ITEM MODEL KEY"))).toBe(true);
    expect(run.providerCalls).toBe(10);
    expect(run.costUsd).toBe(0.0003);
    expect(run.tokens).toEqual({ input: 100, output: 200, reasoning: 70, visibleOutput: 130 });
    expect(run.qualityProven).toBe(false);
    expect(run.studentBankWrites).toBe(0);
    const reading = run.records.filter((record) => record.passageId === "reading-1");
    expect(reading.slice(0, 3).every((record) => record.source.status === "pass" && record.key.status === "pass" && record.pool.status === "not_run" && record.blind.status === "not_run" && record.decision.status === "not_run" && record.typeSemantic.status === "not_run" && record.sourceFidelity === "not_run")).toBe(true);
    expect(new Set(reading.slice(0, 3).map((record) => record.propositionId))).toEqual(new Set(["p1", "p2", "p3"]));
    expect(reading[3]).toMatchObject({ key: { status: "not_run" }, stop: "budget", typeSemantic: { status: "not_run" }, sourceFidelity: "not_run" });
    expect(reading.every((record) => record.setDiversity.surfaceOverlapIsNotDiversityProof === true && record.setDiversity.failures.includes("proposition_missing"))).toBe(true);
    expect(run.records.filter((record) => record.direction === "en_tr" || record.direction === "tr_en").every((record) => record.key.status === "pass" && record.key.failures.length === 0)).toBe(true);
  });

  it("does not call the key after an empty source, and can then finish four reading keys inside the cap", async () => {
    const calls: string[] = [];
    const run = await executeCoreSmoke({
      authorization: smokeAuthorization,
      providerFor: () =>
        provider((system, user) => {
          if (system.startsWith("ITEM MODEL SOURCE") && user.includes("restatement.meaning_equivalence")) return { proposition: "", scope: "", modality: "", polarity: "affirmative", tense: "", argumentStructure: "" };
          return system.startsWith("ITEM MODEL SOURCE") ? sourceBody(user) : coreBody(user);
        }, calls),
      prices,
      models,
      officialTexts,
      sources,
      cacheSalt: `core-smoke-${Date.now()}-empty`,
    });
    const restatement = run.records.find((record) => record.id === "restatement-1");
    expect(restatement?.source.status).toBe("fail");
    expect(restatement?.key.status).toBe("not_run");
    expect(restatement?.source.failures.join(" ")).toMatch(/proposition/);
    const reading = run.records.filter((record) => record.passageId === "reading-1");
    expect(reading.every((record) => record.key.status === "pass")).toBe(true);
    expect(reading[0]?.setDiversity.status).toBe("unverified");
    expect(reading[0]?.setDiversity.propositionIdentityIsNotCognitiveProof).toBe(true);
    expect(new Set(reading.map((record) => record.propositionId))).toEqual(new Set(["p1", "p2", "p3", "p4"]));
    expect(calls).toHaveLength(10);
    expect(run.records.every((record) => record.pool.status === "not_run" && record.blind.status === "not_run" && record.qualityProven === false)).toBe(true);
  });

  it("refuses the other factory commands and leaves the saved precheck records alone", async () => {
    expect(smokeLimits({ maxCalls: 1000, maxCostUsd: 50, maxRegenerations: 4 })).toEqual({ maxCalls: 10, maxRegenerations: 0, maxCostUsd: 0.5 });
    expect(precheckMaxCalls).toBe(41);
    expect(benchmarkCeilings).toMatchObject({ total: 90, maxCalls: 360, totalUsdCap: 18 });
    const plan = freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge });
    expect(runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan }).started).toBe(false);
    const denied = await executeCoreSmoke({ authorization: precheckAuthorization, providerFor: () => provider(() => ({}), []), prices, models, officialTexts, sources });
    expect(denied).toMatchObject({ started: false, lock: "authorization", providerCalls: 0 });
    expect((await itemFactoryPrecheck(smokeAuthorization)).lock).toBe("authorization");
    expect((await itemFactoryCoreSmoke(precheckAuthorization, ".data/analysis/_factory/item-precheck/openrouter-v1")).lock).toBe("authorization");
    expect((await itemFactoryCoreSmoke(smokeAuthorization, ".data/analysis/_factory/item-precheck/openrouter-v1", "openrouter")).reason).toMatch(/overwrite/);
    expect((await itemFactoryCoreSmoke(smokeAuthorization, ".data/analysis/_factory/item-core-smoke/openrouter-v1", "anthropic")).lock).toBe("authorization");
    const summary = JSON.parse(readFileSync(".data/analysis/_factory/item-precheck/openrouter-v1/summary.json", "utf8")) as { providerCalls: number; studentBankWrites: number };
    expect(summary).toMatchObject({ providerCalls: 34, studentBankWrites: 0 });
  });
});
