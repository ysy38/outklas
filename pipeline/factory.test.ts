import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { analysisDraft } from "@/modules/analysis/contract";
import { toDnaQuestion } from "@/modules/analysis/dna";
import { familyBlueprints } from "@/modules/factory/families";
import { buildExamProfile } from "@/modules/factory/profile";
import { buildQuestionSpec } from "@/modules/factory/spec-engine";
import { validateCandidate } from "@/modules/factory/validator";
import { loadAIConfig } from "./ai/config";
import { generatorPromptVersion, generatorResponseSchema, generatorSystem, generatorUser } from "./ai/prompts/generator.v3";
import { acceptabilitySystem, acceptabilityUser } from "./ai/prompts/acceptability.v1";
import { judgeUser } from "./ai/prompts/judge.v2";
import { distractorJudgeUser } from "./ai/prompts/distractor-judge.v3";
import { createAIService, JudgeNotIndependent } from "./ai/service";
import type { AIProvider, ModelRequest, ModelResponse } from "./ai/types";
import { mkdirSync, writeFileSync } from "node:fs";
import { distractorDecision, distractorJudgeReport, distractorJudgeReportFor, validateDistractor, type DistractorJudgeReport, type ExperimentalJudgeReport, type GeneratedDistractor } from "@/modules/factory/distractor";
import { parseExperiments, type FactoryExperiment } from "@/modules/factory/experiments";
import { buildDistractorSpecs, type DistractorSpec } from "@/modules/factory/distractor-spec";
import type { ItemExplanation } from "@/modules/factory/explanation";
import { advance, generationTransitions, IllegalTransition, newTrace } from "@/modules/factory/generation";
import { applyReview } from "@/modules/factory/review";
import { validateSkeleton, type QuestionSkeleton, type SkeletonCheckReport } from "@/modules/factory/skeleton";
import { defaultFactoryThresholds } from "@/modules/factory/thresholds";
import { clauseReuse, longestSharedPhrase, originalityIndex } from "@/modules/factory/validator";
import { distractorSystem, distractorUser } from "./ai/prompts/distractor.v4";
import { distractorSystemFor, distractorUserFor } from "./ai/prompts/distractor.v5";
import { distractorRevisionSystem, distractorRevisionUser } from "./ai/prompts/distractor.v6";
import { distractorJudgeSystemFor } from "./ai/prompts/distractor-judge.v4";
import { distractorJudgeRevisionSystem, distractorJudgeRevisionUser } from "./ai/prompts/distractor-judge.v6";
import { requestHash } from "./ai/cache";
import { factoryBlindScore, factoryBlindSheet } from "./stages/benchmark";
import { goldForOption } from "./stages/calibrate";
import { judgeSystem } from "./ai/prompts/judge.v2";
import type { AIResult, AIService } from "./ai/types";
import { assertTextFree } from "./lib/text-free";
import { generateItem, type RunContext } from "./stages/atomic";
import { assertRunWritable, factorySlice, sliceLimit, sliceMetrics, sliceSpend } from "./stages/factory";
import { relabelTrace } from "./stages/rescore";
import { SpendBudget } from "./ai/budget";
import { calibratedBand } from "@/modules/factory/audit";
import { contextIssues, hasPastPerfect, mainClauseFrame, type MainClauseFrame } from "@/modules/factory/context";
import { judgeDecision } from "@/modules/factory/judge";

describe("goldForOption (judge calibration)", () => {
  const map = { A: "A", B: "B", C: "C", D: "D", E: "E" } as const;
  it("marks APPROVE wrong options good unless flagged", () => {
    expect(goldForOption({ factoryOption: "A", key: "B", overall: "APPROVE", blindToFactory: map })).toBe("good");
    expect(goldForOption({ factoryOption: "C", key: "B", overall: "APPROVE", second_defensible: "C", blindToFactory: map })).toBe("bad");
    expect(goldForOption({ factoryOption: "B", key: "B", overall: "APPROVE", blindToFactory: map })).toBeNull();
  });
  it("marks EDIT/REJECT wrong options as bad/suspect", () => {
    expect(goldForOption({ factoryOption: "A", key: "E", overall: "REJECT", blindToFactory: map })).toBe("bad");
    expect(goldForOption({ factoryOption: "A", key: "E", overall: "EDIT", blindToFactory: map })).toBe("bad");
  });
});

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "tomo-factory-"));
  process.env.ANALYSIS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ANALYSIS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

const long = (connector: string, n: number) => `${connector} ${Array.from({ length: n }, (_, i) => `w${i}`).join(" ")}`;
const rows = ["yds-2018", "yds-2018-2", "yds-2023-10", "yds-2024-11"].map((document, index) =>
  toDnaQuestion({
    document,
    question: { number: 30 + index, section: "sentence", layout: "blank", stimulusKey: null, stimulus: null, stem: long("Fixture stem", 14) + " ----.", options: { A: long("although", 15), B: long("because", 16), C: long("unless", 17), D: long("whereas", 18), E: long("until", 15) }, translationDirection: null },
    analysis: analysisDraft.parse({
      question_number: 30 + index,
      question_type: "question_type:sentence_completion",
      correct_option: "A",
      knowledge: { primary_concepts: ["discourse_relation:concession"], secondary_concepts: [], grammar: ["grammar:adverbial_clause"], vocabulary: [], discourse_relations: ["discourse_relation:concession"] },
      skills: { primary: "skill:coherence", secondary: [], cognitive: ["cognitive_skill:logical_relationship"] },
      difficulty: { overall: 0.55, lexical: 0.3, syntactic: 0.4, semantic: 0.5, inference: 0.5, distractor_similarity: 0.6, context_dependency: 0.4 },
      answer_expresses: ["connector:although"],
      distractors: (["B", "C", "D", "E"] as const).map((label) => ({ label, type: "distractor_type:wrong_discourse_relation", expresses: null, targeted_concept: null, misconception: null, why_plausible: "x", why_wrong: "y" })),
      misconceptions: [],
      prerequisites: [],
      learning_objective: "tell concession from contrast",
      pedagogy: { cognitive_demand: "analyze", transfer_requirement: "medium" },
      proposals: [],
      ambiguities: [],
      confidence: 0.9,
      needs_review: false,
    }),
    answer: "A",
    textSha256: "0".repeat(64),
    proposals: [],
  }),
);
const profile = buildExamProfile(rows);
const spec = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 2 });

const candidateJson = {
  question: {
    stem: "----, many desert plants survive long periods without any rain at all.",
    options: {
      A: "Whereas most forest trees depend on deep roots to collect underground water",
      B: "Although their thin roots reach only a few centimetres below the dry surface",
      C: "Because their leaves lose large amounts of water during the hottest hours",
      D: "Unless scientists measure the exact amount of water stored in each stem",
      E: "Until the first seeds appear several weeks before the plants themselves grow",
    },
  },
  correctOption: "B",
  explanation: "Doğru cevap B. 'although' beklentinin tersine bir durumu anlatır: kökler kısa olduğu halde bitkiler yaşar. Diğer şıklar karşılaştırma, sebep, koşul ya da zaman bildirir.",
  distractorRationales: spec.distractorPlan.map((slot) => ({ option: slot.option, distractorType: slot.distractorType, misconception: slot.misconception, whyPlausible: "Akıcı görünür.", whyWrong: "İlişki uymaz." })),
  targetConcept: spec.primaryConcept,
  targetSkill: spec.targetSkill,
  metadata: { connectorByOption: { A: "whereas", B: "although", C: "because", D: "unless", E: "until" }, selfRatedDifficulty: "medium" },
};
const judgeJson = {
  scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 },
  alternativeDefensibleOptions: [],
  estimatedDifficulty: "medium",
  verdict: "APPROVE",
  reasons: ["clean"],
};
const acceptabilityJson = {
  sentences: (["A", "B", "C", "D", "E"] as const).map((option) => ({ option, acceptable: option === "B", confidence: 0.9, reason: "relation check" })),
};

function scripted(): AIProvider & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  return {
    name: "fake",
    calls,
    async generate(request): Promise<ModelResponse> {
      calls.push(request);
      const text = request.system?.startsWith("ROLE")
        ? JSON.stringify(candidateJson)
        : request.system?.startsWith("You are taking")
          ? JSON.stringify({ answer: "B", confidence: 0.9, rationale: "concessive clause" })
          : request.system === acceptabilitySystem
            ? JSON.stringify(acceptabilityJson)
            : JSON.stringify(judgeJson);
      return { text, model: request.model, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
    },
  };
}

