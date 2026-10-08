import type { DnaQuestion } from "@/modules/analysis/dna";
import { forOverallDistribution } from "@/modules/analysis/dna";
import type { QuestionFacet } from "@/modules/analysis/contract";
import { parseRef, ref, type KnowledgeEdge, type KnowledgeNode, type NodeRef, type NodeType } from "@/modules/knowledge/graph";
import { discourseForConnector, knowledgeEdges, knowledgeNodes, knowledgeVersion } from "@/modules/knowledge/seed";
import { dnaVersion, factoryVersions } from "./versions";

export const evidenceLevels = ["frequent", "observed", "rare", "unsupported"] as const;
export type EvidenceLevel = (typeof evidenceLevels)[number];

/** Frequent needs breadth across exams, not just volume in one booklet. */
export const evidenceThresholds = { frequent: { questions: 10, documents: 3 }, observed: { questions: 3, documents: 2 } } as const;

export function evidenceLevel(questions: number, documents: number): EvidenceLevel {
  if (questions === 0) return "unsupported";
  if (questions >= evidenceThresholds.frequent.questions && documents >= evidenceThresholds.frequent.documents) return "frequent";
  if (questions >= evidenceThresholds.observed.questions && documents >= evidenceThresholds.observed.documents) return "observed";
  return "rare";
}

export type Evidence = { ref: NodeRef; questions: number; documents: number; share: number; level: EvidenceLevel };

export type MisconceptionEvidence = Evidence & {
  /** Distractors carrying the label. */
  labelled: number;
  /** Labelled distractors whose answer/distractor pair matches what the misconception is about in the graph. */
  consistent: number;
  confusedRelations: NodeRef[];
};

export type Range = { min: number; median: number; max: number };

export type QuestionTypeProfile = Evidence & {
  difficulty: number;
  surface: { stemWords: Range; optionWords: Range; stimulusWords: Range };
  concepts: Evidence[];
  skills: Evidence[];
  cognitive: Evidence[];
  distractorTypes: Evidence[];
  measured: NodeRef[];
  measuredWithoutEvidence: NodeRef[];
  evidencedNotMeasured: NodeRef[];
};

export type FamilyProfile = {
  id: string;
  questionType: NodeRef;
  concept: NodeRef;
  questions: number;
  documents: number;
  level: EvidenceLevel;
  difficulty: number;
  distractorTypes: Evidence[];
  misconceptions: MisconceptionEvidence[];
  answerConnectors: Evidence[];
};

export type YdsExamProfile = {
  version: typeof factoryVersions.examProfile;
  exam: "yds";
  dnaVersion: typeof dnaVersion;
  knowledgeVersion: string;
  evidenceScope: "exam_distribution";
  documents: string[];
  questions: number;
  questionTypes: QuestionTypeProfile[];
  concepts: Evidence[];
  skills: Evidence[];
  cognitiveSkills: Evidence[];
  grammar: Evidence[];
  grammarPatterns: Evidence[];
  discourseRelations: Evidence[];
  connectors: Evidence[];
  distractorPatterns: Evidence[];
  misconceptions: MisconceptionEvidence[];
  families: FamilyProfile[];
  unsupported: NodeRef[];
  graphGaps: {
    measures: { questionType: NodeRef; ref: NodeRef; questions: number }[];
    exploits: { distractorType: NodeRef; misconception: NodeRef; distractors: number }[];
    unobservedExploits: { distractorType: NodeRef; misconception: NodeRef }[];
  };
  confidence: { meanAnalysis: number; humanReviewed: number };
};

type Graph = { nodes: KnowledgeNode[]; edges: KnowledgeEdge[]; version: string };
const canonical: Graph = { nodes: knowledgeNodes, edges: knowledgeEdges, version: knowledgeVersion.version };

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const refsOf = (question: DnaQuestion, ...facets: QuestionFacet[]) => question.nodes.filter((node) => facets.includes(node.facet)).map((node) => node.ref);
const typeOf = (value: NodeRef) => parseRef(value).type;

function range(values: number[]): Range {
  if (!values.length) return { min: 0, median: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return { min: sorted[0], median: round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2), max: sorted[sorted.length - 1] };
}

/** Counts questions (not occurrences) per reference, with how many exams each appears in. */
function tally(questions: DnaQuestion[], pick: (question: DnaQuestion) => Iterable<NodeRef>, total = questions.length, only?: (value: NodeRef) => boolean): Evidence[] {
  const seen = new Map<NodeRef, { questions: number; documents: Set<string> }>();
  for (const question of questions) {
    for (const value of new Set(pick(question))) {
      if (only && !only(value)) continue;
      const entry = seen.get(value) ?? { questions: 0, documents: new Set<string>() };
      entry.questions += 1;
      entry.documents.add(question.document);
      seen.set(value, entry);
    }
  }
  return [...seen]
    .map(([value, entry]) => ({ ref: value, questions: entry.questions, documents: entry.documents.size, share: total ? round(entry.questions / total, 3) : 0, level: evidenceLevel(entry.questions, entry.documents.size) }))
    .sort((a, b) => b.questions - a.questions || (a.ref < b.ref ? -1 : 1));
}

