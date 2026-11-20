import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { analysisDraft } from "@/modules/analysis/contract";
import { toDnaQuestion } from "@/modules/analysis/dna";
import { familyBlueprints } from "@/modules/factory/families";
import { buildExamProfile } from "@/modules/factory/profile";
import { buildQuestionSpec } from "@/modules/factory/spec-engine";
import { soleConcessiveConnector, validateCandidate } from "@/modules/factory/validator";
import { loadAIConfig } from "./ai/config";
import { generatorPromptVersion, generatorResponseSchema, generatorSystem, generatorUser } from "./ai/prompts/generator.v3";
import { acceptabilitySystem, acceptabilityUser } from "./ai/prompts/acceptability.v1";
import { solveSystem } from "./ai/prompts/verifier.v1";
import { judgeUser } from "./ai/prompts/judge.v2";
import { distractorJudgeUser } from "./ai/prompts/distractor-judge.v3";
import { AIOutputError, createAIService, JudgeNotIndependent } from "./ai/service";
import type { AIProvider, ModelRequest, ModelResponse } from "./ai/types";
import { mkdirSync, writeFileSync } from "node:fs";
import { distractorDecision, distractorJudgeReport, distractorJudgeReportFor, distractorVerdicts, planRealization, reportFromStandalone, reportFromVerdict, validateDistractor, type DistractorJudgeReport, type DistractorVerdict, type ExperimentalJudgeReport, type GeneratedDistractor } from "@/modules/factory/distractor";
import { parseExperiments, type FactoryExperiment } from "@/modules/factory/experiments";
import { buildDistractorSpecs, type DistractorSpec } from "@/modules/factory/distractor-spec";
import { assembleCandidate, gateEvidence, type ItemExplanation } from "@/modules/factory/explanation";
import { advance, generationTransitions, IllegalTransition, newTrace } from "@/modules/factory/generation";
import { applyReview } from "@/modules/factory/review";
import { clauseRepair, distractorPlanIssues, hasEmbedding, isPlannerDecline, relationalPlannerOutput, repairSkeletonSurface, settleRelationalPlanner, stackedObstacle, validateSkeleton, type DistractorBlueprint, type QuestionSkeleton, type RelationFamily, type SkeletonCheckReport } from "@/modules/factory/skeleton";
import { connectorSurface } from "@/modules/factory/spec-engine";
import { defaultFactoryThresholds } from "@/modules/factory/thresholds";
import { clauseReuse, longestSharedPhrase, originalityIndex } from "@/modules/factory/validator";
import { distractorSystem, distractorUser } from "./ai/prompts/distractor.v4";
import { distractorVerdictPromptVersion, distractorVerdictSystem, distractorVerdictUser } from "./ai/prompts/distractor-judge.v7";
import { distractorSystemFor, distractorUserFor } from "./ai/prompts/distractor.v5";
import { distractorRevisionSystem, distractorRevisionUser } from "./ai/prompts/distractor.v6";
import { distractorJudgeSystemFor } from "./ai/prompts/distractor-judge.v4";
import { distractorJudgeRevisionSystem, distractorJudgeRevisionUser } from "./ai/prompts/distractor-judge.v6";
import { requestHash } from "./ai/cache";
import { distractorPlanSystem, distractorPlanUser, skeletonResponseSchema, skeletonSystem, skeletonUser } from "./ai/prompts/skeleton.v2";
import { explanationUser } from "./ai/prompts/explanation.v2";
import { factoryBlindScore, factoryBlindSheet } from "./stages/benchmark";
import { goldForOption } from "./stages/calibrate";
import { judgeSystem } from "./ai/prompts/judge.v2";
import { skeletonCheckSystem, skeletonCheckUser } from "./ai/prompts/skeleton-check.v2";
import type { AIResult, AIService } from "./ai/types";
import { assertTextFree } from "./lib/text-free";
import { distractorJudgeKeyExposure, distractorPromptsFor, generateItem, type RunContext } from "./stages/atomic";
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
    expect(prompt).toContain("GATE EVIDENCE: none.");
  });

  it("writes the real validator status and critical codes, and leaves the other reviews out", () => {
    const validation = validateCandidate({ spec, candidate: candidateJson as never });
    const rejected = {
      ...validation,
      status: "reject" as const,
      critical: 1,
      warnings: 1,
      issues: [
        { code: "sole_concessive_clue", severity: "critical" as const, option: "B" as const },
        { code: "length_out_of_range", severity: "warn" as const },
      ],
    };
    const prompt = judgeUser({ spec, candidate: candidateJson as never, validation: rejected });
    expect(prompt).toContain("DETERMINISTIC CHECKS: reject; critical: sole_concessive_clue@B; warnings: length_out_of_range.");
    expect(prompt).not.toContain("passed");
    expect(prompt).toContain("KEY: B");
    expect(prompt).not.toContain("equallyDefensible");
    expect(prompt).not.toContain("relationCoherent");
    expect(prompt).not.toContain("blind");
  });

  it("gives the final judge the clause and term the skeleton gate accepted", () => {
    const gate = { embedding: "that had turned anoxic", preciseTerm: "anoxic", clauseCarriesClash: true };
    const candidate = { ...candidateJson, metadata: { ...candidateJson.metadata, gate } };
    const prompt = judgeUser({ spec, candidate: candidate as never, validation: validateCandidate({ spec, candidate: candidate as never }) });
    expect(prompt).toContain('embedding "that had turned anoxic"');
    expect(prompt).toContain('preciseTerm "anoxic"');
    expect(prompt).toContain("clauseCarriesClash true");
    expect(judgeSystem).not.toContain("hard is C1 only when");
    expect(judgeSystem).toContain("plain verb such as affect");
    expect(skeletonCheckSystem).toContain("replacing that word with a plain verb such as affect");
  });

  const hardSpec = (ordinal: number) => buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal, band: "hard" });
  const withGate = (clauseCarriesClash: boolean) => ({ ...candidateJson, metadata: { ...candidateJson.metadata, gate: { embedding: "blocks most tidal sediment", preciseTerm: "blocks", clauseCarriesClash } } });

  it("does not reject a relational item because the neutralization test failed", () => {
    const relational = hardSpec(202);
    const prompt = judgeUser({ spec: relational, candidate: withGate(false) as never, validation: validateCandidate({ spec: relational, candidate: withGate(false) as never }) });
    expect(prompt).toContain("ASSIGNED STRATEGY: relational_inference.");
    expect(prompt).toContain("do not use the replacement test to decide hard");
    expect(prompt).not.toContain("use the same replacement test");
    expect(judgeSystem).toContain("A failed or missing neutralization is not a reject");
    expect(judgeSystem).toContain("do not use the replacement test");
  });

  it("does not call a relational item hard when it needs knowledge the sentence does not give", () => {
    expect(judgeSystem).toContain("scientific, medical, or professional knowledge the sentence does not give");
    expect(judgeSystem).toContain("Do not approve hard for an item that cannot be solved without outside expertise");
  });

  it("does not call a relational item hard when the answer does not require combining the sentence", () => {
    expect(judgeSystem).toContain("the reader must combine two or more pieces of information given in the sentence");
    expect(judgeSystem).toContain("when the main clause already explains the outcome so no inference is required");
  });

  it("rejects a distractor that fails only by grammar and keeps a natural wrong option", () => {
    const dspec = buildDistractorSpecs(spec, defaultFactoryThresholds)[0];
    const broken = distractorDecision({ dspec, report: reportFromVerdict({ verdict: "ungrammatical", sure: true, reason: "The verb does not agree." }) });
    expect(broken.decision).toBe("REGENERATE");
    expect(broken.failures).toContain("ungrammatical");
    const natural = distractorDecision({ dspec, report: reportFromVerdict({ verdict: "good", sure: true, reason: "The clause is sensible and the link fails." }) });
    expect(natural.decision).toBe("ACCEPT");
    expect(natural.failures).not.toContain("too_obvious");
    const relational = hardSpec(202);
    const slot = buildDistractorSpecs(relational, defaultFactoryThresholds)[0];
    const writer = distractorUser({ dspec: slot, skeleton: { stem: candidateJson.question.stem, correctAnswer: candidateJson.question.options.B, context: "" } as never, usedConnectors: [], feedback: [], strategy: "relational_inference" });
    expect(writer).toContain("Do not make it wrong by a grammar error");
    expect(writer).toContain("whyPlausible");
    expect(distractorUser({ dspec: slot, skeleton: { stem: candidateJson.question.stem, correctAnswer: candidateJson.question.options.B, context: "" } as never, usedConnectors: [], feedback: [] })).not.toContain("RELATIONAL DISTRACTOR");
    const review = distractorVerdictUser({ dspec: slot, skeleton: { stem: candidateJson.question.stem, correctAnswer: candidateJson.question.options.B } as never, text: candidateJson.question.options.A, strategy: "relational_inference" });
    expect(review).toContain("DISCOURSE TASK: concession");
    expect(review).not.toContain(candidateJson.question.options.B);
    expect(distractorVerdictUser({ dspec: slot, skeleton: { stem: candidateJson.question.stem, correctAnswer: candidateJson.question.options.B } as never, text: candidateJson.question.options.A })).not.toContain("RELATIONAL CHECK");
  });

  it("flags a relational item whose key is the only concessive connector", () => {
    const relational = hardSpec(202);
    expect(soleConcessiveConnector(candidateJson.question.options, "B")).toBe(true);
    const prompt = judgeUser({ spec: relational, candidate: candidateJson as never, validation: validateCandidate({ spec: relational, candidate: candidateJson as never }) });
    expect(prompt).toContain("CONNECTOR CLUE: only the key opens with a concessive connector");
    const shared = {
      ...candidateJson,
      question: { ...candidateJson.question, options: { ...candidateJson.question.options, E: "Even though the first seeds appear several weeks before the plants themselves grow" } },
    };
    expect(soleConcessiveConnector(shared.question.options, "B")).toBe(false);
    const quiet = judgeUser({ spec: relational, candidate: shared as never, validation: validateCandidate({ spec: relational, candidate: shared as never }) });
    expect(quiet).not.toContain("CONNECTOR CLUE");
  });

  it("still rejects an item that has a second defensible answer", () => {
    const verdict = judgeDecision({
      spec,
      validation: validateCandidate({ spec, candidate: candidateJson as never }),
      judge: {
        blindAnswer: "B",
        blindConfidence: 0.9,
        acceptability: { sentences: acceptabilityJson.sentences.map((entry) => ({ ...entry, acceptable: entry.option === "B" || entry.option === "C" })) },
        report: { ...judgeJson, alternativeDefensibleOptions: ["C"] } as never,
      },
    });
    expect(verdict.verdict).toBe("REJECT");
    expect(verdict.failures.some((failure) => failure.startsWith("second_defensible_"))).toBe(true);
  });

  it("keeps the lexical pivot neutralization test", () => {
    const lexical = hardSpec(203);
    const prompt = judgeUser({ spec: lexical, candidate: withGate(true) as never, validation: validateCandidate({ spec: lexical, candidate: withGate(true) as never }) });
    expect(prompt).toContain("ASSIGNED STRATEGY: lexical_pivot.");
    expect(prompt).toContain("use the same replacement test on this word");
    expect(judgeSystem).toContain("plain verb such as affect");
    expect(judgeSystem).toContain("an aquifer which has been severely depleted");
    expect(judgeSystem).toContain("expected to curtail small enterprise transactions");
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
    const finalText = provider.calls[3].parts.map((part) => ("text" in part ? part.text : "")).join("");
    expect(finalText).toContain("KEY:");
    expect(finalText).toContain(`DETERMINISTIC CHECKS: ${validation.status};`);
    expect(finalText).not.toContain("passed");
    expect(finalText).not.toContain("concessive clause");
    const same = createAIService(loadAIConfig({ GENERATOR_MODEL: "m", JUDGE_MODEL: "m" }), scripted());
    await expect(same.judge.evaluate(generated.value, spec, validation)).rejects.toBeInstanceOf(JudgeNotIndependent);
  });

  it("uses the same validation line for a passing factory item and a rejected replay item", async () => {
    const provider = scripted();
    const service = createAIService(loadAIConfig({ GENERATOR_MODEL: "gen", DISTRACTOR_MODEL: "gen", JUDGE_MODEL: "judge" }), provider);
    const recorded = validateCandidate({ spec, candidate: candidateJson as never });
    const passing = { ...recorded, status: "pass" as const, critical: 0, issues: recorded.issues.filter((issue) => issue.severity === "warn") };
    const rejected = {
      ...passing,
      status: "reject" as const,
      critical: 1,
      warnings: 0,
      issues: [{ code: "sole_concessive_clue", severity: "critical" as const, option: "B" as const }],
    };
    await service.judge.evaluate(candidateJson as never, spec, passing);
    const textOf = (call: (typeof provider.calls)[number]) => call.parts.map((part) => ("text" in part ? part.text : "")).join("");
    await service.judge.evaluate(candidateJson as never, spec, rejected);
    const texts = provider.calls.map(textOf);
    const passText = texts.find((text) => text.includes(`DETERMINISTIC CHECKS: ${passing.status};`));
    const rejectText = texts.find((text) => text.includes("sole_concessive_clue@B"));
    expect(passText).toBeTruthy();
    expect(passText).not.toContain("passed");
    expect(rejectText).toContain("DETERMINISTIC CHECKS: reject; critical: sole_concessive_clue@B; warnings: none.");
    expect(rejectText).not.toContain("passed");
    expect(rejectText).not.toContain("concessive clause");
    expect(rejectText).not.toContain("equallyDefensible");
    expect(rejectText).not.toContain("relationCoherent");
  });

  it("checks each completed sentence without the key or a single-answer framing", () => {
    const prompt = `${acceptabilitySystem}\n${acceptabilityUser(candidateJson)}`;
    expect(prompt).toContain("B. Although their thin roots reach only a few centimetres below the dry surface, many desert plants survive");
    expect(prompt).toContain("D. Unless scientists measure");
    expect(prompt).not.toMatch(/KEY|correct option|answer key/i);
    expect(prompt).not.toContain("----");
    expect(acceptabilitySystem).toContain("relationCoherent");
    expect(acceptabilitySystem).toContain("not, by itself, the best completion");
    expect(solveSystem).toContain("stemEvidence");
    expect(solveSystem).toContain("equallyDefensible");
    expect(solveSystem).toContain("uncertain");
    expect(judgeSystem).toContain("only grammatical and natural on its own is not an equally defensible answer");
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

  it("rejects two obstacles joined by and, and keeps a relative clause off the easy band", () => {
    const stacked = { ...skeleton, correctAnswer: "Although the list had been read only once and most of the volunteers had slept under four hours" };
    expect(stackedObstacle(stacked.correctAnswer)).toBe(true);
    expect(stackedObstacle(skeleton.correctAnswer)).toBe(false);
    expect(validateSkeleton({ spec, skeleton: stacked }).issues.map((issue) => issue.code)).toContain("stacked_obstacle");
    const hard = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 2, band: "hard" });
    const easy = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 2, band: "easy" });
    expect(validateSkeleton({ spec: hard, skeleton }).issues.map((issue) => issue.code)).not.toContain("hard_no_embedding");
    const embedded = { ...skeleton, correctAnswer: "Although the drug that the clinic had issued causes mild headaches during the first weeks" };
    expect(hasEmbedding(embedded.correctAnswer)).toBe(true);
    expect(validateSkeleton({ spec: easy, skeleton: embedded }).issues.map((issue) => issue.code)).toContain("easy_not_plain");
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

