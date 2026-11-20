import { describe, expect, it } from "vitest";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import type { JudgeInput } from "../judge";
import { benchmarkCeilings } from "./benchmark";
import type { DistractorCandidate, ItemCore, ItemSource, ReadingQuestionSlot, ShiftTarget, SourceRecord } from "./contract";
import { pilotPassageWordBand } from "./contract";
import { assertPrecheckInputs, assertPrecheckStart, buildRunRecord, finalizeReadingSet, notCalled, precheckCeilings, precheckLimits, precheckMaxCalls, precheckSlots, productionPath } from "./precheck";
import { readingModel, restatementModel } from "./registry";

const frame = { scope: "the harbor plan only", modality: "stated fact", polarity: "affirmative" as const, tense: "past", argumentStructure: "council delayed vote" };
const source: ItemSource = { kind: "restatement", proposition: "The council delayed the vote on the harbor plan.", frame };

function core(patch: Partial<ItemCore> = {}): ItemCore {
  return {
    stem: "The council delayed the vote on the harbor plan.",
    correctAnswer: "The harbor vote was postponed.",
    constructEvidence: "The postponed vote is the same event.",
    correctnessRationale: "The frame stays intact.",
    sourceReferences: ["proposition"],
    modelVersion: "writer-test",
    promptVersion: "item-model.restatement.v3.4",
    meaningDelta: "preserved",
    ...patch,
  };
}

function candidate(mechanism: string, text: string, risk: DistractorCandidate["semanticRisk"] = "none", shiftTarget: ShiftTarget = "scope"): DistractorCandidate {
  return { candidateText: text, errorMechanism: mechanism, shiftTarget, whyPlausible: "It mentions the council.", whyInferior: "It changes the frame.", sourceEvidence: "proposition", semanticRisk: risk };
}

const eight = [
  candidate("scope_widening", "The council delayed every infrastructure vote."),
  candidate("modality_shift", "The council may have delayed the harbor vote."),
  candidate("polarity_reversal", "The council refused to delay the harbor vote."),
  candidate("tense_shift", "The council will delay the harbor vote."),
  candidate("argument_swap", "The harbor plan delayed the council.", "second_answer"),
  candidate("scope_widening", "The council delayed every infrastructure vote."),
  candidate("argument_swap", "The vote delayed the council.", "off_construct"),
  candidate("tense_shift", "The council delays votes A) today.", "ungrammatical"),
];

function judge(correct: OptionLabel, rival: OptionLabel | null = null): JudgeInput {
  return {
    blindAnswer: correct,
    blindConfidence: 0.9,
    blindEvidence: "Only one option keeps the harbor limit.",
    blindUncertain: false,
    blindAlternative: rival,
    acceptability: { sentences: optionLabels.map((option) => ({ option, acceptable: option === correct, relationCoherent: option === correct, confidence: 0.9, reason: "checked" })) },
    report: {
      scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 },
      alternativeDefensibleOptions: rival ? [rival] : [],
      estimatedDifficulty: "hard",
      verdict: rival ? "REJECT" : "APPROVE",
      reasons: ["Checked against the frame."],
    },
  };
}

const base = {
  id: "restatement-1",
  model: restatementModel,
  generatorModel: "writer-test",
  judgeModel: "judge-test",
  correctOption: "A" as const,
  officialTexts: [] as string[],
  calls: [],
  costUsd: null,
};

