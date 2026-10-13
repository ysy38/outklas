import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { dataRoot } from "../lib/artifacts";
import { analysisDraft, blindSolution, coerceAnalysisJson, transcription } from "@/modules/analysis/contract";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { generatedQuestionCandidate, type GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import { distractorJudgeReport, generatedDistractor } from "@/modules/factory/distractor";
import { itemExplanation } from "@/modules/factory/explanation";
import { judgeReport, optionAcceptability } from "@/modules/factory/judge";
import { questionSkeleton } from "@/modules/factory/skeleton";
import { cachedGenerate } from "./cache";
import { AnthropicProvider } from "./anthropic";
import { loadAIConfig, parseModel, sameModel, type AIConfig, type ProviderName } from "./config";
import { GeminiProvider } from "./gemini";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { acceptabilityPromptVersion, acceptabilityResponseSchema, acceptabilitySystem, acceptabilityUser } from "./prompts/acceptability.v1";
import { analyzerPromptVersion, analyzerResponseSchema, analyzerSystem, analyzerUser } from "./prompts/analyzer.v2";
import { distractorJudgePromptVersion, distractorJudgeResponseSchema, distractorJudgeSystem, distractorJudgeUser } from "./prompts/distractor-judge.v1";
import { distractorPromptVersion, distractorResponseSchema, distractorSystem, distractorUser } from "./prompts/distractor.v1";
import { explanationPromptVersion, explanationResponseSchema, explanationSystem, explanationUser } from "./prompts/explanation.v1";
import { responseSchema } from "./prompts/schema";
import { generatorPromptVersion, generatorResponseSchema, generatorSystem, generatorUser } from "./prompts/generator.v3";
import { judgePromptVersion, judgeResponseSchema, judgeSystem, judgeUser } from "./prompts/judge.v2";
import { skeletonPromptVersion, skeletonResponseSchema, skeletonSystem, skeletonUser } from "./prompts/skeleton.v1";
import { solvePromptVersion, solveSystem, solveUser, transcribePromptVersion, transcribeSystem, transcribeUser } from "./prompts/verifier.v1";
import type { AIProvider, AIResult, AIRole, AIService, ModelRequest, Usage } from "./types";

export class AIOutputError extends Error {
  constructor(
    message: string,
    readonly finishReason?: string,
  ) {
    super(message);
  }
}

/** Finish reasons where asking again cannot help: the provider declined to produce the content. */
const declined = new Set(["RECITATION", "SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "REFUSAL", "CONTENT_FILTER"]);

export class NotImplementedRole extends Error {
  constructor(role: AIRole) {
    super(`The ${role} role is not implemented in Phase 2.`);
  }
}

const notImplemented = (role: AIRole) => async (): Promise<never> => {
  throw new NotImplementedRole(role);
};

const addUsage = (a: Usage, b: Usage): Usage => ({ inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens, totalTokens: a.totalTokens + b.totalTokens });

function parse<T>(text: string, schema: z.ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, error: "output is not valid JSON" };
  }
  const result = schema.safeParse(coerceAnalysisJson(json));
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
}

/** One JSON call with Zod validation and a single repair attempt; every request is cached by its hash. */
export async function structuredCall<T>(provider: AIProvider, promptVersion: string, schema: z.ZodType<T>, request: ModelRequest): Promise<AIResult<T>> {
  const full: ModelRequest = { ...request, jsonSchema: request.jsonSchema ?? responseSchema(schema) };
  const first = await cachedGenerate(provider, promptVersion, full);
  if (first.response.finishReason && declined.has(first.response.finishReason)) {
    throw new AIOutputError(`${promptVersion}: the model declined (${first.response.finishReason})`, first.response.finishReason);
  }
  let usage = first.response.usage;
  let outcome = parse(first.response.text, schema);
  let last = first;
  if (!outcome.ok) {
    const repair: ModelRequest = {
      ...full,
      parts: [...full.parts, { text: `Your previous output:\n${first.response.text.slice(0, 20_000)}\n\nIt was rejected: ${outcome.error}. Return the corrected JSON only.` }],
    };
    last = await cachedGenerate(provider, promptVersion, repair);
    usage = addUsage(usage, last.response.usage);
    outcome = parse(last.response.text, schema);
  }
  if (!outcome.ok) throw new AIOutputError(`${promptVersion}: ${outcome.error}`, last.response.finishReason);
  return { value: outcome.value, provider: provider.name, model: last.response.model, promptVersion, requestHash: last.requestHash, usage, cached: first.cached && last.cached };
}

/** Retries are logged for the pilot's pipeline-error count; the key never appears in them. */
function logRetry(event: object) {
  const dir = path.join(dataRoot(), "logs");
  mkdirSync(dir, { recursive: true });
  appendFileSync(path.join(dir, "ai-retries.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`);
}

export class JudgeNotIndependent extends Error {
  constructor(model: string, writer = "GENERATOR_MODEL", judge = "JUDGE_MODEL") {
    super(`${writer} and ${judge} are both ${model}; the judge must be a different model.`);
  }
}

/** Throws when a writer would check its own output. Shared by the service and the slice runner. */
export function assertIndependent(config: AIConfig, scope: "final" | "distractor" | "all" = "all") {
  const same = (a: string, b: string) => sameModel(a, b, config.provider);
  const { generator, distractor, distractorJudge, judge } = config.models;
  if (scope !== "distractor") {
    if (same(generator, judge)) throw new JudgeNotIndependent(judge);
    if (same(distractor, judge)) throw new JudgeNotIndependent(judge, "DISTRACTOR_MODEL", "FINAL_JUDGE_MODEL");
  }
  if (scope !== "final" && same(distractor, distractorJudge)) throw new JudgeNotIndependent(distractor, "DISTRACTOR_MODEL", "DISTRACTOR_JUDGE_MODEL");
}

/** The judge's blind solve reads the candidate the way a learner would: stem and options, no key. */
const asItem = (candidate: GeneratedQuestionCandidate): ReconstructedQuestion => ({
  number: 1,
  section: "sentence",
  layout: "blank",
  stimulusKey: null,
  stimulus: null,
  stem: candidate.question.stem,
  options: candidate.question.options,
  translationDirection: null,
});

export function createProvider(config: AIConfig, name: ProviderName = config.provider): AIProvider {
  const common = { maxRetries: config.maxRetries, onRetry: logRetry };
  switch (name) {
    case "gemini":
      return new GeminiProvider({ apiKey: config.keys.gemini ?? "", ...common });
    case "nvidia":
      return new OpenAICompatibleProvider("nvidia", { apiKey: config.keys.nvidia ?? "", baseUrl: config.nvidiaBaseUrl, ...common });
    case "anthropic":
      return new AnthropicProvider({ apiKey: config.keys.anthropic ?? "", ...common });
  }
}

export type ProviderSet = AIProvider | Partial<Record<ProviderName, AIProvider>>;

/** Providers are built on first use, so a missing key only matters for a role that needs it. */
export function providerRouter(config: AIConfig, given?: ProviderSet, wrap: (provider: AIProvider) => AIProvider = (provider) => provider) {
  const built = new Map<ProviderName, AIProvider>();
  return (setting: string): { provider: AIProvider; model: string } => {
    const { provider: name, model } = parseModel(setting, config.provider);
    if (given && "generate" in given) return { provider: given as AIProvider, model };
    if (!built.has(name)) built.set(name, wrap((given as Partial<Record<ProviderName, AIProvider>> | undefined)?.[name] ?? createProvider(config, name)));
    return { provider: built.get(name)!, model };
  };
}

export function createAIService(config: AIConfig = loadAIConfig(), providers?: ProviderSet | ReturnType<typeof providerRouter>): AIService {
  const route = typeof providers === "function" ? providers : providerRouter(config, providers);
  const call = <T>(setting: string, promptVersion: string, schema: z.ZodType<T>, request: Omit<ModelRequest, "model">) => {
    const target = route(setting);
    return structuredCall(target.provider, promptVersion, schema, { ...request, model: target.model });
  };
  return {
    analyzer: {
      analyze: (input) =>
        call(config.models.analyzer, analyzerPromptVersion, analysisDraft, {
          system: analyzerSystem(),
          parts: [{ text: analyzerUser(input) }],
          jsonSchema: analyzerResponseSchema(),
          temperature: 0,
          maxOutputTokens: 16_384,
        }),
    },
    verifier: {
      transcribe: (input) =>
        call(config.models.verifier, transcribePromptVersion, transcription, {
          system: transcribeSystem,
          parts: [{ image: { mimeType: "image/png", data: input.image } }, { text: transcribeUser(input.label) }],
          temperature: 0,
          maxOutputTokens: 32_768,
        }),
      solve: (question) =>
        call(config.models.verifier, solvePromptVersion, blindSolution, {
          system: solveSystem,
          parts: [{ text: solveUser(question) }],
          temperature: 0,
          maxOutputTokens: 4096,
        }),
    },
    generator: {
      generate: (spec) =>
        call(config.models.generator, generatorPromptVersion, generatedQuestionCandidate, {
          system: generatorSystem(spec),
          parts: [{ text: generatorUser(spec) }],
          jsonSchema: generatorResponseSchema(),
          temperature: 0.8,
          maxOutputTokens: 8192,
        }),
    },
    judge: {
      evaluate: async (candidate, spec, validation, distractorChecks) => {
        assertIndependent(config, "final");
        const blind = await call(config.models.judge, solvePromptVersion, blindSolution, {
          system: solveSystem,
          parts: [{ text: solveUser(asItem(candidate)) }],
          temperature: 0,
          maxOutputTokens: 4096,
        });
        const acceptability = await call(config.models.judge, acceptabilityPromptVersion, optionAcceptability, {
          system: acceptabilitySystem,
          parts: [{ text: acceptabilityUser(candidate) }],
          jsonSchema: acceptabilityResponseSchema(),
          temperature: 0,
          maxOutputTokens: 4096,
        });
        const report = await call(config.models.judge, judgePromptVersion, judgeReport, {
          system: judgeSystem,
          parts: [{ text: judgeUser({ spec, candidate, validation, distractorChecks }) }],
          jsonSchema: judgeResponseSchema(),
          temperature: 0,
          maxOutputTokens: 4096,
        });
        return { blind, acceptability, report };
      },
    },
    factory: {
      skeleton: (spec, feedback) =>
        call(config.models.generator, skeletonPromptVersion, questionSkeleton, {
          system: skeletonSystem(spec),
          parts: [{ text: skeletonUser(spec, feedback) }],
          jsonSchema: skeletonResponseSchema(),
          temperature: 0.8,
          maxOutputTokens: 2048,
        }),
      distractor: (input) =>
        call(config.models.distractor, distractorPromptVersion, generatedDistractor, {
          system: distractorSystem,
          parts: [{ text: distractorUser(input) }],
          jsonSchema: distractorResponseSchema(),
          temperature: 0.8,
          maxOutputTokens: 1024,
        }),
      judgeDistractor: async (input) => {
        assertIndependent(config, "distractor");
        return call(config.models.distractorJudge, distractorJudgePromptVersion, distractorJudgeReport, {
          system: distractorJudgeSystem,
          parts: [{ text: distractorJudgeUser(input) }],
          jsonSchema: distractorJudgeResponseSchema(),
          temperature: 0,
          maxOutputTokens: 2048,
        });
      },
      explain: (input) =>
        call(config.models.explanation, explanationPromptVersion, itemExplanation, {
          system: explanationSystem,
          parts: [{ text: explanationUser(input) }],
          jsonSchema: explanationResponseSchema(),
          temperature: 0.4,
          maxOutputTokens: 4096,
        }),
    },
    explainer: { explain: notImplemented("explainer") },
    tutor: { respond: notImplemented("tutor") },
  };
}
