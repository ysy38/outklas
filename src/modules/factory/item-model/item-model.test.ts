import { describe, expect, it } from "vitest";
import type { OptionLabel } from "@/modules/analysis/contract";
import { optionLabels } from "@/modules/analysis/contract";
import type { DnaQuestion } from "@/modules/analysis/dna";
import type { NodeRef } from "@/modules/knowledge/graph";
import type { JudgeInput } from "../judge";
import { judgeThresholds } from "../judge";
import { assembleItem, type AssemblyDraft } from "./assemble";
import { assertBenchmarkBudget, benchmarkAuthorization, benchmarkCeilings, factoryReuse, freezeBenchmarkPlan, runItemBenchmark } from "./benchmark";
import type { DistractorCandidate, ItemCore, MeaningFrame, ReadingQuestionSlot, ShiftTarget, SourceRecord } from "./contract";
import { observeResponses, unobservedDifficulty, verifiedDifficulty } from "./difficulty";
import { assignGoldRole, goldFamilyId, officialSurfaceOverlap, refuseStudentBankWrite, splitGold } from "./gold";
import { selectDistractors } from "./pool";
import { itemModels, registryCoverage, requireModelId } from "./registry";
import { applyEditorialReview, publishToStudentBank } from "./review-status";
import { scoreRubric } from "./rubric";

const frame: MeaningFrame = { scope: "the harbor plan only", modality: "stated fact", polarity: "affirmative", tense: "past", argumentStructure: "council delayed vote" };
const harborPlan: ReadingQuestionSlot[] = [1, 2, 3, 4].map((number): ReadingQuestionSlot => ({
  propositionId: `p${number}`,
  evidenceSpanId: `span-${number}`,
  testedProposition: [`The council delayed one harbor vote.`, `Records stayed limited to the plan.`, `The report arrived before the decision.`, `The limit covered that harbor plan.`][number - 1] ?? `Harbor claim ${number}.`,
  cognitiveOperation: number === 2 ? "infer" : "locate",
  questionFunction: number === 2 ? "inference" : "detail",
}));
const harborReading = { questionFunction: "detail" as const, evidenceSpan: { id: "span-1", quote: "delayed the vote" }, propositionId: "p1", testedProposition: "The council delayed one harbor vote.", cognitiveOperation: "locate" };
const mechanisms = ["scope_widening", "modality_shift", "polarity_reversal", "tense_shift", "argument_swap"] as const;

const core = (patch: Partial<ItemCore> = {}): ItemCore => ({
  stem: "The council delayed the vote on the harbor plan.",
  correctAnswer: "The harbor vote was postponed.",
  constructEvidence: "The postponed vote is the same event, still limited to the harbor plan.",
  correctnessRationale: "Scope, polarity, tense and the council's action stay intact.",
  sourceReferences: ["proposition"],
  modelVersion: "writer-test",
  promptVersion: "item-model.restatement.v3.4",
  meaningDelta: "preserved",
  ...patch,
});

function distractor(mechanism: string, text: string, risk: DistractorCandidate["semanticRisk"] = "none", shiftTarget: ShiftTarget = "scope"): DistractorCandidate {
  return {
    candidateText: text,
    errorMechanism: mechanism,
    shiftTarget,
    whyPlausible: "It keeps the council and the vote.",
    whyInferior: "It changes one part of the frame.",
    sourceEvidence: "proposition",
    semanticRisk: risk,
  };
}

const pool = [
  distractor("scope_widening", "The council delayed every infrastructure vote."),
  distractor("modality_shift", "The council may have delayed the harbor vote."),
  distractor("polarity_reversal", "The council refused to delay the harbor vote."),
  distractor("tense_shift", "The council will delay the harbor vote."),
  distractor("argument_swap", "The harbor plan delayed the council.", "second_answer"),
];