describe("precheck ledger", () => {
  it("leaves every unrun control as not_run", () => {
    const record = buildRunRecord({ ...base, source: notCalled, core: notCalled, distractors: notCalled, judge: notCalled });
    expect(record.source.status).toBe("not_run");
    expect(record.key.status).toBe("not_run");
    expect(record.pool.status).toBe("not_run");
    expect(record.blind.status).toBe("not_run");
    expect(record.secondAnswer.status).toBe("not_run");
    expect(record.decision.status).toBe("not_run");
    expect(record.typeSemantic.status).toBe("not_run");
    expect(record.qualityProven).toBe(false);
    expect(JSON.stringify(record)).not.toContain("PASS");
  });

  it("stops before distractors when the source or the key fails", () => {
    const weakSource = buildRunRecord({ ...base, source: { called: true, value: { ...source, proposition: " " }, error: null }, core: notCalled, distractors: { called: true, value: eight, error: null }, judge: notCalled });
    expect(weakSource.source.status).toBe("fail");
    expect(weakSource.key.status).toBe("not_run");
    expect(weakSource.pool.status).toBe("not_run");
    expect(weakSource.pool.generated).toEqual([]);
    const weakKey = buildRunRecord({ ...base, source: { called: true, value: source, error: null }, core: { called: true, value: core({ meaningDelta: "shifted" }), error: null }, distractors: notCalled, judge: notCalled });
    expect(weakKey.key.status).toBe("fail");
    expect(weakKey.key.validity).toBe("structural_only");
    expect(weakKey.pool.status).toBe("not_run");
    expect(weakKey.decision.status).toBe("fail");
    expect(weakKey.typeSemantic).toEqual({ status: "not_run", focus: "meaning_equivalence", reason: expect.stringContaining("not that proof") });
  });

  it("keeps the rejected distractors and does not treat a rival as a pass", () => {
    const clean = buildRunRecord({
      ...base,
      source: { called: true, value: source, error: null },
      core: { called: true, value: core(), error: null },
      distractors: { called: true, value: eight, error: null },
      judge: { called: true, value: judge("A"), error: null },
      calls: [{ stage: "judge", model: "judge-test", promptVersion: "item-model.judge.v1", cached: false, inputTokens: 10, outputTokens: 20, requestHash: "abc", error: null }],
    });
    expect(clean.pool.selected).toHaveLength(4);
    expect(clean.pool.generated).toHaveLength(8);
    expect(clean.pool.rejected.map((entry) => entry.reason)).toEqual(expect.arrayContaining(["second_answer", "duplicate", "off_construct", "ungrammatical"]));
    expect(clean.blind).toMatchObject({ status: "pass", answer: "A", agrees: true });
    expect(clean.secondAnswer.status).toBe("pass");
    expect(clean.decision).toMatchObject({ status: "pass", verdict: "APPROVE" });
    expect(clean.editorialStatus).toBe("needs_editorial_review");
    expect(clean.editorApproved).toBe(false);
    expect(clean.qualityProven).toBe(false);
    expect(clean.typeSemantic.status).toBe("not_run");
    expect(clean.providerCalls).toBe(1);
    const rival = buildRunRecord({
      ...base,
      source: { called: true, value: source, error: null },
      core: { called: true, value: core(), error: null },
      distractors: { called: true, value: eight, error: null },
      judge: { called: true, value: judge("A", "B"), error: null },
    });
    expect(rival.secondAnswer).toMatchObject({ status: "fail", options: ["B"] });
    expect(rival.decision.status).toBe("fail");
    expect(rival.typeSemantic.status).toBe("not_run");
  });

  it("freezes the eleven-question profile under the ninety-item plan", () => {
    expect(precheckSlots()).toHaveLength(11);
    expect(precheckSlots().filter((slot) => slot.direction === "en_tr")).toHaveLength(2);
    expect(precheckSlots().filter((slot) => slot.direction === "tr_en")).toHaveLength(2);
    expect(new Set(precheckSlots().filter((slot) => slot.passageId).map((slot) => slot.passageId))).toEqual(new Set(["reading-1"]));
    expect(precheckCeilings.totalQuestions).toBe(11);
    expect(precheckCeilings.maxCalls).toBe(41);
    expect(precheckMaxCalls).toBe(41);
    expect(precheckCeilings.totalUsdCap).toBe(2.05);
    expect(precheckCeilings.maxRegenerations).toBe(0);
    expect(precheckCeilings.passageWords).toEqual({ min: 154, max: 312, standing: "pilot_observed_on_four_exams" });
    expect(benchmarkCeilings.total).toBe(90);
    expect(benchmarkCeilings.maxCalls).toBe(360);
    expect(benchmarkCeilings.totalUsdCap).toBe(18);
    expect(precheckLimits({ maxCalls: 1000, maxCostUsd: 50, maxRegenerations: 4 })).toEqual({ maxCalls: 41, maxRegenerations: 0, maxCostUsd: 2.05 });
    expect(productionPath("restatement").stages).toEqual(productionPath("translation").stages);
    expect(productionPath("restatement").typeSemantic.focus).toBe("meaning_equivalence");
    expect(productionPath("translation").typeSemantic.focus).toBe("cross_lingual_preservation");
    expect(productionPath("reading_comprehension").typeSemantic.focus).toBe("textual_evidence");
    expect(productionPath("reading_comprehension").typeSemantic.status).toBe("not_run");
    expect(() => assertPrecheckStart({ authorization: "no" })).toThrow(/authorization/);
    expect(() => assertPrecheckStart({ authorization: "item-model-precheck-v1", overrides: { prompt: "v2" } })).toThrow(/refuses/);
    expect(() => assertPrecheckStart({ authorization: "item-model-precheck-v1", outDir: "db:items" })).toThrow(/student bank/);
    expect(assertPrecheckInputs({ officialTexts: [], sources: [] })).toBe("corpus");
    expect(assertPrecheckInputs({ officialTexts: ["official booklet text"], sources: [] })).toBe("sources");
  });

  it("keeps a partial reading package and stops the set when the passage is missing", () => {
    const granted: SourceRecord = { sourceId: "src-harbor", locator: { kind: "document", value: "doc-harbor" }, topic: "harbors", factNotes: "One delayed vote.", usageRights: "granted", role: "production_notes" };
    const passage = `The council delayed the vote after the report. Harbor records remained limited to that plan. ${Array.from({ length: 150 }, (_, index) => `Note${index}`).join(" ")}.`;
    const harborPlan: ReadingQuestionSlot[] = [1, 2, 3, 4].map((number): ReadingQuestionSlot => ({
      propositionId: `p${number}`,
      evidenceSpanId: `span-${number}`,
      testedProposition: [`The council delayed one harbor vote.`, `Records stayed limited to the plan.`, `The report arrived before the decision.`, `The limit covered that harbor plan.`][number - 1] ?? `Harbor claim ${number}.`,
      cognitiveOperation: number === 2 ? "infer" : "locate",
      questionFunction: number === 2 ? "inference" : "detail",
    }));
    const readingSource: ItemSource = { kind: "reading", passageId: "reading-1", sourceId: "src-harbor", passage, questionPlan: harborPlan };
    const readingCore = (id: string, index = 1): ItemCore => {
      const slot = harborPlan[index - 1] ?? harborPlan[0]!;
      return { ...core(), stem: `Question ${id}`, promptVersion: "item-model.reading.v3.4", sourceReferences: [slot.evidenceSpanId], reading: { questionFunction: slot.questionFunction, evidenceSpan: { id: slot.evidenceSpanId, quote: id === "missing" ? "not in the passage" : "delayed the vote" }, propositionId: slot.propositionId, testedProposition: slot.testedProposition, cognitiveOperation: slot.cognitiveOperation } };
    };
    const shared = { model: readingModel, generatorModel: "writer-test", judgeModel: "judge-test", correctOption: "A" as const, officialTexts: ["unrelated official booklet wording"], sources: [granted], calls: [], costUsd: null, passageId: "reading-1" };
    const ready = (id: string, index: number) => buildRunRecord({ ...shared, id: `reading-1-q${index}`, source: { called: true, value: readingSource, error: null }, core: { called: true, value: readingCore(id, index), error: null }, distractors: { called: true, value: eight.map((entry, offset) => ({ ...entry, candidateText: `${entry.candidateText} ${id}-${offset}`, errorMechanism: readingModel.errorMechanisms[offset % readingModel.errorMechanisms.length] ?? "unsupported_detail" })), error: null }, judge: { called: true, value: judge("A"), error: null } });
    const complete = finalizeReadingSet([ready("span-1", 1), ready("span-2", 2), ready("span-3", 3), ready("span-4", 4)]);
    expect(new Set(complete.map((record) => record.passageId))).toEqual(new Set(["reading-1"]));
    expect(complete.every((record) => record.readingSet === "partial" && record.setDiversity.status === "unverified" && record.quoteMatch === "structural_only" && record.typeSemantic.status === "not_run" && record.publishState === "unpublished" && record.surfaceScreen === "clear" && record.wordCount !== null && record.wordCount >= pilotPassageWordBand.min)).toBe(true);
    expect(new Set(complete.map((record) => record.questionFunction))).toEqual(new Set(["detail", "inference"]));
    const partial = finalizeReadingSet([ready("span-1", 1), ready("span-2", 2), buildRunRecord({ ...shared, id: "reading-1-q3", source: { called: true, value: readingSource, error: null }, core: { called: true, value: readingCore("missing", 3), error: null }, distractors: notCalled, judge: notCalled }), ready("span-4", 4)]);
    expect(partial.every((record) => record.readingSet === "partial")).toBe(true);
    expect(partial[0]?.key.status).toBe("pass");
    expect(partial[2]?.key.status).toBe("fail");
    const short: ItemSource = { kind: "reading", passageId: "reading-1", sourceId: "src-harbor", passage: "Too short. Still two sentences.", questionPlan: harborPlan };
    const stopped = finalizeReadingSet([1, 2, 3, 4].map((index) => buildRunRecord({ ...shared, id: `reading-1-q${index}`, source: { called: true, value: short, error: null }, core: notCalled, distractors: notCalled, judge: notCalled })));
    expect(stopped.every((record) => record.source.status === "fail" && record.source.failures.includes("passage_outside_pilot_band") && record.key.status === "not_run" && record.readingSet === "stopped")).toBe(true);
    const unauthorized = buildRunRecord({ ...shared, id: "reading-1-q1", sources: [], source: { called: true, value: readingSource, error: null }, core: notCalled, distractors: notCalled, judge: notCalled });
    expect(unauthorized.source.failures).toContain("production_source_missing");
    expect(unauthorized.usageRights).toBe("missing");
    expect(unauthorized.surfaceScreen).toBe("not_run");
    expect(unauthorized.similarityIsNotLicense).toBe(true);
  });
});