describe("generator prompt", () => {
  it("keeps static rules in the system layer and the spec in the user layer", () => {
    const system = generatorSystem(spec);
    const user = generatorUser(spec);
    for (const layer of ["ROLE", "YDS RULES", "QUESTION TYPE RULES", "FAMILY RULES", "OUTPUT"]) expect(system).toContain(layer);
    for (const layer of ["PEDAGOGICAL TARGET", "QUESTION SPEC", "GENERATION CONSTRAINTS"]) expect(user).toContain(layer);
    expect(system).not.toContain(spec.id);
    expect(system).not.toContain(spec.contextConstraints.domain);
    expect(generatorSystem(buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 7 }))).toBe(system);
    expect(user).toContain(`"${spec.id}"`);
    expect(user).toContain("B) CORRECT");
    expect(user).not.toContain("evidenceReferences");
    expect(generatorPromptVersion).toBe("generator.v3");
  });

  it("never carries historical item text or few-shot examples", () => {
    const prompt = `${generatorSystem(spec)}\n${generatorUser(spec)}`;
    expect(prompt).not.toMatch(/PASSAGE:|\nITEM\n|EXAMPLES?:|Example \d|few-shot/);
    expect(readFileSync(path.join(process.cwd(), "pipeline/ai/prompts/generator.v3.ts"), "utf8")).not.toMatch(/from "\.\/item"|\.data|readFileSync/);
  });

  it("refuses types and families it has no rules for", () => {
    expect(() => generatorSystem({ ...spec, questionType: "question_type:cloze" })).toThrow(/no rules/);
  });

  it("constrains taxonomy fields to canonical nodes", () => {
    const schema = generatorResponseSchema() as { properties: Record<string, any> };
    const rationale = schema.properties.distractorRationales.items.properties;
    expect(rationale.distractorType.enum.every((value: string) => value.startsWith("distractor_type:"))).toBe(true);
    expect(rationale.misconception.anyOf.find((option: any) => option.enum).enum).toContain("misconception:concession_vs_contrast");
    expect(schema.properties.targetSkill.enum.every((value: string) => value.startsWith("skill:"))).toBe(true);
  });
});

describe("judge", () => {
  it("does not reveal the blind answer and lists only warning codes", () => {
    const validation = validateCandidate({ spec, candidate: candidateJson as never });
    const prompt = judgeUser({ spec, candidate: candidateJson as never, validation });
    expect(prompt).toContain("KEY: B");
    expect(prompt).not.toContain("blind");
  });

  it("solves blind, checks each sentence and reviews with the judge model, and refuses to judge with the generator model", async () => {
    const provider = scripted();
    const service = createAIService(loadAIConfig({ GENERATOR_MODEL: "gen", JUDGE_MODEL: "judge" }), provider);
    const generated = await service.generator.generate(spec);
    expect(generated.value.correctOption).toBe("B");
    expect(provider.calls[0].model).toBe("gen");
    const validation = validateCandidate({ spec, candidate: generated.value });
    const evaluation = await service.judge.evaluate(generated.value, spec, validation);
    expect(evaluation.blind.value.answer).toBe("B");
    expect(evaluation.report.value.verdict).toBe("APPROVE");
    expect(evaluation.acceptability.value.sentences.filter((entry) => entry.acceptable).map((entry) => entry.option)).toEqual(["B"]);
    expect(provider.calls.slice(1).map((call) => call.model)).toEqual(["judge", "judge", "judge"]);
    for (const call of provider.calls.slice(1, 3)) expect(call.parts.map((part) => ("text" in part ? part.text : "")).join("")).not.toContain("KEY");
    const same = createAIService(loadAIConfig({ GENERATOR_MODEL: "m", JUDGE_MODEL: "m" }), scripted());
    await expect(same.judge.evaluate(generated.value, spec, validation)).rejects.toBeInstanceOf(JudgeNotIndependent);
  });

  it("checks each completed sentence without the key or a single-answer framing", () => {
    const prompt = `${acceptabilitySystem}\n${acceptabilityUser(candidateJson)}`;
    expect(prompt).toContain("B. Although their thin roots reach only a few centimetres below the dry surface, many desert plants survive");
    expect(prompt).toContain("D. Unless scientists measure");
    expect(prompt).not.toMatch(/KEY|correct option|answer key/i);
    expect(prompt).not.toContain("----");
  });
});

describe("exam profile artifact", () => {
  it("is text-free", () => {
    expect(() => assertTextFree(profile)).not.toThrow();
  });
});

describe("factory slice", () => {
  it("refuses bulk generation and unknown families before any model call", async () => {
    await expect(factorySlice({ family: "sentence_completion.concession", count: sliceLimit + 1 })).rejects.toThrow(/bulk generation/);
    await expect(factorySlice({ family: "yokdil.anything", count: 1 })).rejects.toThrow(/Unknown family/);
    await expect(factorySlice({ family: "sentence_completion.concession", count: 1, tag: "../x" })).rejects.toThrow(/tag/);
  });

  it("never overwrites a run that holds human decisions", () => {
    const run = path.join(dir, "run");
    expect(() => assertRunWritable(run)).not.toThrow();
    mkdirSync(path.join(run, "candidates"), { recursive: true });
    writeFileSync(path.join(run, "candidates", "a.json"), JSON.stringify({ reviews: [] }));
    expect(() => assertRunWritable(run)).not.toThrow();
    writeFileSync(path.join(run, "candidates", "b.json"), JSON.stringify({ reviews: [{ decision: "REJECT" }] }));
    expect(() => assertRunWritable(run)).toThrow(/never overwritten/);
  });
});

const skeleton: QuestionSkeleton = {
  context: null,
  stem: "----, many patients continue to take the prescribed medicine for several months without complaint.",
  correctAnswer: "Although the treatment causes mild headaches and some tiredness during the first weeks",
};
const fine: Record<string, string> = {
  A: "Because the national health authority approved the drug only after a long clinical trial",
  C: "Unless doctors record every side effect in a separate file kept at the hospital",
  D: "Until the first results of the study were published in a respected medical journal",
  E: "Whereas most nurses prefer to give injections in the morning rather than in the evening",
};
const dspecs = buildDistractorSpecs(spec);
const dspec = (option: string) => dspecs.find((entry) => entry.option === option)!;
const review = (patch: Partial<DistractorJudgeReport> = {}): DistractorJudgeReport => ({
  standaloneSentenceAcceptable: false,
  grammaticalValidity: 0.95,
  semanticCoherence: 0.9,
  unintendedCorrectness: 0.05,
  answerClauseReuse: 0.05,
  ambiguity: 0.05,
  obviouslyWrong: 0.1,
  competentCandidateCouldSelect: false,
  confidence: 0.9,
  reasons: ["the cause does not fit"],
  ...patch,
});

describe("distractor specs", () => {
  it("builds one deterministic spec per wrong option with distinct roles and failure modes", () => {
    expect(buildDistractorSpecs(spec)).toEqual(dspecs);
    expect(dspecs.map((entry) => entry.option)).toEqual(spec.distractorPlan.map((slot) => slot.option));
    expect(new Set(dspecs.map((entry) => entry.role)).size).toBe(4);
    expect(dspecs.map((entry) => entry.semanticConstraint.failureMode)).toEqual(["reason_supports_opposite", "condition_cannot_restrict", "impossible_time_order", "no_real_opposition"]);
    for (const entry of dspecs) {
      expect(entry.relationConstraint.mustNotExpress).toEqual(["discourse_relation:concession"]);
      expect(entry.forbiddenProperties).toContain("reuses_answer_clause");
      expect(entry.grammarConstraint.capitalised).toBe(true);
      expect(entry.lexicalConstraint.forbiddenWords).toContain("although");
    }
  });

  it("explains a repeated type with a distinct relation and refuses a repeated mechanism", () => {
    expect(dspec("A").repeatedTypeReason).toBe("distinct_relation");
    expect(dspec("D").repeatedTypeReason).toBeNull();
    const twice = { ...spec, distractorPlan: spec.distractorPlan.map((slot) => (slot.option === "C" ? { ...spec.distractorPlan[0], option: "C" as const } : slot)) };
    expect(() => buildDistractorSpecs(twice)).toThrow(/repeats the mechanism/);
    const bare = { ...spec, distractorPlan: spec.distractorPlan.map((slot) => (slot.option === "C" ? { ...slot, expresses: null } : slot)) };
    expect(() => buildDistractorSpecs(bare)).toThrow(/without a distinct relation/);
  });

  it("takes the answer-reuse limits from config", () => {
    const strict = buildDistractorSpecs(spec, { ...defaultFactoryThresholds, answerReuseTokenOverlap: 0.6 });
    expect(strict[0].lexicalConstraint.maxAnswerTokenOverlap).toBe(0.6);
  });
});

describe("skeleton validation", () => {
  it("accepts a clean skeleton", () => {
    expect(validateSkeleton({ spec, skeleton }).status).toBe("pass");
  });

  it.each([
    ["blank_count", { stem: "Many patients continue to take the prescribed medicine for several months without complaint." }],
    ["blank_position", { stem: "Many patients continue to take the prescribed medicine for several months without complaint ----." }],
    ["stem_punctuation", { stem: "---- many patients continue to take the prescribed medicine for several months without complaint." }],
    ["unexpected_context", { context: "A short passage that sentence completion items never have." }],
    ["answer_punctuation", { correctAnswer: `${skeleton.correctAnswer},` }],
    ["answer_connector_not_allowed", { correctAnswer: "Whereas the treatment causes mild headaches and some tiredness during the first weeks" }],
    ["answer_not_clause", { correctAnswer: "Although headaches" }],
    ["answer_leak_in_stem", { stem: "----, many patients nevertheless continue to take the prescribed medicine for several months." }],
    ["non_english_text", { correctAnswer: "Although tedavi baş ağrısı yapsa da hastalar ilacı almaya devam ediyor ve şikayet etmiyor" }],
  ])("rejects %s", (code, patch) => {
    const result = validateSkeleton({ spec, skeleton: { ...skeleton, ...patch } });
    expect(result.status).toBe("reject");
    expect(result.issues.map((issue) => issue.code)).toContain(code);
  });

  it("rejects a stem that repeats a sibling or historical text", () => {
    expect(validateSkeleton({ spec, skeleton, siblingStems: [skeleton.stem] }).issues.map((issue) => issue.code)).toContain("duplicate_of_sibling");
    const historical = originalityIndex([`${skeleton.correctAnswer.slice(9)}, many patients continue`]);
    expect(validateSkeleton({ spec, skeleton, originality: historical }).issues.map((issue) => issue.code)).toContain("source_overlap");
  });
});

