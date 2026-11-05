import { parseExperiments, type FactoryExperiment } from "@/modules/factory/experiments";
import { defaultFactoryThresholds, type FactoryThresholds } from "@/modules/factory/thresholds";
import { promptCacheModes, type PromptCacheMode } from "./anthropic";
import { loadSpendLimits, type SpendLimits } from "./budget";
import { openrouterDataPolicies, type OpenRouterDataPolicy } from "./openrouter";
import { loadPrices, type Prices } from "./prices";
import { thinkingLevels, type ThinkingLevel } from "./types";

export type ModelRole = "analyzer" | "verifier" | "generator" | "distractor" | "distractorJudge" | "judge" | "explanation";

/**
 * The only place model names live. Chosen from ListModels and live probes on 2026-10-07; see
 * docs/architecture/phase-2-plan.md §2 and docs/analysis/phase-2.1-report.md. Analyzer and verifier
 * stay on different models so the blind solve is independent of the analysis pass; every factory writer
 * (generator, distractor) is checked by a different model (distractorJudge, judge). Factory roles run on
 * Claude since the 2026-10-13 comparison slices (Haiku writes, Sonnet judges).
 */
export const modelDefaults: Record<ModelRole, string> = {
  analyzer: "gemini-3.1-flash-lite",
  verifier: "gemini-flash-lite-latest",
  generator: "anthropic:claude-haiku-5-5",
  distractor: "anthropic:claude-haiku-5-5",
  distractorJudge: "anthropic:claude-sonnet-5-5",
  judge: "anthropic:claude-sonnet-5-5",
  explanation: "anthropic:claude-haiku-5-5",
};

/** Non-ÖSYM health probes. Order: requested Pro preview, then working Flash defaults. */
export const smokeModels = [
  "gemini-3.1-pro-preview",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
] as const;

/** Env names per role; the first set name wins (FINAL_JUDGE_MODEL is the factory name for JUDGE_MODEL). */
const modelEnv: Record<ModelRole, string[]> = {
  analyzer: ["ANALYZER_MODEL"],
  verifier: ["VERIFIER_MODEL"],
  generator: ["GENERATOR_MODEL"],
  distractor: ["DISTRACTOR_MODEL"],
  distractorJudge: ["DISTRACTOR_JUDGE_MODEL"],
  judge: ["FINAL_JUDGE_MODEL", "JUDGE_MODEL"],
  explanation: ["EXPLANATION_MODEL"],
};

const thresholdEnv: Record<keyof FactoryThresholds, string> = {
  distractorAcceptability: "DISTRACTOR_ACCEPTABILITY_THRESHOLD",
  answerReuseTokenOverlap: "ANSWER_REUSE_TOKEN_OVERLAP",
  answerReuseTrigramOverlap: "ANSWER_REUSE_TRIGRAM_OVERLAP",
  answerReuseTokenWarn: "ANSWER_REUSE_TOKEN_WARN",
  answerSharedContentWords: "ANSWER_SHARED_CONTENT_WORDS",
  stemSharedContentWords: "STEM_SHARED_CONTENT_WORDS",
  stemCopiedShare: "STEM_COPIED_SHARE",
  copiedPhraseWords: "COPIED_PHRASE_WORDS",
};

export const providers = ["gemini", "nvidia", "anthropic", "openrouter"] as const;
export type ProviderName = (typeof providers)[number];

/**
 * A model setting is `provider:model` (`nvidia:nvidia/nemotron-3-super-120b-a12b`, `anthropic:claude-haiku-5-5`,
 * `openrouter:google/gemini-3.8-flash:batch`) or a bare name for the default provider, so existing Gemini settings,
 * provenance and caches keep their meaning. The first `:` separates provider from model; `/` and a trailing `:batch`
 * stay inside the model id.
 */