const ofType = (...types: NodeType[]) => (value: NodeRef) => types.includes(typeOf(value));

/** The discourse relation an option expresses: a relation node directly, or the relation of its connector. */
export function relationOf(value: NodeRef | null): NodeRef | null {
  if (!value) return null;
  if (typeOf(value) === "discourse_relation") return value;
  if (typeOf(value) === "connector") return discourseForConnector(value);
  return null;
}

export function answerRelation(question: DnaQuestion): NodeRef | null {
  for (const value of refsOf(question, "answer_expresses")) {
    const relation = relationOf(value);
    if (relation) return relation;
  }
  return null;
}

/** One family per question: the most specific primary concept (relation > pattern > grammar > skill) on its question type. */
export function familyConcept(question: DnaQuestion): NodeRef | null {
  const primary = refsOf(question, "primary_concept");
  const answer = answerRelation(question);
  if (answer && primary.includes(answer)) return answer;
  for (const type of ["discourse_relation", "grammar_pattern", "grammar", "skill"] as NodeType[]) {
    const hit = primary.find((value) => typeOf(value) === type);
    if (hit) return hit;
  }
  return refsOf(question, "skill_primary")[0] ?? null;
}

export const familyId = (questionType: NodeRef, concept: NodeRef) => `${parseRef(questionType).slug}.${parseRef(concept).slug}`;

export function confusedRelations(misconception: NodeRef, graph: Graph = canonical): NodeRef[] {
  return graph.edges
    .filter((edge) => edge.type === "related_to" && (edge.from === misconception || edge.to === misconception))
    .map((edge) => (edge.from === misconception ? edge.to : edge.from))
    .filter((value) => typeOf(value) === "discourse_relation")
    .sort();
}

/** Whether a labelled distractor really shows the misconception the graph describes. */
export function consistentMisconception(question: DnaQuestion, distractor: DnaQuestion["distractors"][number], graph: Graph = canonical): boolean {
  if (!distractor.misconception) return false;
  const relations = confusedRelations(distractor.misconception, graph);
  if (relations.length) {
    const answer = answerRelation(question);
    const offered = relationOf(distractor.expresses);
    return !!answer && !!offered && answer !== offered && relations.includes(answer) && relations.includes(offered);
  }
  return graph.edges.some((edge) => edge.type === "exploits" && edge.from === distractor.type && edge.to === distractor.misconception);
}

function misconceptionEvidence(questions: DnaQuestion[], graph: Graph, total = questions.length): MisconceptionEvidence[] {
  const base = tally(questions, (question) => [...refsOf(question, "misconception"), ...question.distractors.flatMap((entry) => (entry.misconception ? [entry.misconception] : []))], total);
  return base.map((entry) => {
    const labelled = questions.flatMap((question) => question.distractors.filter((distractor) => distractor.misconception === entry.ref).map((distractor) => ({ question, distractor })));
    return {
      ...entry,
      labelled: labelled.length,
      consistent: labelled.filter(({ question, distractor }) => consistentMisconception(question, distractor, graph)).length,
      confusedRelations: confusedRelations(entry.ref, graph),
    };
  });
}