describe("distractor validation", () => {
  const check = (option: string, text: string, accepted: { option: "A" | "C" | "D" | "E"; text: string }[] = []) => validateDistractor({ dspec: dspec(option), skeleton, text, accepted });

  it("accepts a distractor that opens with its own connector", () => {
    for (const option of ["A", "C", "D", "E"]) expect(check(option, fine[option]).status).toBe("pass");
  });

  it("treats a connector swap of the answer as a critical copy and allows natural topic overlap", () => {
    const swap = check("A", "Because the treatment causes mild headaches and some tiredness during the first weeks");
    expect(swap.issues.find((issue) => issue.code === "answer_clause_reuse")?.severity).toBe("critical");
    expect(check("A", "Because the treatment causes serious problems for older patients with weak hearts").status).toBe("pass");
  });

  it("reads the reuse limits from config", () => {
    const text = "Because the treatment causes mild headaches in some older patients at the clinic";
    const loose = clauseReuse(skeleton.correctAnswer, text);
    const strict = clauseReuse(skeleton.correctAnswer, text, { ...defaultFactoryThresholds, answerReuseTokenOverlap: Math.max(0.05, loose.tokenOverlap - 0.05), answerReuseTokenWarn: 0.01 });
    expect(strict.level).toBe("copy");
  });

  it.each([
    ["distractor_connector_mismatch", "A", "If the national health authority approved the drug only after a long clinical trial"],
    ["forbidden_marker_in_distractor", "A", "Because patients take the drug even though the authority approved it after a long trial"],
    ["option_punctuation", "A", `${fine.A}.`],
    ["capitalisation", "A", fine.A.charAt(0).toLowerCase() + fine.A.slice(1)],
    ["length_far_out", "A", "Because it works"],
  ])("rejects %s", (code, option, text) => {
    expect(check(option, text).issues.map((issue) => issue.code)).toContain(code);
  });

  it("rejects a text the writer already had rejected for this option", () => {
    const again = validateDistractor({ dspec: dspec("A"), skeleton, text: `${fine.A} `, accepted: [], rejected: [fine.A] });
    expect(again.issues.map((issue) => issue.code)).toContain("repeats_rejected_attempt");
  });

  it("rejects a wrong option that restates the stem", () => {
    const echo = check("E", "Whereas many patients take the prescribed medicine for only a few months");
    expect(echo.issues.find((issue) => issue.code === "stem_echo")).toMatchObject({ severity: "critical", detail: "patients take prescribed medicine months" });
    expect(check("E", fine.E).issues.map((issue) => issue.code)).not.toContain("stem_echo");
  });

  it("rejects a wrong option that shares the key's wording so a candidate could match it", () => {
    const echo = check("A", "Because the treatment causes headaches and tiredness in older patients with weak hearts");
    expect(echo.issues.find((issue) => issue.code === "answer_shared_wording")).toMatchObject({ severity: "critical", detail: "treatment causes headaches tiredness" });
    expect(validateDistractor({ dspec: dspec("A"), skeleton, text: "Because the treatment causes headaches and tiredness in older patients with weak hearts", accepted: [], thresholds: { ...defaultFactoryThresholds, answerSharedContentWords: 5 } }).issues.map((issue) => issue.code)).not.toContain("answer_shared_wording");
  });

  it("rejects a repeated connector or a copy of an accepted distractor", () => {
    expect(check("C", "If doctors record every side effect in a separate file kept at the hospital", [{ option: "A", text: "If the drug works" }]).issues.map((issue) => issue.code)).toContain("connector_repeated");
    expect(check("C", "Unless the national health authority approved the drug only after a long clinical trial", [{ option: "A", text: fine.A }]).issues.map((issue) => issue.code)).toContain("distractor_clause_reuse");
  });
});

describe("distractor judge decision", () => {
  const decide = (patch: Partial<DistractorJudgeReport> = {}, threshold = 0.5) => distractorDecision({ dspec: dspec("A"), report: review(patch), thresholds: { ...defaultFactoryThresholds, distractorAcceptability: threshold } });

  it("accepts a grammatical, coherent option that fails as a completed sentence", () => {
    expect(decide()).toMatchObject({ decision: "ACCEPT", failures: [], concerns: [] });
  });

  it("regenerates an option a competent candidate could select or that reads as acceptable", () => {
    expect(decide({ competentCandidateCouldSelect: true })).toMatchObject({ decision: "REGENERATE", failures: ["competent_candidate_could_select"] });
    expect(decide({ standaloneSentenceAcceptable: true }).decision).toBe("REGENERATE");
    expect(decide({ unintendedCorrectness: 0.7 }).failures).toContain("unintended_correctness");
    expect(decide({ answerClauseReuse: 0.8 }).failures).toContain("answer_clause_reuse");
    expect(decide({ grammaticalValidity: 0.2 }).failures).toContain("ungrammatical");
  });

  it("regenerates an option even a weak candidate would dismiss at a glance", () => {
    expect(decide({ obviouslyWrong: 0.8 })).toMatchObject({ decision: "REGENERATE", failures: ["too_obvious"] });
  });

  it("leaves the connector role and relation to the deterministic checks", () => {
    expect(Object.keys(distractorJudgeReport.shape)).not.toEqual(expect.arrayContaining(["targetRelationValidity"]));
    expect(Object.keys(distractorJudgeReport.shape)).not.toEqual(expect.arrayContaining(["distractorRoleAlignment"]));
    expect(distractorJudgeUser({ dspec: dspec("A"), skeleton, text: fine.A })).not.toMatch(/ROLE|fail by|expressing/);
  });

  it("sends an unsure reviewer to a human instead of deciding", () => {
    expect(decide({ competentCandidateCouldSelect: true, confidence: 0.3 })).toMatchObject({ decision: "HUMAN_REVIEW", failures: [] });
    expect(decide({ unintendedCorrectness: 0.3 }).decision).toBe("HUMAN_REVIEW");
    expect(decide({ ambiguity: 0.6 }).concerns).toContain("ambiguous");
  });

  it("moves with the single acceptability threshold", () => {
    expect(decide({ unintendedCorrectness: 0.6 }, 0.5).decision).toBe("REGENERATE");
    expect(decide({ unintendedCorrectness: 0.6 }, 0.8).decision).toBe("HUMAN_REVIEW");
  });
});

describe("distractor experiments", () => {
  const decideWith = (experiments: FactoryExperiment[], patch: Partial<ExperimentalJudgeReport>) => distractorDecision({ dspec: dspec("A"), report: { ...review(), ...patch }, experiments });

  it("parses FACTORY_EXPERIMENTS order-free and fails loudly on an unknown name", () => {
    expect(parseExperiments(undefined)).toEqual([]);
    expect(parseExperiments(" lexical, contrast,lexical ")).toEqual(["contrast", "lexical"]);
    expect(() => parseExperiments("contrast,bigger")).toThrow(/Unknown factory experiment/);
  });

  it("keeps the baseline judge contract when no experiment is on", () => {
    expect(distractorJudgeReportFor([])).toBe(distractorJudgeReport);
    expect(decideWith([], { relationHolds: 1, negatesStem: true, contextualPlausibility: 0 })).toMatchObject({ decision: "ACCEPT", version: "distractor-judge.v3" });
  });

  it("puts the reasons before the verdict under the contrast experiment", () => {
    const keys = (experiments: FactoryExperiment[]) => Object.keys((distractorJudgeReportFor(experiments) as unknown as { shape: Record<string, unknown> }).shape);
    expect(keys(["contrast"])[0]).toBe("reasons");
    expect(keys(["contrast"]).slice(-2)).toEqual(["competentCandidateCouldSelect", "confidence"]);
    expect(keys(["plausibility"]).at(-1)).toBe("reasons");
  });

  it("judges relation, plausibility and rewriting as separate dimensions, each owned by one experiment", () => {
    expect(decideWith(["contrast"], { relationHolds: 0.8 }).failures).toEqual(["relation_holds"]);
    expect(decideWith(["contrast"], { negatesStem: true }).failures).toEqual(["negates_stem"]);
    expect(decideWith(["plausibility"], { contextualPlausibility: 0.2 }).failures).toEqual(["implausible_scenario"]);
    expect(decideWith(["plausibility"], { tenseCompatible: false }).failures).toEqual(["tense_incompatible"]);
    expect(decideWith(["plausibility"], { worldKnowledgeAloneEliminates: true, confidence: 0.3 })).toMatchObject({ decision: "HUMAN_REVIEW", concerns: ["eliminable_by_world_knowledge", "low_confidence"] });
    expect(decideWith(["lexical"], { superficialRewrite: 0.9 }).failures).toEqual(["superficial_rewrite"]);
    expect(decideWith(["lexical"], { relationHolds: 1 }).decision).toBe("ACCEPT");
    expect(decideWith(["contrast"], {}).version).toBe("distractor-judge.v4");
  });

  it("turns stem echo into a measured warning under the lexical experiment, keeping key-wording matches critical", () => {
    const text = "Whereas many patients take the prescribed medicine for only a few months";
    const lexical = validateDistractor({ dspec: dspec("E"), skeleton, text, accepted: [], experiments: ["lexical"] });
    expect(lexical.issues.find((issue) => issue.code === "stem_echo")?.severity).toBe("warn");
    expect(lexical.lexical.stemContentWords).toEqual(["patients", "take", "prescribed", "medicine", "months"]);
    const keyMatch = validateDistractor({ dspec: dspec("A"), skeleton, text: "Because the treatment causes headaches and tiredness in older patients with weak hearts", accepted: [], experiments: ["lexical"] });
    expect(keyMatch.issues.find((issue) => issue.code === "answer_shared_wording")?.severity).toBe("critical");
  });

  it("finds the longest phrase an option repeats from the stem", () => {
    expect(longestSharedPhrase("Many patients take the prescribed medicine ----.", "whereas they take the prescribed medicine daily")).toBe("take the prescribed medicine");
    expect(longestSharedPhrase("Many patients take it ----.", "because doctors agree")).toBe("");
  });

  it("adds one prompt section per experiment and leaves the baseline prompt untouched", () => {
    expect(distractorSystemFor([])).toBe(distractorSystem);
    const user = distractorUserFor({ dspec: dspec("A"), skeleton, usedConnectors: [], feedback: [], experiments: ["contrast", "plausibility", "lexical"] });
    expect(user.startsWith(distractorUser({ dspec: dspec("A"), skeleton, usedConnectors: [], feedback: [] }))).toBe(true);
    expect(user).toMatch(/SCENARIO AND TIME/);
    expect(user).toMatch(/WORDING/);
    expect(user).toMatch(/do not negate, reverse or restate/);
  });
});

