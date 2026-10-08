import { z } from "zod";
import { nodeRef, optionLabels } from "@/modules/analysis/contract";
import { structuralFormats } from "@/modules/analysis/surface";
import { factoryVersions } from "./versions";

const refs = z.array(nodeRef).max(12);
const wordRange = z.object({ min: z.number().int().min(1), max: z.number().int().min(1) });

export const difficultyBands = ["easy", "medium", "hard"] as const;
export const cefrLevels = ["B1", "B2", "C1"] as const;

export const distractorSlot = z.object({
  option: z.enum(optionLabels),
  distractorType: nodeRef,
  /** The discourse relation this wrong option must express (by its connector). */
  expresses: nodeRef.nullable(),
  /** Connectors this option may open with; empty when the shape has no connector. */
  connectors: refs,
  misconception: nodeRef.nullable(),
});
export type DistractorSlot = z.infer<typeof distractorSlot>;

/**
 * The deterministic contract a generator request is built from. Every field changes what is generated or how it is
 * validated; the model never edits it. Built only by the spec engine from the exam profile and the canonical graph.
 */
export const questionSpec = z.object({
  version: z.literal(factoryVersions.questionSpec),
  id: z.string().regex(/^[a-z0-9_.-]+$/),
  exam: z.literal("yds"),
  knowledgeVersion: z.string(),
  questionType: nodeRef,
  questionFamily: z.string().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/),
  structuralFormat: z.enum(structuralFormats),
  primaryConcept: nodeRef,
  secondaryConcepts: refs,
  targetSkill: nodeRef,
  cognitiveSkill: nodeRef,
  difficulty: z.object({ band: z.enum(difficultyBands), cefr: z.enum(cefrLevels), target: z.number().min(0).max(1) }),
  requiredKnowledge: refs,
  targetMisconception: nodeRef.nullable(),
  discourseRelation: nodeRef.nullable(),
  grammarPattern: nodeRef.nullable(),
  vocabularyConstraints: z.object({
    register: z.literal("academic"),
    cefrCeiling: z.enum(cefrLevels),
    /** Words that would give a wrong option the target relation, or leak the answer; never allowed in distractors. */
    forbiddenInDistractors: z.array(z.string()).max(20),
  }),
  distractorPlan: z.array(distractorSlot).length(4),
  contextConstraints: z.object({
    domain: z.string().regex(/^[a-z_]+$/),
    blankPosition: z.enum(["start", "end"]),
    stemWords: wordRange,
    optionWords: wordRange,
    sentences: z.literal(1),
  }),
  originalityConstraints: z.object({ maxSharedRun: z.number().int().min(3), historicalTextInPrompt: z.literal(false), fewShotFromHistory: z.literal(false) }),
  answerConstraints: z.object({ correctOption: z.enum(optionLabels), connectors: refs, singleDefensibleAnswer: z.literal(true) }),
  explanationRequirements: z.object({ language: z.literal("tr"), address: z.literal("sen"), maxWords: z.number().int(), mustName: z.array(z.enum(["correct_connector", "relation", "each_distractor_failure"])) }),
  evidenceReferences: z.object({ dnaVersion: z.string(), profileVersion: z.string(), documents: z.array(z.string()), family: z.object({ questions: z.number().int(), documents: z.number().int(), level: z.string() }), misconception: z.object({ labelled: z.number().int(), consistent: z.number().int() }).nullable() }),
  generationConstraints: z.object({ singleCorrectAnswer: z.literal(true), avoidUnintendedClues: z.literal(true), originalContent: z.literal(true), noNewTaxonomy: z.literal(true) }),
});
export type QuestionSpec = z.infer<typeof questionSpec>;
