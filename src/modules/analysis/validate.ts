import { parseRef, ref, type NodeRef, type NodeType } from "@/modules/knowledge/graph";
import { discourseForConnector, knowledgeNodes } from "@/modules/knowledge/seed";
import { facetTypes, optionLabels, type AnalysisDraft, type BlindSolution, type Facet, type OptionLabel } from "./contract";
import { words, type ReconstructedQuestion } from "./surface";

export type Severity = "block" | "warn";
export type Flag = { code: string; severity: Severity; detail?: string };
export type ValidationStatus = "accepted" | "needs_review" | "failed";

export type Proposal = { type: NodeType; slug: string; name: string; source: "model" | "demoted" };

export type ValidatedAnalysis = {
  status: ValidationStatus;
  flags: Flag[];
  analysis: AnalysisDraft;
  proposals: Proposal[];
};

export type ValidationInput = {
  draft: AnalysisDraft;
  question: ReconstructedQuestion;
  expectedType: NodeRef | null;
  answerKey: OptionLabel | null;
  blind: BlindSolution | null;
  extractionFlags: string[];
};

export const minConfidence = 0.7;
export const quoteWindow = 5;

const knownNodes: ReadonlyMap<NodeRef, NodeType> = new Map(knowledgeNodes.map((node) => [ref(node), node.type]));
const collocationMisconception = "misconception:collocation_by_meaning_only" as NodeRef;
const collocationEvidence = new Set<NodeRef>(["distractor_type:collocation_failure", "distractor_type:near_synonym"]);

export const isKnownRef = (value: NodeRef) => knownNodes.has(value);

const tokens = (text: string) => words(text).map((word) => word.toLocaleLowerCase("en"));

export function shingles(text: string, size: number): Set<string> {
  const list = tokens(text);
  const result = new Set<string>();
  for (let i = 0; i + size <= list.length; i += 1) result.add(list.slice(i, i + size).join(" "));
  return result;
}

/** The first run of `size` consecutive words that `note` shares with the item, if any. */
export function quotedRun(note: string, itemText: string, size = quoteWindow): string | null {
  const item = shingles(itemText, size);
  for (const run of shingles(note, size)) if (item.has(run)) return run;
  return null;
}

export const itemText = (question: ReconstructedQuestion) => [question.stimulus ?? "", question.stem, ...optionLabels.map((label) => question.options[label])].join("\n");

const prettyName = (slug: string) => slug.replaceAll("_", " ");

function stripQuotes(note: string, text: string): string {
  let current = note;
  for (let i = 0; i < 8; i += 1) {
    const run = quotedRun(current, text);
    if (!run) return current.replace(/\s+/g, " ").trim();
    current = current.replace(run, " ").replace(/\s+/g, " ").trim();
  }
  return current;
}

function answerConnectors(analysis: AnalysisDraft): NodeRef[] {
  return [
    ...analysis.answer_expresses.filter((value) => value.startsWith("connector:")),
    ...analysis.knowledge.vocabulary.filter((item) => (item.role === "answer" || item.role === "tested") && item.ref?.startsWith("connector:")).map((item) => item.ref!),
  ];
}

function replaceRelation(list: NodeRef[], from: NodeRef, to: NodeRef): NodeRef[] {
  const next = list.map((value) => (value === from ? to : value));
  return next.includes(to) ? next : [...next, to];
}

const rivalRelations = new Set<NodeRef>(["discourse_relation:concession", "discourse_relation:contrast", "discourse_relation:cause", "discourse_relation:result"]);

/** Aligns discourse labels with the Phase 1 connector → relation graph (whereas is contrast, not concession). */
export function alignConnectorRelations(analysis: AnalysisDraft): { analysis: AnalysisDraft; swapped: string[] } {
  const swapped: string[] = [];
  let next = analysis;
  for (const connector of answerConnectors(analysis)) {
    const relation = discourseForConnector(connector);
    if (!relation) continue;
    const swapList = (list: NodeRef[], field: string, insert: boolean) => {
      const rivals = list.filter((value) => rivalRelations.has(value) && value !== relation);
      if (rivals.length) swapped.push(`${field}:${rivals.join(",")}→${relation}`);
      let result = list;
      for (const rival of rivals) result = replaceRelation(result, rival, relation);
      if (insert && !result.includes(relation)) result = [...result, relation];
      return result;
    };
    next = {
      ...next,
      knowledge: {
        ...next.knowledge,
        primary_concepts: swapList(next.knowledge.primary_concepts, "primary", false),
        secondary_concepts: swapList(next.knowledge.secondary_concepts, "secondary", false),
        discourse_relations: swapList(next.knowledge.discourse_relations, "discourse", true),
      },
      answer_expresses: swapList(next.answer_expresses, "answer", true),
      prerequisites: swapList(next.prerequisites, "prerequisite", false),
    };
  }
  return { analysis: next, swapped };
}

