import type { HumanReviewStatus, SourceClass, ValidationStatus } from "@/modules/analysis/acceptance";
import { usableForDistribution } from "@/modules/analysis/acceptance";
import type { SectionId } from "@/modules/exam/blueprint";
import type { NodeRef } from "@/modules/knowledge/graph";
import { difficultyDimensions, questionFacets, type AnalysisDraft, type DifficultyDimension, type OptionLabel, type QuestionFacet } from "./contract";
import { surfaceFeatures, type ReconstructedQuestion, type SurfaceFeatures } from "./surface";

/** One analysed question as stored in the database: references, numbers and hashes only. */
export type DnaQuestion = {
  document: string;
  number: number;
  section: SectionId;
  questionType: NodeRef;
  translationDirection: "en_tr" | "tr_en" | null;
  answer: OptionLabel;
  stimulusKey: string | null;
  textSha256: string;
  surface: SurfaceFeatures;
  difficulty: Record<DifficultyDimension, number>;
  cognitiveDemand: string;
  transferRequirement: string;
  confidence: number;
  extractionConfidence: number;
  analysisConfidence: number;
  validationStatus: ValidationStatus;
  humanReviewStatus: HumanReviewStatus;
  sourceClass: SourceClass;
  nodes: { facet: QuestionFacet; ref: NodeRef; rank: number }[];
  distractors: { position: OptionLabel; type: NodeRef; expresses: NodeRef | null; targeted: NodeRef | null; misconception: NodeRef | null }[];
  proposals: { type: string; slug: string }[];
};

const round3 = (value: number) => Math.round(value * 1000) / 1000;

export const lemmaSlug = (lemma: string) =>
  lemma
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Maps a validated analysis to the text-free row shape; tested and answer lemmas without a node become vocabulary proposals. */
export function toDnaQuestion(input: {
  document: string;
  question: ReconstructedQuestion;
  analysis: AnalysisDraft;
  answer: OptionLabel;
  textSha256: string;
  proposals: { type: string; slug: string }[];
  extractionConfidence?: number;
  validationStatus?: ValidationStatus;
  humanReviewStatus?: HumanReviewStatus;
  sourceClass?: SourceClass;
}): DnaQuestion {
  const { analysis } = input;
  const byFacet: Record<QuestionFacet, (NodeRef | null)[]> = {
    primary_concept: analysis.knowledge.primary_concepts,
    secondary_concept: analysis.knowledge.secondary_concepts,
    grammar: analysis.knowledge.grammar,
    vocabulary: analysis.knowledge.vocabulary.map((item) => item.ref),
    discourse: analysis.knowledge.discourse_relations,
    skill_primary: [analysis.skills.primary],
    skill_secondary: analysis.skills.secondary,
    cognitive: analysis.skills.cognitive,
    misconception: analysis.misconceptions,
    prerequisite: analysis.prerequisites,
    answer_expresses: analysis.answer_expresses,
  };
  const nodes = questionFacets.flatMap((facet) =>
    [...new Set(byFacet[facet].filter((value): value is NodeRef => value !== null))].map((ref, rank) => ({ facet, ref, rank })),
  );
  const lemmaProposals = analysis.knowledge.vocabulary
    .filter((item) => !item.ref && (item.role === "tested" || item.role === "answer") && lemmaSlug(item.lemma))
    .map((item) => ({ type: "vocabulary", slug: lemmaSlug(item.lemma) }));
  const proposals = [...input.proposals, ...lemmaProposals]
    .filter((entry, index, all) => all.findIndex((other) => other.type === entry.type && other.slug === entry.slug) === index)
    .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return {
    document: input.document,
    number: input.question.number,
    section: input.question.section,
    questionType: analysis.question_type,
    translationDirection: input.question.translationDirection,
    answer: input.answer,
    stimulusKey: input.question.stimulusKey,
    textSha256: input.textSha256,
    surface: surfaceFeatures(input.question),
    difficulty: Object.fromEntries(difficultyDimensions.map((dimension) => [dimension, round3(analysis.difficulty[dimension])])) as Record<DifficultyDimension, number>,
    cognitiveDemand: analysis.pedagogy.cognitive_demand,
    transferRequirement: analysis.pedagogy.transfer_requirement,
    confidence: round3(analysis.confidence),
    extractionConfidence: round3(input.extractionConfidence ?? 1),
    analysisConfidence: round3(analysis.confidence),
    validationStatus: input.validationStatus ?? "accepted",
    humanReviewStatus: input.humanReviewStatus ?? "unreviewed",
    sourceClass: input.sourceClass ?? "complete_exam",
    nodes: nodes.sort((a, b) => (a.facet < b.facet ? -1 : a.facet > b.facet ? 1 : a.rank - b.rank)),
    distractors: analysis.distractors
      .map((entry) => ({ position: entry.label, type: entry.type, expresses: entry.expresses, targeted: entry.targeted_concept, misconception: entry.misconception }))
      .sort((a, b) => (a.position < b.position ? -1 : 1)),
    proposals,
  };
}

