import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { dataRoot } from "../lib/artifacts";
import { analysisDraft, blindSolution, coerceAnalysisJson, transcription } from "@/modules/analysis/contract";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { generatedQuestionCandidate, type GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import { itemAuditReport } from "@/modules/factory/audit";
import { distractorJudgeReport, distractorJudgeReportFor, generatedDistractor, reportFromStandalone, standaloneDistractorReview } from "@/modules/factory/distractor";
import { itemExplanation } from "@/modules/factory/explanation";
import { judgeReport, optionAcceptability } from "@/modules/factory/judge";
import { experimentGeneration } from "@/modules/factory/experiments";
import { distractorPlanOutput, questionSkeleton, relationalPlannerOutput, settleRelationalPlanner, skeletonCheckReport } from "@/modules/factory/skeleton";
import { assignedStrategy } from "@/modules/factory/strategy";
import { cachedGenerate } from "./cache";
import { AnthropicProvider } from "./anthropic";
import { loadAIConfig, parseModel, sameModel, type AIConfig, type ModelRole, type ProviderName } from "./config";
import { GeminiProvider } from "./gemini";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { GatewayProvider } from "./gateway";
import { OpenRouterProvider } from "./openrouter";
import { acceptabilityPromptVersion, acceptabilityResponseSchema, acceptabilitySystem, acceptabilityUser } from "./prompts/acceptability.v1";
import { analyzerPromptVersion, analyzerResponseSchema, analyzerSystem, analyzerUser } from "./prompts/analyzer.v2";
import { distractorJudgePromptVersion, distractorJudgeResponseSchema, distractorJudgeSystem, distractorJudgeUser } from "./prompts/distractor-judge.v3";
import { distractorJudgeExperimentalPromptVersion, distractorJudgeResponseSchemaFor, distractorJudgeSystemFor, distractorJudgeUserFor } from "./prompts/distractor-judge.v4";
import { distractorPromptVersion, distractorResponseSchema, distractorSystem, distractorUser } from "./prompts/distractor.v4";
import { distractorExperimentalPromptVersion, distractorSystemFor, distractorUserFor } from "./prompts/distractor.v5";
import { distractorRevisionPromptVersion, distractorRevisionSystem, distractorRevisionUser } from "./prompts/distractor.v6";
import { distractorJudgeRevisionPromptVersion, distractorJudgeRevisionSystem, distractorJudgeRevisionUser } from "./prompts/distractor-judge.v6";
import { distractorVerdictPromptVersion, distractorVerdictResponseSchema, distractorVerdictSystem, distractorVerdictUser } from "./prompts/distractor-judge.v7";
import { skeletonCheckPromptVersion, skeletonCheckResponseSchema, skeletonCheckSystem, skeletonCheckUser } from "./prompts/skeleton-check.v2";
import { itemAuditPromptVersion, itemAuditResponseSchema, itemAuditSystem, itemAuditUser } from "./prompts/item-audit.v2";
import { explanationPromptVersion, explanationResponseSchema, explanationSystem, explanationUser } from "./prompts/explanation.v2";
import { responseSchema } from "./prompts/schema";
import { generatorPromptVersion, generatorResponseSchema, generatorSystem, generatorUser } from "./prompts/generator.v3";
import { judgePromptVersion, judgeResponseSchema, judgeSystem, judgeUser } from "./prompts/judge.v2";
import { distractorPlanPromptVersion, distractorPlanResponseSchema, distractorPlanSystem, distractorPlanUser, skeletonPromptVersion, skeletonResponseSchema, skeletonSystem, skeletonUser } from "./prompts/skeleton.v2";
import { solvePromptVersion, solveSystem, solveUser, transcribePromptVersion, transcribeSystem, transcribeUser } from "./prompts/verifier.v1";
import type { AIProvider, AIResult, AIRole, AIService, ModelRequest, Usage } from "./types";

export class AIOutputError extends Error {
  constructor(
    message: string,
    readonly finishReason?: string,
    readonly usage?: Usage,
    readonly servedProvider?: string,
    readonly requestHash?: string,
    /** True when every attempt of this call was served from the local cache. A replay is not a new provider request. */
    readonly cached = false,
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
  for (const key of ["cacheWriteTokens", "cacheWrite1hTokens", "cacheReadTokens", "reasoningTokens"] as const) if (a[key] != null || b[key] != null) sum[key] = (a[key] ?? 0) + (b[key] ?? 0);
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

type UnitSchema = { type?: string | string[]; maximum?: number; minimum?: number; properties?: Record<string, UnitSchema>; items?: UnitSchema; anyOf?: UnitSchema[] };

const isUnit = (schema: UnitSchema | undefined) => schema?.type === "number" && schema.minimum === 0 && schema.maximum === 1;

/**
 * Some models answer 0..1 fields on a 0–5 scale. Only fields the schema declares as 0..1 are touched, and only when one
 * of them in the same object is above 1: then every unit field of that object is read on the 0–5 scale, so a "1" there
 * means 0.2, not certainty.
 */
export function normalizeUnitScale(value: unknown, schema: UnitSchema | undefined): unknown {
  if (!schema || value === null || typeof value !== "object") return value;
  const options = schema.anyOf ?? [schema];
  if (Array.isArray(value)) {
    const items = options.find((option) => option.items)?.items;
    return items ? value.map((entry) => normalizeUnitScale(entry, items)) : value;
  }
  const properties = options.find((option) => option.properties)?.properties;
  if (!properties) return value;
  const record = value as Record<string, unknown>;
  const unitKeys = Object.keys(properties).filter((key) => isUnit(properties[key]) && typeof record[key] === "number");
  const likert = unitKeys.some((key) => (record[key] as number) > 1) && unitKeys.every((key) => (record[key] as number) <= 5);
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => {
      if (likert && unitKeys.includes(key)) return [key, Math.round(((entry as number) / 5) * 1000) / 1000];
      return [key, normalizeUnitScale(entry, properties[key])];
    }),
  );
}

const unitSchemas = new WeakMap<z.ZodType, UnitSchema>();
const unitSchemaFor = (schema: z.ZodType): UnitSchema | undefined => {
  if (!unitSchemas.has(schema)) {
    try {
      unitSchemas.set(schema, z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as UnitSchema);
    } catch {
      return undefined;
    }
  }
  return unitSchemas.get(schema);
};

function parse<T>(text: string, schema: z.ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(extractJsonText(text));
  } catch {
    return { ok: false, error: "output is not valid JSON" };
  }
  const result = schema.safeParse(coerceAnalysisJson(normalizeUnitScale(json, unitSchemaFor(schema))));
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
}

