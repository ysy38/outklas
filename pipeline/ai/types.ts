import type { AnalysisDraft, BlindSolution, TranscriptionDraft } from "@/modules/analysis/contract";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import type { GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import type { DistractorJudgeReport, GeneratedDistractor } from "@/modules/factory/distractor";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import type { ItemCore, ItemExplanation } from "@/modules/factory/explanation";
import type { QuestionSkeleton } from "@/modules/factory/skeleton";
import type { NodeRef } from "@/modules/knowledge/graph";
import type { DistractorCheckSummary } from "./prompts/judge.v2";
import type { JudgeReport, OptionAcceptability } from "@/modules/factory/judge";
import type { QuestionSpec } from "@/modules/factory/spec";
import type { CandidateValidation } from "@/modules/factory/validator";

export const aiRoles = ["analyzer", "verifier", "generator", "judge", "explainer", "tutor"] as const;
export type AIRole = (typeof aiRoles)[number];

export type Part = { text: string } | { image: { mimeType: "image/png" | "image/jpeg"; data: Uint8Array } };

export type ModelRequest = {
  model: string;
  system?: string;
  parts: Part[];
  /** JSON Schema the provider should constrain output to; the result is still validated with Zod. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
};

export type Usage = { inputTokens: number; outputTokens: number; totalTokens: number };

export type ModelResponse = { text: string; model: string; usage: Usage; finishReason?: string };

/** Transport only: no prompts, no roles. Adding OpenAI or Claude means adding one of these. */
export interface AIProvider {
  readonly name: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}

export type AIResult<T> = {
  value: T;
  provider: string;
  model: string;
  promptVersion: string;
  requestHash: string;
  usage: Usage;
  cached: boolean;
};

export type AnalyzerInput = { question: ReconstructedQuestion; questionType: string; answerKey: string; examLabel: string };

export interface Analyzer {
  analyze(input: AnalyzerInput): Promise<AIResult<AnalysisDraft>>;
}

export type TranscribeInput = { image: Uint8Array; label: string };

export interface Verifier {
  /** Reads a page image independently of Tesseract; the raw OCR artifact is never touched. */
  transcribe(input: TranscribeInput): Promise<AIResult<TranscriptionDraft>>;
  /** Solves without the answer key, so disagreement with the key flags extraction or ambiguity problems. */
  solve(question: ReconstructedQuestion): Promise<AIResult<BlindSolution>>;
}

/** Builds a draft candidate from a QuestionSpec only; it never sees historical item text. */
export interface Generator {
  generate(spec: QuestionSpec): Promise<AIResult<GeneratedQuestionCandidate>>;
}

export type JudgeEvaluation = { blind: AIResult<BlindSolution>; acceptability: AIResult<OptionAcceptability>; report: AIResult<JudgeReport> };

/** Separate prompt and model from Generator: its job is to prove the candidate is bad. Both blind steps run before it sees the key. */
export interface Judge {
  evaluate(candidate: GeneratedQuestionCandidate, spec: QuestionSpec, validation: CandidateValidation, distractorChecks?: DistractorCheckSummary[]): Promise<JudgeEvaluation>;
}

/**
 * The atomic question factory: each stage is its own call with only the inputs it needs. None of them can change
 * the spec, the answer position or the taxonomy; their outputs are text that deterministic code places and checks.
 */
export interface ItemFactory {
  skeleton(spec: QuestionSpec, feedback: string[]): Promise<AIResult<QuestionSkeleton>>;
  distractor(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; usedConnectors: NodeRef[]; feedback: string[] }): Promise<AIResult<GeneratedDistractor>>;
  judgeDistractor(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; text: string }): Promise<AIResult<DistractorJudgeReport>>;
  explain(input: { spec: QuestionSpec; core: ItemCore; dspecs: DistractorSpec[]; feedback: string[] }): Promise<AIResult<ItemExplanation>>;
}
export type Evaluator = Judge;

export interface Explainer {
  explain(questionId: string, learnerAnswer: string): Promise<AIResult<never>>;
}

export interface Tutor {
  respond(sessionId: string, message: string): Promise<AIResult<never>>;
}

export type AIService = {
  analyzer: Analyzer;
  verifier: Verifier;
  generator: Generator;
  judge: Judge;
  factory: ItemFactory;
  explainer: Explainer;
  tutor: Tutor;
};