function approvingJudge(correct: OptionLabel = "A"): JudgeInput {
  return {
    blindAnswer: correct,
    blindConfidence: 0.9,
    blindEvidence: "The harbor limit is kept only by the key.",
    acceptability: {
      sentences: optionLabels.map((option) => ({ option, acceptable: option === correct, relationCoherent: option === correct, confidence: 0.9, reason: "checked" })),
    },
    report: {
      scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 },
      alternativeDefensibleOptions: [],
      estimatedDifficulty: "hard",
      verdict: "APPROVE",
      reasons: ["The key keeps the frame."],
    },
  };
}

function draft(patch: Partial<AssemblyDraft> = {}): AssemblyDraft {
  return {
    id: "restatement-1",
    modelId: "restatement.meaning_equivalence",
    source: { kind: "restatement", proposition: "The council delayed the vote on the harbor plan.", frame },
    core: core(),
    distractors: pool,
    correctOption: "A",
    generatorModel: "writer-test",
    judgeModel: "judge-test",
    judge: approvingJudge(),
    officialTexts: [],
    selfScoreClaim: "The writer calls this hard.",
    attempt: 1,
    ...patch,
  };
}

const ref = (value: string) => value as NodeRef;

function dnaRow(patch: Partial<DnaQuestion> & Pick<DnaQuestion, "document" | "number" | "questionType">): DnaQuestion {
  return {
    section: "restatement",
    translationDirection: null,
    answer: "A",
    stimulusKey: null,
    textSha256: "a".repeat(64),
    surface: { optionCount: 5, structuralFormat: "sentence_translation", stimulusWordCount: 0, stemWordCount: 12, optionWordMean: 8, optionWordMax: 11, sentenceCount: 1, meanSentenceLength: 12, blankCount: 0 },
    difficulty: { overall: 0.5, lexical: 0.4, syntactic: 0.4, semantic: 0.5, inference: 0.5, distractor_similarity: 0.6, context_dependency: 0.3 },
    cognitiveDemand: "OFFICIAL WORDING SHOULD NOT APPEAR",
    transferRequirement: "same",
    confidence: 0.8,
    extractionConfidence: 0.9,
    analysisConfidence: 0.8,
    validationStatus: "accepted",
    humanReviewStatus: "approved",
    sourceClass: "complete_exam",
    nodes: [{ facet: "primary_concept", ref: ref("discourse_relation:concession"), rank: 0 }],
    distractors: [{ position: "B", type: ref("distractor_type:semantic_mismatch"), expresses: null, targeted: null, misconception: ref("misconception:false_synonym_in_context") }],
    proposals: [],
    ...patch,
  };
}

describe("item model registry", () => {
  it("names ten types and implements the first three", () => {
    expect(registryCoverage).toEqual({ named: 10, implemented: 3 });
    expect(itemModels.restatement.reviewStatus).toBe("specified");
    expect(itemModels.translation.graphRefs).toContain("question_type:translation_tr_en");
    expect(itemModels.reading_comprehension.errorMechanisms).toContain("unsupported_detail");
    expect(itemModels.sentence_completion.implemented).toBe(false);
    expect(() => requireModelId("vocabulary.unimplemented")).toThrow(/no item-model producer/);
  });
});

