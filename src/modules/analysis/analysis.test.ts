import { describe, expect, it } from "vitest";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { analysisDraft, coerceAnalysisJson, type AnalysisDraft } from "./contract";
import { deriveFamilies, forOverallDistribution, mineDna, toDnaQuestion } from "./dna";
import { licenseProblems, sourceDocuments, usableForGrounding } from "./sources";
import { expectedQuestionType, looksTurkish, normalizeForHash, surfaceFeatures, type ReconstructedQuestion } from "./surface";
import { classifySource, usableForDistribution } from "./acceptance";
import { analysisScaleThresholds } from "./thresholds";
import { quotedRun, validateAnalysis } from "./validate";

const question: ReconstructedQuestion = {
  number: 30,
  section: "sentence",
  layout: "blank",
  stimulusKey: null,
  stimulus: null,
  stem: "---- the invented bridge was painted blue, the imaginary villagers still preferred the old wooden ferry.",
  options: { A: "Although", B: "Because", C: "Unless", D: "So that", E: "Once" },
  translationDirection: null,
};

const draft = (patch: Partial<AnalysisDraft> = {}): AnalysisDraft =>
  analysisDraft.parse({
    question_number: 30,
    question_type: "question_type:sentence_completion",
    correct_option: "A",
    knowledge: { primary_concepts: ["discourse_relation:concession"], secondary_concepts: [], grammar: [], vocabulary: [{ lemma: "although", pos: "conjunction", role: "answer", ref: "connector:although" }], discourse_relations: ["discourse_relation:concession"] },
    skills: { primary: null, secondary: [], cognitive: ["cognitive_skill:logical_relationship"] },
    difficulty: { overall: 0.5, lexical: 0.3, syntactic: 0.4, semantic: 0.5, inference: 0.5, distractor_similarity: 0.6, context_dependency: 0.4 },
    answer_expresses: ["discourse_relation:concession"],
    distractors: ["B", "C", "D", "E"].map((label) => ({ label, type: "distractor_type:wrong_discourse_relation", expresses: "discourse_relation:cause", targeted_concept: null, misconception: label === "B" ? "misconception:concession_vs_contrast" : null, why_plausible: "connects two clauses", why_wrong: "wrong relation" })),
    misconceptions: ["misconception:concession_vs_contrast"],
    prerequisites: [],
    learning_objective: "recognise an unexpected result between clauses",
    pedagogy: { cognitive_demand: "analyze", transfer_requirement: "medium" },
    proposals: [],
    ambiguities: [],
    confidence: 0.9,
    needs_review: false,
    ...patch,
  });

const blind = { answer: "A" as const, confidence: 0.9, rationale: "the clauses contrast expectation and outcome" };
const input = { question, expectedType: "question_type:sentence_completion" as const, answerKey: "A" as const, blind, extractionFlags: [] };

describe("coerceAnalysisJson", () => {
  it("lowercases lemmas and slugifies proposal slugs so Q28/Q40-style output can parse", () => {
    const coerced = coerceAnalysisJson({
      knowledge: { vocabulary: [{ lemma: "UNESCO", pos: "noun", role: "tested", ref: null }] },
      proposals: [{ type: "topic", slug: "World-Heritage", name: "World Heritage", reason: "missing" }],
    }) as { knowledge: { vocabulary: { lemma: string }[] }; proposals: { slug: string }[] };
    expect(coerced.knowledge.vocabulary[0].lemma).toBe("unesco");
    expect(coerced.proposals[0].slug).toBe("world_heritage");
  });
});

