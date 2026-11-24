import type { AnalysisDraft, BlindSolution, TranscriptionDraft } from "@/modules/analysis/contract";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import type { OptionLabel } from "@/modules/analysis/contract";
import type { ItemAuditReport } from "@/modules/factory/audit";
import type { GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import type { ExperimentalJudgeReport, GeneratedDistractor, LexicalDiagnostics } from "@/modules/factory/distractor";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import type { ItemCore, ItemExplanation } from "@/modules/factory/explanation";
import type { DifficultyStrategy, DistractorBlueprint, PlannerDecline, QuestionSkeleton, SkeletonCheckReport } from "@/modules/factory/skeleton";
import type { NodeRef } from "@/modules/knowledge/graph";
import type { DistractorCheckSummary } from "./prompts/judge.v2";
import type { JudgeReport, OptionAcceptability } from "@/modules/factory/judge";
import type { QuestionSpec } from "@/modules/factory/spec";
import type { CandidateValidation } from "@/modules/factory/validator";

export const aiRoles = ["analyzer", "verifier", "generator", "judge", "explainer", "tutor"] as const;
export type AIRole = (typeof aiRoles)[number];

export type Part = { text: string } | { image: { mimeType: "image/png" | "image/jpeg"; data: Uint8Array } };

export const thinkingLevels = ["minimal", "low", "medium", "high"] as const;
export type ThinkingLevel = (typeof thinkingLevels)[number];

export type ModelRequest = {
  model: string;
  system?: string;
  parts: Part[];
  /** JSON Schema the provider should constrain output to; the result is still validated with Zod. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  /** Gemini 3+ thinking depth (thinkingConfig.thinkingLevel); other providers ignore it. Unset sends nothing. */
  thinking?: ThinkingLevel;
  /**
   * OpenRouter-only. Unset keeps the provider default (existing: exclude=true on OpenRouter).
   * `disabled` is documented effort none. `existing` is exclude=true and is not a disable switch.
   */
  reasoningProfile?: "disabled" | "low" | "default" | "existing";
  /** Part of the cache key only, never sent: lets a second benchmark seed make fresh calls for an identical request. */
  cacheSalt?: string;
};

/**
 * `inputTokens` is the uncached input. Providers with prompt caching report the cached prefix separately: tokens
 * written to the cache (`cacheWrite1hTokens` is the part written with a one-hour lifetime) and tokens read from it.
 */
export type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheWriteTokens?: number;
  cacheWrite1hTokens?: number;
  cacheReadTokens?: number;
  /** Present only when the provider reports a reasoning-token field. Never inferred from the visible output. */
  reasoningTokens?: number;
};

export type ModelResponse = {
  text: string;
  model: string;
  usage: Usage;
  finishReason?: string;
  servedProvider?: string;
  /** Visible message.content after think-tag strip. Empty when the model spent the turn on hidden reasoning. */
  contentText?: string;
  /** Hidden reasoning text when the provider returns it. Never used to infer a token count. */
  reasoningText?: string;
};

/** Transport only: no prompts, no roles. Adding OpenAI or Claude means adding one of these. */
export interface AIProvider {
  readonly name: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
  /**
   * Controls the provider adds when it sends the request, such as a reasoning default or a token floor.
   * They belong in the cache key and are not sent a second time.
   */
  wireIdentity?(request: ModelRequest): Record<string, unknown>;
}

export type AIResult<T> = {
  value: T;
  provider: string;
  model: string;
  promptVersion: string;
  requestHash: string;
  usage: Usage;
  cached: boolean;
  finishReason?: string;
  servedProvider?: string;
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
  skeleton(spec: QuestionSpec, feedback: string[], avoided?: string[]): Promise<AIResult<QuestionSkeleton | PlannerDecline>>;
  /** Independent semantic check of the stem and key before any distractor is written (skeleton gate). */
  checkSkeleton?(input: { spec: QuestionSpec; skeleton: QuestionSkeleton }): Promise<AIResult<SkeletonCheckReport>>;
  /** answer_first only: four wrong beliefs for an accepted stem and correct continuation. Same generator role. */
  planDistractors?(input: { spec: QuestionSpec; skeleton: QuestionSkeleton; feedback: string[] }): Promise<AIResult<{ distractorBlueprints: DistractorBlueprint[] }>>;
  distractor(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; usedConnectors: NodeRef[]; feedback: string[]; strategy?: DifficultyStrategy | null; blueprints?: QuestionSkeleton["distractorBlueprints"] }): Promise<AIResult<GeneratedDistractor>>;
  judgeDistractor(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; text: string; lexical?: LexicalDiagnostics; strategy?: DifficultyStrategy | null }): Promise<AIResult<ExperimentalJudgeReport>>;
  explain(input: { spec: QuestionSpec; core: ItemCore; dspecs: DistractorSpec[]; feedback: string[] }): Promise<AIResult<ItemExplanation>>;
}
export type Evaluator = Judge;

/** Post-hoc benchmark audit of a finished item; blind to key, labels and variant. Never changes a verdict. */
export interface ItemAuditor {
  item(input: { stem: string; options: Record<OptionLabel, string>; targetRelation: NodeRef | null }): Promise<AIResult<ItemAuditReport>>;
}

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
  audit?: ItemAuditor;
  explainer: Explainer;
  tutor: Tutor;
};
