import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import type { JudgeInput } from "@/modules/factory/judge";
import { benchmarkAuthorization, benchmarkCeilings, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import { assessKey, assessReadingDiversity } from "@/modules/factory/item-model/core";
import type { DistractorCandidate, ItemCore, ItemSource, ReadingQuestionSlot, SourceRecord } from "@/modules/factory/item-model/contract";
import { buildRunRecord, finalizeReadingSet, notCalled, precheckCeilings, precheckMaxCalls } from "@/modules/factory/item-model/precheck";
import { readingModel, restatementModel, translationModel } from "@/modules/factory/item-model/registry";
import { assessSource } from "@/modules/factory/item-model/source";
import { modelDefaults } from "./ai/config";
import { itemCoreOutput, readingCoreOutput, restatementSourceOutput, sourceSystem, sourceUser, translationSourceOutput } from "./ai/prompts/item-model.v1";
import { openrouterPrecheckModels, precheckPlan } from "./stages/item-precheck";

const saved = ".data/analysis/_factory/item-precheck/openrouter-v1";
const longReference = "scope: obligation 'must' over review; quantity two; past tense; concessive contrast; temporal before";
const stopQuote = "a three-nucleotide sequence that signals the end without specifying an amino acid";

const emptyRestatement = { proposition: "", scope: "", modality: "", polarity: "affirmative", tense: "", argumentStructure: "Production stopped: no original proposition or meaning frame supplied in the source record; polarity is a placeholder." };
const emptyTranslation = { sourceSentence: "", sourceLanguage: "en", targetLanguage: "tr", roles: [], scope: "" };

const granted: SourceRecord = { sourceId: "nlm-medlineplus-gene-expression", locator: { kind: "url", value: "https://medlineplus.gov/genetics/understanding/howgeneswork/makingprotein/" }, topic: "gene expression", factNotes: "A stop codon ends translation and does not code for an amino acid.", usageRights: "granted", role: "production_notes" };
const passage = `Most genes hold the instructions a cell needs. Translation continues until ${stopQuote}. ${Array.from({ length: 150 }, (_, index) => `Note${index}`).join(" ")}.`;
const distinctPlan: ReadingQuestionSlot[] = [1, 2, 3, 4].map((number): ReadingQuestionSlot => ({
  propositionId: `p${number}`,
  evidenceSpanId: `span-${number}`,
  testedProposition: [`Transcription copies DNA into RNA inside the nucleus.`, `A stop codon ends assembly without an amino acid.`, `A codon usually names one amino acid.`, `Gene expression carries information from DNA to protein.`][number - 1] ?? `Claim ${number}.`,
  cognitiveOperation: number === 2 ? "infer" : "locate",
  questionFunction: number === 2 ? "inference" : "detail",
}));
const repeatedPlan: ReadingQuestionSlot[] = [1, 2, 3, 4].map((number): ReadingQuestionSlot => ({
  propositionId: "stop-codon",
  evidenceSpanId: `span-${number}`,
  testedProposition: "A stop codon signals the end without specifying an amino acid.",
  cognitiveOperation: number === 4 ? "purpose" : "locate",
  questionFunction: (["inference", "detail", "detail", "purpose"] as const)[number - 1] ?? "detail",
}));

function readingSource(plan: ReadingQuestionSlot[]): ItemSource {
  return { kind: "reading", passageId: "reading-1", sourceId: granted.sourceId, passage, questionPlan: plan };
}

describe("recorded source contract", () => {
  it("rejects the empty restatement source and does not require a production record", () => {
    const cached = JSON.parse(readFileSync(".data/analysis/cache/ai/60135918ad5094d9977d4bbea8f6661acfafdbd6c0899ca543d6874d18dfc9eb.json", "utf8")) as { response: { text: string; usage: { outputTokens: number; reasoningTokens: number } } };
    const parsed = JSON.parse(cached.response.text) as typeof emptyRestatement;
    expect(parsed).toEqual(emptyRestatement);
    expect(cached.response.usage.reasoningTokens).toBe(683);
    expect(cached.response.usage.outputTokens).toBe(762);
    expect(restatementSourceOutput.safeParse(parsed).success).toBe(false);
    expect(sourceSystem).toContain("Restatement and translation do not use a production source record");
    expect(sourceSystem).toContain("A missing production record is not a reason to return empty fields");
    expect(sourceUser(restatementModel, 1)).not.toContain("PRODUCTION SOURCE");
    const written = assessSource(restatementModel, { kind: "restatement", proposition: "The council delayed one vote.", frame: { scope: "one vote", modality: "stated", polarity: "affirmative", tense: "past", argumentStructure: "council delayed" } });
    expect(written.sufficient).toBe(true);
    expect(written.failures).not.toContain("production_source_missing");
  });

  it("rejects the empty translation source without borrowing the reading source rule", () => {
    const cached = JSON.parse(readFileSync(".data/analysis/cache/ai/4a344583710d436db61b312d14f91886f95499267fbdabbbd7be84f7c75730ec.json", "utf8")) as { response: { text: string; usage: { reasoningTokens: number } } };
    const parsed = JSON.parse(cached.response.text) as typeof emptyTranslation;
    expect(parsed).toEqual(emptyTranslation);
    expect(cached.response.usage.reasoningTokens).toBeGreaterThan(0);
    expect(translationSourceOutput.safeParse(parsed).success).toBe(false);
    const written = assessSource(translationModel, { kind: "translation", sourceSentence: "The council delayed the vote.", sourceLanguage: "en", targetLanguage: "tr", roles: ["agent:council"], scope: "one vote" });
    expect(written.sufficient).toBe(true);
    expect(sourceSystem).toContain("Reading uses only the production source record");
    const reading = assessSource(readingModel, readingSource(distinctPlan), { sources: [] });
    expect(reading.failures).toContain("production_source_missing");
  });

  it("keeps a long translation reference as an invalid id", () => {
    const cached = JSON.parse(readFileSync(".data/analysis/cache/ai/ecf1c310c49255f2adbfd170e65e6279f79ced6a1032b5d8fc8ea805a735fce3.json", "utf8")) as { response: { text: string } };
    const body = JSON.parse(cached.response.text) as { sourceReferences: string[] };
    expect(body.sourceReferences[3]).toBe(longReference);
    expect(longReference.length).toBeGreaterThan(80);
    expect(itemCoreOutput.safeParse(body).success).toBe(true);
    const source: ItemSource = {
      kind: "translation",
      sourceSentence: "Although the committee could not approve every proposal, its chair insisted that the two budget amendments drafted last spring must be reviewed before the audit begins.",
      sourceLanguage: "en",
      targetLanguage: "tr",
      roles: ["committee chair as speaker and modality holder", "two budget amendments as reviewed object"],
      scope: "Obligation 'must' scopes over the review.",
    };
    const core: ItemCore = { ...body, modelVersion: "writer-test", promptVersion: translationModel.promptVersion, reading: null } as ItemCore;
    const key = assessKey(translationModel, source, core);
    expect(key.valid).toBe(false);
    expect(key.failures).toContain(`unknown_source_reference:${longReference}`);
    expect(key.failures).not.toContain(`unknown_source_reference:${longReference.slice(0, 80)}`);
  });

  it("does not accept a reading reference that is not the evidence span", () => {
    const cached = JSON.parse(readFileSync(".data/analysis/cache/ai/1b624c216655ae15761cb2154ec72632435a9601feb22b31310b68045f751964.json", "utf8")) as { response: { text: string } };
    const body = JSON.parse(cached.response.text) as { sourceReferences: string[]; evidenceSpan: { id: string; quote: string }; questionFunction: "inference" };
    expect(readingCoreOutput.safeParse({ ...body, propositionId: "p1", testedProposition: distinctPlan[0]!.testedProposition, cognitiveOperation: "infer" }).success).toBe(true);
    const core: ItemCore = {
      stem: "Which option best states what the passage implies about a stop codon during translation?",
      correctAnswer: "A stop codon signals where translation ends because it specifies no amino acid.",
      constructEvidence: "The span defines the stop codon.",
      correctnessRationale: "The span supports the end-of-translation role.",
      sourceReferences: body.sourceReferences,
      modelVersion: "writer-test",
      promptVersion: readingModel.promptVersion,
      meaningDelta: "preserved",
      reading: { questionFunction: body.questionFunction, evidenceSpan: body.evidenceSpan, propositionId: "p1", testedProposition: distinctPlan[0]!.testedProposition, cognitiveOperation: "locate" },
    };
    const key = assessKey(readingModel, readingSource(distinctPlan), core);
    expect(key.valid).toBe(false);
    expect(key.failures).toContain("unknown_source_reference:nlm-medlineplus-gene-expression");
    expect(key.failures).toContain("unknown_source_reference:reading-1");
    expect(key.failures).toContain("evidence_id_mismatch");
  });
});

describe("reading set diversity", () => {
  it("rejects four questions that measure the same stop-codon proposition", () => {
    const questions = [
      { propositionId: "stop-codon", testedProposition: "A stop codon signals where translation ends because it specifies no amino acid.", questionFunction: "inference" },
      { propositionId: "stop-codon", testedProposition: "It signals the end of translation without specifying an amino acid.", questionFunction: "detail" },
      { propositionId: "stop-codon", testedProposition: "A stop codon differs because it ends translation and names no amino acid.", questionFunction: "detail" },
      { propositionId: "stop-codon", testedProposition: "The role of a stop codon is to end the process without an amino acid.", questionFunction: "purpose" },
    ];
    const same = assessReadingDiversity(questions);
    expect(new Set(questions.map((question) => question.questionFunction)).size).toBeGreaterThan(1);
    expect(same.status).toBe("fail");
    expect(same.failures).toContain("repeated_proposition");
    expect(same.surfaceOverlapIsNotDiversityProof).toBe(true);
    const reworded = assessReadingDiversity(questions.map((question, index) => ({ ...question, testedProposition: `Unrelated wording ${index} with no shared claim text.` })));
    expect(reworded.status).toBe("fail");
    const overlapped = assessReadingDiversity([
      { propositionId: "p1", testedProposition: "A stop codon signals where translation ends because it specifies no amino acid.", questionFunction: "inference" },
      { propositionId: "p2", testedProposition: "Transcription copies DNA into messenger RNA inside the nucleus.", questionFunction: "detail" },
      { propositionId: "p3", testedProposition: "A ribosome reads messenger RNA three nucleotides at a time.", questionFunction: "detail" },
      { propositionId: "p4", testedProposition: "The passage explains how a gene becomes a protein.", questionFunction: "purpose" },
    ]);
    expect(overlapped.status).toBe("unverified");
    expect(overlapped.propositionIdentityIsNotCognitiveProof).toBe(true);
    expect(overlapped.surfaceOverlapIsNotDiversityProof).toBe(true);
    const planned = assessSource(readingModel, readingSource(repeatedPlan), { sources: [granted] });
    expect(planned.failures).toContain("repeated_proposition");
  });

  it("stops the set when the four questions declare one proposition", () => {
    const source = readingSource(distinctPlan);
    const candidate = (text: string, mechanism: string): DistractorCandidate => ({ candidateText: text, errorMechanism: mechanism, shiftTarget: "scope", whyPlausible: "It mentions translation.", whyInferior: "It changes the claim.", sourceEvidence: "span-1", semanticRisk: "none" });
    const judge = (correct: OptionLabel): JudgeInput => ({
      blindAnswer: correct,
      blindConfidence: 0.9,
      blindEvidence: "One option follows the span.",
      blindUncertain: false,
      blindAlternative: null,
      acceptability: { sentences: optionLabels.map((option) => ({ option, acceptable: option === correct, relationCoherent: option === correct, confidence: 0.9, reason: "checked" })) },
      report: { scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 }, alternativeDefensibleOptions: [], estimatedDifficulty: "hard", verdict: "APPROVE", reasons: ["Checked."] },
    });
    const mechanisms = readingModel.errorMechanisms;
    const record = (index: number, propositionId: string, testedProposition: string) => {
      const slot = distinctPlan.find((entry) => entry.propositionId === propositionId) ?? distinctPlan[0]!;
      const core: ItemCore = {
        stem: `Question ${index}`,
        correctAnswer: `Answer ${index}`,
        constructEvidence: "The span is in the passage.",
        correctnessRationale: "The claim stays with the span.",
        sourceReferences: [slot.evidenceSpanId],
        modelVersion: "writer-test",
        promptVersion: readingModel.promptVersion,
        meaningDelta: "preserved",
        reading: { questionFunction: slot.questionFunction, evidenceSpan: { id: slot.evidenceSpanId, quote: stopQuote }, propositionId, testedProposition, cognitiveOperation: slot.cognitiveOperation },
      };
      return buildRunRecord({
        id: `reading-1-q${index}`,
        model: readingModel,
        generatorModel: "writer-test",
        judgeModel: "judge-test",
        correctOption: "A",
        officialTexts: ["unrelated official booklet wording"],
        sources: [granted],
        calls: [],
        costUsd: null,
        passageId: "reading-1",
        source: { called: true, value: source, error: null },
        core: { called: true, value: core, error: null },
        distractors: { called: true, value: mechanisms.slice(0, 4).map((mechanism, offset) => candidate(`${mechanism} ${index}-${offset}`, mechanism)), error: null },
        judge: { called: true, value: judge("A"), error: null },
      });
    };
    const repeated = finalizeReadingSet([1, 2, 3, 4].map((index) => record(index, "p1", distinctPlan[0]!.testedProposition)));
    expect(repeated.every((item) => item.readingSet === "partial" && item.setDiversity.status === "fail" && item.setDiversity.failures.includes("repeated_proposition") && item.decision.status === "fail" && item.typeSemantic.status === "not_run" && item.sourceFidelity === "not_run")).toBe(true);
    expect(repeated[0]?.setDiversity.surfaceOverlapIsNotDiversityProof).toBe(true);
    const varied = finalizeReadingSet([1, 2, 3, 4].map((index) => record(index, `p${index}`, distinctPlan[index - 1]!.testedProposition)));
    expect(varied.every((item) => item.readingSet === "partial" && item.setDiversity.status === "unverified" && item.setDiversity.propositionIdentityIsNotCognitiveProof === true)).toBe(true);
  });
});