describe("gold split", () => {
  it("keeps a family on one side and does not treat DNA approval as human judgment", () => {
    const passageA = dnaRow({ document: "yds-2019", number: 1, questionType: ref("question_type:reading_comprehension"), section: "reading", stimulusKey: "passage-1", surface: { ...dnaRow({ document: "x", number: 1, questionType: ref("question_type:reading_comprehension") }).surface, structuralFormat: "passage_question" } });
    const passageB = { ...passageA, number: 2 };
    const missing = dnaRow({ document: "yds-2020", number: 3, questionType: ref("question_type:closest_meaning"), nodes: [{ facet: "primary_concept", ref: ref("skill:paraphrase"), rank: 0 }] });
    const rows = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"].map((name, index) => ({
      question: dnaRow({ document: "yds-2021", number: index + 1, questionType: ref("question_type:closest_meaning"), nodes: [{ facet: "primary_concept", ref: ref(`discourse_relation:${name}`), rank: 0 }] }),
      fullTextAvailable: true,
    }));
    const split = splitGold([
      { question: passageA, fullTextAvailable: true },
      { question: passageB, fullTextAvailable: true },
      { question: missing, fullTextAvailable: false },
      { question: { ...missing, number: 4 }, fullTextAvailable: true },
      ...rows,
    ]);
    const family = goldFamilyId(passageA);
    const role = assignGoldRole(family);
    const productionIds = new Set(split.production.map((entry) => entry.familyId));
    const evaluationIds = new Set(split.evaluation.map((entry) => entry.familyId));
    expect(productionIds.has(family) && evaluationIds.has(family)).toBe(false);
    expect(role === "production_exemplar" ? split.production.filter((entry) => entry.familyId === family) : split.evaluation.filter((entry) => entry.familyId === family)).toHaveLength(role === "production_exemplar" ? 1 : 2);
    expect(split.withheld.map((entry) => entry.familyId)).toContain(goldFamilyId(missing));
    expect(productionIds.has(goldFamilyId(missing))).toBe(false);
    expect(evaluationIds.has(goldFamilyId(missing))).toBe(false);
    const cards = [...split.production, ...split.evaluation];
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((entry) => entry.labelTrust === "dna_labels_are_not_human_judgment" && entry.textIncluded === false && entry.recordedHumanReviewStatus === "approved")).toBe(true);
    expect(split.production.every((entry) => entry.scope === null)).toBe(true);
    expect(JSON.stringify(split)).not.toContain("OFFICIAL WORDING SHOULD NOT APPEAR");
    expect(new Set([...productionIds, ...evaluationIds, ...split.withheld.map((entry) => entry.familyId)]).size).toBe(productionIds.size + evaluationIds.size + split.withheld.length);
  });

  it("rejects a surface rewrite and a student-bank destination", () => {
    const official = "The council delayed the vote after the report arrived.";
    expect(officialSurfaceOverlap(`Later, ${official} Nothing else changed.`, [official]).rejected).toBe(true);
    expect(officialSurfaceOverlap("A different claim about harbor maintenance.", [official]).rejected).toBe(false);
    expect(() => refuseStudentBankWrite(".data/analysis/_factory/bank-import/2026")).toThrow(/student bank/);
    expect(() => refuseStudentBankWrite("db:items")).toThrow(/student bank/);
  });
});

