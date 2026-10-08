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
import { createAIService, JudgeNotIndependent } from "./ai/service";
import type { AIProvider, ModelRequest, ModelResponse } from "./ai/types";
import { mkdirSync, writeFileSync } from "node:fs";
import { distractorDecision, validateDistractor, type DistractorJudgeReport, type GeneratedDistractor } from "@/modules/factory/distractor";
import { buildDistractorSpecs, type DistractorSpec } from "@/modules/factory/distractor-spec";
import type { ItemExplanation } from "@/modules/factory/explanation";
import { advance, generationTransitions, IllegalTransition, newTrace } from "@/modules/factory/generation";
import { applyReview } from "@/modules/factory/review";
import { validateSkeleton, type QuestionSkeleton } from "@/modules/factory/skeleton";
import { defaultFactoryThresholds } from "@/modules/factory/thresholds";
import { clauseReuse, originalityIndex } from "@/modules/factory/validator";
import { judgeSystem } from "./ai/prompts/judge.v2";
import type { AIResult, AIService } from "./ai/types";
import { assertTextFree } from "./lib/text-free";
import { generateItem, type RunContext } from "./stages/atomic";
import { assertRunWritable, factorySlice, sliceLimit, sliceMetrics } from "./stages/factory";

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
  targetRelationValidity: 0.9,
  unintendedCorrectness: 0.05,
  distractorRoleAlignment: 0.9,
  answerClauseReuse: 0.05,
  ambiguity: 0.05,
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
    expect(decide({ targetRelationValidity: 0.2 }).failures).toContain("target_relation_not_expressed");
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
const result = <T>(value: T, model: string): AIResult<T> => ({ value, provider: "fake", model, promptVersion: "test", requestHash: hashOf(++counter), usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, cached: false });
const explanationJson: ItemExplanation = {
  explanation: "Doğru cevap B. 'although' beklentinin tersine bir durumu bildirir: yan etkilere rağmen hastalar ilacı almaya devam eder. Diğer seçenekler sebep, koşul, zaman ya da karşıtlık bildirir.",
  distractorRationales: (["A", "C", "D", "E"] as const).map((option) => ({ option, whyPlausible: "Akıcı ve konuyla ilgili görünür.", whyWrong: "Bildirdiği ilişki cümlenin iki yarısını bağlamaz." })),
  transferNote: "Beklenmeyen bir sonuç varsa önce 'although' grubunu düşün.",
  estimatedDifficulty: "medium",
};

type Script = { skeletons?: QuestionSkeleton[]; distractors?: Record<string, string[]>; reviews?: Record<string, DistractorJudgeReport[]>; explanations?: ItemExplanation[]; verdict?: "APPROVE" | "REJECT" };

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

const ctxFor = (service: AIService): RunContext => ({
  service,
  config: loadAIConfig({ GENERATOR_MODEL: "gen", DISTRACTOR_MODEL: "gen", DISTRACTOR_JUDGE_MODEL: "dj", FINAL_JUDGE_MODEL: "judge", EXPLANATION_MODEL: "gen" }),
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
    expect(record.provenance).toMatchObject({ pipelineVersion: "atomic.v1", generatorModel: "gen", distractorJudgeModel: "dj", judgeModel: "judge", distractorSpecVersion: "distractor-spec.v1" });
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

  it("stops after three rejected attempts without going back to the skeleton", async () => {
    const { service, log } = fakeService({ reviews: { C: [review({ competentCandidateCouldSelect: true })] } });
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
    const first = await generateItem(spec, ctxFor(fakeService({ reviews: { A: [review({ competentCandidateCouldSelect: true }), review()] } }).service));
    const second = await generateItem(spec, ctxFor(fakeService({ reviews: { C: [review({ competentCandidateCouldSelect: true })] } }).service));
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