describe("generation states", () => {
  const at = "2026-10-08T12:00:00.000Z";

  it("follows the atomic path and never returns to the skeleton", () => {
    let trace = newTrace(spec.id);
    for (const state of ["SKELETON_GENERATED", "SKELETON_VALIDATED", "DISTRACTORS_GENERATING", "DISTRACTORS_VALIDATED", "EXPLAINED", "ITEM_VALIDATED", "JUDGED", "HUMAN_REVIEW", "APPROVED"] as const) trace = advance(trace, state, at);
    expect(trace.history).toHaveLength(9);
    for (const state of ["DISTRACTORS_GENERATING", "DISTRACTORS_VALIDATED", "DISTRACTORS_FAILED", "EXPLAINED", "ITEM_VALIDATED", "JUDGED"] as const) {
      expect(generationTransitions[state]).not.toContain("SKELETON_GENERATED");
      expect(generationTransitions[state]).not.toContain("DRAFT");
    }
    expect(() => advance(trace, "HUMAN_REVIEW", at)).toThrow(IllegalTransition);
    expect(() => advance(newTrace(spec.id), "JUDGED", at)).toThrow(IllegalTransition);
  });
});

const hashOf = (n: number) => n.toString(16).padStart(64, "0");
let counter = 0;
const result = <T>(value: T, model: string): AIResult<T> => ({ value, provider: "gemini", model, promptVersion: "test", requestHash: hashOf(++counter), usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, cached: false });
const explanationJson: ItemExplanation = {
  explanation: "Doğru cevap B. 'although' beklentinin tersine bir durumu bildirir: yan etkilere rağmen hastalar ilacı almaya devam eder. Diğer seçenekler sebep, koşul, zaman ya da karşıtlık bildirir.",
  distractorRationales: (["A", "C", "D", "E"] as const).map((option) => ({ option, whyPlausible: "Akıcı ve konuyla ilgili görünür.", whyWrong: "Bildirdiği ilişki cümlenin iki yarısını bağlamaz." })),
  transferNote: "Beklenmeyen bir sonuç varsa önce 'although' grubunu düşün.",
  estimatedDifficulty: "medium",
};

type Script = { skeletons?: QuestionSkeleton[]; distractors?: Record<string, string[]>; reviews?: Record<string, DistractorJudgeReport[]>; explanations?: ItemExplanation[]; verdict?: "APPROVE" | "REJECT"; gate?: SkeletonCheckReport[] };

function fakeService(script: Script) {
  const log: string[] = [];
  const skeletons = [...(script.skeletons ?? [skeleton])];
  const queues = Object.fromEntries(["A", "C", "D", "E"].map((option) => [option, [...(script.distractors?.[option] ?? [fine[option]])]]));
  const reviews = Object.fromEntries(["A", "C", "D", "E"].map((option) => [option, [...(script.reviews?.[option] ?? [])]]));
  const explanations = [...(script.explanations ?? [explanationJson])];
  const take = <T>(queue: T[]) => (queue.length > 1 ? queue.shift()! : queue[0]);
  const service = {
    factory: {
      skeleton: async (_spec: unknown, feedback: string[]) => {
        log.push(`skeleton${feedback.length ? "+feedback" : ""}`);
        return result(take(skeletons), "gen");
      },
      ...(script.gate
        ? {
            checkSkeleton: async () => {
              log.push("gate");
              return result(take(script.gate!), "dj");
            },
          }
        : {}),
      distractor: async ({ dspec: entry, feedback }: { dspec: DistractorSpec; feedback: string[] }) => {
        log.push(`distractor:${entry.option}${feedback.length ? "+feedback" : ""}`);
        return result<GeneratedDistractor>({ text: take(queues[entry.option]), rationale: "fails as a whole" }, "gen");
      },
      judgeDistractor: async ({ dspec: entry }: { dspec: DistractorSpec }) => {
        log.push(`review:${entry.option}`);
        return result(reviews[entry.option].length ? take(reviews[entry.option]) : review(), "dj");
      },
      explain: async () => {
        log.push("explain");
        return result(take(explanations), "gen");
      },
    },
    judge: {
      evaluate: async () => {
        log.push("final-judge");
        return { blind: result({ answer: "B" as const, confidence: 0.9, rationale: "concession" }, "judge"), acceptability: result(acceptabilityJson, "judge"), report: result({ ...judgeJson, verdict: script.verdict ?? "APPROVE" }, "judge") };
      },
    },
  } as unknown as AIService;
  return { service, log };
}

const ctxFor = (service: AIService, env: Record<string, string> = {}): RunContext => ({
  service,
  config: loadAIConfig({ GENERATOR_MODEL: "gen", DISTRACTOR_MODEL: "gen", DISTRACTOR_JUDGE_MODEL: "dj", FINAL_JUDGE_MODEL: "judge", EXPLANATION_MODEL: "gen", ...env }),
  originality: originalityIndex([]),
  siblingStems: [],
  siblings: [],
  profileVersion: profile.version,
});