describe("assembly", () => {
  it("sends an independent pass to editorial review without certifying the key", () => {
    const item = assembleItem(draft());
    expect(item.status).toBe("needs_editorial_review");
    expect(item.statusHistory).toEqual(["generated", "structurally_valid", "needs_editorial_review"]);
    expect(item.options?.A).toBe(core().correctAnswer);
    expect(Object.keys(item.options ?? {})).toHaveLength(5);
    expect(item.selectedDistractors.map((entry) => entry.errorMechanism)).toEqual(["scope_widening", "modality_shift", "polarity_reversal", "tense_shift"]);
    expect(item.keyCertifiedByJudge).toBe(false);
    expect(item.semanticClaims.every((claim) => claim.treatedAsProof === false)).toBe(true);
    expect(item.publishState).toBe("unpublished");
    expect(item.production.retries).toBe(0);
    expect(item.targetDifficulty).toBe("hard");
    expect(item.observedDifficulty).toEqual(unobservedDifficulty());
    expect(verifiedDifficulty(item.targetDifficulty, item.observedDifficulty)).toBeNull();
  });

  it("stops before distractors when the source or the key is too weak", () => {
    const weak = assembleItem(draft({ core: core({ meaningDelta: "shifted" }) }));
    expect(weak.failure).toBe("key_meaning_shifted");
    expect(weak.production.proceededToDistractors).toBe(false);
    expect(weak.options).toBeNull();
    const empty = assembleItem(draft({ source: { kind: "restatement", proposition: "  ", frame } }));
    expect(empty.failure).toBe("proposition_missing");
    expect(empty.production.proceededToDistractors).toBe(false);
  });

  it("rejects a short distractor pool instead of padding a five-option item", () => {
    const item = assembleItem(draft({ distractors: pool.slice(0, 3) }));
    expect(item.failure).toBe("distractor_pool_insufficient");
    expect(item.options).toBeNull();
    const selected = selectDistractors({ candidates: pool, keyText: core().correctAnswer, allowedMechanisms: mechanisms });
    expect(selected.status).toBe("selected");
    expect(selected.invalidity).toBe("recorded_for_editorial_review");
    expect(selected.rejected.map((entry) => entry.reason)).toContain("second_answer");
    const repeated = selectDistractors({
      candidates: [distractor("scope_widening", "The council delayed every vote."), distractor("scope_widening", "The council delayed the regional plan."), distractor("modality_shift", "The council may delay the vote.", "none", "modality"), distractor("polarity_reversal", "The council did not delay the vote.", "none", "polarity")],
      keyText: core().correctAnswer,
      allowedMechanisms: mechanisms,
    });
    expect(repeated.status).toBe("selected");
    expect(repeated.selected.map((entry) => entry.errorMechanism)).toEqual(["scope_widening", "scope_widening", "modality_shift", "polarity_reversal"]);
    const paraphrase = selectDistractors({
      candidates: [distractor("syntactic_mismatch", "The vote on the harbor plan was delayed by the council.", "none", "none"), ...pool.slice(0, 3)],
      keyText: core().correctAnswer,
      allowedMechanisms: [...mechanisms, "syntactic_mismatch"],
    });
    expect(paraphrase.rejected.map((entry) => entry.reason)).toContain("paraphrase_not_error");
    expect(paraphrase.status).toBe("insufficient");
  });

  it("does not let the writer judge its own key or override a rejection", () => {
    const same = assembleItem(draft({ judgeModel: "writer-test" }));
    expect(same.failure).toBe("judge_not_independent");
    expect(same.judge).toBeNull();
    const rival = approvingJudge();
    rival.report.alternativeDefensibleOptions = ["B"];
    const rejected = assembleItem(draft({ judge: rival, selfScoreClaim: "APPROVE hard 1.0" }));
    expect(rejected.status).toBe("rejected");
    expect(rejected.failure).toBe("judge_rejected");
    expect(rejected.semanticClaims.some((claim) => claim.claim === "APPROVE hard 1.0" && claim.treatedAsProof === false)).toBe(true);
  });

  it("keeps a structurally valid item out of the editorial queue until a judge packet exists", () => {
    const item = assembleItem(draft({ judge: null, judgeModel: null }));
    expect(item.status).toBe("structurally_valid");
    expect(item.judge).toBeNull();
    expect(() => applyEditorialReview(item, { decision: "approve", reviewer: "eda", rationale: "Looks sound.", at: "2026-11-15T12:00:00.000Z" })).toThrow(/cannot approve/);
  });

  it("rejects an official surface rewrite, a prompt change and a retry", () => {
    const official = "The council delayed the vote on the harbor plan yesterday afternoon.";
    const copied = assembleItem(draft({ core: core({ stem: official }), officialTexts: [official] }));
    expect(copied.failure).toBe("official_surface_overlap");
    expect(copied.contentRights.officialSurfaceRewrite).toBe(true);
    expect(copied.production.proceededToDistractors).toBe(false);
    expect(() => assembleItem(draft({ core: core({ promptVersion: "item-model.restatement.v2" }) }))).toThrow(/frozen/);
    expect(() => assembleItem(draft({ attempt: 2 }))).toThrow(/does not retry/);
  });

  it("assembles translation and reading only from a sufficient source", () => {
    const translated = assembleItem(
      draft({
        id: "translation-1",
        modelId: "translation.meaning_preservation",
        source: { kind: "translation", sourceSentence: "Kurul, liman planının oylamasını erteledi.", sourceLanguage: "tr", targetLanguage: "en", roles: ["agent:council", "theme:vote"], scope: "harbor plan" },
        core: core({ sourceReferences: ["source_sentence"], promptVersion: "item-model.translation.v3.4" }),
        distractors: [
          distractor("scope_shift", "The council delayed every vote."),
          distractor("modality_shift", "The council might delay the harbor vote."),
          distractor("polarity_reversal", "The council did not delay the harbor vote."),
          distractor("role_reversal", "The harbor vote delayed the council."),
        ],
      }),
    );
    expect(translated.status).toBe("needs_editorial_review");
    const badDirection = assembleItem(
      draft({
        modelId: "translation.meaning_preservation",
        source: { kind: "translation", sourceSentence: "Kurul oylamayı erteledi.", sourceLanguage: "tr", targetLanguage: "tr", roles: ["agent"], scope: "vote" },
        core: core({ promptVersion: "item-model.translation.v3.4", sourceReferences: ["source_sentence"] }),
      }),
    );
    expect(badDirection.failure).toBe("language_direction");
    const passage = `The council delayed the vote after the report. Harbor records remained limited to that plan. ${Array.from({ length: 150 }, (_, index) => `Note${index}`).join(" ")}.`;
    const granted: SourceRecord = { sourceId: "src-harbor", locator: { kind: "doi", value: "10.1000/harbor" }, topic: "harbors", factNotes: "A council delayed one harbor vote after a report.", usageRights: "granted", role: "production_notes" };
    const reading = assembleItem(
      draft({
        id: "reading-1",
        modelId: "reading.evidence_based",
        sources: [granted],
        source: { kind: "reading", passageId: "reading-1", sourceId: "src-harbor", passage, questionPlan: harborPlan },
        core: core({ stem: "What was limited to the harbor plan?", sourceReferences: ["span-1"], promptVersion: "item-model.reading.v3.4", reading: harborReading }),
        distractors: [
          distractor("unsupported_detail", "The council cancelled the harbor plan."),
          distractor("opposite_claim", "The council held the vote immediately."),
          distractor("out_of_passage", "The ministry funded a new harbor."),
          distractor("wrong_operation", "The passage argues that delays are useful."),
        ],
      }),
    );
    expect(reading.status).toBe("needs_editorial_review");
    expect(reading.correctOption).toBe("A");
    expect(reading.contentRights.sourceFidelity).toBe("not_run");
    expect(reading.contentRights.similarityIsNotLicense).toBe(true);
    expect(reading.contentRights.surfaceScreen).toBe("not_run");
    const missingQuote = assembleItem(
      draft({
        modelId: "reading.evidence_based",
        sources: [granted],
        source: { kind: "reading", passageId: "reading-1", sourceId: "src-harbor", passage, questionPlan: harborPlan },
        core: core({ promptVersion: "item-model.reading.v3.4", sourceReferences: ["span-1"], reading: { ...harborReading, evidenceSpan: { id: "span-1", quote: "a sentence that never occurs" } } }),
      }),
    );
    expect(missingQuote.failure).toBe("evidence_not_in_passage");
    const unclear = assembleItem(
      draft({
        modelId: "reading.evidence_based",
        sources: [{ ...granted, usageRights: "unclear" }],
        source: { kind: "reading", passageId: "reading-1", sourceId: "src-harbor", passage, questionPlan: harborPlan },
        core: core({ promptVersion: "item-model.reading.v3.4", sourceReferences: ["span-1"], reading: harborReading }),
      }),
    );
    expect(unclear.failure).toBe("usage_rights_unclear");
    expect(unclear.production.proceededToDistractors).toBe(false);
  });
});