export type Count = { key: string; count: number };
export type Matrix = { rows: string[]; columns: string[]; cells: Record<string, Record<string, number>> };
export type Distribution = { mean: number; median: number; min: number; max: number; bins: number[] };

export type Family = {
  primary: NodeRef;
  members: { document: string; number: number; questionType: NodeRef }[];
  questionTypes: Count[];
  distractorTypes: Count[];
  misconceptions: Count[];
};

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

export function countBy(values: string[]): Count[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1));
}

function matrix(pairs: [string, string][]): Matrix {
  const cells: Record<string, Record<string, number>> = {};
  for (const [row, column] of pairs) {
    cells[row] ??= {};
    cells[row][column] = (cells[row][column] ?? 0) + 1;
  }
  return {
    rows: countBy(pairs.map(([row]) => row)).map((entry) => entry.key),
    columns: countBy(pairs.map(([, column]) => column)).map((entry) => entry.key),
    cells,
  };
}

export function distribution(values: number[]): Distribution {
  if (!values.length) return { mean: 0, median: 0, min: 0, max: 0, bins: [0, 0, 0, 0, 0] };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const bins = [0, 0, 0, 0, 0];
  for (const value of values) bins[Math.min(4, Math.floor(value * 5))] += 1;
  return {
    mean: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    median: round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2),
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    bins,
  };
}

export const difficultyBand = (value: number) => (value < 0.4 ? "easy" : value < 0.7 ? "medium" : "hard");

const refsOf = (question: DnaQuestion, ...facets: QuestionFacet[]) => question.nodes.filter((node) => facets.includes(node.facet)).map((node) => node.ref);

/** A family is every question whose primary concept is the same node, whatever surface it is tested on. */
export function deriveFamilies(questions: DnaQuestion[]): Family[] {
  const byPrimary = new Map<NodeRef, DnaQuestion[]>();
  for (const question of questions) {
    for (const primary of new Set(refsOf(question, "primary_concept"))) byPrimary.set(primary, [...(byPrimary.get(primary) ?? []), question]);
  }
  return [...byPrimary]
    .map(([primary, members]) => ({
      primary,
      members: members.map((member) => ({ document: member.document, number: member.number, questionType: member.questionType })).sort((a, b) => a.number - b.number),
      questionTypes: countBy(members.map((member) => member.questionType)),
      distractorTypes: countBy(members.flatMap((member) => member.distractors.map((entry) => entry.type))),
      misconceptions: countBy(members.flatMap((member) => [...refsOf(member, "misconception"), ...member.distractors.flatMap((entry) => (entry.misconception ? [entry.misconception] : []))])),
    }))
    .sort((a, b) => b.members.length - a.members.length || b.questionTypes.length - a.questionTypes.length || (a.primary < b.primary ? -1 : 1));
}

export type DnaReport = {
  questions: number;
  concepts: Count[];
  questionTypes: Count[];
  grammar: Count[];
  vocabulary: Count[];
  discourse: Count[];
  answerExpresses: Count[];
  skills: Count[];
  secondarySkills: Count[];
  cognitive: Count[];
  distractorTypes: Count[];
  distractorTypesByQuestionType: Matrix;
  misconceptions: Count[];
  difficulty: Record<DifficultyDimension, Distribution>;
  difficultyByQuestionType: Record<string, Record<DifficultyDimension, number>>;
  cognitiveDemand: Count[];
  transfer: Count[];
  conceptByQuestionType: Matrix;
  conceptByDifficulty: Matrix;
  skillByQuestionType: Matrix;
  families: Family[];
  surface: Record<string, { stimulusWords: number; stemWords: number; optionWords: number; sentenceLength: number }>;
  answers: Count[];
};

