import { z } from "zod";
import { nodeTypes, type NodeRef, type NodeType } from "@/modules/knowledge/graph";

export const analysisSchemaVersion = "1";

const lemmaPattern = /^[a-z][a-z' -]*$/;
const slugPattern = /^[a-z0-9]+(_[a-z0-9]+)*$/;

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Repairs common model-output slips (uppercase lemmas, hyphenated proposal slugs) before Zod. */
export function coerceAnalysisJson(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const draft = structuredClone(value) as Record<string, unknown>;
  const knowledge = draft.knowledge as { vocabulary?: { lemma?: string }[] } | undefined;
  if (Array.isArray(knowledge?.vocabulary)) {
    for (const item of knowledge.vocabulary) {
      if (typeof item.lemma === "string" && !lemmaPattern.test(item.lemma)) {
        item.lemma = item.lemma
          .toLocaleLowerCase("en")
          .replace(/[^a-z' -]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }
  }
  if (Array.isArray(draft.proposals)) {
    for (const proposal of draft.proposals as { slug?: string }[]) {
      if (typeof proposal.slug === "string" && !slugPattern.test(proposal.slug)) proposal.slug = slugify(proposal.slug);
    }
  }
  return draft;
}

export const optionLabels = ["A", "B", "C", "D", "E"] as const;
export type OptionLabel = (typeof optionLabels)[number];

const unit = z.number().min(0).max(1);

export const nodeRef = z
  .string()
  .regex(/^[a-z_]+:[a-z0-9]+(_[a-z0-9]+)*$/, "expected type:slug")
  .refine((value) => (nodeTypes as readonly string[]).includes(value.slice(0, value.indexOf(":"))), "unknown node type")
  .transform((value) => value as NodeRef);

const refs = z.array(nodeRef).max(12);
const note = z.string().max(600);

export const partsOfSpeech = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "phrase", "phrasal_verb", "other"] as const;
export const vocabularyRoles = ["tested", "answer", "distractor", "key_context"] as const;
export const cognitiveDemands = ["remember", "understand", "apply", "analyze", "evaluate"] as const;
export const transferLevels = ["low", "medium", "high"] as const;
export const difficultyDimensions = ["overall", "lexical", "syntactic", "semantic", "inference", "distractor_similarity", "context_dependency"] as const;
export type DifficultyDimension = (typeof difficultyDimensions)[number];

export const vocabularyItem = z.object({
  lemma: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z' -]*$/, "lowercase lemma"),
  pos: z.enum(partsOfSpeech),
  role: z.enum(vocabularyRoles),
  ref: nodeRef.nullable(),
});

export const distractorAnalysis = z.object({
  label: z.enum(optionLabels),
  type: nodeRef,
  expresses: nodeRef.nullable(),
  targeted_concept: nodeRef.nullable(),
  misconception: nodeRef.nullable(),
  why_plausible: note,
  why_wrong: note,
});

export const proposal = z.object({
  type: z.enum(nodeTypes),
  slug: z
    .string()
    .max(64)
    .regex(/^[a-z0-9]+(_[a-z0-9]+)*$/),
  name: z.string().min(1).max(120),
  reason: note,
});

export const analysisDraft = z.object({
  question_number: z.number().int().min(1).max(200),
  question_type: nodeRef,
  correct_option: z.enum(optionLabels),
  knowledge: z.object({
    primary_concepts: refs,
    secondary_concepts: refs,
    grammar: refs,
    vocabulary: z.array(vocabularyItem).max(15),
    discourse_relations: refs,
  }),
  skills: z.object({ primary: nodeRef.nullable(), secondary: refs, cognitive: refs }),
  difficulty: z.object(Object.fromEntries(difficultyDimensions.map((dimension) => [dimension, unit])) as Record<DifficultyDimension, typeof unit>),
  answer_expresses: refs,
  distractors: z.array(distractorAnalysis).max(4),
  misconceptions: refs,
  prerequisites: refs,
  learning_objective: note,
  pedagogy: z.object({ cognitive_demand: z.enum(cognitiveDemands), transfer_requirement: z.enum(transferLevels) }),
  proposals: z.array(proposal).max(10),
  ambiguities: z.array(note).max(10),
  confidence: unit,
  needs_review: z.boolean(),
});
export type AnalysisDraft = z.infer<typeof analysisDraft>;

export const blindSolution = z.object({
  answer: z.enum(optionLabels),
  confidence: unit,
  rationale: note,
});
export type BlindSolution = z.infer<typeof blindSolution>;

export const transcription = z.object({
  lines: z.array(z.string().max(400)).max(400),
  uncertain: z.array(z.string().max(200)).max(100),
});
export type TranscriptionDraft = z.infer<typeof transcription>;

/** Which node types each analysis field may point at; anything else is demoted to a proposal. */
export const facetTypes = {
  question_type: ["question_type"],
  primary_concept: ["grammar", "grammar_pattern", "discourse_relation", "skill", "connector", "vocabulary", "topic"],
  secondary_concept: ["grammar", "grammar_pattern", "discourse_relation", "skill", "connector", "vocabulary", "topic"],
  grammar: ["grammar", "grammar_pattern"],
  vocabulary: ["vocabulary", "connector"],
  discourse: ["discourse_relation"],
  skill_primary: ["skill"],
  skill_secondary: ["skill"],
  cognitive: ["cognitive_skill"],
  answer_expresses: ["discourse_relation", "connector", "grammar", "grammar_pattern", "vocabulary"],
  misconception: ["misconception"],
  prerequisite: ["grammar", "grammar_pattern", "discourse_relation", "skill", "cognitive_skill", "connector", "vocabulary"],
  distractor_type: ["distractor_type"],
  distractor_expresses: ["discourse_relation", "connector", "grammar", "grammar_pattern", "vocabulary", "skill"],
  distractor_target: ["grammar", "grammar_pattern", "discourse_relation", "skill", "connector", "vocabulary", "cognitive_skill"],
} as const satisfies Record<string, readonly NodeType[]>;
export type Facet = keyof typeof facetTypes;

/** Facets stored in analysis.question_nodes (distractor facets live on analysis.distractors). */
export const questionFacets = [
  "primary_concept",
  "secondary_concept",
  "grammar",
  "vocabulary",
  "discourse",
  "skill_primary",
  "skill_secondary",
  "cognitive",
  "misconception",
  "prerequisite",
  "answer_expresses",
] as const satisfies readonly Facet[];
export type QuestionFacet = (typeof questionFacets)[number];
