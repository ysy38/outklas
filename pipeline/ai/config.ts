import { defaultFactoryThresholds, type FactoryThresholds } from "@/modules/factory/thresholds";

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
};

export const providers = ["gemini", "nvidia", "anthropic"] as const;
export type ProviderName = (typeof providers)[number];

/**
 * A model setting is `provider:model` (`nvidia:nvidia/nemotron-3-super-120b-a12b`, `anthropic:claude-haiku-5-5`)
 * or a bare name for the default provider, so existing Gemini settings, provenance and caches keep their meaning.
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
  models: Record<ModelRole, string>;
  thresholds: FactoryThresholds;
  maxRetries: number;
  warnings: string[];
};

const countThresholds = new Set<keyof FactoryThresholds>(["answerSharedContentWords", "stemSharedContentWords"]);

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
  const keys: Record<ProviderName, string | null> = {
    gemini: env.GEMINI_API_KEY?.trim() || null,
    nvidia: env.NVIDIA_API_KEY?.trim() || null,
    anthropic: env.CLAUDE_API_KEY?.trim() || env.ANTHROPIC_API_KEY?.trim() || null,
  };
  for (const role of Object.keys(models) as ModelRole[]) {
    const { provider: owner } = parseModel(models[role], provider);
    if (!keys[owner]) warnings.push(`${role} uses ${owner}, but its API key is not set.`);
  }
  return {
    provider,
    apiKey: keys.gemini,
    keys,
    nvidiaBaseUrl: env.NVIDIA_API_URL?.trim() || "https://integrate.api.nvidia.com/v1",
    models,
    thresholds: loadThresholds(env),
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 6,
    warnings,
  };
}