describe("verdict judge (distractor-judge.v7)", () => {
  const decideVerdict = (verdict: DistractorVerdict["verdict"], sure = true) => distractorDecision({ dspec: dspec("A"), report: reportFromVerdict({ verdict, sure, reason: "r" }) });

  it("accepts a sure good verdict and regenerates each sure flaw for its own reason", () => {
    expect(decideVerdict("good")).toMatchObject({ decision: "ACCEPT", failures: [], concerns: [] });
    expect(decideVerdict("second_answer").failures).toEqual(expect.arrayContaining(["competent_candidate_could_select", "unintended_correctness"]));
    expect(decideVerdict("repeats_answer").failures).toEqual(["answer_clause_reuse"]);
    expect(decideVerdict("ungrammatical").failures).toEqual(["ungrammatical"]);
    expect(decideVerdict("unnatural").failures).toEqual(["incoherent_clause"]);
    expect(decideVerdict("too_obvious").failures).toEqual(["too_obvious"]);
  });

  it("sends every unsure verdict to a human", () => {
    for (const verdict of distractorVerdicts) expect(decideVerdict(verdict, false).decision).toBe("HUMAN_REVIEW");
  });

  it("hides the key and the planned failure from the blind verdict", () => {
    const correctAnswer = "Although residents welcomed the practical changes to the hall";
    const planned = "The missing ornament was rebuilt in plaster because the brief required a replica";
    const clause = "Because the ground floor was reopened to shops and offices";
    const prompt = `${distractorVerdictSystem}\n${distractorVerdictUser({
      dspec: dspec("A"),
      skeleton: {
        context: null,
        stem: "----, the restoration was praised more for keeping the building in use than for returning it to its original appearance.",
        correctAnswer,
        distractorBlueprints: [
          {
            option: "A",
            relationFamily: "cause",
            proposition: planned,
            whyPlausible: "A learner might treat the reopening as the reason for the praise.",
            stemEvidenceAnchor: "keeping the building in use",
            failureMechanism: "causal_direction",
            decisiveFailureReason: planned,
            failureAnchor: "outcome",
            connectorStrategy: "natural",
            intendedMisconception: "A cause is mistaken for the concession.",
          },
        ],
      },
      text: clause,
      strategy: "relational_inference",
    })}`;
    expect(prompt).toContain(clause);
    expect(prompt).toContain("DISCOURSE TASK: concession");
    expect(prompt).not.toContain(correctAnswer);
    expect(prompt).not.toContain(planned);
    expect(prompt).not.toContain("INTENDED CORRECT");
    expect(prompt).not.toContain("PLANNED FAILURE");
    expect(prompt).not.toContain("whyPlausible");
    expect(prompt).not.toContain("intendedMisconception");
    expect(prompt).not.toContain("decisiveFailureReason");
    expect(prompt).not.toContain("correctBlueprint");
    expect(prompt).not.toMatch(/\bKEY\b/);
  });

  it("rejects a defensible continuation without consulting the plan", () => {
    const report = reportFromStandalone({
      surface: "sound",
      readings: ["second_answer"],
      sure: true,
      reason: "Reopening the ground floor is a defensible cause of the praise.",
    });
    const decision = distractorDecision({ dspec: dspec("A"), report });
    expect(report.planFidelity).toBe("unverified");
    expect(decision.decision).toBe("REGENERATE");
    expect(decision.failures).toEqual(expect.arrayContaining(["competent_candidate_could_select", "unintended_correctness"]));
  });

  it("keeps an invalid exclusion as an unsupported inference", () => {
    const report = reportFromStandalone({
      surface: "sound",
      readings: ["unsupported_inference", "discourse_failure"],
      sure: true,
      reason: "Every applicant who passed receives funding does not entail that applicants who failed receive none.",
    });
    const decision = distractorDecision({ dspec: dspec("A"), report });
    expect(report.standaloneReadings).toEqual(["unsupported_inference", "discourse_failure"]);
    expect(decision.decision).toBe("ACCEPT");
    expect(decision.failures).not.toContain("competent_candidate_could_select");
    expect(decision.failures).not.toContain("unintended_correctness");
  });

  it("does not accept a scope restatement as an inference distractor", () => {
    const fourth = reportFromStandalone({
      surface: "sound",
      readings: ["restatement"],
      sure: true,
      reason: "Up to three children already leaves the fourth child outside.",
    });
    const exception = reportFromStandalone({
      surface: "sound",
      readings: ["restatement"],
      sure: true,
      reason: "Every room except one already states the exception.",
    });
    for (const report of [fourth, exception]) {
      const decision = distractorDecision({ dspec: dspec("A"), report });
      expect(decision.decision).toBe("HUMAN_REVIEW");
      expect(decision.concerns).toContain("stem_restatement");
      expect(decision.failures).not.toContain("competent_candidate_could_select");
      expect(decision.decision).not.toBe("ACCEPT");
    }
  });

  it("leaves an unseen plan unverified and does not reject the clause for that alone", () => {
    const report = reportFromStandalone({ surface: "sound", readings: [], sure: true, reason: "The clause is grammatical and the link fails." });
    expect(planRealization(report.planFidelity)).toBe("unverified");
    expect(planRealization(undefined)).toBe("unverified");
    expect(planRealization("faithful")).toBe("faithful");
    const decision = distractorDecision({ dspec: dspec("A"), report });
    expect(decision.decision).toBe("ACCEPT");
    expect(decision.failures).not.toContain("plan_fidelity");
    const legacy = reportFromVerdict({ verdict: "good", sure: true, reason: "r" });
    expect(planRealization(legacy.planFidelity)).toBe("unverified");
    expect(distractorDecision({ dspec: dspec("A"), report: legacy }).decision).toBe("ACCEPT");
    const unsure = reportFromStandalone({ surface: "sound", readings: ["uncertain"], sure: true, reason: "The link is hard to judge." });
    expect(unsure.standaloneReadings).toEqual(["uncertain"]);
    expect(distractorDecision({ dspec: dspec("A"), report: unsure }).decision).toBe("HUMAN_REVIEW");
  });

  it("keeps the rubric path, which still shows the key", () => {
    const rubric = distractorJudgeUser({ dspec: dspec("A"), skeleton, text: fine.A });
    expect(loadAIConfig({ FACTORY_DISTRACTOR_JUDGE: "rubric" }).distractorJudgeStyle).toBe("rubric");
    expect(rubric).toContain("INTENDED CORRECT OPTION");
    expect(rubric).toContain(skeleton.correctAnswer);
    expect(rubric).not.toContain("PLANNED FAILURE");
    expect(decideVerdict("good").decision).toBe("ACCEPT");
    expect(decideVerdict("second_answer").decision).toBe("REGENERATE");
    expect(distractorJudgeKeyExposure("rubric")).toBe("shown");
  });

  it("uses the blind verdict for experiments and does not call that path blind when the rubric is on", async () => {
    const seen: string[] = [];
    const recorder: AIProvider = {
      name: "fake",
      async generate(request) {
        seen.push(`${request.system ?? ""}\n${request.parts.map((part) => ("text" in part ? part.text : "")).join("\n")}`);
        throw new Error("stop");
      },
    };
    const env = { GENERATOR_MODEL: "w", DISTRACTOR_MODEL: "w", DISTRACTOR_JUDGE_MODEL: "dj", FINAL_JUDGE_MODEL: "judge", FACTORY_EXPERIMENTS: "contrast", FACTORY_DISTRACTOR_JUDGE: "verdict" };
    await createAIService(loadAIConfig(env), recorder).factory.judgeDistractor({ dspec: dspec("A"), skeleton, text: fine.A }).catch(() => undefined);
    expect(seen[0]).toContain("DISCOURSE TASK");
    expect(seen[0]).not.toContain("INTENDED CORRECT OPTION");
    expect(seen[0]).not.toContain(skeleton.correctAnswer);
    expect(distractorJudgeKeyExposure("verdict")).toBe("hidden");
    expect(distractorPromptsFor(["contrast"], "verdict").judge).toBe(distractorVerdictPromptVersion);
    expect(distractorPromptsFor(["contrast"], "rubric").judge).not.toBe(distractorVerdictPromptVersion);
    expect(distractorJudgeUser({ dspec: dspec("A"), skeleton, text: fine.A })).toContain("INTENDED CORRECT OPTION");
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

type Script = { skeletons?: QuestionSkeleton[]; plans?: DistractorBlueprint[][]; distractors?: Record<string, string[]>; reviews?: Record<string, DistractorJudgeReport[]>; explanations?: ItemExplanation[]; verdict?: "APPROVE" | "REJECT"; gate?: SkeletonCheckReport[]; secondOnFirst?: "A" | "C" | "D" | "E"; secondStays?: boolean; acceptableOnFirst?: "A" | "C" | "D" | "E" };

function fakeService(script: Script) {
  const log: string[] = [];
  const skeletons = [...(script.skeletons ?? [skeleton])];
  const queues = Object.fromEntries(["A", "C", "D", "E"].map((option) => [option, [...(script.distractors?.[option] ?? [fine[option]])]]));
  const reviews = Object.fromEntries(["A", "C", "D", "E"].map((option) => [option, [...(script.reviews?.[option] ?? [])]]));
  const explanations = [...(script.explanations ?? [explanationJson])];
  let judgeRound = 0;
  const take = <T>(queue: T[]) => (queue.length > 1 ? queue.shift()! : queue[0]);
  const service = {
    factory: {
      skeleton: async (_spec: unknown, feedback: string[], avoided: string[] = []) => {
        log.push(`skeleton${feedback.length ? "+feedback" : ""}${avoided.length ? "+avoid" : ""}`);
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
      planDistractors: async ({ feedback }: { feedback: string[] }) => {
        log.push(`plan${feedback.length ? "+feedback" : ""}`);
        return result({ distractorBlueprints: script.plans?.length ? take(script.plans) : [] }, "gen");
      },
      distractor: async ({ dspec: entry, feedback }: { dspec: DistractorSpec; feedback: string[] }) => {
        log.push(`distractor:${entry.option}${feedback.length ? "+feedback" : ""}`);
        return result<GeneratedDistractor>({ text: take(queues[entry.option]), rationale: "fails as a whole" }, "gen");
      },
      judgeDistractor: async ({ dspec: entry }: { dspec: DistractorSpec }) => {
        log.push(`review:${entry.option}`);
        return result(reviews[entry.option].length ? take(reviews[entry.option]) : review(), "dj");
      },
      explain: async ({ feedback }: { feedback?: string[] }) => {
        log.push(`explain${(feedback ?? []).includes("explanation_language") ? "+turkish" : ""}`);
        return result(take(explanations), "gen");
      },
    },
    judge: {
      evaluate: async () => {
        log.push("final-judge");
        judgeRound += 1;
        const alternativeDefensibleOptions = (script.secondStays || judgeRound === 1) && script.secondOnFirst ? [script.secondOnFirst] : [];
        const acceptability = script.acceptableOnFirst && judgeRound === 1
          ? { sentences: acceptabilityJson.sentences.map((entry) => (entry.option === script.acceptableOnFirst ? { ...entry, acceptable: true } : entry)) }
          : acceptabilityJson;
        return { blind: result({ answer: "B" as const, confidence: 0.9, rationale: "concession", stemEvidence: "prescribed medicine", equallyDefensible: null, uncertain: false }, "judge"), acceptability: result(acceptability, "judge"), report: result({ ...judgeJson, alternativeDefensibleOptions, verdict: script.verdict ?? "APPROVE" }, "judge") };
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
    expect(outcome.trace.state).toBe("APPROVED");
    expect(log).toEqual(["skeleton", "distractor:A", "review:A", "distractor:C", "review:C", "distractor:D", "review:D", "distractor:E", "review:E", "explain", "final-judge"]);
    expect(outcome.modelCalls).toBe(13);
    const record = outcome.record!;
    expect(record.status).toBe("approved");
    expect(record.versions[0].candidate.metadata.difficultyBasis).toBe("engine");
    expect(record.versions[0].candidate.question.options).toEqual({ A: fine.A, B: skeleton.correctAnswer, C: fine.C, D: fine.D, E: fine.E });
    expect(outcome.trace.distractors.every((entry) => entry.audit?.decisive_failure_reason === "fails as a whole" && entry.audit.distractor_type.startsWith("distractor_type:"))).toBe(true);
    expect(JSON.stringify(record.lesson)).not.toContain("decisive_failure_reason");
    expect(record.versions[0].candidate.distractorRationales.map((entry) => entry.distractorType)).toEqual(spec.distractorPlan.map((slot) => slot.distractorType));
    expect(record.provenance).toMatchObject({ pipelineVersion: "atomic.v1", generatorModel: "gen", distractorJudgeModel: "dj", judgeModel: "judge", distractorSpecVersion: "distractor-spec.v6" });
    expect(record.provenance.attempts.map((attempt) => `${attempt.stage}:${attempt.option ?? "-"}:${attempt.attempt}`)).toEqual(["skeleton:-:1", "distractor:A:1", "distractor:C:1", "distractor:D:1", "distractor:E:1", "explanation:-:1"]);
    expect(record.provenance.attempts[1].judge).toMatchObject({ model: "dj", decision: "ACCEPT" });
    expect(applyReview(record, { decision: "APPROVE", reviewer: "mora", at: "2026-10-08T13:00:00.000Z" }).generation?.state).toBe("APPROVED");
  });

  it("records a cached model error as a replay and a billed error as a miss", async () => {
    const replay = { factory: { skeleton: async () => { throw new AIOutputError("skeleton.v2: output is not valid JSON", "LENGTH", undefined, undefined, "replay", true); } } } as unknown as AIService;
    const replayed = await generateItem(spec, ctxFor(replay));
    expect(replayed.trace.cost?.log?.map((row) => `${row.localCache}:${row.outputTokens}`)).toEqual(["hit:0", "hit:0", "hit:0"]);
    expect(replayed.trace.attempts.every((attempt) => attempt.cached)).toBe(true);
    expect(replayed.modelCalls).toBe(3);
    const billed = { inputTokens: 10, outputTokens: 4096, totalTokens: 4106, reasoningTokens: 4096 };
    const fresh = { factory: { skeleton: async () => { throw new AIOutputError("skeleton.v2: output is not valid JSON", "LENGTH", billed, undefined, "fresh", false); } } } as unknown as AIService;
    const missed = await generateItem(spec, ctxFor(fresh));
    expect(missed.trace.cost?.log?.map((row) => row.localCache)).toEqual(["miss", "miss", "miss"]);
    expect(missed.trace.cost?.log?.[0]).toMatchObject({ outputTokens: 4096, reasoningTokens: 4096 });
    expect(missed.trace.attempts.every((attempt) => attempt.cached === false)).toBe(true);
  });

  it("stops a relational decline before the writer and does not retry", async () => {
    const hard = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 262, band: "hard" });
    const { service, log } = fakeService({});
    const reason = "After redesigning the stem, four distractors still had no demonstrable failure.";
    service.factory.skeleton = async () => result({
      decision: "decline",
      declineReason: reason,
      stem: "----, the redesigned stem states the time the failure needs.",
      correctBlueprint: "Although the obstacle remained",
      distractorBlueprints: [],
      missingDistractors: [
        { option: "A", reason: "No visible failure." },
        { option: "C", reason: "Same event as another letter." },
        { option: "D", reason: "Needs a hidden fact." },
        { option: "E", reason: "Repeats the correct obstacle." },
      ],
    }, "gen");
    const outcome = await generateItem(hard, ctxFor(service));
    expect(log).toEqual([]);
    expect(outcome.trace.state).toBe("SKELETON_FAILED");
    expect(outcome.trace.failure).toBe(`planner_decline: ${reason}`);
    expect(outcome.modelCalls).toBe(1);
    expect(outcome.record).toBeNull();
    expect(outcome.trace.attempts).toHaveLength(1);
    expect(outcome.trace.attempts[0].rejectionReason).toContain(reason);
    expect(outcome.trace.attempts[0].output).toContain("redesigned stem");
    expect(outcome.trace.attempts[0].output).toContain("No visible failure.");
  });

  it("regenerates only the failing distractor and records every attempt", async () => {
    const copy = "Because the treatment causes mild headaches and some tiredness during the first weeks";
    const { service, log } = fakeService({
      distractors: { A: [copy, "Because doctors usually prescribe it to patients who have already tried other drugs", fine.A] },
      reviews: { A: [review({ competentCandidateCouldSelect: true }), review()] },
    });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.state).toBe("APPROVED");
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
    expect(outcome.trace.state).toBe("APPROVED");
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
    expect(outcome.trace.state).toBe("REJECTED");
    expect(outcome.record!.status).toBe("judge_rejected");
    expect(outcome.trace.failure).toBe("unresolved_review");
  });

  it("retries a rejected skeleton up to three times and then gives up", async () => {
    const broken = { ...skeleton, stem: "Many patients continue to take the medicine for months without complaint." };
    const retried = fakeService({ skeletons: [broken, skeleton] });
    expect((await generateItem(spec, ctxFor(retried.service))).trace.state).toBe("APPROVED");
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
    expect(outcome.trace.state).toBe("APPROVED");
    expect(log.filter((entry) => entry === "explain")).toHaveLength(2);
    expect(log.filter((entry) => entry.startsWith("distractor:"))).toHaveLength(4);
    expect(outcome.record!.provenance.attempts.filter((attempt) => attempt.stage === "explanation").map((attempt) => attempt.validator.status)).toEqual(["reject", "pass"]);
  });

  it("asks for a Turkish explanation on retry and keeps the question and the key", async () => {
    const english = { ...explanationJson, explanation: "The key is right because the obstacle would normally produce the opposite result. The other options build a cause, a condition, a time order, or a contrast." };
    const turkish = { ...explanationJson, explanation: `${explanationJson.explanation} Hedef kelime curtail bu engeli adlandırır.` };
    const englishCandidate = { ...candidateJson, explanation: english.explanation };
    const turkishCandidate = { ...candidateJson, explanation: turkish.explanation };
    expect(validateCandidate({ spec, candidate: englishCandidate as never }).issues.map((issue) => issue.code)).toContain("explanation_language");
    expect(validateCandidate({ spec, candidate: turkishCandidate as never }).issues.map((issue) => issue.code)).not.toContain("explanation_language");
    const retry = explanationUser({ spec, core: { stem: skeleton.stem, options: { A: fine.A, B: skeleton.correctAnswer, C: fine.C, D: fine.D, E: fine.E }, correctOption: "B" }, dspecs, feedback: ["explanation_language"] });
    expect(retry).toContain("Rewrite the entire explanation in Turkish.");
    expect(retry).toContain("do not change the question, options, or answer key.");
    const { service } = fakeService({ explanations: [english, turkish] });
    const outcome = await generateItem(spec, ctxFor(service));
    const question = outcome.record!.versions[0].candidate.question;
    expect(outcome.trace.state).toBe("APPROVED");
    expect(question.stem).toBe(skeleton.stem);
    expect(question.options.B).toBe(skeleton.correctAnswer);
    expect(outcome.record!.versions[0].candidate.correctOption).toBe("B");
    expect(outcome.record!.versions[0].candidate.explanation).toContain("curtail");
  });

  it("rewrites a second answer once and judges the repaired item", async () => {
    const slot = spec.distractorPlan.find((entry) => entry.option === "C")!;
    const surface = connectorSurface(slot.connectors[0]);
    const replacement = `${surface.charAt(0).toUpperCase()}${surface.slice(1)} the archive kept every damaged ledger in a locked room beside the reading hall`;
    const { service, log } = fakeService({ distractors: { C: [fine.C, replacement] }, secondOnFirst: "C" });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(log.filter((entry) => entry === "final-judge")).toHaveLength(2);
    expect(log.filter((entry) => entry === "distractor:C+feedback")).toHaveLength(1);
    const kept = outcome.record!.versions[0].candidate.question;
    const written = outcome.trace.attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === "C");
    expect(written.map((attempt) => attempt.output)).toEqual([fine.C, replacement]);
    expect(kept.options.C).toBe(replacement);
    expect(kept.options.C).not.toBe(fine.C);
    expect(kept.options.B).toBe(skeleton.correctAnswer);
    expect(outcome.trace.state).toBe("APPROVED");
    expect(outcome.record!.status).toBe("approved");
  });

  it("does not rewrite a sentence that is only acceptable on its own", async () => {
    const { service, log } = fakeService({ acceptableOnFirst: "C" });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(log.filter((entry) => entry === "final-judge")).toHaveLength(1);
    expect(log.filter((entry) => entry === "skeleton")).toHaveLength(1);
    expect(log.filter((entry) => entry === "distractor:C+feedback")).toHaveLength(0);
    expect(outcome.record!.versions[0].candidate.question.options.B).toBe(skeleton.correctAnswer);
    expect(outcome.record!.versions[0].candidate.question.options.C).toBe(fine.C);
    expect(outcome.record!.versions[0].candidate.question.options.A).toBe(fine.A);
    expect(outcome.record!.judge?.failures.some((failure) => failure.startsWith("acceptable_distractor_"))).toBe(false);
    expect(outcome.record!.judge?.acceptableOptions).toContain("C");
    expect(outcome.trace.state).toBe("APPROVED");
  });

  it("rejects the item when the repaired option is still a second answer", async () => {
    const slot = spec.distractorPlan.find((entry) => entry.option === "C")!;
    const surface = connectorSurface(slot.connectors[0]);
    const replacement = `${surface.charAt(0).toUpperCase()}${surface.slice(1)} the archive kept every damaged ledger in a locked room beside the reading hall`;
    const { service, log } = fakeService({ distractors: { C: [fine.C, replacement] }, secondOnFirst: "C", secondStays: true });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(log.filter((entry) => entry === "final-judge")).toHaveLength(2);
    expect(log.filter((entry) => entry === "skeleton")).toHaveLength(1);
    expect(outcome.record!.versions[0].candidate.question.options.B).toBe(skeleton.correctAnswer);
    expect(outcome.trace.state).toBe("REJECTED");
    expect(outcome.record!.judge?.failures).toContain("second_defensible_C");
  });

  it("keeps a repaired distractor when the new explanation is still English", async () => {
    const slot = spec.distractorPlan.find((entry) => entry.option === "C")!;
    const surface = connectorSurface(slot.connectors[0]);
    const replacement = `${surface.charAt(0).toUpperCase()}${surface.slice(1)} the archive kept every damaged ledger in a locked room beside the reading hall`;
    const english = { ...explanationJson, explanation: "The key is right because the obstacle would normally produce the opposite result. The other options build a cause, a condition, a time order, or a contrast." };
    const { service, log } = fakeService({ distractors: { C: [fine.C, replacement] }, explanations: [explanationJson, english], secondOnFirst: "C" });
    const outcome = await generateItem(spec, ctxFor(service));
    const question = outcome.record!.versions[0].candidate.question;
    expect(log).toContain("explain+turkish");
    expect(log.filter((entry) => entry === "distractor:C+feedback")).toHaveLength(1);
    expect(log.filter((entry) => entry === "final-judge")).toHaveLength(1);
    const written = outcome.trace.attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === "C");
    expect(written.map((attempt) => attempt.output)).toEqual([fine.C, replacement]);
    expect(written[1].rejectionReason).toBeNull();
    expect(outcome.trace.state).toBe("REJECTED");
    expect(outcome.trace.failure).toBe("explanation_language");
    expect(outcome.record!.status).toBe("validator_rejected");
    expect(outcome.record!.status).not.toBe("approved");
    expect(outcome.record!.judge).toBeNull();
    expect(question.options.C).toBe(replacement);
    expect(question.options.C).not.toBe(fine.C);
    expect(question.options.B).toBe(skeleton.correctAnswer);
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
    expect(Object.fromEntries(metrics.endStates)).toEqual({ APPROVED: 1, DISTRACTORS_FAILED: 1 });
    expect(metrics.production).toMatchObject({
      requested_count: 2,
      first_attempt_pass: 2,
      total_stem_gate_pass: 2,
      distractor_judged_pass: 1,
      final_approved: 1,
      final_review: 0,
      final_rejected: 0,
      human_approved: 1,
      banked_hard: 0,
      banked_medium: 1,
      banked_easy: 0,
      duplicate_target_lemmas: 0,
      total_api_cost: null,
      hard_yield_of_requested: 0,
      hard_yield_of_stem_pass: 0,
    });
    const accounted = Object.values(Object.fromEntries(metrics.endStates)).reduce((sum, count) => sum + count, 0);
    expect(accounted).toBe(metrics.production.requested_count);
    expect(metrics.production.final_approved + metrics.production.final_review + metrics.production.final_rejected).toBe(1);
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
    expect(judgeSystem).toContain("equally defensible concession");
    expect(judgeSystem).toContain("merely possible in the real world");
    expect(distractorSystem).toContain("Topic similarity is not correctness");
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

  it("does not replay one skeleton for the next spec in the same domain", async () => {
    const recorder: AIProvider = {
      name: "fake",
      generate: async (request) => ({ text: JSON.stringify({ context: null, stem: "The trial ended ----.", correctAnswer: "although the panel was split" }), model: request.model, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }),
    };
    const service = createAIService(loadAIConfig({ GENERATOR_MODEL: "w", DISTRACTOR_JUDGE_MODEL: "dj", FINAL_JUDGE_MODEL: "judge" }), recorder);
    const first = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 1, band: "hard" });
    const later = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 13, band: "hard" });
    expect(first.contextConstraints.domain).toBe(later.contextConstraints.domain);
    expect(first.contextConstraints.blankPosition).toBe(later.contextConstraints.blankPosition);
    const one = await service.factory.skeleton(first, []);
    const again = await service.factory.skeleton(first, []);
    const two = await service.factory.skeleton(later, []);
    expect(again).toMatchObject({ requestHash: one.requestHash, cached: true });
    expect(one.requestHash).not.toBe(two.requestHash);
    expect(skeletonSystem(first)).toContain("Decide the item plan before you write any English sentence");
    expect(skeletonSystem(first).indexOf("difficultyStrategy")).toBeLessThan(skeletonSystem(first).indexOf('"stem"'));
    expect(skeletonUser(first)).toContain("Do not write the sentence first and fit a plan to it afterwards.");
    expect(skeletonUser(first, ["The concession was too transparent."])).toContain("ASSIGNED STRATEGY: lexical_pivot.");
    expect(skeletonUser(first, ["The concession was too transparent."])).toContain("Decide a new plan before you write the new sentence.");
    const relational = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 212, band: "hard" });
    expect(skeletonUser(relational)).toContain("ASSIGNED STRATEGY: relational_inference.");
    expect(skeletonUser(relational, ["Write a different situation."])).toContain("ASSIGNED STRATEGY: relational_inference.");
    const situation = "Actor: the night bakers. Obstacle: the main oven lost its heat. Outcome: the ward still received the full bread order.";
    expect(skeletonUser(relational)).toContain("Invent the situation");
    expect(skeletonUser(relational)).not.toContain("ASSIGNED SITUATION");
    expect(skeletonSystem(relational)).not.toContain("ASSIGNED SITUATION");
    const assigned = skeletonUser(relational, [], [], situation);
    expect(assigned).toContain("ASSIGNED SITUATION");
    expect(assigned).toContain(situation);
    expect(assigned).toContain("JOINT OPTION PLAN");
    expect(assigned).not.toContain("Invent the situation");
    const medium = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 2, band: "medium" });
    expect(skeletonSystem(medium)).toContain('{"context": null, "stem": "...", "correctAnswer": "..."}');
    expect(skeletonSystem(medium)).not.toContain("Decide the item plan");
    const hardSchema = skeletonResponseSchema("hard") as { properties: Record<string, unknown>; required: string[] };
    expect(Object.keys(hardSchema.properties).slice(0, 4)).toEqual(["difficultyStrategy", "targetLexeme", "neutralSubstitute", "scenario"]);
    expect(hardSchema.required).toEqual(expect.arrayContaining(["difficultyStrategy", "scenario"]));
    expect((skeletonResponseSchema() as { required?: string[] }).required ?? []).not.toContain("difficultyStrategy");
    expect(skeletonUser(first)).toMatch(/replace that word with a plain verb such as affect/i);
    expect(skeletonUser(first)).toMatch(/not a frame to fill/);
    expect(skeletonUser(first, [], ["volatility"])).toContain("TARGET WORDS ALREADY USED IN THIS BATCH: volatility.");
    expect(skeletonUser(first, [], ["volatility"])).toContain("Do not pick a corner noun");
    expect(skeletonUser(first)).not.toMatch(/Delete only that word/);
    expect(skeletonUser(first)).not.toMatch(/harmless fact: a date/);
    expect(skeletonUser(first)).not.toMatch(/storage solution that had turned hypoxic/);
  });
});