describe("editorial review and difficulty", () => {
  it("records the editor and withholds calibration until student responses exist", () => {
    const queued = assembleItem(draft());
    const approved = applyEditorialReview(queued, { decision: "approve", reviewer: "eda", rationale: "One defensible key.", at: "2026-11-15T12:00:00.000Z" });
    expect(approved.status).toBe("editor_approved");
    expect(approved.reviews[0]).toMatchObject({ reviewer: "eda", appliesToVersion: 1, reviewVersion: "item-review.v1" });
    expect(approved.publishState).toBe("unpublished");
    const pretest = applyEditorialReview(approved, { decision: "send_to_pretest", reviewer: "eda", rationale: "Ready for a pretest.", at: "2026-11-15T12:05:00.000Z" });
    expect(pretest.status).toBe("pretest_ready");
    expect(() => applyEditorialReview(pretest, { decision: "record_calibration", reviewer: "eda", rationale: "No forms yet.", at: "2026-11-15T12:10:00.000Z" })).toThrow(/student responses/);
    const calibrated = applyEditorialReview(pretest, {
      decision: "record_calibration",
      reviewer: "eda",
      rationale: "Thirty responses.",
      at: "2026-11-15T12:20:00.000Z",
      responses: [
        { option: "A", abilityBand: "high" },
        { option: "A", abilityBand: "high" },
        { option: "B", abilityBand: "low" },
        { option: "C", abilityBand: "low" },
      ],
    });
    expect(calibrated.status).toBe("calibrated");
    expect(calibrated.observedDifficulty.basis).toBe("observed_counts");
    expect(calibrated.observedDifficulty.correctRate).toBe(0.5);
    expect(calibrated.observedDifficulty.discrimination).toBe(1);
    expect(verifiedDifficulty(calibrated.targetDifficulty, calibrated.observedDifficulty)).toBeNull();
    expect(calibrated.publishState).toBe("unpublished");
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    expect(() => applyEditorialReview(approved, { decision: "record_calibration", reviewer: "eda", rationale: "Skip pretest.", at: "2026-11-15T12:20:00.000Z", responses: [{ option: "A" }] })).toThrow(/cannot record_calibration/);
  });

  it("leaves difficulty unobserved when there are no responses", () => {
    expect(observeResponses("A", null).basis).toBe("unobserved");
    expect(observeResponses("A", []).discrimination).toBeNull();
  });
});

