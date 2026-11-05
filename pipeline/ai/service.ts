import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { dataRoot } from "../lib/artifacts";
import { analysisDraft, blindSolution, coerceAnalysisJson, transcription } from "@/modules/analysis/contract";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { generatedQuestionCandidate, type GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import { itemAuditReport } from "@/modules/factory/audit";
import { distractorJudgeReport, distractorJudgeReportFor, generatedDistractor } from "@/modules/factory/distractor";
import { itemExplanation } from "@/modules/factory/explanation";
import { judgeReport, optionAcceptability } from "@/modules/factory/judge";
import { experimentGeneration } from "@/modules/factory/experiments";
import { questionSkeleton, skeletonCheckReport } from "@/modules/factory/skeleton";
import { cachedGenerate } from "./cache";
import { AnthropicProvider } from "./anthropic";
import { loadAIConfig, parseModel, sameModel, type AIConfig, type ModelRole, type ProviderName } from "./config";
import { GeminiProvider } from "./gemini";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { OpenRouterProvider } from "./openrouter";
import { acceptabilityPromptVersion, acceptabilityResponseSchema, acceptabilitySystem, acceptabilityUser } from "./prompts/acceptability.v1";
import { analyzerPromptVersion, analyzerResponseSchema, analyzerSystem, analyzerUser } from "./prompts/analyzer.v2";
import { distractorJudgePromptVersion, distractorJudgeResponseSchema, distractorJudgeSystem, distractorJudgeUser } from "./prompts/distractor-judge.v3";
import { distractorJudgeExperimentalPromptVersion, distractorJudgeResponseSchemaFor, distractorJudgeSystemFor, distractorJudgeUserFor } from "./prompts/distractor-judge.v4";
import { distractorPromptVersion, distractorResponseSchema, distractorSystem, distractorUser } from "./prompts/distractor.v4";
import { distractorExperimentalPromptVersion, distractorSystemFor, distractorUserFor } from "./prompts/distractor.v5";
import { distractorRevisionPromptVersion, distractorRevisionSystem, distractorRevisionUser } from "./prompts/distractor.v6";
import { distractorJudgeRevisionPromptVersion, distractorJudgeRevisionSystem, distractorJudgeRevisionUser } from "./prompts/distractor-judge.v6";
import { skeletonCheckPromptVersion, skeletonCheckResponseSchema, skeletonCheckSystem, skeletonCheckUser } from "./prompts/skeleton-check.v1";
import { itemAuditPromptVersion, itemAuditResponseSchema, itemAuditSystem, itemAuditUser } from "./prompts/item-audit.v2";
import { explanationPromptVersion, explanationResponseSchema, explanationSystem, explanationUser } from "./prompts/explanation.v2";
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

const addUsage = (a: Usage, b: Usage): Usage => {
  const sum: Usage = { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens, totalTokens: a.totalTokens + b.totalTokens };
  for (const key of ["cacheWriteTokens", "cacheWrite1hTokens", "cacheReadTokens"] as const) if (a[key] || b[key]) sum[key] = (a[key] ?? 0) + (b[key] ?? 0);
  return sum;
};

/** Strip markdown fences and pull the first balanced `{...}` so truncated prose / reasoning wrappers still parse. */
export function extractJsonText(text: string): string {
  let cleaned = text.trim().replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) return cleaned;
  const start = cleaned.indexOf("{");
  if (start < 0) return cleaned;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return cleaned.slice(start);
}

/** Some OpenRouter models emit 0–5 Likert scores for 0–1 unit fields; rescale before Zod. */
function normalizeUnitScale(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeUnitScale);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (typeof entry === "number" && entry > 1 && entry <= 5) return [key, Math.round((entry / 5) * 1000) / 1000];
      return [key, normalizeUnitScale(entry)];
    }),
  );
}

