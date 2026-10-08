import type { OptionLabel } from "@/modules/analysis/contract";
import type { DistractorDecisionKind } from "./distractor";
import type { DistractorSpec } from "./distractor-spec";
import type { QuestionSkeleton } from "./skeleton";
import { factoryVersions } from "./versions";

export const generationStates = [
  "DRAFT",
  "SKELETON_GENERATED",
  "SKELETON_VALIDATED",
  "SKELETON_FAILED",
  "DISTRACTORS_GENERATING",
  "DISTRACTORS_VALIDATED",
  "DISTRACTORS_FAILED",
  "EXPLAINED",
  "EXPLANATION_FAILED",
  "ITEM_VALIDATED",
  "ITEM_REJECTED",
  "JUDGED",
  "HUMAN_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export type GenerationState = (typeof generationStates)[number];

/**
 * Legal moves. A failing stage retries itself (self-loop) or ends the item; a failed distractor never sends the
 * item back to the skeleton, and a failed explanation never regenerates the question.
 */
export const generationTransitions: Record<GenerationState, readonly GenerationState[]> = {
  DRAFT: ["SKELETON_GENERATED", "SKELETON_FAILED"],
  SKELETON_GENERATED: ["SKELETON_GENERATED", "SKELETON_VALIDATED", "SKELETON_FAILED"],
  SKELETON_VALIDATED: ["DISTRACTORS_GENERATING"],
  SKELETON_FAILED: [],
  DISTRACTORS_GENERATING: ["DISTRACTORS_VALIDATED", "DISTRACTORS_FAILED"],
  DISTRACTORS_VALIDATED: ["EXPLAINED", "EXPLANATION_FAILED"],
  DISTRACTORS_FAILED: [],
  EXPLAINED: ["ITEM_VALIDATED", "ITEM_REJECTED"],
  EXPLANATION_FAILED: [],
  ITEM_VALIDATED: ["JUDGED"],
  ITEM_REJECTED: [],
  JUDGED: ["HUMAN_REVIEW", "REJECTED"],
  HUMAN_REVIEW: ["HUMAN_REVIEW", "APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
};

export const terminalStates = generationStates.filter((state) => generationTransitions[state].length === 0);

export type AttemptStage = "skeleton" | "distractor" | "explanation";

/** One model call of one stage, with what the checks said about it. Written to provenance. */
export type StageAttempt = {
  stage: AttemptStage;
  option: OptionLabel | null;
  attempt: number;
  model: string;
  promptVersion: string;
  /** Null when the call itself failed (provider error or unparseable output). */
  requestHash: string | null;
  cached: boolean;
  latencyMs: number;
  /** What the call produced: the completed skeleton sentence or the distractor text; null for explanations and failed calls. */
  output: string | null;
  validator: { status: "pass" | "reject"; codes: string[] };
  judge: { model: string; promptVersion: string; requestHash: string; decision: DistractorDecisionKind; failures: string[]; concerns: string[]; reasons: string[] } | null;
  rejectionReason: string | null;
};

export type AcceptedDistractor = { option: OptionLabel; text: string; decision: Exclude<DistractorDecisionKind, "REGENERATE">; attempts: number };

export type GenerationTrace = {
  version: typeof factoryVersions.generation;
  pipelineVersion: typeof factoryVersions.pipeline;
  specId: string;
  state: GenerationState;
  history: { from: GenerationState; to: GenerationState; at: string; note?: string }[];
  attempts: StageAttempt[];
  distractorSpecs: DistractorSpec[];
  skeleton: QuestionSkeleton | null;
  distractors: AcceptedDistractor[];
  failure: string | null;
};

export class IllegalTransition extends Error {
  constructor(from: GenerationState, to: GenerationState) {
    super(`Illegal generation transition ${from} → ${to}`);
  }
}

export function newTrace(specId: string): GenerationTrace {
  return { version: factoryVersions.generation, pipelineVersion: factoryVersions.pipeline, specId, state: "DRAFT", history: [], attempts: [], distractorSpecs: [], skeleton: null, distractors: [], failure: null };
}

export function advance(trace: GenerationTrace, to: GenerationState, at: string, note?: string): GenerationTrace {
  if (!generationTransitions[trace.state].includes(to)) throw new IllegalTransition(trace.state, to);
  return { ...trace, state: to, history: [...trace.history, { from: trace.state, to, at, ...(note ? { note } : {}) }] };
}

export const isTerminal = (state: GenerationState) => terminalStates.includes(state);
