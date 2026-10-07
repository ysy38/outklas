import { describe, expect, it } from "vitest";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { analysisDraft, type AnalysisDraft } from "./contract";
import { deriveFamilies, mineDna, toDnaQuestion } from "./dna";
import { licenseProblems, sourceDocuments, usableForGrounding } from "./sources";
import { expectedQuestionType, looksTurkish, normalizeForHash, surfaceFeatures, type ReconstructedQuestion } from "./surface";
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

  it("blocks key and blind-solve disagreements, low confidence and extraction problems", () => {
    const result = validateAnalysis({ ...input, blind: { ...blind, answer: "B" }, extractionFlags: ["ocr_disagreement"], draft: draft({ correct_option: "B", confidence: 0.5 }) });
    expect(result.status).toBe("needs_review");
    expect(result.flags.filter((flag) => flag.severity === "block").map((flag) => flag.code)).toEqual(["answer_key_mismatch", "blind_solve_mismatch", "low_confidence", "extraction_needs_review"]);
  });

  it("blocks notes that quote the item and accepts the translation parent type only as a warning", () => {
    const quoting = draft({ learning_objective: "notice that the imaginary villagers still preferred the old ferry" });
    expect(validateAnalysis({ ...input, draft: quoting }).flags).toContainEqual({ code: "quotes_item", severity: "block", detail: "learning_objective" });
    expect(quotedRun("the imaginary villagers still preferred the old", question.stem)).toBe("the imaginary villagers still preferred the");
    const translation = validateAnalysis({ ...input, expectedType: "question_type:translation_en_tr", draft: draft({ question_type: "question_type:translation" }) });
    expect(translation.flags[0]).toMatchObject({ code: "question_type_mismatch", severity: "warn" });
    expect(translation.analysis.question_type).toBe("question_type:translation_en_tr");
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

describe("sources", () => {
  it("registers ÖSYM booklets as reference-only, unverified and unusable for grounding", () => {
    for (const document of sourceDocuments) {
      expect(licenseProblems(document.license)).toEqual([]);
      expect(usableForGrounding(document.license)).toBe(false);
    }
    expect(licenseProblems({ ...sourceDocuments[0].license, commercialUse: true })).toHaveLength(1);
  });
});