describe("validateAnalysis", () => {
  it("accepts a consistent analysis", () => {
    const result = validateAnalysis({ ...input, draft: draft() });
    expect(result.status).toBe("accepted");
    expect(result.flags).toEqual([]);
  });

  it("demotes unknown references to proposals and drops wrong facet types", () => {
    const result = validateAnalysis({ ...input, draft: draft({ knowledge: { ...draft().knowledge, secondary_concepts: ["topic:made_up_topic", "misconception:concession_vs_contrast"] } }) });
    expect(result.analysis.knowledge.secondary_concepts).toEqual([]);
    expect(result.proposals).toEqual([{ type: "topic", slug: "made_up_topic", name: "made up topic", source: "demoted" }]);
    expect(result.flags.map((flag) => flag.code)).toEqual(["unknown_ref", "wrong_facet_type"]);
    expect(result.status).toBe("accepted");
  });

  it("blocks key and blind-solve disagreements and extraction problems", () => {
    const result = validateAnalysis({ ...input, blind: { ...blind, answer: "B" }, extractionFlags: ["ocr_disagreement"], draft: draft({ correct_option: "B", confidence: 0.5 }) });
    expect(result.status).toBe("needs_review");
    expect(result.flags.filter((flag) => flag.severity === "block").map((flag) => flag.code)).toEqual(["answer_key_mismatch", "blind_solve_mismatch", "extraction_needs_review"]);
    expect(result.analysis.confidence).toBeLessThan(0.5);
  });

  it("strips quoted n-grams from notes and accepts the translation parent type only as a warning", () => {
    const quoting = draft({ learning_objective: "notice that the imaginary villagers still preferred the old ferry" });
    const stripped = validateAnalysis({ ...input, draft: quoting });
    expect(stripped.flags.map((flag) => flag.code)).not.toContain("quotes_item");
    expect(quotedRun(stripped.analysis.learning_objective, question.stem)).toBeNull();
    expect(quotedRun("the imaginary villagers still preferred the old", question.stem)).toBe("the imaginary villagers still preferred");
    const translation = validateAnalysis({ ...input, expectedType: "question_type:translation_en_tr", draft: draft({ question_type: "question_type:translation" }) });
    expect(translation.flags[0]).toMatchObject({ code: "question_type_mismatch", severity: "warn" });
    expect(translation.analysis.question_type).toBe("question_type:translation_en_tr");
  });

  it("keeps misconceptions only when a distractor evidences them and derives confidence from flags", () => {
    const overAssigned = validateAnalysis({
      ...input,
      draft: draft({
        misconceptions: ["misconception:collocation_by_meaning_only", "misconception:concession_vs_contrast"],
        distractors: draft().distractors.map((entry) => ({
          ...entry,
          misconception: entry.label === "B" ? "misconception:concession_vs_contrast" : "misconception:collocation_by_meaning_only",
        })),
      }),
    });
    expect(overAssigned.analysis.misconceptions).toEqual(["misconception:concession_vs_contrast"]);
    expect(overAssigned.analysis.distractors.find((entry) => entry.label === "B")?.misconception).toBe("misconception:concession_vs_contrast");
    expect(overAssigned.analysis.distractors.filter((entry) => entry.label !== "B").every((entry) => entry.misconception === null)).toBe(true);
    expect(overAssigned.analysis.confidence).toBeLessThan(0.9);
    expect(overAssigned.flags.map((flag) => flag.code)).toContain("misconception_unevidenced");
  });

  it("relabels whereas from concession to contrast using the Phase 1 graph", () => {
    const whereas = validateAnalysis({
      ...input,
      draft: draft({
        knowledge: { ...draft().knowledge, vocabulary: [{ lemma: "whereas", pos: "conjunction", role: "answer", ref: "connector:whereas" }], discourse_relations: ["discourse_relation:concession"], primary_concepts: ["discourse_relation:concession"] },
        answer_expresses: ["connector:whereas", "discourse_relation:concession"],
      }),
    });
    expect(whereas.analysis.answer_expresses).toEqual(expect.arrayContaining(["connector:whereas", "discourse_relation:contrast"]));
    expect(whereas.analysis.answer_expresses).not.toContain("discourse_relation:concession");
    expect(whereas.analysis.knowledge.discourse_relations).toEqual(["discourse_relation:contrast"]);
    expect(whereas.flags.map((flag) => flag.code)).toContain("connector_relation_aligned");
  });

  it("requires exactly the four wrong options as distractors", () => {
    const result = validateAnalysis({ ...input, draft: draft({ distractors: draft().distractors.slice(1) }) });
    expect(result.flags.map((flag) => flag.code)).toContain("distractor_labels");
  });
});

