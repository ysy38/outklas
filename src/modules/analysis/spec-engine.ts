import type { NodeRef } from "@/modules/knowledge/graph";
import type { DnaReport } from "./dna";
import { difficultyBand } from "./dna";
import type { QuestionSpec } from "./spec";

export type SpecRequest = {
  questionType?: NodeRef;
  primaryConcept?: NodeRef;
  misconception?: NodeRef;
  difficultyBand?: QuestionSpec["difficulty"]["band"];
};

export type SpecContext = {
  dna: DnaReport;
  productionTypeCounts?: { key: string; count: number }[];
  request?: SpecRequest;
};

const defaultDistractors: NodeRef[] = ["distractor_type:wrong_discourse_relation", "distractor_type:syntactic_mismatch", "distractor_type:near_synonym"];

function pickType(dna: DnaReport, production: { key: string; count: number }[], requested?: NodeRef): NodeRef {
  if (requested) return requested;
  const have = new Map(production.map((entry) => [entry.key, entry.count]));
  const gap = dna.questionTypes
    .map((entry) => ({ type: entry.key as NodeRef, dna: entry.count, bank: have.get(entry.key) ?? 0, ratio: (have.get(entry.key) ?? 0) / entry.count }))
    .sort((a, b) => a.ratio - b.ratio || b.dna - a.dna || (a.type < b.type ? -1 : 1));
  return gap[0]?.type ?? (dna.questionTypes[0]?.key as NodeRef);
}

function pickConcept(dna: DnaReport, questionType: NodeRef, requested?: NodeRef): NodeRef {
  if (requested) return requested;
  const cells = dna.conceptByQuestionType.cells;
  const ranked = dna.concepts
    .map((entry) => ({ concept: entry.key as NodeRef, n: cells[entry.key]?.[questionType] ?? 0 }))
    .filter((entry) => entry.n > 0)
    .sort((a, b) => b.n - a.n || (a.concept < b.concept ? -1 : 1));
  return ranked[0]?.concept ?? (dna.concepts[0]?.key as NodeRef);
}

function pickMisconception(dna: DnaReport, requested?: NodeRef): NodeRef | undefined {
  if (requested) return requested;
  return dna.misconceptions[0]?.key as NodeRef | undefined;
}

function distractorsFor(dna: DnaReport, questionType: NodeRef): NodeRef[] {
  const cells = dna.distractorTypesByQuestionType.cells;
  const ranked = dna.distractorTypes
    .map((entry) => ({ type: entry.key as NodeRef, n: cells[entry.key]?.[questionType] ?? 0 }))
    .filter((entry) => entry.n > 0)
    .sort((a, b) => b.n - a.n);
  const picked = ranked.slice(0, 3).map((entry) => entry.type);
  return picked.length ? picked : defaultDistractors;
}

function cognitiveFor(dna: DnaReport, questionType: NodeRef): NodeRef {
  const cells = dna.skillByQuestionType.cells;
  const ranked = dna.cognitive
    .map((entry) => ({ skill: entry.key as NodeRef, n: cells[entry.key]?.[questionType] ?? 0 }))
    .filter((entry) => entry.n > 0)
    .sort((a, b) => b.n - a.n);
  return ranked[0]?.skill ?? (dna.cognitive[0]?.key as NodeRef) ?? "cognitive_skill:logical_relationship";
}

function skillFor(dna: DnaReport, questionType: NodeRef): NodeRef {
  const cells = dna.skillByQuestionType.cells;
  const ranked = dna.skills
    .map((entry) => ({ skill: entry.key as NodeRef, n: cells[entry.key]?.[questionType] ?? 0 }))
    .filter((entry) => entry.n > 0)
    .sort((a, b) => b.n - a.n);
  return ranked[0]?.skill ?? (dna.skills[0]?.key as NodeRef) ?? "skill:word_meaning";
}

function bandFor(dna: DnaReport, questionType: NodeRef, requested?: QuestionSpec["difficulty"]["band"]): QuestionSpec["difficulty"] {
  if (requested) {
    const overall = requested === "easy" ? 0.3 : requested === "hard" ? 0.75 : 0.5;
    return { band: requested, cefr: requested === "easy" ? "B1" : requested === "hard" ? "C1" : "B2", factors: { overall } };
  }
  const means = dna.difficultyByQuestionType[questionType];
  const overall = means?.overall ?? dna.difficulty.overall.mean;
  const band = difficultyBand(overall);
  return { band, cefr: band === "easy" ? "B1" : band === "hard" ? "C1" : "B2", factors: { overall } };
}

/** Deterministic spec from YDS DNA + graph. LLM is not called here. */
export function getQuestionSpec(input: SpecContext): QuestionSpec {
  const production = input.productionTypeCounts ?? [];
  const questionType = pickType(input.dna, production, input.request?.questionType);
  const primary = pickConcept(input.dna, questionType, input.request?.primaryConcept);
  const family = input.dna.families.find((entry) => entry.primary === primary);
  const documents = [...new Set((family?.members ?? []).map((member) => member.document))].sort();
  return {
    questionType,
    primaryConcepts: [primary],
    secondaryConcepts: [],
    targetSkill: skillFor(input.dna, questionType),
    cognitiveSkill: cognitiveFor(input.dna, questionType),
    targetMisconception: pickMisconception(input.dna, input.request?.misconception),
    distractorPlan: distractorsFor(input.dna, questionType),
    difficulty: bandFor(input.dna, questionType, input.request?.difficultyBand),
    dnaBasis: { documentIds: documents, statistic: `concept×type ${primary} × ${questionType}` },
    constraints: { singleCorrectAnswer: true, avoidUnintendedClues: true, originalContent: true },
  };
}
