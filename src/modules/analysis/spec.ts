import type { NodeRef } from "@/modules/knowledge/graph";
import type { DifficultyDimension } from "./contract";

/** A generator request is always built from this, never from "give me a YDS question". */
export type QuestionSpec = {
  questionType: NodeRef;
  primaryConcepts: NodeRef[];
  secondaryConcepts: NodeRef[];
  targetSkill: NodeRef;
  cognitiveSkill: NodeRef;
  targetMisconception?: NodeRef;
  distractorPlan: NodeRef[];
  difficulty: { band: "easy" | "medium" | "hard"; cefr?: "B1" | "B2" | "C1"; factors: Partial<Record<DifficultyDimension, number>> };
  dnaBasis: { documentIds: string[]; statistic: string };
  groundingSourceDocumentIds?: string[];
  constraints: { singleCorrectAnswer: true; avoidUnintendedClues: true; originalContent: true };
};