describe("failed stages and unchanged paths", () => {
  it("does not run later stages after an empty source", () => {
    const record = buildRunRecord({
      id: "restatement-1",
      model: restatementModel,
      generatorModel: "writer-test",
      judgeModel: "judge-test",
      correctOption: "A",
      officialTexts: ["unrelated official booklet wording"],
      calls: [],
      costUsd: null,
      source: { called: true, value: null, error: "proposition: Too small: expected string to have >=1 characters" },
      core: notCalled,
      distractors: notCalled,
      judge: notCalled,
    });
    expect(record.source.status).toBe("fail");
    expect(record.key.status).toBe("not_run");
    expect(record.pool.status).toBe("not_run");
    expect(record.structure.status).toBe("not_run");
    expect(record.blind.status).toBe("not_run");
    expect(record.decision.status).toBe("fail");
    expect(record.typeSemantic.status).toBe("not_run");
    expect(record.sourceFidelity).toBe("not_run");
    expect(record.qualityProven).toBe(false);
    expect(record.publishState).toBe("unpublished");
  });

  it("leaves the saved eleven records and the old ceilings unchanged", () => {
    const firstRun = ".data/analysis/_factory/item-precheck/openrouter-v1-first-run";
    const summary = JSON.parse(readFileSync(`${firstRun}/summary.json`, "utf8")) as { providerCalls: number; studentBankWrites: number; qualityProven: boolean; started: boolean };
    const current = JSON.parse(readFileSync(`${saved}/summary.json`, "utf8")) as { providerCalls: number; studentBankWrites: number; qualityProven: boolean };
    const restatement = JSON.parse(readFileSync(`${firstRun}/restatement-1.json`, "utf8")) as { source: { status: string }; key: { status: string }; typeSemantic: { status: string }; sourceFidelity: string };
    const translation = JSON.parse(readFileSync(`${firstRun}/translation-en_tr-2.json`, "utf8")) as { key: { status: string }; decision: { failure: string } };
    const reading = JSON.parse(readFileSync(`${firstRun}/reading-1-q1.json`, "utf8")) as { key: { status: string }; typeSemantic: { status: string }; sourceFidelity: string };
    expect(summary).toMatchObject({ providerCalls: 13, studentBankWrites: 0, qualityProven: false, started: true });
    expect(current).toMatchObject({ providerCalls: 34, studentBankWrites: 0, qualityProven: false });
    expect(restatement.source.status).toBe("fail");
    expect(restatement.key.status).toBe("not_run");
    expect(restatement.typeSemantic.status).toBe("not_run");
    expect(restatement.sourceFidelity).toBe("not_run");
    expect(translation.key.status).toBe("fail");
    expect(translation.decision.failure).toContain("sourceReferences.3");
    expect(reading.key.status).toBe("fail");
    expect(reading.typeSemantic.status).toBe("not_run");
    expect(reading.sourceFidelity).toBe("not_run");
    expect(precheckCeilings.totalQuestions).toBe(11);
    expect(precheckMaxCalls).toBe(41);
    expect(precheckCeilings.totalUsdCap).toBe(2.05);
    expect(benchmarkCeilings.total).toBe(90);
    expect(benchmarkCeilings.maxCalls).toBe(360);
    expect(benchmarkCeilings.totalUsdCap).toBe(18);
    expect(precheckPlan.models.generator).toBe(modelDefaults.generator);
    expect(precheckPlan.models.judge).toBe(modelDefaults.judge);
    expect(openrouterPrecheckModels).toEqual({ generator: "openrouter:anthropic/claude-haiku-5.5", judge: "openrouter:anthropic/claude-sonnet-5.5" });
    const plan = freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge });
    const locked = runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan });
    expect(locked.started).toBe(false);
    expect(locked.reason).toMatch(/not started/);
  });
});