describe("planner benchmark hooks", () => {
  it("keeps the relational planner request at 3072 unless this process raises it", async () => {
    const seen: { maxOutputTokens?: number; text: string }[] = [];
    const recorder: AIProvider = {
      name: "fake",
      generate: async (request) => {
        seen.push({ maxOutputTokens: request.maxOutputTokens, text: (request.parts[0] as { text: string }).text });
        return { text: "{}", model: request.model, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
      },
    };
    const relational = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 302, band: "hard" });
    const base = { GENERATOR_MODEL: "w", DISTRACTOR_JUDGE_MODEL: "dj", FINAL_JUDGE_MODEL: "judge" };
    await createAIService(loadAIConfig(base), recorder).factory.skeleton(relational, []).catch(() => undefined);
    const dir = mkdtempSync(path.join(tmpdir(), "planner-briefs-"));
    const briefs = path.join(dir, "briefs.json");
    writeFileSync(briefs, JSON.stringify({ [relational.id]: "Actor: the night bakers." }));
    await createAIService(loadAIConfig({ ...base, FACTORY_PLANNER_MAX_OUTPUT_TOKENS: "8192", FACTORY_SCENARIO_BRIEFS: briefs }), recorder).factory.skeleton(relational, []).catch(() => undefined);
    rmSync(dir, { recursive: true, force: true });
    expect(seen[0].maxOutputTokens).toBe(3072);
    expect(seen.at(-1)?.maxOutputTokens).toBe(8192);
    expect(seen[0].text).toContain("Invent the situation");
    expect(seen.at(-1)?.text).toContain("Actor: the night bakers.");
    expect(seen[0].text).not.toContain("ASSIGNED SITUATION");
  });
});

describe("skeleton surface repair", () => {
  it("fixes blank punctuation and capitalisation before a model is called again", () => {
    const repaired = repairSkeletonSurface(spec, {
      context: null,
      stem: "---- many patients continue to take the prescribed medicine for several months without complaint",
      correctAnswer: "although the treatment causes mild headaches and some tiredness during the first weeks.",
    });
    expect(repaired.stem.startsWith("----, ")).toBe(true);
    expect(repaired.stem.endsWith(".")).toBe(true);
    expect(repaired.correctAnswer.startsWith("Although")).toBe(true);
    const codes = validateSkeleton({ spec, skeleton: repaired }).issues.map((issue) => issue.code);
    expect(codes).not.toContain("stem_punctuation");
    expect(codes).not.toContain("answer_capitalisation");
    expect(clauseRepair(["hard_no_term"])).toBe(true);
    expect(clauseRepair(["hard_decorative_clause"])).toBe(false);
    expect(clauseRepair(["hard_decorative_clause", "hard_no_term"])).toBe(false);
    expect(clauseRepair(["stem_punctuation"])).toBe(false);
    expect(clauseRepair(["gate_error"])).toBe(false);
  });
});

