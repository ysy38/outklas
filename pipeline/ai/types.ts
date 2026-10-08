import type { AnalysisDraft, BlindSolution, TranscriptionDraft } from "@/modules/analysis/contract";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import type { GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import type { JudgeReport } from "@/modules/factory/judge";
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

export type JudgeEvaluation = { blind: AIResult<BlindSolution>; report: AIResult<JudgeReport> };

/** Separate prompt and model from Generator: its job is to prove the candidate is bad. It solves blind first. */
export interface Judge {
  evaluate(candidate: GeneratedQuestionCandidate, spec: QuestionSpec, validation: CandidateValidation): Promise<JudgeEvaluation>;
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
  explainer: Explainer;
  tutor: Tutor;
};