/** Text-free YDS exam profile built from accepted DNA rows and the canonical graph. Nothing here is written back to the graph. */
export function buildExamProfile(rows: DnaQuestion[], graph: Graph = canonical): YdsExamProfile {
  const questions = forOverallDistribution(rows).sort((a, b) => (a.document < b.document ? -1 : a.document > b.document ? 1 : a.number - b.number));
  const total = questions.length;
  const documents = [...new Set(questions.map((question) => question.document))].sort();
  const allRefs = (question: DnaQuestion) => [
    question.questionType,
    ...question.nodes.map((node) => node.ref),
    ...question.distractors.flatMap((entry) => [entry.type, entry.expresses, entry.targeted, entry.misconception].filter((value): value is NodeRef => !!value)),
  ];
  const used = new Set(questions.flatMap(allRefs));
  const measures = (questionType: NodeRef) => graph.edges.filter((edge) => edge.type === "measures" && edge.from === questionType).map((edge) => edge.to);

  const byType = new Map<NodeRef, DnaQuestion[]>();
  for (const question of questions) byType.set(question.questionType, [...(byType.get(question.questionType) ?? []), question]);

  const questionTypes: QuestionTypeProfile[] = tally(questions, (question) => [question.questionType], total).map((entry) => {
    const members = byType.get(entry.ref) ?? [];
    const evidenced = tally(members, (question) => refsOf(question, "primary_concept", "skill_primary", "cognitive"), members.length);
    const measured = measures(entry.ref).sort();
    const strong = evidenced.filter((item) => item.share >= 0.3 && ofType("skill", "cognitive_skill", "grammar", "discourse_relation")(item.ref));
    return {
      ...entry,
      difficulty: round(members.reduce((sum, question) => sum + question.difficulty.overall, 0) / Math.max(1, members.length)),
      surface: {
        stemWords: range(members.map((question) => question.surface.stemWordCount)),
        optionWords: range(members.map((question) => question.surface.optionWordMean)),
        stimulusWords: range(members.map((question) => question.surface.stimulusWordCount)),
      },
      concepts: tally(members, (question) => refsOf(question, "primary_concept"), members.length),
      skills: tally(members, (question) => refsOf(question, "skill_primary"), members.length),
      cognitive: tally(members, (question) => refsOf(question, "cognitive"), members.length),
      distractorTypes: tally(members, (question) => question.distractors.map((distractor) => distractor.type), members.length),
      measured,
      measuredWithoutEvidence: measured.filter((value) => !evidenced.some((item) => item.ref === value)),
      evidencedNotMeasured: strong.filter((item) => !measured.includes(item.ref)).map((item) => item.ref),
    };
  });

  const byFamily = new Map<string, { questionType: NodeRef; concept: NodeRef; members: DnaQuestion[] }>();
  for (const question of questions) {
    const concept = familyConcept(question);
    if (!concept) continue;
    const id = familyId(question.questionType, concept);
    const entry = byFamily.get(id) ?? { questionType: question.questionType, concept, members: [] };
    entry.members.push(question);
    byFamily.set(id, entry);
  }
  const families: FamilyProfile[] = [...byFamily]
    .map(([id, entry]) => {
      const docs = new Set(entry.members.map((member) => member.document)).size;
      return {
        id,
        questionType: entry.questionType,
        concept: entry.concept,
        questions: entry.members.length,
        documents: docs,
        level: evidenceLevel(entry.members.length, docs),
        difficulty: round(entry.members.reduce((sum, question) => sum + question.difficulty.overall, 0) / entry.members.length),
        distractorTypes: tally(entry.members, (question) => question.distractors.map((distractor) => distractor.type), entry.members.length),
        misconceptions: misconceptionEvidence(entry.members, graph, entry.members.length),
        answerConnectors: tally(entry.members, (question) => refsOf(question, "answer_expresses"), entry.members.length, ofType("connector")),
      };
    })
    .sort((a, b) => b.questions - a.questions || (a.id < b.id ? -1 : 1));

  const exploitEdges = graph.edges.filter((edge) => edge.type === "exploits");
  const exploitPairs = new Map<string, number>();
  for (const question of questions) {
    for (const distractor of question.distractors) {
      if (distractor.misconception) exploitPairs.set(`${distractor.type} ${distractor.misconception}`, (exploitPairs.get(`${distractor.type} ${distractor.misconception}`) ?? 0) + 1);
    }
  }

  return {
    version: factoryVersions.examProfile,
    exam: "yds",
    dnaVersion,
    knowledgeVersion: graph.version,
    evidenceScope: "exam_distribution",
    documents,
    questions: total,
    questionTypes,
    concepts: tally(questions, (question) => refsOf(question, "primary_concept"), total),
    skills: tally(questions, (question) => refsOf(question, "skill_primary", "skill_secondary"), total),
    cognitiveSkills: tally(questions, (question) => refsOf(question, "cognitive"), total),
    grammar: tally(questions, (question) => refsOf(question, "grammar"), total, ofType("grammar")),
    grammarPatterns: tally(questions, (question) => [...refsOf(question, "grammar", "primary_concept", "secondary_concept", "answer_expresses")], total, ofType("grammar_pattern")),
    discourseRelations: tally(questions, (question) => refsOf(question, "discourse"), total),
    connectors: tally(questions, (question) => [...refsOf(question, "vocabulary", "answer_expresses"), ...question.distractors.flatMap((entry) => (entry.expresses ? [entry.expresses] : []))], total, ofType("connector")),
    distractorPatterns: tally(questions, (question) => question.distractors.map((distractor) => distractor.type), total),
    misconceptions: misconceptionEvidence(questions, graph, total),
    families,
    unsupported: graph.nodes
      .map(ref)
      .filter((value) => !used.has(value) && typeOf(value) !== "domain")
      .sort(),
    graphGaps: {
      measures: questionTypes.flatMap((type) => type.evidencedNotMeasured.map((value) => ({ questionType: type.ref, ref: value, questions: type.concepts.concat(type.skills, type.cognitive).find((item) => item.ref === value)?.questions ?? 0 }))),
      exploits: [...exploitPairs]
        .filter(([key]) => !exploitEdges.some((edge) => `${edge.from} ${edge.to}` === key))
        .map(([key, distractors]) => {
          const [distractorType, misconception] = key.split(" ") as [NodeRef, NodeRef];
          return { distractorType, misconception, distractors };
        })
        .sort((a, b) => b.distractors - a.distractors),
      unobservedExploits: exploitEdges.filter((edge) => !exploitPairs.has(`${edge.from} ${edge.to}`)).map((edge) => ({ distractorType: edge.from, misconception: edge.to })),
    },
    confidence: {
      meanAnalysis: round(questions.reduce((sum, question) => sum + question.analysisConfidence, 0) / Math.max(1, total), 3),
      humanReviewed: questions.filter((question) => question.humanReviewStatus !== "unreviewed").length,
    },
  };
}

export const findFamily = (profile: YdsExamProfile, id: string) => profile.families.find((family) => family.id === id) ?? null;
