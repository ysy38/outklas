import { describe, expect, it } from "vitest";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { judgeUser, sourceSystem, typeFocusLine } from "./ai/prompts/item-model.v1";
import { restatementModel, translationModel, readingModel } from "@/modules/factory/item-model/registry";
import { precheckAuthorization, precheckCeilings, precheckMaxCalls } from "@/modules/factory/item-model/precheck";
import type { SourceRecord } from "@/modules/factory/item-model/contract";
import type { AIProvider, ModelResponse } from "./ai/types";
import { priceFor, loadPrices } from "./ai/prices";
import { executePrecheck, itemFactoryPrecheck, openrouterPrecheckModels } from "./stages/item-precheck";

const answer = "The harbor vote was postponed.";
const turkishAnswer = "Liman oylaması ertelendi.";
const prices = {
  source: "test",
  table: {
    "writer-test": { in: 1, out: 1 },
    "judge-test": { in: 1, out: 1 },
    "fixture:writer-test": { in: 1, out: 1 },
    "fixture:judge-test": { in: 1, out: 1 },
  },
};

function response(text: string, model: string): ModelResponse {
  return { text, model, usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } };
}

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
  if (user.includes("reading.evidence_based")) {
    return { sourceId: "src-harbor", passage, questionPlan: harborPlan() };
  }
  return { proposition: "The council delayed the vote on the harbor plan.", scope: "the harbor plan only", modality: "stated fact", polarity: "affirmative", tense: "past", argumentStructure: "council delayed vote" };
}

