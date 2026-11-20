import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { benchmarkAuthorization, benchmarkCeilings, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import { assessKey, assessReadingDiversity } from "@/modules/factory/item-model/core";
import type { ItemCore, ItemSource, ReadingQuestionSlot, SourceRecord } from "@/modules/factory/item-model/contract";
import { tenseLabelMax } from "@/modules/factory/item-model/contract";
import { precheckCeilings, smokeCeilings, smokeGraphCalls } from "@/modules/factory/item-model/precheck";
import { readingModel, restatementModel, translationModel } from "@/modules/factory/item-model/registry";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { assessSource } from "@/modules/factory/item-model/source";
import { factoryVersions } from "@/modules/factory/versions";
import { modelDefaults } from "./ai/config";
import { coreUser, restatementSourceOutput, sourceSystem } from "./ai/prompts/item-model.v1";
import { openrouterPrecheckModels } from "./stages/item-precheck";

const smokeDir = ".data/analysis/_factory/item-core-smoke/openrouter-v1";

function savedText(id: string, stage: "source" | "core"): string {
  const record = JSON.parse(readFileSync(`${smokeDir}/${id}.json`, "utf8")) as { calls: { stage: string; requestHash: string }[] };
  const hash = record.calls.find((call) => call.stage === stage)?.requestHash;
  const cached = JSON.parse(readFileSync(`.data/analysis/cache/ai/${hash}.json`, "utf8")) as { response: { text: string } };
  return cached.response.text;
}

const passage = `Most genes hold the instructions a cell needs. Translation continues until a three-nucleotide sequence that signals the end without specifying an amino acid. ${Array.from({ length: 150 }, (_, index) => `Note${index}`).join(" ")}.`;
const granted: SourceRecord = { sourceId: "src-harbor", locator: { kind: "document", value: "doc-harbor" }, topic: "harbors", factNotes: "One delayed vote.", usageRights: "granted", role: "production_notes" };

function plan(): ReadingQuestionSlot[] {
  return [1, 2, 3, 4].map((number): ReadingQuestionSlot => ({
    propositionId: `reading-1-P${number}`,
    evidenceSpanId: `reading-1-S${number}`,
    testedProposition: `Claim ${number} is a different proposition.`,
    cognitiveOperation: `operation-${number}`,
    questionFunction: number === 2 ? "inference" : "detail",
  }));
}

describe("saved smoke contract", () => {
  it("rejects the recorded long tense and keeps two different short labels", () => {
    const raw = JSON.parse(savedText("restatement-1", "source")) as { tense: string; argumentStructure: string; proposition: string; scope: string; modality: string; polarity: "negative" };
    expect(raw.tense.length).toBeGreaterThan(tenseLabelMax);
    expect(restatementSourceOutput.safeParse(raw).success).toBe(false);
    expect(raw.tense).not.toBe(raw.tense.slice(0, tenseLabelMax));
    const overlong = assessSource(restatementModel, { kind: "restatement", proposition: raw.proposition, frame: { scope: raw.scope, modality: raw.modality, polarity: raw.polarity, tense: raw.tense, argumentStructure: raw.argumentStructure } });
    expect(overlong.failures).toContain("tense_too_long");
    expect(overlong.sufficient).toBe(false);
    const pastPerfect = "past_perfect_before_simple_past";
    const simplePast = "simple_past";
    expect(pastPerfect).not.toBe(simplePast);
    expect(restatementSourceOutput.safeParse({ proposition: raw.proposition, scope: "one report", modality: "stated", polarity: raw.polarity, tense: pastPerfect, argumentStructure: `${raw.argumentStructure} ${raw.tense}` }).success).toBe(true);
    expect(assessSource(restatementModel, { kind: "restatement", proposition: raw.proposition, frame: { scope: "one report", modality: "stated", polarity: "negative", tense: pastPerfect, argumentStructure: raw.tense } }).sufficient).toBe(true);
    expect(assessSource(restatementModel, { kind: "restatement", proposition: raw.proposition, frame: { scope: "one report", modality: "stated", polarity: "affirmative", tense: simplePast, argumentStructure: "The vote is simply past." } }).sufficient).toBe(true);
    expect(sourceSystem).toContain("short relation label");
  });

  it("rejects a proposition id used as a reading evidence reference", () => {
    const raw = JSON.parse(savedText("reading-1-q2", "core")) as { sourceReferences: string[]; stem: string; correctAnswer: string; constructEvidence: string; correctnessRationale: string; meaningDelta: "preserved"; questionFunction: "inference"; evidenceSpan: { id: string; quote: string }; propositionId: string; testedProposition: string; cognitiveOperation: string };
    expect(raw.sourceReferences).toContain("reading-1-P2");
    const slots = plan();
    const source: ItemSource = { kind: "reading", passageId: "reading-1", sourceId: granted.sourceId, passage, questionPlan: slots };
    const core: ItemCore = { ...raw, modelVersion: "writer-test", promptVersion: readingModel.promptVersion, reading: { questionFunction: raw.questionFunction, evidenceSpan: raw.evidenceSpan, propositionId: slots[1]!.propositionId, testedProposition: slots[1]!.testedProposition, cognitiveOperation: slots[1]!.cognitiveOperation } };
    const rejected = assessKey(readingModel, source, core);
    expect(rejected.valid).toBe(false);
    expect(rejected.failures).toContain("unknown_source_reference:reading-1-P2");
    const repaired: ItemCore = { ...core, sourceReferences: [slots[1]!.evidenceSpanId], reading: { ...core.reading!, evidenceSpan: { id: slots[1]!.evidenceSpanId, quote: "a three-nucleotide sequence that signals the end without specifying an amino acid" } } };
    expect(assessKey(readingModel, source, repaired).valid).toBe(true);
    const prompt = coreUser(readingModel, source, 2);
    expect(prompt).toContain("ALLOWED EVIDENCE SPAN IDS: reading-1-S1, reading-1-S2, reading-1-S3, reading-1-S4");
    expect(prompt).toContain("THIS QUESTION'S EVIDENCE SPAN ID: reading-1-S2");
    expect(sourceSystem).toContain("A proposition id is not an evidence reference");
  });

  it("keeps four saved reading propositions apart from their evidence ids", () => {
    const sourceRaw = JSON.parse(savedText("reading-1-q1", "source")) as { questionPlan: { propositionId: string; testedProposition: string; evidenceSpanId?: string }[] };
    const questions = [1, 2, 3, 4].map((number) => JSON.parse(savedText(`reading-1-q${number}`, "core")) as { propositionId: string; testedProposition: string; evidenceSpan: { id: string }; questionFunction: string });
    expect(new Set(sourceRaw.questionPlan.map((entry) => entry.propositionId)).size).toBe(4);
    expect(new Set(questions.map((question) => question.propositionId)).size).toBe(4);
    expect(new Set(questions.map((question) => question.evidenceSpan.id)).size).toBe(4);
    const diversity = assessReadingDiversity(questions.map((question) => ({ propositionId: question.propositionId, testedProposition: question.testedProposition, questionFunction: question.questionFunction })));
    expect(diversity.status).toBe("unverified");
    expect(diversity.propositionIdentityIsNotCognitiveProof).toBe(true);
    expect(diversity.surfaceOverlapIsNotDiversityProof).toBe(true);
    const sameProposition = assessReadingDiversity(questions.map((question) => ({ propositionId: questions[0]!.propositionId, testedProposition: questions[0]!.testedProposition, questionFunction: question.questionFunction })));
    expect(sameProposition.failures).toContain("repeated_proposition");
    const sharedEvidence = assessSource(readingModel, { kind: "reading", passageId: "reading-1", sourceId: granted.sourceId, passage, questionPlan: plan().map((entry) => ({ ...entry, evidenceSpanId: "reading-1-S1" })) }, { sources: [granted] });
    expect(sharedEvidence.failures).toContain("repeated_evidence");
  });

  it("accepts the recorded translation sources and keys", () => {
    for (const id of ["translation-en_tr-1", "translation-tr_en-1"] as const) {
      const sourceRaw = JSON.parse(savedText(id, "source")) as { sourceSentence: string; sourceLanguage: "en" | "tr"; targetLanguage: "en" | "tr"; roles: string[]; scope: string };
      const coreRaw = JSON.parse(savedText(id, "core")) as Omit<ItemCore, "modelVersion" | "promptVersion" | "reading">;
      const source: ItemSource = { kind: "translation", ...sourceRaw };
      const core: ItemCore = { ...coreRaw, sourceReferences: ["source_sentence"], modelVersion: "writer-test", promptVersion: translationModel.promptVersion, reading: null };
      expect(assessSource(translationModel, source, { expectedDirection: id.includes("en_tr") ? "en_tr" : "tr_en" }).sufficient).toBe(true);
      expect(assessKey(translationModel, source, core).valid).toBe(true);
    }
  });

  it("keeps the eleven-question ceiling and the ninety-item lock", () => {
    expect(precheckCeilings.maxCalls).toBe(41);
    expect(precheckCeilings.totalUsdCap).toBe(2.05);
    expect(precheckCeilings.maxRegenerations).toBe(0);
    expect(smokeGraphCalls).toBe(11);
    expect(smokeCeilings.maxCalls).toBe(10);
    expect(smokeCeilings.totalUsdCap).toBe(0.5);
    expect(benchmarkCeilings).toMatchObject({ total: 90, maxCalls: 360, totalUsdCap: 18 });
    expect(openrouterPrecheckModels).toEqual({ generator: "openrouter:anthropic/claude-haiku-5.5", judge: "openrouter:anthropic/claude-sonnet-5.5" });
    expect(modelDefaults.generator).not.toBe(modelDefaults.judge);
    const plan = freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge });
    expect(plan.promptVersions).toEqual({ restatement: restatementModel.promptVersion, translation: translationModel.promptVersion, reading: readingModel.promptVersion, judge: factoryVersions.judge });
    expect(factoryVersions.itemJudgePrompt).toBe("item-model.judge.v3.1");
    expect(runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan }).started).toBe(false);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
  });
});