function parse<T>(text: string, schema: z.ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(extractJsonText(text));
  } catch {
    return { ok: false, error: "output is not valid JSON" };
  }
  const result = schema.safeParse(coerceAnalysisJson(normalizeUnitScale(json)));
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
export function assertIndependent(config: AIConfig, scope: "final" | "distractor" | "skeleton" | "all" = "all") {
  const same = (a: string, b: string) => sameModel(a, b, config.provider);
  const { generator, distractor, distractorJudge, judge } = config.models;
  if (scope === "skeleton") {
    if (same(generator, distractorJudge)) throw new JudgeNotIndependent(generator, "GENERATOR_MODEL", "DISTRACTOR_JUDGE_MODEL");
    return;
  }
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
  const common = { maxRetries: config.maxRetries, ...(config.maxWaitMs !== undefined ? { maxWaitMs: config.maxWaitMs } : {}), onRetry: logRetry };
  switch (name) {
    case "gemini":
      return new GeminiProvider({ apiKey: config.keys.gemini ?? "", ...common });
    case "nvidia":
      return new OpenAICompatibleProvider("nvidia", { apiKey: config.keys.nvidia ?? "", baseUrl: config.nvidiaBaseUrl, ...common });
    case "anthropic":
      return new AnthropicProvider({ apiKey: config.keys.anthropic ?? "", promptCache: config.promptCache ?? "5m", ...common });
    case "openrouter":
      return new OpenRouterProvider({
        apiKey: config.keys.openrouter ?? "",
        baseUrl: config.openrouterBaseUrl,
        promptCache: config.promptCache ?? "5m",
        dataCollection: config.openrouterDataCollection,
        title: "tomo-factory",
        ...common,
      });
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
  const experiments = config.experiments ?? [];
  const generation = experimentGeneration(experiments);
  const salt = config.seed && config.seed > 1 ? { cacheSalt: `seed:${config.seed}` } : {};
  const call = <T>(role: ModelRole, promptVersion: string, schema: z.ZodType<T>, request: Omit<ModelRequest, "model">) => {
    const target = route(config.models[role]);
    const thinking = config.thinking?.[role];
    return structuredCall(target.provider, promptVersion, schema, { ...request, ...(thinking ? { thinking } : {}), ...salt, model: target.model });
  };
  return {
    analyzer: {
      analyze: (input) =>
        call("analyzer", analyzerPromptVersion, analysisDraft, {
          system: analyzerSystem(),
          parts: [{ text: analyzerUser(input) }],
          jsonSchema: analyzerResponseSchema(),
          temperature: 0,
          maxOutputTokens: 16_384,
        }),
    },
    verifier: {
      transcribe: (input) =>
        call("verifier", transcribePromptVersion, transcription, {
          system: transcribeSystem,
          parts: [{ image: { mimeType: "image/png", data: input.image } }, { text: transcribeUser(input.label) }],
          temperature: 0,
          maxOutputTokens: 32_768,
        }),
      solve: (question) =>
        call("verifier", solvePromptVersion, blindSolution, {
          system: solveSystem,
          parts: [{ text: solveUser(question) }],
          temperature: 0,
          maxOutputTokens: 4096,
        }),
    },
    generator: {
      generate: (spec) =>
        call("generator", generatorPromptVersion, generatedQuestionCandidate, {
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
        const blind = await call("judge", solvePromptVersion, blindSolution, {
          system: solveSystem,
          parts: [{ text: solveUser(asItem(candidate)) }],
          temperature: 0,
          maxOutputTokens: 4096,
        });
        const acceptability = await call("judge", acceptabilityPromptVersion, optionAcceptability, {
          system: acceptabilitySystem,
          parts: [{ text: acceptabilityUser(candidate) }],
          jsonSchema: acceptabilityResponseSchema(),
          temperature: 0,
          maxOutputTokens: 4096,
        });
        const report = await call("judge", judgePromptVersion, judgeReport, {
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
        call("generator", skeletonPromptVersion, questionSkeleton, {
          system: skeletonSystem(spec),
          parts: [{ text: skeletonUser(spec, feedback) }],
          jsonSchema: skeletonResponseSchema(),
          temperature: 0.8,
          maxOutputTokens: 2048,
        }),
      checkSkeleton: async (input) => {
        assertIndependent(config, "skeleton");
        return call("distractorJudge", skeletonCheckPromptVersion, skeletonCheckReport, {
          system: skeletonCheckSystem,
          parts: [{ text: skeletonCheckUser(input.spec, input.skeleton) }],
          jsonSchema: skeletonCheckResponseSchema(),
          temperature: 0,
          maxOutputTokens: 1024,
        });
      },
      distractor: (input) =>
        generation === "second"
          ? call("distractor", distractorRevisionPromptVersion, generatedDistractor, {
              system: distractorRevisionSystem(experiments),
              parts: [{ text: distractorRevisionUser({ ...input, experiments }) }],
              jsonSchema: distractorResponseSchema(),
              temperature: 0.8,
              maxOutputTokens: 1024,
            })
          : generation === "first"
          ? call("distractor", distractorExperimentalPromptVersion, generatedDistractor, {
              system: distractorSystemFor(experiments),
              parts: [{ text: distractorUserFor({ ...input, experiments }) }],
              jsonSchema: distractorResponseSchema(),
              temperature: 0.8,
              maxOutputTokens: 1024,
            })
          : call("distractor", distractorPromptVersion, generatedDistractor, {
              system: distractorSystem,
              parts: [{ text: distractorUser(input) }],
              jsonSchema: distractorResponseSchema(),
              temperature: 0.8,
              maxOutputTokens: 1024,
            }),
      judgeDistractor: async (input) => {
        assertIndependent(config, "distractor");
        if (generation === "second")
          return call("distractorJudge", distractorJudgeRevisionPromptVersion, distractorJudgeReportFor(experiments), {
            system: distractorJudgeRevisionSystem(experiments),
            parts: [{ text: distractorJudgeRevisionUser({ ...input, experiments }) }],
            jsonSchema: distractorJudgeResponseSchemaFor(experiments),
            temperature: 0,
            maxOutputTokens: 2048,
          });
        if (generation === "first")
          return call("distractorJudge", distractorJudgeExperimentalPromptVersion, distractorJudgeReportFor(experiments), {
            system: distractorJudgeSystemFor(experiments),
            parts: [{ text: distractorJudgeUserFor({ ...input, experiments }) }],
            jsonSchema: distractorJudgeResponseSchemaFor(experiments),
            temperature: 0,
            maxOutputTokens: 2048,
          });
        return call("distractorJudge", distractorJudgePromptVersion, distractorJudgeReport, {
          system: distractorJudgeSystem,
          parts: [{ text: distractorJudgeUser(input) }],
          jsonSchema: distractorJudgeResponseSchema(),
          temperature: 0,
          maxOutputTokens: 2048,
        });
      },
      explain: (input) =>
        call("explanation", explanationPromptVersion, itemExplanation, {
          system: explanationSystem,
          parts: [{ text: explanationUser(input) }],
          jsonSchema: explanationResponseSchema(),
          temperature: 0.4,
          maxOutputTokens: 4096,
        }),
    },
    audit: {
      item: (input) =>
        call("judge", itemAuditPromptVersion, itemAuditReport, {
          system: itemAuditSystem,
          parts: [{ text: itemAuditUser(input) }],
          jsonSchema: itemAuditResponseSchema(),
          temperature: 0,
          maxOutputTokens: 6144,
        }),
    },
    explainer: { explain: notImplemented("explainer") },
    tutor: { respond: notImplemented("tutor") },
  };
}