function coreBody(user: string) {
  const reading = user.includes("reading.evidence_based");
  const translation = user.includes("translation.meaning_preservation");
  const slot = Number(user.match(/QUESTION SLOT: (\d)/)?.[1] ?? "1");
  const planned = harborPlan()[slot - 1] ?? harborPlan()[0]!;
  return {
    stem: reading ? "What was limited to the harbor plan?" : translation ? "Kurul, liman planının oylamasını erteledi." : "The council delayed the vote on the harbor plan.",
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

function poolBody(user: string) {
  const mechanisms = user.includes("reading.evidence_based")
    ? ["unsupported_detail", "opposite_claim", "out_of_passage", "partial_evidence", "wrong_operation"]
    : user.includes("translation.meaning_preservation")
      ? ["scope_shift", "modality_shift", "polarity_reversal", "role_reversal", "tense_shift"]
      : ["scope_widening", "modality_shift", "polarity_reversal", "tense_shift", "argument_swap"];
  const texts = ["The council delayed every vote.", "The council may delay the harbor vote.", "The council did not delay the harbor vote.", "The council will delay the harbor vote."];
  const candidates = mechanisms.slice(0, 4).map((errorMechanism, index) => ({
    candidateText: texts[index],
    errorMechanism,
    shiftTarget: shiftTarget(errorMechanism),
    whyPlausible: "It mentions the council.",
    whyInferior: "It changes the frame.",
    sourceEvidence: "source",
    semanticRisk: "none",
  }));
  candidates.push(
    { candidateText: "The harbor plan delayed the council.", errorMechanism: mechanisms[4], shiftTarget: shiftTarget(mechanisms[4] ?? "role"), whyPlausible: "The same words appear.", whyInferior: "The roles are reversed.", sourceEvidence: "source", semanticRisk: "second_answer" },
    { ...candidates[0], semanticRisk: "none" },
    { candidateText: "A ministry funded a different harbor.", errorMechanism: mechanisms[0], shiftTarget: "scope", whyPlausible: "It is about a harbor.", whyInferior: "It leaves the construct.", sourceEvidence: "source", semanticRisk: "off_construct" },
    { candidateText: "The council delay vote.", errorMechanism: mechanisms[1], shiftTarget: "modality", whyPlausible: "The words are familiar.", whyInferior: "The sentence is broken.", sourceEvidence: "source", semanticRisk: "ungrammatical" },
  );
  return { candidates };
}

function judgeBody(user: string) {
  const line = user.split("\n").find((entry) => entry.includes(answer) || entry.includes(turkishAnswer));
  const letter = (line?.slice(0, 1) ?? "A") as OptionLabel;
  return {
    blindAnswer: letter,
    blindConfidence: 0.9,
    blindEvidence: "One option keeps the claim.",
    blindUncertain: false,
    blindAlternative: null,
    acceptability: { sentences: optionLabels.map((option) => ({ option, acceptable: option === letter, relationCoherent: option === letter, confidence: 0.9, reason: "checked" })) },
    report: {
      scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 },
      alternativeDefensibleOptions: [],
      estimatedDifficulty: "hard",
      verdict: "APPROVE",
      reasons: ["The frame holds."],
    },
  };
}

function provider(bodies: (system: string, user: string) => unknown, calls: string[]): AIProvider {
  return {
    name: "fixture",
    async generate(request) {
      const user = request.parts.map((part) => ("text" in part ? part.text : "")).join("\n");
      calls.push(request.system ?? "");
      return response(JSON.stringify(bodies(request.system ?? "", user)), request.model);
    },
  };
}

const models = { generator: "writer-test", judge: "judge-test" };
const officialTexts = ["zzz-official-comparison-corpus-marker"];
const sources: SourceRecord[] = [{ sourceId: "src-harbor", locator: { kind: "doi", value: "10.1000/harbor" }, topic: "harbors", factNotes: "A council delayed one harbor vote after a report.", usageRights: "granted", role: "production_notes" }];
const passage = `The council delayed the vote after the report. Harbor records remained limited to that plan. ${Array.from({ length: 150 }, (_, index) => `Note${index}`).join(" ")}.`;

function shiftTarget(mechanism: string) {
  if (mechanism.includes("tense")) return "tense";
  if (mechanism.includes("modal")) return "modality";
  if (mechanism.includes("polar")) return "polarity";
  if (mechanism.includes("role") || mechanism.includes("argument")) return "role";
  if (mechanism.includes("cause") || mechanism.includes("causal")) return "cause";
  return "scope";
}

describe("item precheck execution", () => {
  it("walks all three models through one call per stage and does not repair a bad parse", async () => {
    const salt = `precheck-${Date.now()}-full`;
    const calls: string[] = [];
    const full = await executePrecheck({
      authorization: precheckAuthorization,
      providerFor: () => provider((system, user) => (system.startsWith("ITEM MODEL SOURCE") ? sourceBody(user) : system.startsWith("ITEM MODEL KEY") ? coreBody(user) : system.startsWith("ITEM MODEL DISTRACTOR") ? poolBody(user) : judgeBody(user)), calls),
      prices,
      models,
      officialTexts,
      sources,
      cacheSalt: salt,
    });
    expect(full.started).toBe(true);
    expect(full.executed).toBe(true);
    expect(full.providerCalls).toBe(precheckMaxCalls);
    expect(calls).toHaveLength(precheckMaxCalls);
    expect(full.records).toHaveLength(11);
    expect(new Set(full.records.map((record) => record.itemModelId))).toEqual(new Set([restatementModel.itemModelId, translationModel.itemModelId, readingModel.itemModelId]));
    expect(full.records.every((record) => record.decision.status === "pass" && record.qualityProven === false && record.typeSemantic.status === "not_run" && record.editorApproved === false && record.publishState === "unpublished" && record.similarityIsNotLicense === true)).toBe(true);
    const reading = full.records.filter((record) => record.passageId === "reading-1");
    expect(reading).toHaveLength(4);
    expect(reading.every((record) => record.readingSet === "partial" && record.setDiversity.status === "unverified" && record.setDiversity.propositionIdentityIsNotCognitiveProof === true && record.quoteMatch === "structural_only" && record.sourceFidelity === "not_run" && record.meaningIntegrity.status === "not_run")).toBe(true);
    expect(full.records.filter((record) => record.direction === "en_tr")).toHaveLength(2);
    expect(full.records.filter((record) => record.direction === "tr_en")).toHaveLength(2);
    expect(full.records.every((record) => record.pool.generated.length === 8 && record.pool.selected.length === 4 && record.pool.rejected.some((entry) => entry.reason === "second_answer"))).toBe(true);
    expect(full.records.filter((record) => !record.passageId).map((record) => record.calls.map((call) => call.stage))).toEqual(Array.from({ length: 7 }, () => ["source", "core", "distractors", "judge"]));
    expect(reading[0]?.calls.map((call) => call.stage)).toEqual(["source", "core", "distractors", "judge"]);
    expect(reading.slice(1).every((record) => record.calls.map((call) => call.stage).join() === "core,distractors,judge")).toBe(true);
    expect(full.records.every((record) => record.promptVersion === restatementModel.promptVersion || record.promptVersion === translationModel.promptVersion || record.promptVersion === readingModel.promptVersion)).toBe(true);
    expect(precheckCeilings.maxCalls).toBe(41);
    expect(precheckCeilings.totalUsdCap).toBe(2.05);
    expect(precheckCeilings.maxRegenerations).toBe(0);
    expect(full.studentBankWrites).toBe(0);
    expect(full.costUsd).not.toBeNull();

    const brokenCalls: string[] = [];
    const broken = await executePrecheck({
      authorization: precheckAuthorization,
      providerFor: () => provider(() => "not json", brokenCalls),
      prices,
      models,
      officialTexts,
      sources,
      cacheSalt: `${salt}-broken`,
    });
    expect(brokenCalls).toHaveLength(8);
    expect(brokenCalls.every((system) => system === sourceSystem)).toBe(true);
    expect(broken.records.every((record) => record.source.status === "fail" && record.key.status === "not_run" && record.blind.status === "not_run" && record.typeSemantic.status === "not_run")).toBe(true);
  });

  it("does not call a provider without authorization, prices, or an attached runner", async () => {
    let calls = 0;
    const refusing: AIProvider = { name: "fixture", generate: async () => { calls += 1; throw new Error("called"); } };
    const denied = await executePrecheck({ authorization: "no", providerFor: () => refusing, prices, models });
    expect(denied.started).toBe(false);
    expect(denied.lock).toBe("authorization");
    const unpriced = await executePrecheck({ authorization: precheckAuthorization, providerFor: () => refusing, prices: null, models, officialTexts, sources });
    const noCorpus = await executePrecheck({ authorization: precheckAuthorization, providerFor: () => refusing, prices, models, officialTexts: [], sources });
    expect(noCorpus.lock).toBe("corpus");
    const noSource = await executePrecheck({ authorization: precheckAuthorization, providerFor: () => refusing, prices, models, officialTexts, sources: [] });
    expect(noSource.lock).toBe("sources");
    expect(unpriced.lock).toBe("budget");
    const unattached = await executePrecheck({ authorization: precheckAuthorization, providerFor: null, prices: null, models });
    expect(unattached).toMatchObject({ started: false, ready: true, lock: "runner" });
    const overridden = await executePrecheck({ authorization: precheckAuthorization, providerFor: () => refusing, prices, models, overrides: { prompt: "v2" } });
    expect(overridden.reason).toMatch(/refuses/);
    expect(calls).toBe(0);
    expect((await itemFactoryPrecheck("no")).lock).toBe("authorization");
    expect((await itemFactoryPrecheck("no", ".data/analysis/_factory/item-precheck/openrouter-v1", "openrouter")).lock).toBe("authorization");
    const openrouterPrices = loadPrices({ FACTORY_PRICES: "pipeline/ai/prices.openrouter.json" });
    expect(priceFor(openrouterPrices!.table, openrouterPrecheckModels.generator)?.in).toBe(0.1);
    expect(priceFor(openrouterPrices!.table, openrouterPrecheckModels.judge)?.out).toBe(10);
    const limited: string[] = [];
    const capped = await executePrecheck({
      authorization: precheckAuthorization,
      providerFor: () => provider((system, user) => (system.startsWith("ITEM MODEL SOURCE") ? sourceBody(user) : coreBody(user)), limited),
      prices,
      models,
      officialTexts,
      sources,
      limits: { maxCalls: 1, maxCostUsd: 1.8, maxRegenerations: 0 },
      cacheSalt: `precheck-${Date.now()}-cap`,
    });
    expect(limited).toHaveLength(1);
    expect(capped.records[0]?.source.status).toBe("pass");
    expect(capped.records[0]?.key.status).toBe("not_run");
    expect(capped.records[0]?.stop).toBe("budget");
    expect(capped.records.slice(1).every((record) => record.decision.status === "not_run" && record.stop === "budget")).toBe(true);
  });

  it("asks the judge a type-specific question and hides the key letter", () => {
    const source = { kind: "restatement" as const, proposition: "The council delayed the vote.", frame: { scope: "harbor", modality: "fact", polarity: "affirmative" as const, tense: "past", argumentStructure: "council delayed vote" } };
    const options = { A: answer, B: "Another claim.", C: "A third claim.", D: "A fourth claim.", E: "A fifth claim." };
    const text = judgeUser(restatementModel, source.proposition, options, source);
    expect(text).toContain(typeFocusLine.restatement);
    expect(text).not.toContain("\nKEY:");
    expect(typeFocusLine.translation).not.toBe(typeFocusLine.reading_comprehension);
    expect(sourceSystem.startsWith("ITEM MODEL SOURCE")).toBe(true);
  });
});