describe("atomic generation", () => {
  it("builds an item stage by stage and queues it for a human", async () => {
    const { service, log } = fakeService({});
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.error).toBeNull();
    expect(outcome.trace.state).toBe("HUMAN_REVIEW");
    expect(log).toEqual(["skeleton", "distractor:A", "review:A", "distractor:C", "review:C", "distractor:D", "review:D", "distractor:E", "review:E", "explain", "final-judge"]);
    expect(outcome.modelCalls).toBe(13);
    const record = outcome.record!;
    expect(record.status).toBe("pending_review");
    expect(record.versions[0].candidate.question.options).toEqual({ A: fine.A, B: skeleton.correctAnswer, C: fine.C, D: fine.D, E: fine.E });
    expect(record.versions[0].candidate.distractorRationales.map((entry) => entry.distractorType)).toEqual(spec.distractorPlan.map((slot) => slot.distractorType));
    expect(record.provenance).toMatchObject({ pipelineVersion: "atomic.v1", generatorModel: "gen", distractorJudgeModel: "dj", judgeModel: "judge", distractorSpecVersion: "distractor-spec.v6" });
    expect(record.provenance.attempts.map((attempt) => `${attempt.stage}:${attempt.option ?? "-"}:${attempt.attempt}`)).toEqual(["skeleton:-:1", "distractor:A:1", "distractor:C:1", "distractor:D:1", "distractor:E:1", "explanation:-:1"]);
    expect(record.provenance.attempts[1].judge).toMatchObject({ model: "dj", decision: "ACCEPT" });
    expect(applyReview(record, { decision: "APPROVE", reviewer: "mora", at: "2026-10-08T13:00:00.000Z" }).generation?.state).toBe("APPROVED");
  });

  it("regenerates only the failing distractor and records every attempt", async () => {
    const copy = "Because the treatment causes mild headaches and some tiredness during the first weeks";
    const { service, log } = fakeService({
      distractors: { A: [copy, "Because doctors usually prescribe it to patients who have already tried other drugs", fine.A] },
      reviews: { A: [review({ competentCandidateCouldSelect: true }), review()] },
    });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.state).toBe("HUMAN_REVIEW");
    expect(log.filter((entry) => entry === "skeleton")).toHaveLength(1);
    expect(log.filter((entry) => entry.startsWith("distractor:A"))).toEqual(["distractor:A", "distractor:A+feedback", "distractor:A+feedback"]);
    for (const option of ["C", "D", "E"]) expect(log.filter((entry) => entry.startsWith(`distractor:${option}`))).toHaveLength(1);
    const attemptsA = outcome.record!.provenance.attempts.filter((attempt) => attempt.option === "A");
    expect(attemptsA.map((attempt) => [attempt.attempt, attempt.judge?.decision ?? null])).toEqual([
      [1, null],
      [2, "REGENERATE"],
      [3, "ACCEPT"],
    ]);
    expect(attemptsA[0].rejectionReason).toMatch(/answer_clause_reuse/);
    expect(attemptsA.map((attempt) => attempt.output)).toEqual([copy, "Because doctors usually prescribe it to patients who have already tried other drugs", fine.A]);
    expect(attemptsA[1].judge?.reasons).toEqual(["the cause does not fit"]);
    expect(attemptsA[1].rejectionReason).toBe("competent_candidate_could_select");
    expect(outcome.record!.generation?.distractors.find((entry) => entry.option === "A")?.attempts).toBe(3);
  });

  it("does not send a repeated rejected text to the judge again", async () => {
    const { service, log } = fakeService({ distractors: { A: [fine.A, fine.A, "Because doctors usually prescribe it to patients who have already tried other drugs"] }, reviews: { A: [review({ competentCandidateCouldSelect: true }), review()] } });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.state).toBe("HUMAN_REVIEW");
    expect(log.filter((entry) => entry === "review:A")).toHaveLength(2);
    expect(outcome.record!.provenance.attempts.filter((attempt) => attempt.option === "A").map((attempt) => attempt.rejectionReason?.replace(/@A$/, "") ?? null)).toEqual(["competent_candidate_could_select", "repeats_rejected_attempt", null]);
  });

  it("stops after three rejected attempts without going back to the skeleton", async () => {
    const { service, log } = fakeService({ reviews: { C: [review({ competentCandidateCouldSelect: true })] }, distractors: { C: [fine.C, "If doctors record every side effect in a separate file kept at the hospital", "Unless nurses record every side effect in a separate file kept at the clinic"] } });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.state).toBe("DISTRACTORS_FAILED");
    expect(outcome.trace.failure).toMatch(/distractor_C_.*_rejected_after_3/);
    expect(outcome.record).toBeNull();
    expect(log.filter((entry) => entry === "skeleton")).toHaveLength(1);
    expect(log.filter((entry) => entry.startsWith("distractor:C"))).toHaveLength(3);
    expect(log).not.toContain("distractor:D");
    expect(outcome.trace.history.map((step) => step.to)).not.toContain("DRAFT");
  });

  it("passes an unsure distractor review on to the final decision as a concern", async () => {
    const { service } = fakeService({ reviews: { E: [review({ ambiguity: 0.7 })] } });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.distractors.find((entry) => entry.option === "E")?.decision).toBe("HUMAN_REVIEW");
    expect(outcome.record!.judge?.concerns).toContain("distractor_review_E");
  });

  it("retries a rejected skeleton up to three times and then gives up", async () => {
    const broken = { ...skeleton, stem: "Many patients continue to take the medicine for months without complaint." };
    const retried = fakeService({ skeletons: [broken, skeleton] });
    expect((await generateItem(spec, ctxFor(retried.service))).trace.state).toBe("HUMAN_REVIEW");
    expect(retried.log.slice(0, 2)).toEqual(["skeleton", "skeleton+feedback"]);
    const failed = fakeService({ skeletons: [broken] });
    const outcome = await generateItem(spec, ctxFor(failed.service));
    expect(outcome.trace.state).toBe("SKELETON_FAILED");
    expect(failed.log).toEqual(["skeleton", "skeleton+feedback", "skeleton+feedback"]);
    expect(outcome.trace.attempts.every((attempt) => attempt.rejectionReason?.includes("blank_count"))).toBe(true);
  });

  it("rewrites only the explanation when the explanation fails", async () => {
    const wrong = { ...explanationJson, explanation: "Doğru cevap C. 'although' beklentinin tersini bildirir; diğer seçenekler uymaz ve cümleyi bozar." };
    const { service, log } = fakeService({ explanations: [wrong, explanationJson] });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.state).toBe("HUMAN_REVIEW");
    expect(log.filter((entry) => entry === "explain")).toHaveLength(2);
    expect(log.filter((entry) => entry.startsWith("distractor:"))).toHaveLength(4);
    expect(outcome.record!.provenance.attempts.filter((attempt) => attempt.stage === "explanation").map((attempt) => attempt.validator.status)).toEqual(["reject", "pass"]);
  });

  it("lets the final judge reject a fully built item", async () => {
    const { service } = fakeService({ verdict: "REJECT" });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.state).toBe("REJECTED");
    expect(outcome.record!.status).toBe("judge_rejected");
  });

  it("refuses to judge a distractor with the model that wrote it", async () => {
    const service = createAIService(loadAIConfig({ DISTRACTOR_MODEL: "same", DISTRACTOR_JUDGE_MODEL: "same", FINAL_JUDGE_MODEL: "judge" }), scripted());
    await expect(service.factory.judgeDistractor({ dspec: dspec("A"), skeleton, text: fine.A })).rejects.toBeInstanceOf(JudgeNotIndependent);
  });

  it("summarises a slice per stage and per distractor role", async () => {
    const secondA = "Because doctors usually prescribe it to patients who have already tried other drugs";
    const first = await generateItem(spec, ctxFor(fakeService({ distractors: { A: [fine.A, secondA] }, reviews: { A: [review({ competentCandidateCouldSelect: true }), review()] } }).service));
    const otherC = ["If doctors record every side effect in a separate file kept at the hospital", "Unless nurses record every side effect in a separate file kept at the clinic"];
    const second = await generateItem(spec, ctxFor(fakeService({ distractors: { C: [fine.C, ...otherC] }, reviews: { C: [review({ competentCandidateCouldSelect: true })] } }).service));
    const metrics = sliceMetrics([first, second], 30);
    expect(metrics.skeleton).toMatchObject({ generated: 2, acceptedItems: 2 });
    expect(metrics.distractors).toMatchObject({ acceptedFirstTry: 4, regenerated: 2, acceptedAfterRegeneration: 1, rejectedAfterLimit: 1 });
    expect(metrics.byRole.find((entry) => entry.role === "wrong_discourse_relation:cause")).toMatchObject({ slots: 2, firstTryRate: 0.5, acceptedRate: 1 });
    expect(Object.fromEntries(metrics.endStates)).toEqual({ HUMAN_REVIEW: 1, DISTRACTORS_FAILED: 1 });
    expect(metrics.avgProviderCallsPerItem).toBe(15);
  });
});

describe("final judge prompt", () => {
  it("shows the individual distractor checks but asks the judge to check the options itself", () => {
    const validation = validateCandidate({ spec, candidate: candidateJson as never });
    const prompt = judgeUser({ spec, candidate: candidateJson as never, validation, distractorChecks: [{ option: "A", decision: "HUMAN_REVIEW", attempts: 2, failures: [], concerns: ["ambiguous"] }] });
    expect(prompt).toContain("A: HUMAN_REVIEW after 2 attempt(s); concerns ambiguous");
    expect(prompt).not.toContain("blind");
    expect(judgeSystem).toMatch(/together/i);
  });
});

const revision: FactoryExperiment[] = ["contrast", "plausibility", "opposition", "compatibility", "relation"];

