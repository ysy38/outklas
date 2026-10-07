import { parseRef, ref, type NodeRef, type NodeType } from "@/modules/knowledge/graph";
import { knowledgeNodes } from "@/modules/knowledge/seed";
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
export const quoteWindow = 6;

const knownNodes: ReadonlyMap<NodeRef, NodeType> = new Map(knowledgeNodes.map((node) => [ref(node), node.type]));

export const isKnownRef = (value: NodeRef) => knownNodes.has(value);

const tokens = (text: string) => words(text).map((word) => word.toLocaleLowerCase("en"));

function shingles(text: string, size: number): Set<string> {
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

  const analysis: AnalysisDraft = {
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
  const notes = [
    ["learning_objective", draft.learning_objective],
    ...draft.distractors.flatMap((entry) => [
      [`why_plausible ${entry.label}`, entry.why_plausible],
      [`why_wrong ${entry.label}`, entry.why_wrong],
    ]),
    ...draft.ambiguities.map((entry, index) => [`ambiguity ${index + 1}`, entry]),
    ...(input.blind ? [["blind rationale", input.blind.rationale]] : []),
  ];
  for (const [field, note] of notes) {
    const run = quotedRun(note, text);
    if (run) flag("quotes_item", "block", field);
  }

  if (draft.confidence < minConfidence) flag("low_confidence", "block", String(draft.confidence));
  if (draft.needs_review) flag("model_needs_review", "block");
  if (draft.ambiguities.length) flag("ambiguity_noted", "warn", String(draft.ambiguities.length));
  for (const code of input.extractionFlags) flag("extraction_needs_review", "block", code);

  return { status: flags.some((entry) => entry.severity === "block") ? "needs_review" : "accepted", flags, analysis, proposals };
}
