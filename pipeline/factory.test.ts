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
import { generatorPromptVersion, generatorResponseSchema, generatorSystem, generatorUser } from "./ai/prompts/generator.v2";
import { judgeUser } from "./ai/prompts/judge.v1";
import { createAIService, JudgeNotIndependent } from "./ai/service";
import type { AIProvider, ModelRequest, ModelResponse } from "./ai/types";
import { assertTextFree } from "./lib/text-free";
import { factorySlice, sliceLimit } from "./stages/factory";

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

function scripted(): AIProvider & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  return {
    name: "fake",
    calls,
    async generate(request): Promise<ModelResponse> {
      calls.push(request);
      const text = request.system?.startsWith("ROLE") ? JSON.stringify(candidateJson) : request.system?.startsWith("You are taking") ? JSON.stringify({ answer: "B", confidence: 0.9, rationale: "concessive clause" }) : JSON.stringify(judgeJson);
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
    expect(generatorPromptVersion).toBe("generator.v2");
  });

  it("never carries historical item text or few-shot examples", () => {
    const prompt = `${generatorSystem(spec)}\n${generatorUser(spec)}`;
    expect(prompt).not.toMatch(/PASSAGE:|\nITEM\n|EXAMPLES?:|Example \d|few-shot/);
    expect(readFileSync(path.join(process.cwd(), "pipeline/ai/prompts/generator.v2.ts"), "utf8")).not.toMatch(/from "\.\/item"|\.data|readFileSync/);
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

  it("solves blind and reviews with the judge model, and refuses to judge with the generator model", async () => {
    const provider = scripted();
    const service = createAIService(loadAIConfig({ GENERATOR_MODEL: "gen", JUDGE_MODEL: "judge" }), provider);
    const generated = await service.generator.generate(spec);
    expect(generated.value.correctOption).toBe("B");
    expect(provider.calls[0].model).toBe("gen");
    const validation = validateCandidate({ spec, candidate: generated.value });
    const evaluation = await service.judge.evaluate(generated.value, spec, validation);
    expect(evaluation.blind.value.answer).toBe("B");
    expect(evaluation.report.value.verdict).toBe("APPROVE");
    expect(provider.calls.slice(1).map((call) => call.model)).toEqual(["judge", "judge"]);
    expect(provider.calls[1].parts.map((part) => ("text" in part ? part.text : "")).join("")).not.toContain("KEY");
    const same = createAIService(loadAIConfig({ GENERATOR_MODEL: "m", JUDGE_MODEL: "m" }), scripted());
    await expect(same.judge.evaluate(generated.value, spec, validation)).rejects.toBeInstanceOf(JudgeNotIndependent);
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
  });
});