/** One JSON call with Zod validation and a single repair attempt; every request is cached by its hash. */
export async function structuredCall<T>(provider: AIProvider, promptVersion: string, schema: z.ZodType<T>, request: ModelRequest): Promise<AIResult<T>> {
  const full: ModelRequest = { ...request, jsonSchema: request.jsonSchema ?? responseSchema(schema) };
  const first = await cachedGenerate(provider, promptVersion, full);
  const bill = (hit: { response: { usage: Usage }; cached: boolean }, total: Usage) => (hit.cached ? total : addUsage(total, hit.response.usage));
  let billed: Usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  billed = bill(first, billed);
  if (first.response.finishReason && declined.has(first.response.finishReason)) {
    throw new AIOutputError(`${promptVersion}: the model declined (${first.response.finishReason})`, first.response.finishReason, billed, first.response.servedProvider, first.requestHash, first.cached);
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
    billed = bill(last, billed);
    outcome = parse(last.response.text, schema);
  }
  const spent = billed.inputTokens + billed.outputTokens + (billed.cacheReadTokens ?? 0) + (billed.cacheWriteTokens ?? 0) + (billed.reasoningTokens ?? 0) > 0;
  if (!outcome.ok) throw new AIOutputError(`${promptVersion}: ${outcome.error}`, last.response.finishReason, spent ? billed : undefined, last.response.servedProvider, last.requestHash, first.cached && last.cached);
  return {
    value: outcome.value,
    provider: provider.name,
    model: last.response.model,
    promptVersion,
    requestHash: last.requestHash,
    usage,
    cached: first.cached && last.cached,
    ...(last.response.finishReason ? { finishReason: last.response.finishReason } : {}),
    ...(last.response.servedProvider ? { servedProvider: last.response.servedProvider } : {}),
  };
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
    case "gateway":
      return new GatewayProvider({
        apiKey: config.keys.gateway ?? "",
        baseUrl: config.gatewayBaseUrl,
        noTraining: config.gatewayNoTraining ?? true,
        ...(config.gatewayOnly?.length ? { only: config.gatewayOnly } : {}),
        tags: ["app:tomo-factory"],
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
  const seedSalt = config.seed && config.seed > 1 ? `seed:${config.seed}` : "";
  const call = <T>(role: ModelRole, promptVersion: string, schema: z.ZodType<T>, request: Omit<ModelRequest, "model">, identity?: string) => {
    const target = route(config.models[role]);
    const thinking = config.thinking?.[role];
    const cacheSalt = [seedSalt, identity].filter(Boolean).join("|");
    return structuredCall(target.provider, promptVersion, schema, { ...request, ...(thinking ? { thinking } : {}), ...(cacheSalt ? { cacheSalt } : {}), model: target.model });
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
      skeleton: async (spec, feedback, avoided = []) => {
        const brief = config.scenarioBriefs?.[spec.id];
        if (config.scenarioBriefs && !brief) throw new Error(`FACTORY_SCENARIO_BRIEFS has no situation for ${spec.id}`);
        const strategy = assignedStrategy(spec);
        const answerFirst = config.productionSequence === "answer_first" && strategy === "relational_inference";
        const sequence = answerFirst ? "answer_first" : "plan_first";
        const request = {
          system: skeletonSystem(spec, sequence),
          parts: [{ text: skeletonUser(spec, feedback, avoided, brief, sequence) }],
          jsonSchema: skeletonResponseSchema(spec.difficulty.band, answerFirst ? null : strategy, sequence),
          temperature: 0.8,
          maxOutputTokens: !answerFirst && strategy === "relational_inference" ? (config.plannerMaxOutputTokens ?? 3072) : 2048,
        };
        if (strategy !== "relational_inference" || answerFirst) return call("generator", skeletonPromptVersion, questionSkeleton, request, spec.id);
        const result = await call("generator", skeletonPromptVersion, relationalPlannerOutput, request, spec.id);
        const settled = settleRelationalPlanner(result.value);
        return { ...result, value: settled };
      },
      planDistractors: async (input) =>
        call("generator", distractorPlanPromptVersion, distractorPlanOutput, {
          system: distractorPlanSystem(),
          parts: [{ text: distractorPlanUser(input.spec, input.skeleton, input.feedback) }],
          jsonSchema: distractorPlanResponseSchema(),
          temperature: 0.4,
          maxOutputTokens: config.plannerMaxOutputTokens ?? 3072,
        }, input.spec.id),
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
        if (config.distractorJudgeStyle === "verdict") {
          const judged = await call("distractorJudge", distractorVerdictPromptVersion, standaloneDistractorReview, {
            system: distractorVerdictSystem,
            parts: [{ text: distractorVerdictUser(input) }],
            jsonSchema: distractorVerdictResponseSchema(),
            temperature: 0,
            maxOutputTokens: 1024,
          });
          return { ...judged, value: reportFromStandalone(judged.value) };
        }
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