describe("DNA", () => {
  const row = (number: number, type: "question_type:sentence_completion" | "question_type:cloze", concept: "discourse_relation:concession" | "discourse_relation:contrast", overall: number) =>
    toDnaQuestion({
      document: "doc",
      question: { ...question, number },
      analysis: { ...draft(), question_type: type, knowledge: { ...draft().knowledge, primary_concepts: [concept], vocabulary: [{ lemma: "ferry", pos: "noun", role: "tested", ref: null }] }, difficulty: { ...draft().difficulty, overall } },
      answer: "A",
      textSha256: "0".repeat(64),
      proposals: [],
    });

  it("keeps only references and numbers, and turns unlinked tested words into proposals", () => {
    const dna = row(1, "question_type:sentence_completion", "discourse_relation:concession", 0.5);
    expect(dna.nodes).toContainEqual({ facet: "primary_concept", ref: "discourse_relation:concession", rank: 0 });
    expect(dna.proposals).toEqual([{ type: "vocabulary", slug: "ferry" }]);
    expect(dna.surface.blankCount).toBe(1);
    expect(Object.values(dna).filter((value) => typeof value === "string").every((value) => /^[A-Za-z0-9_:.+\-]{0,64}$/.test(value as string))).toBe(true);
  });

  it("mines deterministic aggregates and families across surfaces", () => {
    const rows = [row(1, "question_type:sentence_completion", "discourse_relation:concession", 0.3), row(2, "question_type:cloze", "discourse_relation:concession", 0.8), row(3, "question_type:cloze", "discourse_relation:contrast", 0.5)];
    const report = mineDna(rows);
    expect(report).toEqual(mineDna([...rows].reverse()));
    expect(report.concepts[0]).toEqual({ key: "discourse_relation:concession", count: 2 });
    expect(report.conceptByQuestionType.cells["discourse_relation:concession"]).toEqual({ "question_type:cloze": 1, "question_type:sentence_completion": 1 });
    expect(report.conceptByDifficulty.cells["discourse_relation:concession"]).toEqual({ easy: 1, hard: 1 });
    expect(report.distractorTypes[0]).toEqual({ key: "distractor_type:wrong_discourse_relation", count: 12 });
    const families = deriveFamilies(rows);
    expect(families[0].primary).toBe("discourse_relation:concession");
    expect(families[0].questionTypes).toHaveLength(2);
    const slice = toDnaQuestion({
      document: "e-yds-topic-vocab",
      question,
      analysis: draft(),
      answer: "A",
      textSha256: "1".repeat(64),
      proposals: [],
      sourceClass: "topic_slice",
    });
    expect(forOverallDistribution([row(1, "question_type:sentence_completion", "discourse_relation:concession", 0.3), slice])).toHaveLength(1);
    expect(forOverallDistribution([slice])[0]?.sourceClass).toBeUndefined();
  });
});

describe("surface", () => {
  it("derives the expected type from the blueprint and the translation direction", () => {
    expect(expectedQuestionType(30, ydsBlueprint, null)).toBe("question_type:sentence_completion");
    expect(expectedQuestionType(38, ydsBlueprint, "tr_en")).toBe("question_type:translation_tr_en");
    expect(looksTurkish("Bu çalışmanın sonuçları şaşırtıcıydı.")).toBe(true);
    expect(looksTurkish("The results were surprising.")).toBe(false);
    expect(normalizeForHash({ ...question, stem: question.stem.toUpperCase() })).toBe(normalizeForHash(question));
    expect(surfaceFeatures(question)).toMatchObject({ optionCount: 5, blankCount: 1, stimulusWordCount: 0 });
  });
});

describe("scale thresholds", () => {
  it("does not block analysis on complete-exam or 85% extraction yield", () => {
    expect(analysisScaleThresholds).toEqual({
      blindSolve: 0.93,
      schemaFail: 0.02,
      quotingNotes: 0,
      misconceptionsEvidenced: 1,
      questionTypeMatch: 1,
      connectorRelationMismatch: 0,
    });
    expect(analysisScaleThresholds).not.toHaveProperty("extractionOk");
    expect(analysisScaleThresholds).not.toHaveProperty("segmentation");
  });
});

describe("source classes", () => {
  it("treats a 39/80 booklet as an analysable partial exam and keeps topic slices out of YDS distribution", () => {
    expect(classifySource({ questionsFound: 39, expected: 80, trustworthy: true })).toBe("partial_exam");
    expect(classifySource({ questionsFound: 80, expected: 80, trustworthy: true })).toBe("complete_exam");
    expect(classifySource({ topic: true, questionsFound: 22, expected: 22, trustworthy: true })).toBe("topic_slice");
    expect(usableForDistribution("partial_exam")).toBe(true);
    expect(usableForDistribution("topic_slice")).toBe(false);
  });
});

describe("sources", () => {
  it("registers ÖSYM booklets as reference-only, unverified and unusable for grounding", () => {
    for (const document of sourceDocuments) {
      expect(licenseProblems(document.license)).toEqual([]);
      expect(usableForGrounding(document.license)).toBe(false);
    }
    expect(licenseProblems({ ...sourceDocuments[0].license, commercialUse: true })).toHaveLength(1);
  });
});