export function parseModel(setting: string, fallback: ProviderName = "gemini"): { provider: ProviderName; model: string } {
  const prefix = setting.slice(0, setting.indexOf(":"));
  return (providers as readonly string[]).includes(prefix) ? { provider: prefix as ProviderName, model: setting.slice(prefix.length + 1) } : { provider: fallback, model: setting };
}

/** Same provider and same model, however the setting was written. */
export const sameModel = (a: string, b: string, fallback: ProviderName = "gemini") => {
  const [x, y] = [parseModel(a, fallback), parseModel(b, fallback)];
  return x.provider === y.provider && x.model === y.model;
};

export type AIConfig = {
  /** Provider for bare model names. */
  provider: ProviderName;
  /** The Gemini key; kept under this name for the analysis stages. */
  apiKey: string | null;
  keys: Record<ProviderName, string | null>;
  nvidiaBaseUrl: string;
  openrouterBaseUrl: string;
  /** OPENROUTER_DATA_COLLECTION: allow (default) or deny (prefer no-train / no-log endpoints). */
  openrouterDataCollection?: OpenRouterDataPolicy;
  models: Record<ModelRole, string>;
  thresholds: FactoryThresholds;
  /** Distractor revisions switched on (FACTORY_EXPERIMENTS); empty is the baseline. */
  experiments: FactoryExperiment[];
  /**
   * FACTORY_SEED: benchmark repetition. Seed 1 sends and caches requests exactly as before; a higher seed salts every
   * request hash so the same prompts are sampled afresh. Providers get no seed (Claude has none); only the cache key changes.
   */
  seed: number;
  /** FACTORY_SKELETON_GATE: semantic skeleton check before distractors (on unless set to off, 0 or false). */
  skeletonGate: boolean;
  /** ANTHROPIC_PROMPT_CACHE: 5m (default), 1h or off; the cache lifetime of the system prompt. */
  promptCache?: PromptCacheMode;
  /** FACTORY_MAX_CALLS, FACTORY_MAX_REGENERATIONS, FACTORY_MAX_TOKENS, FACTORY_MAX_COST_USD. */
  limits?: SpendLimits;
  /** FACTORY_PRICES; null means every cost is unknown. */
  prices?: Prices | null;
  /** <ROLE>_THINKING (GENERATOR_THINKING, FINAL_JUDGE_THINKING, …): Gemini 3+ thinking level per role; unset leaves the model default. */
  thinking?: Partial<Record<ModelRole, ThinkingLevel>>;
  maxRetries: number;
  /** AI_MAX_WAIT_MS: longest retry wait a provider accepts; a longer rate-limit hint fails the call at once. */
  maxWaitMs?: number;
  warnings: string[];
};

const countThresholds = new Set<keyof FactoryThresholds>(["answerSharedContentWords", "stemSharedContentWords", "copiedPhraseWords"]);

function loadThresholds(env: Record<string, string | undefined>): FactoryThresholds {
  return Object.fromEntries(
    (Object.keys(defaultFactoryThresholds) as (keyof FactoryThresholds)[]).map((key) => {
      const raw = env[thresholdEnv[key]]?.trim();
      if (!raw) return [key, defaultFactoryThresholds[key]];
      const value = Number(raw);
      if (countThresholds.has(key)) {
        if (!Number.isInteger(value) || value < 1) throw new Error(`${thresholdEnv[key]} must be a whole number of at least 1`);
      } else if (!Number.isFinite(value) || value <= 0 || value > 1) throw new Error(`${thresholdEnv[key]} must be a number in (0, 1]`);
      return [key, value];
    }),
  ) as FactoryThresholds;
}