const mean = (values: number[]) => (values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);

export function forOverallDistribution(questions: DnaQuestion[]): DnaQuestion[] {
  return questions.filter((question) => usableForDistribution(question.sourceClass));
}

/** Deterministic: the same rows always give the same report. Topic slices must be filtered out before overall YDS distribution. */
export function mineDna(questions: DnaQuestion[]): DnaReport {
  const sorted = [...questions].sort((a, b) => (a.document < b.document ? -1 : a.document > b.document ? 1 : a.number - b.number));
  const concept = (question: DnaQuestion) => refsOf(question, "primary_concept");
  const typesOf = (key: (question: DnaQuestion) => string[]) => sorted.flatMap((question) => key(question).map((value) => [value, question.questionType] as [string, string]));
  const byType = new Map<string, DnaQuestion[]>();
  for (const question of sorted) byType.set(question.questionType, [...(byType.get(question.questionType) ?? []), question]);

  return {
    questions: sorted.length,
    concepts: countBy(sorted.flatMap(concept)),
    questionTypes: countBy(sorted.map((question) => question.questionType)),
    grammar: countBy(sorted.flatMap((question) => refsOf(question, "grammar"))),
    vocabulary: countBy(sorted.flatMap((question) => refsOf(question, "vocabulary"))),
    discourse: countBy(sorted.flatMap((question) => refsOf(question, "discourse"))),
    answerExpresses: countBy(sorted.flatMap((question) => refsOf(question, "answer_expresses"))),
    skills: countBy(sorted.flatMap((question) => refsOf(question, "skill_primary"))),
    secondarySkills: countBy(sorted.flatMap((question) => refsOf(question, "skill_secondary"))),
    cognitive: countBy(sorted.flatMap((question) => refsOf(question, "cognitive"))),
    distractorTypes: countBy(sorted.flatMap((question) => question.distractors.map((entry) => entry.type))),
    distractorTypesByQuestionType: matrix(sorted.flatMap((question) => question.distractors.map((entry) => [entry.type, question.questionType] as [string, string]))),
    misconceptions: countBy(sorted.flatMap((question) => [...refsOf(question, "misconception"), ...question.distractors.flatMap((entry) => (entry.misconception ? [entry.misconception] : []))])),
    difficulty: Object.fromEntries(difficultyDimensions.map((dimension) => [dimension, distribution(sorted.map((question) => question.difficulty[dimension]))])) as Record<DifficultyDimension, Distribution>,
    difficultyByQuestionType: Object.fromEntries(
      [...byType].map(([type, members]) => [type, Object.fromEntries(difficultyDimensions.map((dimension) => [dimension, mean(members.map((member) => member.difficulty[dimension]))]))]),
    ) as Record<string, Record<DifficultyDimension, number>>,
    cognitiveDemand: countBy(sorted.map((question) => question.cognitiveDemand)),
    transfer: countBy(sorted.map((question) => question.transferRequirement)),
    conceptByQuestionType: matrix(typesOf(concept)),
    conceptByDifficulty: matrix(sorted.flatMap((question) => concept(question).map((value) => [value, difficultyBand(question.difficulty.overall)] as [string, string]))),
    skillByQuestionType: matrix(typesOf((question) => refsOf(question, "skill_primary", "cognitive"))),
    families: deriveFamilies(sorted),
    surface: Object.fromEntries(
      [...byType].map(([type, members]) => [
        type,
        {
          stimulusWords: mean(members.map((member) => member.surface.stimulusWordCount)),
          stemWords: mean(members.map((member) => member.surface.stemWordCount)),
          optionWords: mean(members.map((member) => member.surface.optionWordMean)),
          sentenceLength: mean(members.map((member) => member.surface.meanSentenceLength)),
        },
      ]),
    ),
    answers: countBy(sorted.map((question) => question.answer)),
  };
}