describe("second-round experiments", () => {
  const contrastSlot = () => dspec("E");
  const decide = (experiments: FactoryExperiment[], patch: Partial<ExperimentalJudgeReport>, slot = contrastSlot()) => distractorDecision({ dspec: slot, report: { ...review(), ...patch }, experiments });
  // Benchmark items 001 and 012: "whereas" options the first round accepted although they read as "given that".
  const lizardWhereas = { relationHolds: 0.2, negatesStem: false, contextualPlausibility: 0.9, tenseCompatible: true, worldKnowledgeAloneEliminates: false };

  it("regenerates a whereas option that another reading of the connector makes correct (item 001)", () => {
    expect(decide(["contrast", "plausibility"], lizardWhereas).decision).toBe("ACCEPT");
    const second = decide(revision, { ...lizardWhereas, targetRelationReading: 0.2, alternativeReadingCorrect: 0.8 });
    expect(second).toMatchObject({ decision: "REGENERATE", failures: ["alternative_reading_correct"], version: "distractor-judge.v6" });
  });

  it("regenerates a whereas option that reads as the item's own concession (item 012)", () => {
    expect(decide(revision, { ...lizardWhereas, targetRelationReading: 0.7, alternativeReadingCorrect: 0.3 }).failures).toEqual(["reads_as_target_relation"]);
    expect(decide(revision, { ...lizardWhereas, targetRelationReading: 0.1, alternativeReadingCorrect: 0.3 })).toMatchObject({ decision: "HUMAN_REVIEW", concerns: ["alternative_reading_gray"] });
  });

  it("never accepts an option for its planned connector alone", () => {
    const planned = validateDistractor({ dspec: contrastSlot(), skeleton, text: fine.E, accepted: [], experiments: revision });
    expect(planned.status).toBe("pass");
    expect(decide(revision, { ...lizardWhereas, targetRelationReading: 0.1, alternativeReadingCorrect: 0.1 }).decision).toBe("ACCEPT");
    expect(decide(revision, { ...lizardWhereas, targetRelationReading: 0.1, alternativeReadingCorrect: 0.1, relationHolds: 0.9 }).failures).toEqual(["relation_holds"]);
  });

  it("leaves time-frame fit to the deterministic tense rules instead of asking the judge whether the relation holds", () => {
    expect(Object.keys((distractorJudgeReportFor(revision) as unknown as { shape: Record<string, unknown> }).shape)).not.toContain("contextCompatible");
    const framed = buildDistractorSpecs(spec, defaultFactoryThresholds, { experiments: revision, frame: "past_event" });
    const condition = framed.find((entry) => entry.option === "C")!;
    expect(validateDistractor({ dspec: condition, skeleton, text: "If the regulators had found serious side effects in older patients", accepted: [], experiments: revision }).issues.map((issue) => issue.code)).toContain("condition_tense_clash");
    expect(validateDistractor({ dspec: condition, skeleton, text: "Provided that the regulators found serious side effects in older patients", accepted: [], experiments: revision }).status).toBe("pass");
  });

  it("asks the revision judge about the target relation, other readings and the time frame", () => {
    const system = distractorJudgeRevisionSystem(revision);
    expect(system).toMatch(/targetRelationReading/);
    expect(system).toMatch(/"whereas" as "given that"/);
    expect(system).not.toMatch(/contextCompatible/);
    expect(system.indexOf("Write reasons FIRST")).toBeGreaterThan(-1);
    const framed = buildDistractorSpecs(spec, defaultFactoryThresholds, { experiments: revision, frame: "past_event" });
    const user = distractorJudgeRevisionUser({ dspec: framed[1], skeleton, text: fine.C, experiments: revision });
    expect(user).toMatch(/ITEM TARGET RELATION: concession/);
    expect(user).toMatch(/MAIN CLAUSE TIME FRAME \(computed\): a single completed past event/);
    expect(user).not.toMatch(/ROLE|fail by/);
  });

  it("leaves every earlier prompt untouched", () => {
    for (const set of [[], ["contrast"], ["plausibility"], ["lexical"], ["contrast", "plausibility", "lexical"]] as FactoryExperiment[][]) {
      expect(distractorRevisionSystem(set)).toBe(distractorSystemFor(set));
      expect(distractorJudgeSystemFor(set, {})).toBe(distractorJudgeSystemFor(set));
    }
    expect(distractorJudgeRevisionSystem(["contrast", "plausibility", "opposition"])).toBe(distractorJudgeSystemFor(["contrast", "plausibility"]));
    expect(buildDistractorSpecs(spec).map((entry) => entry.temporalConstraint?.eventRelation ?? null)).toEqual(buildDistractorSpecs(spec, defaultFactoryThresholds, { experiments: ["contrast"] }).map((entry) => entry.temporalConstraint?.eventRelation ?? null));
  });

  it("writes a parallel fact for contrast and a frame-specific clause form under the second round", () => {
    const framed = buildDistractorSpecs(spec, defaultFactoryThresholds, { experiments: revision, frame: "past_ongoing" });
    expect(framed.find((entry) => entry.option === "E")?.temporalConstraint).toMatchObject({ eventRelation: "parallel_to_outcome", mainClauseFrame: "past_ongoing" });
    expect(framed.find((entry) => entry.option === "C")?.temporalConstraint?.form).toBe("standing_past_condition");
    const user = distractorRevisionUser({ dspec: framed.find((entry) => entry.option === "E")!, skeleton, usedConnectors: [], feedback: ["x"], experiments: revision });
    expect(user).toMatch(/PARALLEL to the main clause/);
    expect(user).toMatch(/"given that"/);
    expect(user).toMatch(/CONTEXT \(computed from the stem\)/);
    expect(user).toMatch(/RELATION/);
    expect(user.trim().endsWith("Write a different option that avoids these problems.")).toBe(true);
    expect(distractorRevisionSystem([...revision, "lexical", "overlap"])).not.toMatch(/copy no phrase from it/);
  });

  it("routes each experiment generation to its own prompt versions", async () => {
    const seen: { system?: string; text: string }[] = [];
    const recorder: AIProvider = { name: "fake", generate: async (request) => (seen.push({ system: request.system, text: (request.parts[0] as { text: string }).text }), Promise.reject(new Error("stop"))) };
    const env = { DISTRACTOR_MODEL: "w", DISTRACTOR_JUDGE_MODEL: "dj", FINAL_JUDGE_MODEL: "judge" };
    for (const [experiments, marker] of [["", "Also:"], ["contrast", "Also:"], ["contrast,opposition,relation", "RELATION"]] as const) {
      const service = createAIService(loadAIConfig({ ...env, FACTORY_EXPERIMENTS: experiments }), recorder);
      await service.factory.distractor({ dspec: dspec("E"), skeleton, usedConnectors: [], feedback: [] }).catch(() => undefined);
      const last = seen.at(-1)!;
      if (experiments) expect(`${last.system}\n${last.text}`).toContain(marker);
      else expect(last.system).toBe(distractorSystem);
    }
  });

  it("salts the cache key for another seed without sending the salt", async () => {
    const sent: ModelRequest[] = [];
    const recorder: AIProvider = { name: "fake", generate: async (request) => (sent.push(request), { text: JSON.stringify({ text: fine.E, rationale: "r" }), model: request.model, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }) };
    const env = { DISTRACTOR_MODEL: "w", DISTRACTOR_JUDGE_MODEL: "dj", FINAL_JUDGE_MODEL: "judge" };
    const input = { dspec: dspec("E"), skeleton, usedConnectors: [], feedback: [] };
    const one = await createAIService(loadAIConfig(env), recorder).factory.distractor(input);
    const two = await createAIService(loadAIConfig({ ...env, FACTORY_SEED: "2" }), recorder).factory.distractor(input);
    const again = await createAIService(loadAIConfig({ ...env, FACTORY_SEED: "2" }), recorder).factory.distractor(input);
    expect(one.requestHash).not.toBe(two.requestHash);
    expect(again).toMatchObject({ requestHash: two.requestHash, cached: true });
    expect(sent).toHaveLength(2);
    expect(sent.every((request) => !("cacheSalt" in request))).toBe(true);
    const { cacheSalt: _salt, ...plain } = { ...sent[0], cacheSalt: "seed:2" };
    expect(requestHash("fake", "distractor.v4", plain)).toBe(one.requestHash);
  });
});

describe("skeleton gate", () => {
  const sound: SkeletonCheckReport = { reasons: ["clear concession"], grammatical: true, natural: 0.9, keyTrue: true, targetRelation: 0.9, keyAmbiguous: 0.1, confidence: 0.9 };
  const ambiguous: SkeletonCheckReport = { ...sound, reasons: ["the key also reads as a reason"], keyAmbiguous: 0.7 };

  it("checks the skeleton before any distractor and records the check on the attempt", async () => {
    const { service, log } = fakeService({ gate: [sound] });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.state).toBe("HUMAN_REVIEW");
    expect(log.slice(0, 3)).toEqual(["skeleton", "gate", "distractor:A"]);
    expect(outcome.record!.provenance).toMatchObject({ skeletonGatePromptVersion: "skeleton-check.v1", skeletonGateVersion: "skeleton-gate.v1" });
    expect(outcome.record!.provenance.attempts[0].judge).toMatchObject({ model: "dj", decision: "ACCEPT" });
  });

  it("writes a new skeleton when the key is ambiguous and drops the item after the limit, without writing distractors", async () => {
    const retried = fakeService({ gate: [ambiguous, sound] });
    const ok = await generateItem(spec, ctxFor(retried.service));
    expect(ok.trace.state).toBe("HUMAN_REVIEW");
    expect(retried.log.slice(0, 4)).toEqual(["skeleton", "gate", "skeleton+feedback", "gate"]);
    expect(ok.trace.attempts[0].rejectionReason).toBe("key_ambiguous");

    const failed = fakeService({ gate: [ambiguous] });
    const outcome = await generateItem(spec, ctxFor(failed.service));
    expect(outcome.trace.state).toBe("SKELETON_FAILED");
    expect(failed.log.filter((entry) => entry.startsWith("distractor"))).toEqual([]);
    const metrics = sliceMetrics([ok, outcome], null);
    expect(metrics.skeleton).toMatchObject({ attempts: 5, gateChecked: 5, gateRejected: 4, validatorRejected: 0, acceptedItems: 1, acceptedFirstTry: 0 });
    expect(metrics.failureReasons).toContainEqual(["skeleton:key_ambiguous", 4]);
  });

  it("can be switched off for a run", async () => {
    const { service, log } = fakeService({ gate: [ambiguous] });
    expect((await generateItem(spec, ctxFor(service, { FACTORY_SKELETON_GATE: "off" }))).trace.state).toBe("HUMAN_REVIEW");
    expect(log).not.toContain("gate");
  });

  it("never checks a skeleton with the model that wrote it", async () => {
    const service = createAIService(loadAIConfig({ GENERATOR_MODEL: "same", DISTRACTOR_MODEL: "w", DISTRACTOR_JUDGE_MODEL: "same", FINAL_JUDGE_MODEL: "judge" }), scripted());
    await expect(service.factory.checkSkeleton!({ spec, skeleton })).rejects.toBeInstanceOf(JudgeNotIndependent);
  });
});