describe("benchmark plan", () => {
  it("freezes ninety items, refuses a looser budget, and does not start", () => {
    const plan = freezeBenchmarkPlan({ generator: "writer-test", judge: "judge-test" });
    expect(plan.total).toBe(90);
    expect(plan.perType).toBe(30);
    expect(plan.autoStart).toBe(false);
    expect(plan.publishToStudentBank).toBe(false);
    expect(plan.maxRegenerations).toBe(0);
    expect(plan.promptVersions.reading).toBe("item-model.reading.v3.4");
    expect(() => freezeBenchmarkPlan({ generator: "same", judge: "same" })).toThrow(/different models/);
    expect(() => assertBenchmarkBudget({ maxCalls: benchmarkCeilings.maxCalls + 1, maxRegenerations: 0, maxCostUsd: 1 })).toThrow(/maxCalls/);
    expect(() => assertBenchmarkBudget({ maxCalls: 360, maxRegenerations: 1, maxCostUsd: 1 })).toThrow(/maxRegenerations/);
    const refused = runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan });
    expect(refused.started).toBe(false);
    expect(refused.reason).toMatch(/not started/);
    expect(() => runItemBenchmark({ authorization: "please", limits: { maxCalls: 10, maxRegenerations: 0, maxCostUsd: 1 }, plan })).toThrow(/authorization/);
    expect(() => runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 10, maxRegenerations: 0, maxCostUsd: 1 }, plan, overrides: { prompt: "v2" } })).toThrow(/refuses/);
    expect(judgeThresholds.reject.correctness).toBe(0.6);
    expect(judgeThresholds.approve.correctness).toBe(0.85);
  });

  it("scores the engineering bar without treating it as an academic standard", () => {
    const accepted = { structurallyComplete: true, editorAccepted: true, singleBestAnswer: true, functionalDistractors: 2 };
    const items = [...Array(7).fill(accepted), { ...accepted, editorAccepted: false }, { ...accepted, editorAccepted: false }, { structurallyComplete: true, editorAccepted: false, singleBestAnswer: false, functionalDistractors: 0 }];
    const score = scoreRubric(items);
    expect(score.meets).toBe(true);
    expect(score.standard).toBe("outklas_engineering");
    expect(scoreRubric([{ structurallyComplete: true, editorAccepted: true, singleBestAnswer: false, functionalDistractors: 2 }]).meets).toBe(false);
  });

  it("names the factory pieces this path uses", () => {
    expect(factoryReuse.used).toContain("judgeDecision");
    expect(factoryReuse.notUsed).toContain("validateCandidate");
  });
});