function evidencedMisconception(code: NodeRef, distractors: AnalysisDraft["distractors"]): boolean {
  const onDistractor = distractors.some((entry) => entry.misconception === code);
  if (!onDistractor) return false;
  if (code === collocationMisconception) return distractors.some((entry) => entry.misconception === code && collocationEvidence.has(entry.type));
  return true;
}

export function derivedConfidence(input: { flags: Flag[]; blind: BlindSolution | null; extractionFlags: string[] }): number {
  let score = 0.62;
  if (input.blind) score += 0.2 * input.blind.confidence;
  const blocks = input.flags.filter((entry) => entry.severity === "block").length;
  const warns = input.flags.filter((entry) => entry.severity === "warn").length;
  score -= 0.14 * blocks + 0.035 * warns;
  if (input.extractionFlags.includes("single_reading")) score -= 0.04;
  return Math.round(Math.min(0.99, Math.max(0.05, score)) * 1000) / 1000;
}

export function validateAnalysis(input: ValidationInput): ValidatedAnalysis {
  const { draft, question } = input;
  const flags: Flag[] = [];
  const proposals: Proposal[] = draft.proposals.map((entry) => ({ type: entry.type, slug: entry.slug, name: entry.name, source: "model" }));
  const flag = (code: string, severity: Severity, detail?: string) => flags.push({ code, severity, detail });

  const keep = (facet: Facet, value: NodeRef | null): NodeRef | null => {
    if (value == null) return null;
    const type = knownNodes.get(value);
    const allowed = facetTypes[facet] as readonly NodeType[];
    if (!type) {
      const parsed = parseRef(value);
      if (!proposals.some((entry) => entry.type === parsed.type && entry.slug === parsed.slug)) {
        proposals.push({ type: parsed.type, slug: parsed.slug, name: prettyName(parsed.slug), source: "demoted" });
      }
      flag("unknown_ref", "warn", `${facet}: ${value}`);
      return null;
    }
    if (!allowed.includes(type)) {
      flag("wrong_facet_type", "warn", `${facet}: ${value}`);
      return null;
    }
    return value;
  };
  const keepAll = (facet: Facet, values: NodeRef[]) => [...new Set(values.map((value) => keep(facet, value)).filter((value): value is NodeRef => value !== null))];

  let analysis: AnalysisDraft = {
    ...draft,
    knowledge: {
      primary_concepts: keepAll("primary_concept", draft.knowledge.primary_concepts),
      secondary_concepts: keepAll("secondary_concept", draft.knowledge.secondary_concepts),
      grammar: keepAll("grammar", draft.knowledge.grammar),
      vocabulary: draft.knowledge.vocabulary.map((item) => ({ ...item, ref: item.ref && keep("vocabulary", item.ref) })),
      discourse_relations: keepAll("discourse", draft.knowledge.discourse_relations),
    },
    skills: {
      primary: keep("skill_primary", draft.skills.primary),
      secondary: keepAll("skill_secondary", draft.skills.secondary),
      cognitive: keepAll("cognitive", draft.skills.cognitive),
    },
    answer_expresses: keepAll("answer_expresses", draft.answer_expresses),
    misconceptions: keepAll("misconception", draft.misconceptions),
    prerequisites: keepAll("prerequisite", draft.prerequisites),
    distractors: draft.distractors.map((entry) => ({
      ...entry,
      type: keep("distractor_type", entry.type) ?? entry.type,
      expresses: keep("distractor_expresses", entry.expresses),
      targeted_concept: keep("distractor_target", entry.targeted_concept),
      misconception: keep("misconception", entry.misconception),
    })),
  };

  const aligned = alignConnectorRelations(analysis);
  analysis = aligned.analysis;
  if (aligned.swapped.length) flag("connector_relation_aligned", "warn", aligned.swapped.join("; "));

  const droppedMisconceptions: NodeRef[] = [];
  analysis = {
    ...analysis,
    distractors: analysis.distractors.map((entry) => {
      if (entry.misconception && !evidencedMisconception(entry.misconception, [entry, ...analysis.distractors.filter((other) => other !== entry)])) {
        droppedMisconceptions.push(entry.misconception);
        return { ...entry, misconception: null };
      }
      if (entry.misconception === collocationMisconception && !collocationEvidence.has(entry.type)) {
        droppedMisconceptions.push(entry.misconception);
        return { ...entry, misconception: null };
      }
      return entry;
    }),
  };
  analysis = {
    ...analysis,
    misconceptions: analysis.misconceptions.filter((code) => {
      if (evidencedMisconception(code, analysis.distractors)) return true;
      droppedMisconceptions.push(code);
      return false;
    }),
  };
  if (droppedMisconceptions.length) flag("misconception_unevidenced", "warn", [...new Set(droppedMisconceptions)].join(", "));

  if (draft.question_number !== question.number) flag("question_number_mismatch", "block", `${draft.question_number} ≠ ${question.number}`);

  if (!input.expectedType) flag("no_blueprint_band", "block");
  else if (draft.question_type !== input.expectedType) {
    const translationParent = input.expectedType.startsWith("question_type:translation_") && draft.question_type === "question_type:translation";
    flag("question_type_mismatch", translationParent ? "warn" : "block", `${draft.question_type} ≠ ${input.expectedType}`);
  }
  if (input.expectedType) analysis.question_type = input.expectedType;

  if (!input.answerKey) flag("no_answer_key", "block");
  else if (draft.correct_option !== input.answerKey) flag("answer_key_mismatch", "block", `${draft.correct_option} ≠ ${input.answerKey}`);

  if (!input.blind) flag("blind_solve_missing", "block");
  else if (input.answerKey && input.blind.answer !== input.answerKey) flag("blind_solve_mismatch", "block", `${input.blind.answer} ≠ ${input.answerKey}`);

  const correct = input.answerKey ?? draft.correct_option;
  const labels = draft.distractors.map((entry) => entry.label).sort();
  const expectedLabels = optionLabels.filter((label) => label !== correct);
  if (labels.join() !== expectedLabels.join()) flag("distractor_labels", "block", labels.join(""));
  for (const entry of analysis.distractors) {
    if (!isKnownRef(entry.type) || knownNodes.get(entry.type) !== "distractor_type") flag("distractor_type_unknown", "block", `${entry.label}: ${entry.type}`);
  }

  if (analysis.knowledge.primary_concepts.length === 0) flag("no_primary_concept", "block");

  const text = itemText(question);
  analysis = {
    ...analysis,
    learning_objective: stripQuotes(analysis.learning_objective, text),
    distractors: analysis.distractors.map((entry) => ({ ...entry, why_plausible: stripQuotes(entry.why_plausible, text), why_wrong: stripQuotes(entry.why_wrong, text) })),
    ambiguities: analysis.ambiguities.map((entry) => stripQuotes(entry, text)).filter(Boolean),
  };
  if (analysis.learning_objective.length < 8) {
    const concept = analysis.knowledge.primary_concepts[0];
    analysis.learning_objective = concept ? `Recognise ${prettyName(parseRef(concept).slug)}` : "Name the tested concept without quoting the item";
  }

  const notes = [
    ["learning_objective", analysis.learning_objective],
    ...analysis.distractors.flatMap((entry) => [
      [`why_plausible ${entry.label}`, entry.why_plausible],
      [`why_wrong ${entry.label}`, entry.why_wrong],
    ]),
    ...analysis.ambiguities.map((entry, index) => [`ambiguity ${index + 1}`, entry]),
    ...(input.blind ? [["blind rationale", stripQuotes(input.blind.rationale, text)]] : []),
  ];
  for (const [field, note] of notes) {
    const run = quotedRun(note, text);
    if (run) flag("quotes_item", "block", field);
  }

  if (draft.needs_review) flag("model_needs_review", "block");
  if (analysis.ambiguities.length) flag("ambiguity_noted", "warn", String(analysis.ambiguities.length));
  for (const code of input.extractionFlags) flag("extraction_needs_review", "block", code);

  analysis = { ...analysis, confidence: derivedConfidence({ flags, blind: input.blind, extractionFlags: input.extractionFlags }) };

  return { status: flags.some((entry) => entry.severity === "block") ? "needs_review" : "accepted", flags, analysis, proposals };
}