export function loadAIConfig(env: Record<string, string | undefined> = process.env): AIConfig {
  const provider = (env.AI_PROVIDER?.trim() || "gemini") as ProviderName;
  if (!providers.includes(provider)) throw new Error(`AI_PROVIDER must be one of ${providers.join(", ")}`);
  const models = Object.fromEntries(
    (Object.keys(modelDefaults) as ModelRole[]).map((role) => [role, modelEnv[role].map((name) => env[name]?.trim()).find(Boolean) || modelDefaults[role]]),
  ) as Record<ModelRole, string>;
  const warnings: string[] = [];
  const same = (a: string, b: string) => sameModel(a, b, provider);
  if (same(models.generator, models.judge)) warnings.push("GENERATOR_MODEL and JUDGE_MODEL are the same model; the judge refuses to run.");
  if (same(models.distractor, models.judge)) warnings.push("DISTRACTOR_MODEL and FINAL_JUDGE_MODEL are the same model; the judge refuses to run.");
  if (same(models.distractor, models.distractorJudge)) warnings.push("DISTRACTOR_MODEL and DISTRACTOR_JUDGE_MODEL are the same model; the distractor judge refuses to run.");
  const maxRetries = Number.parseInt(env.AI_MAX_RETRIES ?? "", 10);
  const seed = env.FACTORY_SEED?.trim() ? Number(env.FACTORY_SEED.trim()) : 1;
  if (!Number.isInteger(seed) || seed < 1) throw new Error("FACTORY_SEED must be a whole number of at least 1");
  const promptCache = (env.ANTHROPIC_PROMPT_CACHE?.trim() || "5m") as PromptCacheMode;
  if (!promptCacheModes.includes(promptCache)) throw new Error(`ANTHROPIC_PROMPT_CACHE must be one of ${promptCacheModes.join(", ")}`);
  const thinking: Partial<Record<ModelRole, ThinkingLevel>> = {};
  for (const role of Object.keys(modelEnv) as ModelRole[]) {
    const names = modelEnv[role].map((name) => name.replace(/_MODEL$/, "_THINKING"));
    const raw = names.map((name) => env[name]?.trim().toLowerCase()).find(Boolean);
    if (!raw) continue;
    if (!(thinkingLevels as readonly string[]).includes(raw)) throw new Error(`${names[0]} must be one of ${thinkingLevels.join(", ")}`);
    thinking[role] = raw as ThinkingLevel;
  }
  const keys: Record<ProviderName, string | null> = {
    gemini: env.GEMINI_API_KEY?.trim() || null,
    nvidia: env.NVIDIA_API_KEY?.trim() || null,
    anthropic: env.CLAUDE_API_KEY?.trim() || env.ANTHROPIC_API_KEY?.trim() || null,
    openrouter: env.OPENROUTER_API_KEY?.trim() || null,
  };
  const openrouterDataCollection = (env.OPENROUTER_DATA_COLLECTION?.trim() || "allow") as OpenRouterDataPolicy;
  if (!openrouterDataPolicies.includes(openrouterDataCollection)) {
    throw new Error(`OPENROUTER_DATA_COLLECTION must be one of ${openrouterDataPolicies.join(", ")}`);
  }
  for (const role of Object.keys(models) as ModelRole[]) {
    const { provider: owner } = parseModel(models[role], provider);
    if (!keys[owner]) warnings.push(`${role} uses ${owner}, but its API key is not set.`);
  }
  return {
    provider,
    apiKey: keys.gemini,
    keys,
    nvidiaBaseUrl: env.NVIDIA_API_URL?.trim() || "https://integrate.api.nvidia.com/v1",
    openrouterBaseUrl: env.OPENROUTER_API_URL?.trim() || "https://openrouter.ai/api/v1",
    openrouterDataCollection,
    models,
    thresholds: loadThresholds(env),
    experiments: parseExperiments(env.FACTORY_EXPERIMENTS),
    seed,
    skeletonGate: !/^(off|0|false|no)$/i.test(env.FACTORY_SKELETON_GATE?.trim() ?? ""),
    promptCache,
    limits: loadSpendLimits(env),
    prices: loadPrices(env),
    thinking,
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 6,
    ...(env.AI_MAX_WAIT_MS?.trim() ? { maxWaitMs: Math.max(0, Number.parseInt(env.AI_MAX_WAIT_MS, 10) || 0) } : {}),
    warnings,
  };
}