describe("context-compatible plan", () => {
  const pastSkeleton: QuestionSkeleton = { context: null, stem: "----, the regional health board approved the new heart medication for general use this spring.", correctAnswer: "Although the clinical trial reported mild headaches in a few of the older patients" };
  const clash = "If the board had found serious side effects in the trial data";
  const standing = "Provided that the trial showed serious side effects in most of the older patients";

  it("keeps every role and asks for a clause form that fits the stem's time frame", async () => {
    const { service, log } = fakeService({ skeletons: [pastSkeleton], distractors: { C: [clash, standing] } });
    const outcome = await generateItem(spec, ctxFor(service, { FACTORY_EXPERIMENTS: "compatibility" }));
    expect(outcome.trace.context).toEqual({ frame: "past_event" });
    expect(outcome.trace.distractorSpecs.find((entry) => entry.option === "C")).toMatchObject({ semanticConstraint: { failureMode: "condition_cannot_restrict" }, temporalConstraint: { mainClauseFrame: "past_event", form: "standing_past_condition" } });
    expect(log.filter((entry) => entry.startsWith("distractor:C"))).toEqual(["distractor:C", "distractor:C+feedback"]);
    expect(log.filter((entry) => entry === "review:C")).toHaveLength(1);
    expect(outcome.trace.attempts.find((attempt) => attempt.option === "C")?.rejectionReason).toMatch(/condition_tense_clash/);
    expect(outcome.record?.spec).toEqual(spec);
    expect(outcome.record?.provenance.distractorPromptVersion).toBe("distractor.v6");
  });

  it("applies no frame rule without the compatibility experiment", async () => {
    const baseline = await generateItem(spec, ctxFor(fakeService({ skeletons: [pastSkeleton], distractors: { C: [clash] } }).service));
    expect(baseline.trace.context).toBeUndefined();
    expect(baseline.trace.distractorSpecs.find((entry) => entry.option === "C")?.temporalConstraint).toMatchObject({ mainClauseFrame: null, form: null });
  });
});

describe("blind review sheet", () => {
  const writeRun = (name: string, outcome: Awaited<ReturnType<typeof generateItem>>) => {
    const run = path.join(dir, name);
    mkdirSync(path.join(run, "candidates"), { recursive: true });
    writeFileSync(path.join(run, "candidates", `${outcome.record!.id}.json`), JSON.stringify(outcome.record));
    return run;
  };

  it("hides variant, key and labels, splits a shared stem across parts and maps letters back only in key.json", async () => {
    const a = writeRun("run-a", await generateItem(spec, ctxFor(fakeService({}).service)));
    const b = writeRun("run-b", await generateItem(spec, ctxFor(fakeService({ distractors: { A: ["Because doctors usually prescribe it to patients who have already tried other drugs"] } }).service)));
    const out = path.join(dir, "blind");
    expect(factoryBlindSheet({ variants: [{ label: "A", runDirs: [a] }, { label: "B", runDirs: [b] }], out })).toEqual({ items: 2, stems: 1, parts: 2 });
    const sheets = [readFileSync(path.join(out, "part-1.md"), "utf8"), readFileSync(path.join(out, "part-2.md"), "utf8")];
    for (const sheet of sheets) {
      expect(sheet.split(skeleton.stem)).toHaveLength(2);
      expect(sheet).not.toMatch(/✓|KEY|label|run-a|run-b|variant|APPROVE/);
    }
    const ratings = readFileSync(path.join(out, "ratings.csv"), "utf8").trim().split("\n");
    expect(ratings[0]).toBe("part,blind_id,my_answer,second_defensible,unnatural,implausible,obvious,overall,difficulty,confidence,notes");
    expect(ratings.slice(1).every((line) => /^\d,P\d-\d{3},+$/.test(line))).toBe(true);
    const key = JSON.parse(readFileSync(path.join(out, "key.json"), "utf8"));
    for (const [id, item] of Object.entries(key.items) as [string, { part: number; key: "A" | "B" | "C" | "D" | "E" }][]) {
      const sheet = sheets[item.part - 1];
      const block = sheet.slice(sheet.indexOf(`## ${id}`));
      expect(block).toContain(`${item.key}) ${skeleton.correctAnswer}`);
    }

    expect(factoryBlindScore({ dir: out }).byVariant.A).toMatchObject({ items: 1, rated: 0, approved: { n: 0, of: 0 } });
    const [id, item] = Object.entries(key.items).find(([, entry]) => (entry as { variant: string }).variant === "A") as [string, { part: number; key: string }];
    const filled = ratings.map((line) => (line.includes(`,${id},`) ? `${item.part},${id},${item.key},none,none,none,none,APPROVE,medium,3,` : line));
    writeFileSync(path.join(out, "ratings.csv"), `${filled.join("\n")}\n`);
    const scored = factoryBlindScore({ dir: out }).byVariant;
    expect(scored.A).toMatchObject({ rated: 1, approved: { n: 1, of: 1 }, keyAgreement: { n: 1, of: 1 }, difficulty: { medium: 1 } });
    expect(scored.A).toMatchObject({ secondAnswerItems: { n: 0, of: 1 }, unnaturalOptions: { n: 0, of: 5 }, implausibleWrong: { n: 0, of: 4 }, obviousWrong: { n: 0, of: 4 } });
    expect(scored.B).toMatchObject({ rated: 0 });
    expect(() => factoryBlindSheet({ variants: [{ label: "A", runDirs: [a] }], out })).toThrow(/never overwritten/);
  });
});

describe("corrected B+C+ logic, deterministic regression (no API)", () => {
  const slot = (frame: MainClauseFrame, option: "A" | "C" | "D" | "E") => buildDistractorSpecs(spec, defaultFactoryThresholds, { experiments: revision, frame }).find((entry) => entry.option === option)!;
  const sound = { relationHolds: 0.1, negatesStem: false, contextualPlausibility: 0.9, tenseCompatible: true, worldKnowledgeAloneEliminates: false, targetRelationReading: 0.1, alternativeReadingCorrect: 0.1 };
  const decide = (dspec: DistractorSpec, patch: Partial<ExperimentalJudgeReport> = {}, experiments: FactoryExperiment[] = revision) => distractorDecision({ dspec, report: { ...review(), ...sound, ...patch }, experiments });
  const validate = (dspec: DistractorSpec, text: string, stem = skeleton.stem) => validateDistractor({ dspec, skeleton: { ...skeleton, stem }, text, accepted: [], experiments: revision });
  const critical = (result: ReturnType<typeof validate>) => result.issues.filter((issue) => issue.severity === "critical").map((issue) => issue.code);

  it("1. the planned connector is not enough: the option's meaning must also fail the target relation", () => {
    const contrast = slot("present_general", "E");
    expect(validate(contrast, fine.E).status).toBe("pass");
    expect(decide(contrast).decision).toBe("ACCEPT");
    expect(decide(contrast, { targetRelationReading: 0.8 }).failures).toEqual(["reads_as_target_relation"]);
    expect(decide(contrast, { alternativeReadingCorrect: 0.8 }).failures).toEqual(["alternative_reading_correct"]);
  });

  it("2. a distractor that does not break the target relation is rejected", () => {
    const condition = slot("present_general", "C");
    expect(decide(condition, { relationHolds: 0.9 }).failures).toEqual(["relation_holds"]);
    expect(decide(condition, { standaloneSentenceAcceptable: true }).failures).toEqual(["sentence_acceptable_alone"]);
    expect(decide(condition, { unintendedCorrectness: 0.8 }).failures).toEqual(["unintended_correctness"]);
  });

  it("3. two defensibly correct options make the item defective", async () => {
    const { service } = fakeService({});
    const record = (await generateItem(spec, ctxFor(service))).record!;
    const verdict = judgeDecision({
      spec,
      validation: record.versions[0].validation,
      judge: {
        blindAnswer: "B",
        blindConfidence: 0.9,
        acceptability: { sentences: acceptabilityJson.sentences.map((entry) => ({ ...entry, acceptable: entry.option === "B" || entry.option === "C" })) },
        report: { ...judgeJson, alternativeDefensibleOptions: ["C"] } as never,
      },
    });
    expect(verdict.verdict).toBe("REJECT");
    expect(verdict.failures).toEqual(expect.arrayContaining(["second_defensible_C", "acceptable_distractor_C"]));
    const evidence = { blindAgrees: true, answerConfidence: 0.9, keyAcceptable: true, keyNatural: true, unresolved: 1, cheaplyEliminable: 0, relationLogic: 4, functional: 3, wrong: 4, answerFoundWithoutTarget: false, keyRelationUnique: true };
    expect(calibratedBand(evidence as never).band).toBe("defective");
  });

  it("4. a correct tense is not rejected merely because it is past or past perfect", () => {
    const pastEvent = "----, many patients stopped the prescribed medicine within a month.";
    expect(mainClauseFrame(pastEvent)).toBe("past_event");
    expect(validate(slot("past_event", "C"), "Provided that the regulators found serious side effects in older patients", pastEvent).status).toBe("pass");
    expect(validate(slot("past_event", "D"), "Until the first results of the study had been published in a respected medical journal", pastEvent).status).toBe("pass");
    expect(validate(slot("counterfactual", "C"), "If the regulators had found serious side effects in older patients").status).toBe("pass");
    // The judge's tense flag alone no longer rejects under the corrected logic; the first round keeps its old rule.
    expect(decide(slot("past_event", "C"), { tenseCompatible: false })).toMatchObject({ decision: "HUMAN_REVIEW", failures: [], concerns: ["tense_judged_incompatible"] });
    expect(decide(dspec("C"), { tenseCompatible: false }, ["contrast", "plausibility"]).failures).toContain("tense_incompatible");
  });

  it("5. a condition or time relation that cannot hold for an already completed past event is rejected", () => {
    const pastEvent = "----, many patients stopped the prescribed medicine within a month.";
    expect(critical(validate(slot("past_event", "C"), "If the regulators had found serious side effects in older patients", pastEvent))).toContain("condition_tense_clash");
    expect(critical(validate(slot("past_event", "C"), "Unless the regulators had quietly withdrawn the licence for older patients", pastEvent))).toContain("condition_tense_clash");
    expect(critical(validate(slot("past_event", "D"), "Until the regulators will publish the final results of the study", pastEvent))).toContain("future_in_time_clause");
  });

  it("6. valid condition and time structures are not rejected for using those structures", () => {
    const ongoing = "----, many patients kept taking the prescribed medicine for several months.";
    expect(mainClauseFrame(ongoing)).toBe("past_ongoing");
    expect(validate(slot("past_ongoing", "C"), "Provided that the clinic kept enough stock of the medicine for every patient", ongoing).status).toBe("pass");
    expect(validate(slot("past_ongoing", "C"), "Unless the clinic had run out of the medicine during the winter months", ongoing).status).toBe("pass");
    expect(validate(slot("present_general", "C"), "If the dose is taken with food at the same time every day").status).toBe("pass");
    expect(validate(slot("past_event", "D"), "Until the first results of the study were published in a respected medical journal", "----, many patients stopped the prescribed medicine within a month.").status).toBe("pass");
  });

  it("7. an undetermined time frame rejects nothing automatically, and any doubt carries a reason", () => {
    const mixed = "----, the committee has now approved the medicine that it rejected last year.";
    expect(mainClauseFrame(mixed)).toBe("unknown");
    expect(contextIssues({ expresses: "discourse_relation:condition", frame: "unknown", text: "If the regulators had found serious side effects" })).toEqual([]);
    expect(validate(slot("unknown", "C"), "If the regulators had found serious side effects in older patients", mixed).status).toBe("pass");
    expect(validate(slot("unknown", "C"), "If the regulators had found serious side effects in older patients", mixed).issues.map((issue) => issue.code)).not.toContain("condition_tense_clash");
    const unsure = decide(slot("unknown", "C"), { tenseCompatible: false });
    expect(unsure.decision).toBe("HUMAN_REVIEW");
    expect(unsure.concerns).toEqual(["tense_judged_incompatible"]);
  });

  it("reads a past perfect with an adverb between had and the participle", () => {
    expect(hasPastPerfect("if the applicant had publicly criticized the policy")).toBe(true);
    expect(hasPastPerfect("although the clinic had only two nurses")).toBe(false);
  });
});