describe("skeleton gate", () => {
  const sound: SkeletonCheckReport = { reasons: ["clear concession"], grammatical: true, natural: 0.9, keyTrue: true, targetRelation: 0.9, keyAmbiguous: 0.1, confidence: 0.9 };
  const ambiguous: SkeletonCheckReport = { ...sound, reasons: ["the key also reads as a reason"], keyAmbiguous: 0.7 };

  it("checks the skeleton before any distractor and records the check on the attempt", async () => {
    const { service, log } = fakeService({ gate: [sound] });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.trace.state).toBe("APPROVED");
    expect(log.slice(0, 3)).toEqual(["skeleton", "gate", "distractor:A"]);
    expect(outcome.record!.provenance).toMatchObject({ skeletonGatePromptVersion: "skeleton-check.v2", skeletonGateVersion: "skeleton-gate.v1" });
    expect(outcome.record!.provenance.attempts[0].judge).toMatchObject({ model: "dj", decision: "ACCEPT" });
    expect(outcome.record!.versions[0].candidate.metadata.gate).toEqual({ embedding: "", preciseTerm: "", clauseCarriesClash: false });
    expect(outcome.record!.versions[0].candidate.metadata.judgeEstimatedBand).toBe("medium");
    expect(outcome.record!.versions[0].candidate.metadata.selfRatedDifficulty).toBe("medium");
    expect(outcome.record!.versions[0].candidate.metadata.approvedBand).toBe("medium");
    expect(outcome.record!.versions[0].candidate.metadata.difficultyBasis).toBe("engine");
  });

  it("regenerates a repeated target lemma before writing distractors", async () => {
    const named = (term: string): SkeletonCheckReport => ({ ...sound, preciseTerm: term, embedding: term, clauseCarriesClash: true });
    const other: QuestionSkeleton = {
      context: null,
      stem: "----, the archive published the catalogue before the end of the quarter.",
      correctAnswer: "Although the ink on the oldest folders had faded past any reliable reading",
    };
    const first = fakeService({ gate: [named("volatility")] });
    const second = fakeService({ skeletons: [other], gate: [named("volatility"), named("impede")] });
    const ctx = ctxFor(first.service);
    const opened = await generateItem(spec, ctx);
    expect(opened.trace.state).toBe("APPROVED");
    expect(ctx.usedTargets).toEqual(["volatility"]);
    const again = await generateItem({ ...spec, id: `${spec.id}.next` }, { ...ctx, service: second.service });
    expect(second.log.slice(0, 5)).toEqual(["skeleton+avoid", "gate", "skeleton+feedback+avoid", "gate", "distractor:A"]);
    expect(again.record!.versions[0].candidate.question.options.B).toBe(other.correctAnswer);
    expect(again.record!.versions[0].candidate.metadata.gate?.preciseTerm).toBe("impede");
    expect(ctx.usedTargets).toEqual(["volatility", "impede"]);
  });

  it("copies the accepted gate report onto the candidate and leaves the two bands unset", () => {
    const report = { reasons: ["clear concession"], grammatical: true, natural: 0.9, keyTrue: true, targetRelation: 0.9, keyAmbiguous: 0.1, confidence: 0.9, embedding: "that had turned anoxic", preciseTerm: "anoxic", clauseCarriesClash: true as const };
    const candidate = assembleCandidate(spec, { stem: skeleton.stem, options: { A: fine.A, B: skeleton.correctAnswer, C: fine.C, D: fine.D, E: fine.E }, correctOption: "B" }, explanationJson, report);
    expect(candidate.metadata.gate).toEqual(gateEvidence(report));
    expect(candidate.metadata.gate).toEqual({ embedding: "that had turned anoxic", preciseTerm: "anoxic", clauseCarriesClash: true });
    expect(candidate.metadata.selfRatedDifficulty).toBe(explanationJson.estimatedDifficulty);
    expect(candidate.metadata.judgeEstimatedBand).toBeUndefined();
    expect(candidate.metadata.approvedBand).toBeUndefined();
  });

  it("writes a new skeleton when the key is ambiguous and drops the item after the limit, without writing distractors", async () => {
    const retried = fakeService({ gate: [ambiguous, sound] });
    const ok = await generateItem(spec, ctxFor(retried.service));
    expect(ok.trace.state).toBe("APPROVED");
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
    expect((await generateItem(spec, ctxFor(service, { FACTORY_SKELETON_GATE: "off" }))).trace.state).toBe("APPROVED");
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
    expect(verdict.failures).toContain("second_defensible_C");
    expect(verdict.failures.some((failure) => failure.startsWith("acceptable_distractor_"))).toBe(false);
    expect(verdict.acceptableOptions).toEqual(expect.arrayContaining(["B", "C"]));
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

describe("relational distractor contract", () => {
  const hard = (ordinal: number) => buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal, band: "hard" });
  const relational = hard(202);
  const lexical = hard(203);
  const contrast = (built: typeof relational) => built.distractorPlan.find((slot) => slot.expresses === "discourse_relation:contrast")!;
  const withOption = (built: typeof relational, text: string) => {
    const slot = contrast(built);
    return { ...candidateJson, question: { ...candidateJson.question, options: { ...candidateJson.question.options, [slot.option]: text } } };
  };
  const codesFor = (built: typeof relational, text: string, option = contrast(built).option) =>
    validateCandidate({ spec: built, candidate: withOption(built, text) as never }).issues.filter((issue) => issue.option === option).map((issue) => issue.code);

  it("does not reject a relational option only because it opens with although", () => {
    expect(contrast(relational).connectors).toEqual(expect.arrayContaining(["connector:although", "connector:even_though"]));
    expect(relational.vocabularyConstraints.forbiddenInDistractors).not.toEqual(expect.arrayContaining(["although", "while"]));
    const nearMiss = buildDistractorSpecs(relational, defaultFactoryThresholds).find((entry) => entry.option === contrast(relational).option)!;
    expect(nearMiss.semanticConstraint.failureMode).toBe("no_broken_expectation");
    expect(nearMiss.relationConstraint.mustNotExpress).toEqual([]);
    const writer = distractorUser({ dspec: nearMiss, skeleton: { stem: candidateJson.question.stem, correctAnswer: candidateJson.question.options.B, context: "" } as never, usedConnectors: [], feedback: [], strategy: "relational_inference" });
    expect(writer).toContain("A concession connector is not required");
    expect(writer).not.toContain("must open with although");
    const issues = codesFor(relational, "Although the ward clerks file the drug charts only after the morning round has ended");
    expect(issues).not.toContain("distractor_has_target_relation");
    expect(issues).not.toContain("forbidden_marker_in_distractor");
    const validation = validateCandidate({ spec: relational, candidate: withOption(relational, "Although the ward clerks file the drug charts only after the morning round has ended") as never });
    expect(validation.issues.map((issue) => issue.code)).not.toContain("sole_concessive_clue");
  });

  it("still rejects a distractor that is a second defensible concession", () => {
    const dspec = buildDistractorSpecs(relational, defaultFactoryThresholds)[0];
    const second = distractorDecision({ dspec, report: reportFromVerdict({ verdict: "second_answer", sure: true, reason: "The joined sentence is a real concession." }) });
    expect(second.decision).toBe("REGENERATE");
    expect(second.failures).toContain("unintended_correctness");
    const verdict = judgeDecision({
      spec: relational,
      validation: validateCandidate({ spec: relational, candidate: candidateJson as never }),
      judge: {
        blindAnswer: "B",
        blindConfidence: 0.9,
        acceptability: { sentences: acceptabilityJson.sentences.map((entry) => ({ ...entry, acceptable: entry.option === "B" || entry.option === "C" })) },
        report: { ...judgeJson, alternativeDefensibleOptions: ["C"] } as never,
      },
    });
    expect(verdict.verdict).toBe("REJECT");
    expect(verdict.failures.some((failure) => failure.startsWith("second_defensible_"))).toBe(true);
  });

  it("fails quality control when the key is the only concessive connector", () => {
    const validation = validateCandidate({ spec: relational, candidate: candidateJson as never });
    expect(validation.issues.map((issue) => issue.code)).toContain("sole_concessive_clue");
    expect(validation.status).toBe("reject");
  });

  it("judges while and whereas by the slot, not by a word ban", () => {
    const whileCodes = codesFor(relational, "While the ward clerks file the drug charts only after the morning round has ended");
    expect(whileCodes).not.toContain("forbidden_marker_in_distractor");
    expect(whileCodes).not.toContain("connector_unrecognised");
    const whereasCodes = codesFor(relational, "Whereas the ward clerks file the drug charts only after the morning round has ended");
    expect(whereasCodes).not.toContain("distractor_has_target_relation");
    expect(whereasCodes).not.toContain("forbidden_marker_in_distractor");
  });

  it("does not count concession markers on separate options as multiple concessions", () => {
    const validation = validateCandidate({
      spec: relational,
      candidate: withOption(relational, "Even though the ward clerks file the drug charts only after the morning round has ended") as never,
    });
    expect(validation.issues.map((issue) => issue.code)).not.toContain("distractor_has_target_relation");
    expect(validation.issues.map((issue) => issue.code)).not.toContain("sole_concessive_clue");
  });

  it("keeps the lexical pivot concession ban", () => {
    expect(lexical.vocabularyConstraints.forbiddenInDistractors).toEqual(expect.arrayContaining(["although", "even though", "while", "though"]));
    expect(contrast(lexical).connectors).not.toContain("connector:although");
    const slot = buildDistractorSpecs(lexical, defaultFactoryThresholds).find((entry) => entry.option === contrast(lexical).option)!;
    expect(slot.semanticConstraint.failureMode).toBe("no_real_opposition");
    expect(slot.relationConstraint.mustNotExpress).toContain("discourse_relation:concession");
    const issues = codesFor(lexical, lexical.contextConstraints.blankPosition === "start" ? "Although the ward clerks file the drug charts only after the morning round has ended" : "although the ward clerks file the drug charts only after the morning round has ended");
    expect(issues).toEqual(expect.arrayContaining(["distractor_has_target_relation"]));
    expect(slot.lexicalConstraint.forbiddenWords).toContain("although");
  });

  it("still regenerates a grammar-only distractor and keeps a natural wrong option", () => {
    const dspec = buildDistractorSpecs(relational, defaultFactoryThresholds)[0];
    expect(distractorDecision({ dspec, report: reportFromVerdict({ verdict: "ungrammatical", sure: true, reason: "The verb does not agree." }) }).decision).toBe("REGENERATE");
    expect(distractorDecision({ dspec, report: reportFromVerdict({ verdict: "too_obvious", sure: true, reason: "The event is absurd." }) }).decision).toBe("REGENERATE");
    expect(distractorDecision({ dspec, report: reportFromVerdict({ verdict: "good", sure: true, reason: "The clause is natural and the relation fails." }) }).decision).toBe("ACCEPT");
  });
});

describe("joint option plan", () => {
  const relational = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 262, band: "hard" });
  const lexical = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 263, band: "hard" });
  const letters = relational.distractorPlan.map((slot) => slot.option);
  const base = {
    context: null,
    stem: "----, the survey team logged more usable exposures from the valley station than from its dry ridge site.",
    correctAnswer: "Even though river fog blanketed the valley on most nights",
    scenario: {
      domain: "observational astronomy",
      actor: "survey team at a mountain valley station",
      obstacle: "river fog blanketing the valley on most nights",
      expected: "fewer usable exposures from the valley than from the dry ridge",
      outcome: "more usable exposures came from the valley station",
      relation: "concession",
    },
  } satisfies QuestionSkeleton;
  const reason = "The stem assigns the larger total of usable exposures to the valley station, so a ridge share names the wrong site.";
  const anchor = "the survey team logged more usable exposures from the valley station than from its dry ridge site";
  const plan = (
    option: (typeof letters)[number],
    relationFamily: RelationFamily,
    proposition: string,
    decisiveFailureReason = reason,
    failureAnchor: DistractorBlueprint["failureAnchor"] = "outcome",
    failureMechanism: DistractorBlueprint["failureMechanism"] = "contradicts_outcome",
    stemEvidenceAnchor = anchor,
    actor = "ridge site",
    time = "logged",
    scope = "usable exposures",
  ): DistractorBlueprint => ({
    option,
    relationFamily,
    actor,
    time,
    scope,
    proposition,
    intendedMisconception: relationFamily === "near_concession" ? "A nearby limit is mistaken for the obstacle that makes the outcome unexpected." : "",
    whyPlausible: "A learner might choose this clause because it stays on the same field event and sounds like a real limit.",
    stemEvidenceAnchor,
    failureMechanism,
    decisiveFailureReason,
    failureAnchor,
    connectorStrategy: "natural",
  });
  const sound = (): DistractorBlueprint[] => [
    plan(letters[0], "near_concession", "the dry ridge site logged the larger share of usable exposures", reason, "reference", "reference_mismatch"),
    plan(letters[1], "cause", "older detectors recorded fewer faint stars than the ridge instruments did", "Weaker detectors would make the valley station record fewer exposures, so they cannot explain the larger valley total.", "outcome", "contradicts_outcome"),
    plan(letters[2], "condition", "the ridge crew cancelled every comparison whenever clouds covered the summit road", "A cancelled comparison would remove the usable exposures the valley station already logged, so the condition cannot restrict that result.", "outcome", "wrong_expectation"),
    plan(letters[3], "contrast", "the ridge station kept a private log that the valley team never consulted", "The valley exposures are already logged, and a private ridge log the team never consulted cannot change that station's total.", "reference", "reference_mismatch"),
  ];
  const codes = (blueprints: DistractorBlueprint[], skeleton: QuestionSkeleton = base) => distractorPlanIssues(relational, { ...skeleton, distractorBlueprints: blueprints }).map((issue) => issue.code);

  it("accepts four distinct plans and does not require a near concession", () => {
    expect(codes(sound())).toEqual([]);
    const repeatedFamily = sound();
    repeatedFamily[3] = plan(letters[3], "near_concession", "the ridge team opened its night log before the valley comparison", "Opening the ridge log early removes a different limit from the one that should have reduced the valley exposures.");
    expect(codes(repeatedFamily)).toEqual([]);
    expect(buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints: repeatedFamily }).filter((entry) => entry.semanticConstraint.failureMode === "no_broken_expectation")).toHaveLength(2);
    const withoutNear = sound();
    withoutNear[0] = plan(letters[0], "time", "the valley crew started the ridge comparison before the night log was closed", "Starting the comparison before the log closed does not trigger the extra exposures, so the time link is illogical.");
    expect(codes(withoutNear)).toEqual([]);
    expect(validateSkeleton({ spec: lexical, skeleton: base }).issues.map((issue) => issue.code)).not.toContain("plan_missing");
    expect(distractorPlanIssues(relational, base).map((issue) => issue.code)).toContain("plan_missing");
  });

  it("rejects a local-sale plan the stem does not contradict, the 316 case", () => {
    const stem = "----, the wool trade of the town expanded steadily through the seventeenth century, carried entirely in its own vessels.";
    const woolAnchor = "the wool trade of the town expanded steadily through the seventeenth century, carried entirely in its own vessels";
    const blueprints = sound();
    blueprints[0] = plan(letters[0], "contrast", "the town wool exports declined sharply after the middle of the century", "A sharp decline contradicts the expansion the stem states for the whole century.", "outcome", "contradicts_outcome", woolAnchor, "the town", "seventeenth century", "wool trade");
    blueprints[1] = plan(letters[1], "cause", "foreign carriers had taken over the coastal shipping from the town", "Foreign carriers contradict the own vessels that the stem says carried the wool.", "reference", "reference_mismatch", woolAnchor, "the town", "seventeenth century", "the town");
    blueprints[2] = plan(letters[2], "condition", "the harbour depth stayed sufficient for the town fleet throughout the century", "The clause keeps the fleet able to sail, so it does not reverse the expansion the stem already states.", "outcome", "wrong_expectation", woolAnchor);
    blueprints[3] = plan(letters[3], "contrast", "the wool was sold only in local markets near the town", "The stem does not say the wool was sold abroad, so a local market is not supported.", "scope", "scope_mismatch", woolAnchor);
    expect(codes(blueprints, { ...base, stem })).toContain("plan_undemonstrated");
    expect(codes(blueprints, { ...base, stem }).filter((code) => code === "plan_undemonstrated")).toHaveLength(1);
    const recovery = "----, the treatment reduced the average recovery time for the ward patients.";
    const recoveryAnchor = "the treatment reduced the average recovery time for the ward patients";
    const reversed = sound();
    reversed[0] = plan(letters[0], "contrast", "patients required longer recovery periods after the same treatment", "Longer recovery contradicts the reduced recovery time the stem states for the ward patients.", "outcome", "contradicts_outcome", recoveryAnchor, "ward patients", "the treatment", "recovery time");
    expect(distractorPlanIssues(relational, { ...base, stem: recovery, distractorBlueprints: reversed }).filter((issue) => issue.detail === letters[0]).map((issue) => issue.code)).not.toContain("plan_undemonstrated");
    const stars = sound();
    stars[0] = plan(letters[0], "contrast", "fewer faint stars were detected from the ridge instruments", "Fewer stars contradict the more usable exposures the stem records from the valley station.", "reference", "reference_mismatch", anchor, "ridge instruments", "the survey", "faint stars");
    expect(distractorPlanIssues(relational, { ...base, distractorBlueprints: stars }).filter((issue) => issue.detail === letters[0]).map((issue) => issue.code)).not.toContain("plan_undemonstrated");
    blueprints[3] = plan(letters[3], "contrast", "the wool was sold only in local markets near the town", "Vessels point to sea trade, so a purely local market conflicts with the shipping.", "scope", "scope_mismatch", woolAnchor);
    expect(codes(blueprints, { ...base, stem })).toContain("plan_undemonstrated");
    const decline = codes([blueprints[0], blueprints[1], blueprints[2], plan(letters[3], "contrast", "the town kept a second set of customs rolls in the guild hall", "The rolls name a different record from the vessels and the expansion the stem states.", "reference", "reference_mismatch", woolAnchor)], { ...base, stem });
    expect(decline).not.toContain("plan_undemonstrated");
  });

  it("separates an invalid exclusion from a scope restatement without reading the words as proof", () => {
    const exclusionReason = "The stem does not say that a failed applicant receives no tuition, and every applicant who passed does not entail that exclusion from the scholarship.";
    const exclusionAnchor = "every applicant who has passed the language test";
    const scholarship = "Although the scholarship pays the tuition of every applicant who has passed the language test, ----.";
    const exclusion = {
      ...plan(letters[0], "contrast", "an applicant who has failed the test receives no tuition from it", exclusionReason, "scope", "scope_mismatch", exclusionAnchor, "failed applicant", "the test", "tuition"),
      propositionStatus: "not_entailed" as const,
      inferenceClaim: "invalid_inference" as const,
    };
    const letterCodes = (blueprints: DistractorBlueprint[], stem: string) =>
      distractorPlanIssues(relational, { ...base, stem, distractorBlueprints: blueprints }).filter((issue) => issue.detail === letters[0]).map((issue) => issue.code);
    const labeled = sound();
    labeled[0] = exclusion;
    expect(letterCodes(labeled, scholarship)).not.toContain("plan_undemonstrated");
    expect(letterCodes(labeled, scholarship)).not.toContain("plan_restatement_as_inference");
    const unlabeled = sound();
    unlabeled[0] = { ...exclusion, propositionStatus: undefined, inferenceClaim: undefined };
    expect(letterCodes(unlabeled, scholarship)).toContain("plan_undemonstrated");

    const fourthReason = "The bursary already pays for three children, so the fourth child repeats that limit rather than a new inference.";
    const fourthAnchor = "up to three children in one family";
    const bursary = "Although the bursary pays school fees for up to three children in one family, ----.";
    const fourth = {
      ...plan(letters[0], "contrast", "the fourth child in a family is not paid for by the bursary", fourthReason, "scope", "scope_mismatch", fourthAnchor, "fourth child", "the family", "school fees"),
      propositionStatus: "restatement" as const,
      inferenceClaim: "invalid_inference" as const,
    };
    const restated = sound();
    restated[0] = fourth;
    expect(letterCodes(restated, bursary)).toContain("plan_restatement_as_inference");
    const sameWords = sound();
    sameWords[0] = { ...fourth, propositionStatus: "undetermined", inferenceClaim: "invalid_inference" };
    expect(letterCodes(sameWords, bursary)).not.toContain("plan_restatement_as_inference");

    const roomReason = "The repaired room is already the exception the stem states, so closing that room repeats the exception.";
    const roomAnchor = "every room except the room that is being repaired";
    const house = "Although visitors may enter every room except the room that is being repaired, ----.";
    const room = {
      ...plan(letters[0], "contrast", "the room that is being repaired is closed to visitors", roomReason, "scope", "scope_mismatch", roomAnchor, "visitors", "the repair", "that room"),
      propositionStatus: "restatement" as const,
      inferenceClaim: "invalid_inference" as const,
    };
    const rooms = sound();
    rooms[0] = room;
    expect(letterCodes(rooms, house)).toContain("plan_restatement_as_inference");

    expect(codes(sound())).not.toContain("plan_undemonstrated");
    expect(codes(sound())).not.toContain("plan_restatement_as_inference");
    expect(sound()[3].proposition).toMatch(/\bnever\b/);
  });

  it("does not require actor, time, and scope on every belief", () => {
    const farmers = sound();
    farmers[0] = plan(letters[0], "contrast", "nearby farmers dated the valley exposures to two phases", "Two phases contradict the exposures the survey team logged from the valley station.", "outcome", "contradicts_outcome", anchor, "nearby farmers", "the survey", "usable exposures");
    expect(codes(farmers)).not.toContain("plan_undemonstrated");
    const bare = sound().map((entry) => ({ ...entry, actor: undefined, time: undefined, scope: undefined }));
    expect(codes(bare)).toEqual([]);
  });

  it("rejects a written clause that changes the planned actor or result", () => {
    const blueprints = sound();
    blueprints[0] = plan(letters[0], "contrast", "the cloth merchants had abandoned the port and closed their warehouses", "Closing the warehouses removes the storage the stem gives those merchants.", "outcome", "contradicts_outcome", anchor, "cloth merchants", "the port", "their warehouses");
    const slot = buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints }).find((entry) => entry.option === letters[0])!;
    const changed = validateDistractor({ dspec: slot, skeleton: { ...base, distractorBlueprints: blueprints }, text: "Although the traders had sold their warehouses and cut the shipments", accepted: [] });
    expect(changed.issues.map((issue) => issue.code)).not.toContain("plan_mismatch");
    const faithful = validateDistractor({ dspec: slot, skeleton: { ...base, distractorBlueprints: blueprints }, text: "Although the cloth merchants had abandoned the port and closed their warehouses", accepted: [] });
    expect(faithful.issues.map((issue) => issue.code)).not.toContain("plan_mismatch");
  });

  it("keeps actor, time, and scope, and leaves proposition meaning to plan fidelity", () => {
    const warehouses = sound();
    warehouses[0] = plan(letters[0], "contrast", "the merchants closed their warehouses", "Closing the warehouses removes the storage the stem gives those merchants.", "outcome", "contradicts_outcome", anchor, "the merchants", "warehouses", "their warehouses");
    const slot = buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints: warehouses }).find((entry) => entry.option === letters[0])!;
    const structural = (text: string) => validateDistractor({ dspec: slot, skeleton: { ...base, distractorBlueprints: warehouses }, text, accepted: [] }).issues.map((issue) => issue.code);
    for (const text of [
      "Although the merchants had not closed their warehouses",
      "Although the merchants never closed their warehouses",
      "Although the merchants shut their warehouses",
      "Although the merchants had closed their warehouses",
    ]) expect(structural(text)).not.toContain("plan_mismatch");
    const judged = (planFidelity: "faithful" | "changed", verdict: "good" | "second_answer") => distractorDecision({ dspec: slot, report: reportFromVerdict({ verdict, sure: true, reason: "r", planFidelity }) });
    expect(judged("changed", "good").decision).toBe("REGENERATE");
    expect(judged("changed", "good").failures).toEqual(["plan_fidelity"]);
    expect(judged("faithful", "second_answer").failures).not.toContain("plan_fidelity");
    expect(judged("faithful", "second_answer").failures).toContain("competent_candidate_could_select");
    expect(judged("changed", "second_answer").failures).toEqual(expect.arrayContaining(["plan_fidelity", "competent_candidate_could_select"]));
    expect(judged("faithful", "good").decision).toBe("ACCEPT");
    const blind = distractorVerdictUser({ dspec: slot, skeleton: { ...base, distractorBlueprints: warehouses }, text: "Although the merchants shut their warehouses", strategy: "relational_inference" });
    expect(blind).not.toContain("Dropping that season is changed");
    expect(blind).not.toContain(warehouses[0].proposition);
    expect(blind).not.toContain(warehouses[0].decisiveFailureReason);
  });

  it("rejects a failure proved only by a hidden scenario fact", () => {
    const hidden = sound();
    hidden[3] = plan(letters[3], "contrast", "the ridge station kept a private log that the valley team never consulted", "The expected fewer exposures from the valley make a private log irrelevant to the station total.");
    expect(codes(hidden)).toContain("plan_key_evidence");
    const facts = ["river fog blanketed the valley on most nights", "the ridge site stayed dry through the survey", "harbour silt blocked every foreign cargo"];
    const leaked = sound();
    leaked[3] = plan(letters[3], "contrast", "the ridge station kept a private log that the valley team never consulted", "The harbour silt blocked the private log from mattering to the station total.");
    expect(codes(leaked, { ...base, facts })).toContain("plan_key_evidence");
  });

  it("allows the same connector on two relational options and rejects one repeated inside an option", () => {
    const specs = buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints: sound() });
    const first = specs.find((entry) => entry.option === letters[0])!;
    const shared = validateDistractor({
      dspec: first,
      skeleton: { ...base, distractorBlueprints: sound(), difficultyStrategy: "relational_inference" },
      text: "Although the dry ridge site logged the larger share of usable exposures",
      accepted: [{ option: letters[1], text: "Although older detectors recorded fewer faint stars than the ridge instruments did" }],
      strategy: "relational_inference",
    });
    expect(shared.issues.map((issue) => issue.code)).not.toContain("connector_repeated");
    const inside = validateDistractor({
      dspec: first,
      skeleton: { ...base, distractorBlueprints: sound(), difficultyStrategy: "relational_inference" },
      text: "Although the dry ridge site logged the larger share even though the valley stayed open",
      accepted: [],
      strategy: "relational_inference",
    });
    expect(inside.issues.map((issue) => issue.code)).toContain("connector_repeated");
  });

  it("rejects a near concession that does not compete, the 262 and 268 case", () => {
    const blueprints = sound();
    blueprints[0] = plan(letters[0], "near_concession", "the scribe who cut the signs had trained in another script tradition centuries earlier", "The scribe training has no bearing on whether fog would hide the valley station from the ridge.");
    expect(codes(blueprints)).toContain("plan_near_concession_unsupported");
  });

  it("rejects a cause that really explains the outcome, the 272 and 274 case", () => {
    const wider = sound();
    wider[1] = plan(letters[1], "cause", "Because the new detector covers a wider field of sky than the older instruments", "It names no obstacle and does not oppose the expected outcome, so it cannot complete a concession.");
    expect(codes(wider)).toContain("plan_relation_only");
    const explains = sound();
    explains[1] = plan(letters[1], "cause", "Because the new detector covers a wider field of sky than the older instruments", "Wider coverage would explain the larger valley total, so a careful reader could select this cause.");
    expect(codes(explains)).toContain("plan_supports_outcome");
    const sealed = sound();
    sealed[1] = plan(letters[1], "cause", "because the hearth was sealed beneath a thick layer of volcanic ash", "It gives a reason for confidence, not an obstacle opposing the outcome.");
    expect(codes(sealed)).toContain("plan_supports_outcome");
    expect(codes(sealed)).toContain("plan_relation_only");
  });

  it("rejects a near concession that adds a second obstacle, the 276 case", () => {
    const blueprints = sound();
    blueprints[0] = plan(letters[0], "near_concession", "although the probes had been recalibrated only once since installation", "The limit does not produce the lengthened interval; it still points toward more frequent checks.", "outcome", "causal_direction", "The maintenance team lengthened the interval even though the corrosion probes had been giving erratic readings.");
    const stem = "----, the maintenance team lengthened the interval between inspections of the coastal pumping station.";
    const scenario = { ...base.scenario!, obstacle: "corrosion probes in the discharge pipes give erratic readings", outcome: "the team lengthens the interval between inspections" };
    expect(codes(blueprints, { ...base, stem, scenario })).toContain("plan_second_concession");
  });

  it("keeps shared actor words and rejects only the fact the key adds", () => {
    const key = "Even though the survey team at the station kept working on most nights";
    const shared = sound();
    shared[1] = plan(letters[1], "cause", "older detectors recorded fewer faint stars than the ridge instruments did", "Even though the survey team at the station logged more usable exposures, weaker detectors cannot explain that larger valley total.");
    expect(codes(shared, { ...base, correctAnswer: key })).not.toContain("plan_key_evidence");
    const hidden = sound();
    hidden[1] = plan(letters[1], "cause", "older detectors recorded fewer faint stars than the ridge instruments did", "Clear nights would make the valley station log more usable exposures, so the stem alone does not rule this cause out.");
    expect(codes(hidden, { ...base, correctAnswer: key })).toContain("plan_key_evidence");
  });

  it("rejects proof the student cannot see, the 284 and 288 case", () => {
    const transits = "----, the research group recorded more transits of the exoplanet than any earlier campaign had captured.";
    const telescope = "Although the only telescope in the network was out of service for six weeks";
    const transitScenario = { ...base.scenario!, obstacle: "the only network telescope was out of service for six weeks", outcome: "more transits were recorded than any earlier campaign" };
    const quoted = "The research group recorded more transits than any earlier campaign had captured";
    const padded = sound();
    padded[1] = plan(letters[1], "cause", "Because the network had added two smaller telescopes that spring", "Added telescopes contradict the outage, so they cannot explain the recorded transits.", "reference", "reference_mismatch", "The research group recorded more transits while the only telescope was out of service");
    expect(codes(padded, { ...base, stem: transits, correctAnswer: telescope, scenario: transitScenario })).toContain("plan_key_evidence");
    const explains = sound();
    explains[1] = plan(letters[1], "cause", "Because the network had added two smaller telescopes that spring", "Added telescopes would explain the larger number of recorded transits.", "outcome", "causal_direction", quoted);
    expect(codes(explains, { ...base, stem: transits, correctAnswer: telescope, scenario: transitScenario })).toContain("plan_supports_outcome");
    const hiddenReason = sound();
    hiddenReason[1] = plan(letters[1], "cause", "Because the network had added two smaller telescopes that spring", "The telescope outage contradicts added instruments, so they cannot explain the recorded transits.", "reference", "reference_mismatch", quoted);
    expect(codes(hiddenReason, { ...base, stem: transits, correctAnswer: telescope, scenario: transitScenario })).toContain("plan_key_evidence");
    const bridge = "----, the county raised the load limit on the old steel truss bridge that carries most freight traffic across the river.";
    const corrosion = "Although the inspection report found advanced corrosion in several gusset plates";
    const bridgeScenario = { ...base.scenario!, obstacle: "inspection found advanced corrosion in the main truss gusset plates", outcome: "the county raised the load limit" };
    const certified = sound();
    certified[1] = plan(letters[1], "cause", "because an independent firm had certified the original load rating", "The certification contradicts the corrosion finding, so it cannot explain the raised limit.", "reference", "reference_mismatch", "The county raised the load limit after an independent firm certified the original rating");
    expect(codes(certified, { ...base, stem: bridge, correctAnswer: corrosion, scenario: bridgeScenario })).toContain("plan_key_evidence");
    const specialist = sound();
    specialist[1] = plan(letters[1], "cause", "because the radiocarbon calibration required a specialist half-life correction", "Radiocarbon calibration of the valley exposures requires a specialist correction the records never state.", "outcome", "causal_direction", "Radiocarbon calibration shows the valley exposures cannot be dated");
    expect(codes(specialist)).toContain("plan_anchor_missing");
  });

  it("rejects a failure reason with no stem evidence", () => {
    const blueprints = sound();
    blueprints[3] = plan(letters[3], "contrast", "the ridge station kept a private log that the valley team never consulted", "Medieval canon law in a distant diocese settles this reading for the clerks who filed it.", "reference", "reference_mismatch", "Medieval canon law in a distant diocese settles the reading.");
    expect(codes(blueprints)).toContain("plan_anchor_missing");
    const unanchored = sound();
    unanchored[3] = plan(letters[3], "contrast", "the ridge station kept a private log that the valley team never consulted", "Clerks filed the charts after the morning round, so the timing cannot be the trigger of this result.");
    expect(codes(unanchored)).toContain("plan_reason_unanchored");
  });

  it("keeps a stem-grounded inference the stem does not require", () => {
    const stem = "----, the clerks who handle the logbooks daily still find every page legible.";
    const quoted = "who handle them daily";
    const blueprints = sound();
    blueprints[0] = plan(
      letters[0],
      "time",
      "The logbooks remain legible only until the clerks finish handling them each day.",
      "The stem states continuing legibility, not a window ending when handling stops.",
      "outcome",
      "wrong_expectation",
      quoted,
    );
    const letter = distractorPlanIssues(relational, { ...base, stem, distractorBlueprints: blueprints }).filter((issue) => issue.detail === letters[0]).map((issue) => issue.code);
    expect(letter).not.toContain("plan_reason_unanchored");
    expect(letter).not.toContain("plan_incomplete");
    expect(letter).not.toContain("plan_undemonstrated");
  });

  it("still rejects a plan about a fact the stem never states", () => {
    const stem = "----, the lower streets stayed dry during the heavier storm because the crew had reopened an older canal.";
    const key = "Although the street wall had been built only to withstand a ten-year storm";
    const blueprints = sound();
    blueprints[0] = plan(
      letters[0],
      "near_concession",
      "The street wall was designed to handle the heavier storm described in the stem.",
      "The stem gives no wall capacity; this inference needs a fact not stated.",
      "outcome",
      "wrong_expectation",
      "stayed dry during the heavier storm",
    );
    blueprints[1] = plan(
      letters[1],
      "near_concession",
      "The street wall was designed to handle the heavier storm described in the stem.",
      "The stem names no design standard for the wall; the heavier storm is a stem event, and the wall rating is not stated.",
      "outcome",
      "wrong_expectation",
      "during the heavier storm",
    );
    const issues = distractorPlanIssues(relational, { ...base, stem, correctAnswer: key, distractorBlueprints: blueprints });
    const codesFor = (option: (typeof letters)[number]) => issues.filter((issue) => issue.detail === option).map((issue) => issue.code);
    expect(codesFor(letters[0])).toEqual(expect.arrayContaining(["plan_reason_unanchored", "plan_undemonstrated"]));
    expect(codesFor(letters[1])).not.toContain("plan_incomplete");
    expect(codesFor(letters[1])).toContain("plan_undemonstrated");
  });

  it("rejects a repeated plan and keeps two beliefs that only share the stem", () => {
    const stem = "----, the night nurses on one surgical ward recorded fewer missed evening doses than before.";
    const repeated = "The night nurses recorded fewer missed evening doses after the checklist began.";
    const blueprints = sound();
    blueprints[0] = plan(letters[0], "cause", repeated);
    blueprints[1] = plan(letters[1], "time", repeated);
    expect(distractorPlanIssues(relational, { ...base, stem, distractorBlueprints: blueprints }).some((issue) => issue.code === "plan_duplicate_proposition" && issue.detail === letters[1])).toBe(true);
    const distinct = sound();
    distinct[0] = plan(letters[0], "cause", "Morning staff, not the night nurses, were the ones who recorded the reduced missed evening doses.");
    distinct[1] = plan(letters[1], "cause", "The checklist reduced missed evening doses because longer rounds made nurses more careful.");
    const shared = distractorPlanIssues(relational, { ...base, stem, distractorBlueprints: distinct }).filter((issue) => issue.code === "plan_duplicate_proposition" && (issue.detail === letters[0] || issue.detail === letters[1]));
    expect(shared).toEqual([]);
  });

  it("keeps a stem misreading and still rejects a key fact the reason does not tie to the quote", () => {
    const stem = "----, the eighteenth-century logbooks kept in the harbour archive remain legible to the clerks who handle them daily.";
    const key = "Although salt air in the store gradually weakens unprotected paper";
    const scenario = { ...base.scenario!, obstacle: "salt air in the store crumbles unprotected paper", expected: "the eighteenth-century logbooks would be unreadable", outcome: "the logbooks remain legible to the clerks who handle them daily" };
    const blueprints = sound();
    blueprints[0] = {
      ...plan(letters[0], "condition", "The logbooks remain legible only if the archive is kept free of salt air.", "The stem says the logbooks remain legible despite conditions; it does not say legibility requires any storage condition.", "outcome", "wrong_expectation", "kept in the harbour archive"),
      propositionStatus: "not_entailed",
      inferenceClaim: "invalid_inference",
    };
    blueprints[1] = {
      ...plan(letters[1], "time", "The logbooks were written recently enough that their paper has not yet aged.", "The stem dates the logbooks to the eighteenth century, which contradicts a recent production time, so this cannot replace the aging obstacle.", "outcome", "contradicts_outcome", "the eighteenth-century logbooks"),
      propositionStatus: "contradicted",
      inferenceClaim: "invalid_inference",
    };
    blueprints[2] = {
      ...plan(letters[2], "time", "The logbooks were legible only in the eighteenth century and have since become unreadable.", "The stem says they remain legible now, so the claim that they became unreadable contradicts the stated present outcome.", "outcome", "contradicts_outcome", "the eighteenth-century logbooks remain legible"),
      propositionStatus: "contradicted",
      inferenceClaim: "none",
    };
    blueprints[3] = {
      ...plan(letters[3], "contrast", "Legibility of the logbooks is the same thing as their paper being free of any damage.", "Legible means readable and says nothing about absence of damage, so this narrows the stem's claim and cannot stand in for the concession.", "scope", "scope_mismatch", "remain legible"),
      propositionStatus: "not_entailed",
      inferenceClaim: "invalid_inference",
    };
    const issues = distractorPlanIssues(relational, { ...base, stem, correctAnswer: key, scenario, distractorBlueprints: blueprints });
    const codesFor = (option: (typeof letters)[number]) => issues.filter((issue) => issue.detail === option).map((issue) => issue.code);
    expect(codesFor(letters[0])).toContain("plan_reason_unanchored");
    expect(codesFor(letters[0])).not.toContain("plan_incomplete");
    for (const option of [letters[1], letters[2], letters[3]]) {
      expect(codesFor(option)).not.toContain("plan_incomplete");
      expect(codesFor(option)).not.toContain("plan_key_evidence");
      expect(codesFor(option)).not.toContain("plan_reason_unanchored");
    }
  });

  it("rejects a thin proposition and keeps a short quote of the stem", () => {
    const thin = sound();
    thin[0] = plan(letters[0], "contrast", "Nurses missed doses");
    expect(distractorPlanIssues(relational, { ...base, distractorBlueprints: thin }).filter((issue) => issue.detail === letters[0]).map((issue) => issue.code)).toContain("plan_incomplete");
    const stem = "----, the lower streets stayed dry during the heavier storm because the crew had reopened an older canal.";
    const quoted = sound();
    quoted[0] = plan(letters[0], "contrast", "The reopened canal kept every street in the city dry, not only the lower ones.", "The stem limits the dryness to the lower streets, so the canal's effect cannot be assumed to extend citywide.", "scope", "scope_mismatch", "the lower streets stayed dry");
    expect(distractorPlanIssues(relational, { ...base, stem, distractorBlueprints: quoted }).filter((issue) => issue.detail === letters[0]).map((issue) => issue.code)).not.toContain("plan_incomplete");
  });

  it("does not treat a scope extension as a second concession, and still rejects a copy of the key", () => {
    const stem = "----, the eighteenth-century logbooks kept in the harbour archive remain legible to the clerks who handle them daily.";
    const key = "Although salt air in the store gradually weakens unprotected paper";
    const scenario = { ...base.scenario!, obstacle: "salt air weakens the logbooks", outcome: "the logbooks remain legible" };
    const scope = sound();
    scope[0] = plan(letters[0], "near_concession", "Every page of every logbook in the archive is legible, including pages that are badly damaged.", "The stem limits legibility to the logbooks as a whole, so a claim about every damaged page overstates that stated scope.", "scope", "scope_mismatch", "the eighteenth-century logbooks kept in the harbour archive remain legible");
    const scopeCodes = distractorPlanIssues(relational, { ...base, stem, correctAnswer: key, scenario, distractorBlueprints: scope }).filter((issue) => issue.detail === letters[0]).map((issue) => issue.code);
    expect(scopeCodes).not.toContain("plan_second_concession");
    const wallStem = "----, the lower streets stayed dry during the heavier storm because the crew had reopened an older canal.";
    const wallKey = "Although the street wall had been built only to withstand a ten-year storm";
    const copied = sound();
    copied[0] = plan(letters[0], "cause", "The crew had built the street wall to withstand the heavier storm.", "The stem gives the crew only the reopening of an older canal, not building any street wall.", "reference", "reference_mismatch", "because the crew had reopened an older canal");
    expect(distractorPlanIssues(relational, { ...base, stem: wallStem, correctAnswer: wallKey, distractorBlueprints: copied }).filter((issue) => issue.detail === letters[0]).map((issue) => issue.code)).toContain("plan_duplicate_proposition");
    const explains = sound();
    explains[1] = plan(letters[1], "cause", "Because the new detector covers a wider field of sky than the older instruments", "Wider coverage would explain the larger valley total, so a careful reader could select this cause.");
    expect(codes(explains)).toContain("plan_supports_outcome");
  });

  it("rejects a failure reason that is only a different connector, the 250 case", () => {
    const blueprints = sound();
    blueprints[0] = plan(letters[0], "near_concession", "the valley fog cleared on most nights during the autumn survey", "The option is wrong only because it uses a different connector and nothing else about the proposition is decisive.");
    expect(codes(blueprints)).toContain("plan_connector_only");
  });

  it("rejects a dated time plan on an ongoing main clause, the 270 case", () => {
    const blueprints = sound();
    blueprints[3] = plan(letters[3], "time", "the council funded the first reed clearance scheme in 2019 and then left the beds", "A clearance dated to one past year cannot be the trigger of a spread that is still continuing.");
    const stem = "----, the reed beds along the estuary have spread across more ground each year.";
    expect(codes(blueprints, { ...base, stem })).toContain("plan_time_stamp");
  });

  it("still rejects a second answer, the 264 and 266 case, and keeps sole concessive rejection", () => {
    const verdict = judgeDecision({
      spec: relational,
      validation: validateCandidate({ spec: relational, candidate: candidateJson as never }),
      judge: { blindAnswer: "B", blindConfidence: 0.9, acceptability: { sentences: acceptabilityJson.sentences }, report: { ...judgeJson, alternativeDefensibleOptions: ["C"] } as never },
    });
    expect(verdict.verdict).toBe("REJECT");
    expect(verdict.failures.some((failure) => failure.startsWith("second_defensible_"))).toBe(true);
    expect(validateCandidate({ spec: relational, candidate: candidateJson as never }).issues.map((issue) => issue.code)).toContain("sole_concessive_clue");
  });

  it("rejects a clause that misses its proposition or repeats another plan", () => {
    const blueprints = sound();
    const specs = buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints });
    const near = specs.find((entry) => entry.option === letters[0])!;
    expect(near.semanticConstraint.failureMode).toBe("no_broken_expectation");
    expect(near.relationConstraint.connectors).toContain("connector:although");
    const missed = validateDistractor({ dspec: near, skeleton: { ...base, distractorBlueprints: blueprints }, text: "Although the scribe trained in another script tradition centuries earlier", accepted: [] });
    expect(missed.issues.map((issue) => issue.code)).not.toContain("plan_mismatch");
    const thin = validateDistractor({
      dspec: near,
      skeleton: { ...base, distractorBlueprints: blueprints },
      text: "Although the valley nights stayed clear of every instrument error on the ridge",
      accepted: [],
    });
    expect(thin.issues.map((issue) => issue.code)).not.toContain("plan_mismatch");
    const held = validateDistractor({
      dspec: near,
      skeleton: { ...base, distractorBlueprints: blueprints },
      text: "Although the dry ridge site logged the larger share of usable exposures",
      accepted: [],
    });
    expect(held.issues.map((issue) => issue.code)).not.toContain("plan_mismatch");
    expect(held.issues.map((issue) => issue.code)).not.toContain("plan_polarity_shift");
    const review = distractorVerdictUser({ dspec: near, skeleton: { ...base, distractorBlueprints: blueprints }, text: "Although the valley fog cleared on most nights during the autumn survey", strategy: "relational_inference" });
    expect(review).toContain("DISCOURSE TASK: concession");
    expect(review).toContain("Although the valley fog cleared on most nights during the autumn survey");
    expect(review).not.toContain("It was planned to fail because:");
    expect(review).not.toContain("Stem evidence that eliminates it:");
    expect(review).not.toContain(base.correctAnswer);
    expect(review).not.toContain(blueprints[0].decisiveFailureReason);
    const monopoly = "because the guild had been granted a monopoly on dyeing cloth in the town";
    const shifted = sound();
    shifted[1] = plan(letters[1], "cause", monopoly, "The grant would draw members, but the valley exposures are already logged, so the grant cannot explain that station's total.", "outcome", "causal_direction", anchor, "the guild", "dyeing", "cloth");
    const causeSpec = buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints: shifted }).find((entry) => entry.option === letters[1])!;
    const faithful = validateDistractor({ dspec: causeSpec, skeleton: { ...base, distractorBlueprints: shifted }, text: "Because the guild had been granted a monopoly on dyeing cloth in the town", accepted: [] });
    expect(faithful.issues.map((issue) => issue.code)).not.toContain("plan_mismatch");
    expect(faithful.issues.map((issue) => issue.code)).not.toContain("plan_polarity_shift");
    const reversed = validateDistractor({
      dspec: causeSpec,
      skeleton: { ...base, distractorBlueprints: shifted },
      text: "Because the guild had been granted a monopoly on dyeing cloth, which shut out newcomers",
      accepted: [],
    });
    expect(reversed.issues.map((issue) => issue.code)).not.toContain("plan_polarity_shift");
    expect(reversed.issues.map((issue) => issue.code)).not.toContain("plan_mismatch");
    const donor = plan(letters[1], "cause", "Because the weekend donor list had doubled in size since the spring", "The grant would draw members, but the valley exposures are already logged, so the grant cannot explain that station's total.", "outcome", "causal_direction", anchor, "donor list", "the spring", "weekend donor");
    const shrunk = validateDistractor({
      dspec: causeSpec,
      skeleton: { ...base, distractorBlueprints: shifted.map((entry, index) => (index === 1 ? donor : entry)) },
      text: "Because the weekend donor list had shrunk by nearly half since last spring",
      accepted: [],
    });
    expect(shrunk.issues.map((issue) => issue.code)).not.toContain("plan_polarity_shift");
    expect(shrunk.issues.map((issue) => issue.code)).not.toContain("plan_mismatch");
    const cause = specs.find((entry) => entry.option === letters[1])!;
    const copied = validateDistractor({
      dspec: cause,
      skeleton: { ...base, distractorBlueprints: blueprints },
      text: "Because the dry ridge site logged the larger share of usable exposures",
      accepted: [],
    });
    expect(copied.issues.map((issue) => issue.code)).toContain("plan_repeats_sibling");
  });

  it("tells the relational writer the set plan and leaves the lexical call unchanged", () => {
    expect(skeletonUser(relational)).toContain("JOINT OPTION PLAN");
    expect(skeletonUser(relational)).toContain("omit near_concession");
    expect(skeletonUser(relational)).toContain("The same family may be used on more than one option");
    expect(skeletonUser(relational)).toContain("stemEvidenceAnchor");
    expect(skeletonUser(relational)).toContain("Four different beliefs");
    expect(skeletonUser(relational)).toContain("The correct option is hidden");
    expect(skeletonUser(relational)).toContain("failureMechanism");
    expect(skeletonUser(relational)).toContain("not a concession");
    expect(skeletonUser(relational)).not.toContain("Use four different families");
    expect(skeletonUser(lexical)).not.toContain("JOINT OPTION PLAN");
    expect(skeletonSystem(relational)).toContain("four different wrong beliefs");
    expect(skeletonSystem(lexical)).toContain("Other writers add the wrong options");
    const relationalSchema = skeletonResponseSchema("hard", "relational_inference") as { properties: Record<string, unknown>; required: string[] };
    expect(relationalSchema.required).toEqual(["decision", "facts", "scenario", "difficultyStrategy", "targetLexeme", "neutralSubstitute", "distractorBlueprints", "stem", "correctBlueprint", "context", "missingDistractors", "declineReason"]);
    expect(relationalSchema.properties.correctAnswer).toBeUndefined();
    expect(Object.keys(relationalSchema.properties).indexOf("distractorBlueprints")).toBeLessThan(Object.keys(relationalSchema.properties).indexOf("stem"));
    const lexicalSchema = skeletonResponseSchema("hard", "lexical_pivot") as { properties: Record<string, unknown> };
    expect(lexicalSchema.properties.distractorBlueprints).toBeUndefined();
    expect(lexicalSchema.properties.facts).toBeUndefined();
    expect(lexicalSchema.properties.decision).toBeUndefined();
    const produce = {
      decision: "produce" as const,
      stem: base.stem,
      correctBlueprint: base.correctAnswer,
      distractorBlueprints: sound(),
      missingDistractors: [],
      declineReason: null,
      context: null,
      difficultyStrategy: "relational_inference" as const,
      targetLexeme: null,
      neutralSubstitute: null,
      scenario: base.scenario!,
      facts: ["the valley station logged more usable exposures", "the dry ridge site logged a smaller share", "the comparison used the same nights"],
    };
    const produced = relationalPlannerOutput.parse(produce);
    const settled = settleRelationalPlanner(produced);
    expect(isPlannerDecline(settled)).toBe(false);
    if (!isPlannerDecline(settled)) expect(settled.correctAnswer).toBe(base.correctAnswer);
    expect(relationalPlannerOutput.safeParse({ ...produce, distractorBlueprints: sound().slice(0, 3) }).success).toBe(false);
    expect(relationalPlannerOutput.safeParse({ ...produce, declineReason: "not a decline" }).success).toBe(false);
    const found = sound().slice(0, 2);
    const decline = {
      decision: "decline" as const,
      stem: base.stem,
      correctBlueprint: base.correctAnswer,
      distractorBlueprints: found,
      missingDistractors: [
        { option: letters[2], reason: "No stem fact rules out a third distinct event." },
        { option: letters[3], reason: "A fourth event repeats the second." },
      ],
      declineReason: "After rewriting the stem, the remaining two letters still had no visible failure.",
      context: null,
      difficultyStrategy: null,
      targetLexeme: null,
      neutralSubstitute: null,
      scenario: null,
      facts: null,
    };
    const refused = settleRelationalPlanner(relationalPlannerOutput.parse(decline));
    expect(isPlannerDecline(refused) && refused.stem).toBe(base.stem);
    expect(isPlannerDecline(refused) && refused.distractorBlueprints).toHaveLength(2);
    expect(relationalPlannerOutput.safeParse({ ...decline, stem: null }).success).toBe(false);
    expect(relationalPlannerOutput.safeParse({ ...decline, distractorBlueprints: null }).success).toBe(false);
    expect(relationalPlannerOutput.safeParse({ ...decline, decision: "produce" }).success).toBe(false);
    expect(relationalPlannerOutput.safeParse({ ...produce, distractorBlueprints: sound().map(({ actor: _actor, time: _time, scope: _scope, ...rest }) => rest) }).success).toBe(true);
    expect(skeletonUser(relational)).toContain("Student-visible evidence");
    expect(skeletonUser(relational)).toContain("return decision decline");
    expect(skeletonUser(relational)).toContain("A short stem is not a reason to decline");
    expect(skeletonUser(relational)).not.toContain("Put that time into the stem before you decline");
    expect(skeletonUser(lexical)).not.toContain("A short stem is not a reason to decline");
    expect(skeletonUser(relational)).not.toContain("This is why the stem does not support the proposition");
    expect(skeletonUser(relational)).toContain("propositionStatus is one of entailed, contradicted, not_entailed");
    expect(skeletonUser(relational)).toContain("Up to three children already leaves the fourth child outside");
    const restoration = "----, the restoration was praised more for keeping the building in use than for returning it to its original appearance.";
    const groundFloor = "Because the ground floor was reopened to shops and offices";
    const missingOrnament = "While reviewers had expected the missing ornament to be rebuilt";
    const check = skeletonCheckUser(relational, {
      ...base,
      stem: restoration,
      distractorBlueprints: [
        { ...sound()[0], option: "A", proposition: groundFloor },
        { ...sound()[1], option: "B", proposition: missingOrnament },
      ],
    });
    expect(check).toContain("PLANNED WRONGS");
    expect(check).toContain(groundFloor);
    expect(check).toContain(missingOrnament);
    expect(skeletonCheckSystem).toContain("not, by itself, flawed");
    expect(skeletonUser(lexical)).not.toContain("Student-visible evidence");
    const near = buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints: sound() }).find((entry) => entry.option === letters[0])!;
    const writer = distractorUser({ dspec: near, skeleton: { ...base, distractorBlueprints: sound() }, usedConnectors: [], feedback: [], strategy: "relational_inference", blueprints: sound() });
    expect(writer).toContain("Do not invent a new reason");
    expect(writer).toContain("Stem evidence that eliminates it:");
    expect(writer).toContain("A natural synonym or a grammatical rewrite is acceptable");
    expect(writer).toContain("A field this plan does not state is not part of the proposition");
    expect(writer).toContain("does not see the correct option");
    expect(writer).toContain("OTHER PLANS IN THIS SET");
    expect(writer).toContain(letters[1]);
  });

  const stemGate: SkeletonCheckReport = { reasons: ["clear concession"], grammatical: true, natural: 0.9, keyTrue: true, targetRelation: 0.9, keyAmbiguous: 0.1, confidence: 0.9 };
  const answerFirst = async (script: Script, env: Record<string, string> = {}, budget?: SpendBudget) => {
    const built = fakeService({ skeletons: [base], ...script });
    const outcome = await generateItem(relational, { ...ctxFor(built.service, { FACTORY_PRODUCTION_SEQUENCE: "answer_first", ...env }), ...(budget ? { budget } : {}) });
    return { ...built, outcome };
  };
  const openInference = (): DistractorBlueprint[] => {
    const next = sound();
    next[3] = {
      ...plan(letters[3], "contrast", "failed applicants receive no funding from the valley exposures", "The stem does not say that failed applicants receive no funding, and the logged valley exposures do not entail that exclusion.", "scope", "scope_mismatch"),
      propositionStatus: "not_entailed",
      inferenceClaim: "invalid_inference",
    };
    return next;
  };

  it("writes only the stem and the correct continuation on the first answer_first call", async () => {
    expect(loadAIConfig({}).productionSequence).toBe("plan_first");
    expect(() => loadAIConfig({ FACTORY_PRODUCTION_SEQUENCE: "both" })).toThrow(/FACTORY_PRODUCTION_SEQUENCE/);
    expect(skeletonUser(relational, [], [], undefined, "answer_first")).not.toContain("JOINT OPTION PLAN");
    expect(skeletonUser(relational, [], [], undefined, "answer_first")).not.toContain("Four different beliefs");
    expect(skeletonSystem(relational, "answer_first")).not.toContain("four different wrong beliefs");
    expect(skeletonSystem(relational, "answer_first")).toContain("Do not return four wrong beliefs");
    const schema = skeletonResponseSchema(relational.difficulty.band, "relational_inference", "answer_first") as { required?: string[] };
    expect(schema.required ?? []).not.toContain("distractorBlueprints");
    expect(validateSkeleton({ spec: relational, skeleton: base, planCheck: "later" }).issues.map((issue) => issue.code)).not.toContain("plan_missing");
    expect(validateSkeleton({ spec: relational, skeleton: base }).issues.map((issue) => issue.code)).toContain("plan_missing");
    const seen: { model: string; text: string; required?: string[] }[] = [];
    const recorder: AIProvider = {
      name: "fake",
      generate: async (request) => {
        seen.push({ model: request.model, text: (request.parts[0] as { text: string }).text, required: (request.jsonSchema as { required?: string[] } | undefined)?.required });
        throw new Error("stop");
      },
    };
    const env = { GENERATOR_MODEL: "gen", DISTRACTOR_MODEL: "writer", DISTRACTOR_JUDGE_MODEL: "dj", FINAL_JUDGE_MODEL: "judge", FACTORY_PRODUCTION_SEQUENCE: "answer_first" };
    const service = createAIService(loadAIConfig(env), recorder);
    await service.factory.skeleton(relational, []).catch(() => undefined);
    await service.factory.planDistractors!({ spec: relational, skeleton: base, feedback: [] }).catch(() => undefined);
    expect(seen[0].model).toBe("gen");
    expect(seen[0].text).not.toContain("JOINT OPTION PLAN");
    expect(seen[0].text).toContain("Do not plan the four wrong options");
    expect(seen[0].required ?? []).not.toContain("distractorBlueprints");
    expect(seen[1].model).toBe("gen");
    expect(seen[1].text).toContain(base.stem);
    expect(seen[1].text).toContain("Do not rewrite the stem");
    expect(seen[1].text).toContain("not_entailed");
    expect(distractorPlanSystem()).not.toContain("four different wrong beliefs");
    const run = await answerFirst({ gate: [stemGate], plans: [sound()] });
    expect(run.log.slice(0, 3)).toEqual(["skeleton", "gate", "plan"]);
    expect(run.outcome.trace.skeleton?.distractorBlueprints).toHaveLength(4);
    const stemAttempt = run.outcome.trace.attempts.find((attempt) => attempt.stage === "skeleton");
    expect(stemAttempt?.output).not.toContain("larger share");
    expect(run.outcome.trace.attempts.find((attempt) => attempt.stage === "distractorPlan")?.output).toContain("larger share");
  });

  it("does not plan when the stem and the correct continuation fail the early check", async () => {
    const rejected = { ...stemGate, keyTrue: false, reasons: ["the continuation contradicts the stem"] };
    const gate = await answerFirst({ gate: [rejected], plans: [sound()] });
    expect(gate.log.some((entry) => entry.startsWith("plan") || entry.startsWith("distractor"))).toBe(false);
    expect(gate.outcome.trace.state).toBe("SKELETON_FAILED");
    expect(gate.outcome.trace.failure).toMatch(/skeleton_rejected_after_/);
    expect(gate.outcome.trace.cost?.byStage.distractorPlan).toBeUndefined();
    const open = await answerFirst({ gate: [{ ...stemGate, otherContinuationsPossible: true }], plans: [sound()] });
    expect(open.log.slice(0, 3)).toEqual(["skeleton", "gate", "plan"]);
    expect(open.outcome.trace.attempts[0].judge?.concerns).toContain("other_continuations_open");
    expect(open.outcome.trace.attempts[0].judge?.concerns).not.toContain("review_missing");
    expect(open.outcome.trace.attempts[0].judge?.decision).toBe("ACCEPT");
  });

  it("rejects an incomplete, repeated, or unanchored plan and does not write a distractor", async () => {
    const incomplete = sound();
    incomplete[0] = { ...incomplete[0], proposition: "too thin" };
    const repeated = sound();
    repeated[1] = { ...repeated[1], proposition: repeated[0].proposition };
    const unanchored = sound();
    unanchored[0] = { ...unanchored[0], stemEvidenceAnchor: "the missing ornament was rebuilt in plaster overnight" };
    for (const plans of [incomplete, repeated, unanchored]) {
      const run = await answerFirst({ plans: [plans] });
      expect(run.log.filter((entry) => entry.startsWith("plan")).length).toBeGreaterThan(0);
      expect(run.log.some((entry) => entry.startsWith("distractor"))).toBe(false);
      expect(run.outcome.trace.state).toBe("SKELETON_FAILED");
      expect(run.outcome.trace.failure).toMatch(/distractor_plan_rejected_after_/);
      expect(run.outcome.trace.attempts.some((attempt) => attempt.stage === "distractorPlan" && attempt.validator.status === "pass")).toBe(false);
    }
  });

  it("keeps a not_entailed plan that names no contradiction and hands the accepted plans to the writer", async () => {
    expect(codes(openInference())).not.toContain("plan_undemonstrated");
    const unmarked = openInference();
    delete unmarked[3].propositionStatus;
    delete unmarked[3].inferenceClaim;
    expect(codes(unmarked)).toContain("plan_undemonstrated");
    const seen: DistractorBlueprint[][] = [];
    const { service, log } = fakeService({ skeletons: [base], gate: [stemGate], plans: [openInference()] });
    const writer = service.factory.distractor;
    service.factory.distractor = async (input) => {
      seen.push(input.blueprints ?? []);
      return writer(input);
    };
    const outcome = await generateItem(relational, ctxFor(service, { FACTORY_PRODUCTION_SEQUENCE: "answer_first" }));
    expect(seen[0]).toHaveLength(4);
    expect(seen[0].some((entry) => entry.propositionStatus === "not_entailed")).toBe(true);
    expect(outcome.trace.attempts.some((attempt) => attempt.stage === "distractor")).toBe(true);
    expect(log.indexOf("plan")).toBeLessThan(log.findIndex((entry) => entry.startsWith("distractor")));
  });

  it("leaves plan_first on one skeleton call and does not add the plan call", async () => {
    expect(skeletonUser(relational)).toContain("JOINT OPTION PLAN");
    expect(skeletonSystem(relational)).toContain("four different wrong beliefs");
    const bare = fakeService({ skeletons: [base] });
    const refused = await generateItem(relational, ctxFor(bare.service));
    expect(refused.trace.state).toBe("SKELETON_FAILED");
    expect(bare.log.some((entry) => entry.startsWith("plan") || entry.startsWith("distractor"))).toBe(false);
    const armed = fakeService({ skeletons: [{ ...base, distractorBlueprints: sound() }] });
    const kept = await generateItem(relational, ctxFor(armed.service));
    expect(armed.log[0]).toBe("skeleton");
    expect(armed.log).not.toContain("plan");
    expect(armed.log.some((entry) => entry.startsWith("distractor"))).toBe(true);
    expect(kept.trace.cost?.byStage.distractorPlan).toBeUndefined();
    const medium = fakeService({});
    const same = await generateItem(spec, ctxFor(medium.service, { FACTORY_PRODUCTION_SEQUENCE: "answer_first" }));
    expect(medium.log).not.toContain("plan");
    expect(same.trace.state).toBe("APPROVED");
    expect(same.modelCalls).toBe(13);
  });

  it("counts the plan call in the item cost and stops it on the existing limits", async () => {
    const run = await answerFirst({ gate: [stemGate], plans: [sound()] });
    expect(run.outcome.trace.cost?.byStage.distractorPlan).toMatchObject({ calls: 1 });
    expect(run.outcome.trace.cost?.log?.some((call) => call.stage === "distractorPlan" && call.model === "gen")).toBe(true);
    expect(run.outcome.trace.attempts.find((attempt) => attempt.stage === "distractorPlan")?.promptVersion).toBe("distractor-plan.v1");
    expect(run.outcome.modelCalls).toBeGreaterThanOrEqual(3);
    const bad = sound();
    bad[0] = { ...bad[0], proposition: "too thin" };
    const budget = new SpendBudget({ maxRegenerations: 0 }, null);
    const stopped = await answerFirst({ plans: [bad, sound()] }, {}, budget);
    expect(stopped.log.filter((entry) => entry.startsWith("plan"))).toEqual(["plan"]);
    expect(stopped.log.some((entry) => entry.startsWith("distractor"))).toBe(false);
    expect(stopped.outcome.trace.failure).toBe("budget_stopped: max regenerations (0) reached");
    expect(stopped.outcome.trace.cost?.byStage.distractorPlan?.calls).toBe(1);
    const limited = new SpendBudget({ maxCalls: 2 }, null);
    const { service, log } = fakeService({ skeletons: [base], gate: [stemGate], plans: [sound()] });
    const metered = { ...service, factory: Object.fromEntries(Object.entries(service.factory).map(([name, call]) => [name, async (...args: unknown[]) => (limited.beforeCall(), (call as (...a: unknown[]) => unknown)(...args))])) } as unknown as AIService;
    const capped = await generateItem(relational, { ...ctxFor(metered, { FACTORY_PRODUCTION_SEQUENCE: "answer_first" }), budget: limited });
    expect(log).toEqual(["skeleton", "gate"]);
    expect(capped.trace.failure).toMatch(/^budget_stopped: max calls \(2\) reached/);
    expect(capped.trace.cost?.log?.some((call) => call.stage === "distractorPlan" && call.error)).toBe(true);
    expect(capped.trace.cost?.log?.some((call) => call.stage === "distractor")).toBe(false);
  });

  it("keeps the blind distractor verdict after the plans and does not write the student bank", async () => {
    const texts: Record<string, string> = {
      [letters[0]]: "Although the ward clerks file the drug charts only after the morning round has ended",
      [letters[1]]: "Because the harbour pilots delayed the cargo inspection until the evening shift arrived",
      [letters[2]]: "If the library kept the rare maps in a locked cabinet during the whole winter",
      [letters[3]]: "Whereas the choir rehearsed the new mass before the visiting organist reached the hall",
    };
    const { service, log } = fakeService({ skeletons: [base], gate: [stemGate], plans: [sound()] });
    service.factory.distractor = async ({ dspec }) => {
      log.push(`distractor:${dspec.option}`);
      return result({ text: texts[dspec.option], rationale: "fails for the planned reason" }, "gen");
    };
    const outcome = await generateItem(relational, ctxFor(service, { FACTORY_PRODUCTION_SEQUENCE: "answer_first", FACTORY_DISTRACTOR_JUDGE: "verdict" }));
    expect(log.some((entry) => entry.startsWith("review:"))).toBe(true);
    expect(log.indexOf("plan")).toBeLessThan(log.findIndex((entry) => entry.startsWith("review:")));
    const slot = buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints: sound() }).find((entry) => entry.option === letters[0])!;
    const prompt = distractorVerdictUser({ dspec: slot, skeleton: { ...base, distractorBlueprints: sound() }, text: texts[letters[0]] });
    expect(prompt).toContain("DISCOURSE TASK");
    expect(prompt).not.toContain(base.correctAnswer);
    expect(prompt).not.toContain(sound()[0].decisiveFailureReason);
    expect(outcome.trace.attempts.some((attempt) => attempt.stage === "distractor" && attempt.judge)).toBe(true);
    const atomic = readFileSync(new URL("./stages/atomic.ts", import.meta.url), "utf8");
    expect(atomic).not.toContain("factory-bands");
    expect(atomic).not.toContain("planBankImport");
    expect(outcome.record?.status === "approved" || outcome.trace.state === "DISTRACTORS_FAILED" || outcome.trace.state === "HUMAN_REVIEW" || outcome.trace.state === "APPROVED" || outcome.trace.state === "REJECTED").toBe(true);
  });

  const planRow = (option: (typeof letters)[number], patch: Partial<NonNullable<SkeletonCheckReport["plannedReviews"]>[number]> = {}) => ({
    option,
    secondAnswerRisk: "none" as const,
    propositionStatus: "contradicted" as const,
    presentedAsInference: false,
    anchorGrounding: "quoted" as const,
    ...patch,
  });
  const planGate = (patch: Partial<NonNullable<SkeletonCheckReport["plannedReviews"]>[number]> = {}, confidence = 0.9): SkeletonCheckReport => ({
    ...stemGate,
    confidence,
    plannedReviews: letters.map((option, index) => planRow(option, index === 0 ? patch : {})),
  });

  it("sends all four accepted plans through the existing skeleton reviewer", async () => {
    const seen: QuestionSkeleton[] = [];
    const { service, log } = fakeService({ skeletons: [base], gate: [stemGate, planGate()], plans: [sound()] });
    const check = service.factory.checkSkeleton!;
    service.factory.checkSkeleton = async (input) => {
      seen.push(input.skeleton);
      return check(input);
    };
    const outcome = await generateItem(relational, ctxFor(service, { FACTORY_PRODUCTION_SEQUENCE: "answer_first" }));
    expect(seen[0].distractorBlueprints).toBeUndefined();
    expect(seen[1].distractorBlueprints).toHaveLength(4);
    const prompt = skeletonCheckUser(relational, seen[1]);
    expect(prompt).toContain("PLANNED WRONGS");
    for (const entry of sound()) expect(prompt).toContain(entry.proposition);
    expect(log.filter((entry) => entry === "gate")).toHaveLength(2);
    expect(log.indexOf("plan")).toBeLessThan(log.lastIndexOf("gate"));
    expect(log.lastIndexOf("gate")).toBeLessThan(log.findIndex((entry) => entry.startsWith("distractor")));
    expect(outcome.trace.cost?.byStage.planReview).toMatchObject({ calls: 1 });
    expect(outcome.trace.cost?.log?.some((call) => call.stage === "planReview" && call.model === "dj")).toBe(true);
    expect(outcome.trace.attempts.find((attempt) => attempt.stage === "distractorPlan")?.judge).toMatchObject({ decision: "ACCEPT", failures: [], concerns: [] });
    const blind = distractorVerdictUser({ dspec: buildDistractorSpecs(relational, defaultFactoryThresholds, { blueprints: sound() })[0], skeleton: seen[1], text: "Because the harbour pilots delayed the cargo inspection until the evening shift arrived" });
    expect(blind).not.toContain(base.correctAnswer);
    expect(blind).not.toContain(sound()[0].decisiveFailureReason);
  });

  it("does not ask the reviewer to read a plan the deterministic checks rejected", async () => {
    const incomplete = sound();
    incomplete[0] = { ...incomplete[0], proposition: "too thin" };
    const run = await answerFirst({ gate: [stemGate, planGate()], plans: [incomplete] });
    expect(run.log.filter((entry) => entry === "gate")).toEqual(["gate"]);
    expect(run.log.some((entry) => entry.startsWith("distractor"))).toBe(false);
    expect(run.outcome.trace.cost?.byStage.planReview).toBeUndefined();
  });

  it("applies the strict plan review and does not treat the planner's own label as the proof", async () => {
    const second = await answerFirst({ gate: [stemGate, planGate({ secondAnswerRisk: "shown" })], plans: [sound()] });
    expect(second.log.some((entry) => entry.startsWith("distractor"))).toBe(false);
    expect(second.log.filter((entry) => entry.startsWith("plan"))).toHaveLength(3);
    expect(second.outcome.trace.failure).toMatch(/distractor_plan_rejected_after_3/);
    expect(second.outcome.trace.attempts.filter((attempt) => attempt.judge?.failures.includes("planned_second_answer"))).toHaveLength(3);
    const unanchored = await answerFirst({ gate: [stemGate, planGate({ anchorGrounding: "missing" })], plans: [sound()] });
    expect(unanchored.outcome.trace.attempts.some((attempt) => attempt.judge?.failures.includes("plan_ground_unanchored"))).toBe(true);
    expect(unanchored.log.some((entry) => entry.startsWith("distractor"))).toBe(false);
    const declared = await answerFirst({ gate: [stemGate, planGate({ anchorGrounding: "declared_only" })], plans: [sound()] });
    expect(declared.outcome.trace.attempts.some((attempt) => attempt.judge?.failures.includes("plan_ground_unanchored"))).toBe(true);
    const restated = await answerFirst({ gate: [stemGate, planGate({ propositionStatus: "restatement", presentedAsInference: true })], plans: [sound()] });
    expect(restated.outcome.trace.attempts.some((attempt) => attempt.judge?.failures.includes("plan_restatement_as_inference"))).toBe(true);
    expect(restated.log.some((entry) => entry.startsWith("distractor"))).toBe(false);
    const entailed = await answerFirst({ gate: [stemGate, planGate({ propositionStatus: "not_entailed", presentedAsInference: true })], plans: [openInference()] });
    expect(entailed.outcome.trace.attempts.find((attempt) => attempt.stage === "distractorPlan")?.judge?.failures).toEqual([]);
    expect(entailed.log.some((entry) => entry.startsWith("distractor"))).toBe(true);
    const stemDisagreement = { ...planGate(), keyTrue: false, grammatical: false };
    const kept = await answerFirst({ gate: [stemGate, stemDisagreement], plans: [sound()] });
    expect(kept.outcome.trace.attempts.find((attempt) => attempt.stage === "distractorPlan")?.judge?.failures).toEqual([]);
    expect(kept.log.some((entry) => entry.startsWith("distractor"))).toBe(true);
  });

  it("keeps an uncertain plan review as a concern and does not spend another call on it", async () => {
    const low = await answerFirst({ gate: [stemGate, planGate({ secondAnswerRisk: "shown" }, 0.3)], plans: [sound()] });
    expect(low.log.filter((entry) => entry === "gate")).toHaveLength(2);
    expect(low.log.filter((entry) => entry.startsWith("plan"))).toHaveLength(1);
    expect(low.outcome.trace.attempts.find((attempt) => attempt.stage === "distractorPlan")?.judge).toMatchObject({ decision: "ACCEPT", failures: [], concerns: ["planned_second_answer", "low_confidence"] });
    expect(low.log.some((entry) => entry.startsWith("distractor"))).toBe(true);
    const unsure = await answerFirst({ gate: [stemGate, planGate({ secondAnswerRisk: "uncertain" })], plans: [sound()] });
    expect(unsure.outcome.trace.attempts.find((attempt) => attempt.stage === "distractorPlan")?.judge?.concerns).toContain("planned_second_answer_uncertain");
    expect(unsure.log.filter((entry) => entry.startsWith("plan"))).toHaveLength(1);
    const missing = await answerFirst({ gate: [stemGate], plans: [sound()] });
    expect(missing.outcome.trace.attempts.find((attempt) => attempt.stage === "distractorPlan")?.judge?.concerns).toContain("review_missing");
    expect(missing.log.filter((entry) => entry === "gate")).toHaveLength(2);
    expect(missing.outcome.trace.cost?.byStage.planReview?.calls).toBe(1);
  });

  it("counts the plan review in the call limit and leaves plan_first on its single gate", async () => {
    const limited = new SpendBudget({ maxCalls: 3 }, null);
    const { service, log } = fakeService({ skeletons: [base], gate: [stemGate, planGate()], plans: [sound()] });
    const metered = { ...service, factory: Object.fromEntries(Object.entries(service.factory).map(([name, call]) => [name, async (...args: unknown[]) => (limited.beforeCall(), (call as (...a: unknown[]) => unknown)(...args))])) } as unknown as AIService;
    const capped = await generateItem(relational, { ...ctxFor(metered, { FACTORY_PRODUCTION_SEQUENCE: "answer_first" }), budget: limited });
    expect(log).toEqual(["skeleton", "gate", "plan"]);
    expect(capped.trace.failure).toMatch(/^budget_stopped: max calls \(3\) reached/);
    expect(capped.trace.cost?.log?.some((call) => call.stage === "planReview" && call.error)).toBe(true);
    expect(capped.trace.cost?.log?.some((call) => call.stage === "distractor")).toBe(false);
    const armed = fakeService({ skeletons: [{ ...base, distractorBlueprints: sound() }], gate: [planGate({ secondAnswerRisk: "shown" })] });
    const first = await generateItem(relational, ctxFor(armed.service));
    expect(armed.log.filter((entry) => entry === "gate").length).toBeGreaterThan(0);
    expect(armed.log).not.toContain("plan");
    expect(armed.log.some((entry) => entry.startsWith("distractor"))).toBe(false);
    expect(first.trace.cost?.byStage.planReview).toBeUndefined();
    expect(first.trace.state).toBe("SKELETON_FAILED");
    expect(first.trace.attempts.some((attempt) => attempt.judge?.failures.includes("planned_second_answer"))).toBe(true);
  });

  it("carries a missing plan review into the final decision without calling it a verified error", async () => {
    const held = [
      plan("A", "cause", "the archive clerks sealed the damaged ledgers before the evening count", "A sealed ledger does not explain the patients who keep taking the medicine."),
      plan("C", "condition", "the night pharmacist cancelled the ward delivery whenever the lift failed", "A cancelled delivery cannot restrict a course the patients have already continued."),
      plan("D", "time", "the side room closed before the morning drug round began", "The side room closing does not time the months of continued treatment."),
      plan("E", "contrast", "the neighbouring clinic kept a private chart the ward never opened", "A private chart the ward never opened does not oppose the continued treatment."),
    ];
    const drafted = { ...skeleton, distractorBlueprints: held };
    const { service, log } = fakeService({ skeletons: [drafted], gate: [stemGate] });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.record?.judge?.concerns).toContain("review_missing");
    expect(outcome.record?.judge?.failures ?? []).not.toContain("review_missing");
    expect(outcome.record?.judge?.verdict).toBe("REVIEW");
    expect(outcome.record?.status).not.toBe("approved");
    expect(outcome.record?.provenance.distractorJudgeKey).toBe("shown");
    expect(log.filter((entry) => entry === "final-judge")).toHaveLength(1);
    expect(outcome.trace.cost?.byStage.finalJudge?.calls).toBe(3);
    expect(outcome.trace.cost?.byStage.planReview).toBeUndefined();
  });

  it("carries a low-confidence plan concern into the final decision", async () => {
    const held = [
      plan("A", "cause", "the archive clerks sealed the damaged ledgers before the evening count", "A sealed ledger does not explain the patients who keep taking the medicine."),
      plan("C", "condition", "the night pharmacist cancelled the ward delivery whenever the lift failed", "A cancelled delivery cannot restrict a course the patients have already continued."),
      plan("D", "time", "the side room closed before the morning drug round began", "The side room closing does not time the months of continued treatment."),
      plan("E", "contrast", "the neighbouring clinic kept a private chart the ward never opened", "A private chart the ward never opened does not oppose the continued treatment."),
    ];
    const drafted = { ...skeleton, distractorBlueprints: held };
    const { service } = fakeService({ skeletons: [drafted], gate: [planGate({ secondAnswerRisk: "shown" }, 0.3)] });
    const outcome = await generateItem(spec, ctxFor(service));
    expect(outcome.record?.judge?.concerns).toEqual(expect.arrayContaining(["planned_second_answer", "low_confidence"]));
    expect(outcome.record?.judge?.failures ?? []).not.toContain("planned_second_answer");
    expect(outcome.record?.judge?.verdict).toBe("REVIEW");
    expect(outcome.trace.cost?.byStage.finalJudge?.calls).toBe(3);
  });
});