describe("spend budget in the atomic pipeline", () => {
  it("refuses a regeneration over the limit and fails the stage with that reason", async () => {
    const { service, log } = fakeService({ reviews: { A: [review({ competentCandidateCouldSelect: true }), review()] } });
    const budget = new SpendBudget({ maxRegenerations: 0 }, null);
    const outcome = await generateItem(spec, { ...ctxFor(service), budget });
    expect(outcome.trace.state).toBe("DISTRACTORS_FAILED");
    expect(outcome.trace.failure).toBe("budget_stopped: max regenerations (0) reached");
    expect(log.filter((entry) => entry.startsWith("distractor:A"))).toEqual(["distractor:A"]);
    expect(budget.regenerationsDenied).toBe(1);
  });

  it("stops calling once a call limit is reached and records every call with its stage and attempt", async () => {
    const budget = new SpendBudget({ maxCalls: 3 }, null);
    const { service, log } = fakeService({});
    const metered = { ...service, factory: Object.fromEntries(Object.entries(service.factory).map(([name, call]) => [name, async (...args: unknown[]) => (budget.beforeCall(), (call as (...a: unknown[]) => unknown)(...args))])) } as unknown as AIService;
    const outcome = await generateItem(spec, { ...ctxFor(metered), budget });
    expect(log).toEqual(["skeleton", "distractor:A", "review:A"]);
    expect(outcome.trace.state).toBe("DISTRACTORS_FAILED");
    expect(outcome.trace.failure).toMatch(/^budget_stopped: max calls \(3\) reached/);
    const calls = outcome.trace.cost!.log!;
    expect(calls.slice(0, 3).map((call) => `${call.stage}:${call.option ?? "-"}:${call.attempt}:${call.localCache}`)).toEqual(["skeleton:-:1:miss", "distractor:A:1:miss", "distractorJudge:A:1:miss"]);
    expect(calls[3]).toMatchObject({ stage: "distractor", option: "C", attempt: 1, error: expect.stringMatching(/spend limit/) });
  });
});

describe("offline relabeling", () => {
  const trace = () => {
    const dspecs = buildDistractorSpecs(spec, defaultFactoryThresholds, { experiments: revision, frame: "present_general" });
    const attempt = (option: string, n: number, text: string, failures: string[], hash: string | null) => ({ stage: "distractor", option, attempt: n, model: "gen", promptVersion: "distractor.v6", requestHash: null, cached: false, latencyMs: 1, output: text, validator: { status: "pass", codes: [] }, judge: hash ? { model: "dj", promptVersion: "distractor-judge.v5", requestHash: hash, decision: failures.length ? "REGENERATE" : "ACCEPT", failures, concerns: [], reasons: ["r"] } : null, rejectionReason: failures.join(", ") || null });
    return {
      ...newTrace(spec.id),
      state: "DISTRACTORS_FAILED",
      skeleton,
      distractorSpecs: dspecs,
      distractors: [],
      failure: "distractor_A_x_rejected_after_3",
      attempts: [attempt("A", 1, fine.A, ["context_incompatible"], "h1"), attempt("A", 2, "Because doctors usually prescribe it to patients who have already tried other drugs", ["context_incompatible"], "h2")],
    } as never;
  };
  const stored = { ...review(), ...{ relationHolds: 0.1, negatesStem: false, contextualPlausibility: 0.9, tenseCompatible: true, worldKnowledgeAloneEliminates: false, targetRelationReading: 0.1, alternativeReadingCorrect: 0.1, contextCompatible: 0.1 } };

  it("re-scores stored judge reports with the current rules and leaves never-written options unknown", () => {
    const item = relabelTrace(trace(), { experiments: revision, report: () => stored });
    expect(item.slots[0]).toMatchObject({ option: "A", status: "accepted", attempt: 1, storedAccepted: null });
    expect(item.slots.slice(1).map((entry) => entry.status)).toEqual(["not_generated", "not_generated", "not_generated"]);
    expect(item.status).toBe("unknown");
  });

  it("refuses experiments whose judge fields the stored report lacks", () => {
    const { relationHolds: _r, targetRelationReading: _t, alternativeReadingCorrect: _a, ...firstRound } = stored;
    expect(() => relabelTrace(trace(), { experiments: revision, report: () => firstRound })).toThrow(/cannot be relabeled/);
  });

  it("marks an option the stored run never judged as unknown instead of guessing", () => {
    const item = relabelTrace(trace(), { experiments: revision, report: () => null });
    expect(item.slots[0]).toMatchObject({ status: "unknown", reason: expect.stringMatching(/not found/) });
  });
});

describe("slice spend", () => {
  it("reports tokens per item, per accepted item and on failed items, and an unknown cost without prices", async () => {
    const { service } = fakeService({});
    const ok = await generateItem(spec, ctxFor(service));
    const { service: failing } = fakeService({ reviews: { A: [review({ competentCandidateCouldSelect: true })] } });
    const lost = await generateItem(spec, ctxFor(failing));
    const unpriced = sliceSpend([ok, lost], null);
    expect(unpriced.cost).toMatchObject({ usd: null, reason: expect.stringMatching(/FACTORY_PRICES is not set/), perItem: null });
    // 13 calls for the accepted item; 5 for the lost one (the repeated text never reaches the judge again), 2 tokens each.
    expect(unpriced.tokens).toMatchObject({ acceptedItems: 1, total: 36, perItem: 18, perAcceptedItem: 36, onFailedItems: 10 });
    // Logged Gemini models are bare names; the price table keys them as gemini:<model>, like prices.gemini.json.
    const priced = sliceSpend([ok, lost], { table: { "gemini:gen": { in: 1, out: 1 }, "gemini:dj": { in: 1, out: 1 }, "gemini:judge": { in: 1, out: 1 } }, source: "test" });
    expect(priced.cost).toMatchObject({ usd: 0.000036, reason: null, perAcceptedItem: 0.000036 });
  });
});
