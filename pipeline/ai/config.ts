import type { AIRole } from "./types";

export type ModelRole = Extract<AIRole, "analyzer" | "verifier" | "generator" | "judge">;

/**
 * The only place model names live. Chosen from ListModels and live probes on 2026-10-07 (free tier: every flash model
 * answered 503 for hours); see docs/architecture/phase-2-plan.md §2. The verifier is a different model family on purpose,
 * so its blind solve is independent of the analyzer.
 */
export const modelDefaults: Record<ModelRole, string> = {
  analyzer: "gemini-3.5-flash-lite",
  verifier: "gemma-4-31b-it",
  generator: "gemini-3.5-flash",
  judge: "gemini-3.1-flash-lite",
};

const modelEnv: Record<ModelRole, string> = {
  analyzer: "ANALYZER_MODEL",
  verifier: "VERIFIER_MODEL",
  generator: "GENERATOR_MODEL",
  judge: "JUDGE_MODEL",
};

export const providers = ["gemini"] as const;
export type ProviderName = (typeof providers)[number];

export type AIConfig = {
  provider: ProviderName;
  apiKey: string | null;
  models: Record<ModelRole, string>;
  maxRetries: number;
  warnings: string[];
};

export function loadAIConfig(env: Record<string, string | undefined> = process.env): AIConfig {
  const provider = (env.AI_PROVIDER?.trim() || "gemini") as ProviderName;
  if (!providers.includes(provider)) throw new Error(`AI_PROVIDER must be one of ${providers.join(", ")}`);
  const models = Object.fromEntries(
    (Object.keys(modelDefaults) as ModelRole[]).map((role) => [role, env[modelEnv[role]]?.trim() || modelDefaults[role]]),
  ) as Record<ModelRole, string>;
  const warnings: string[] = [];
  if (models.generator === models.judge) warnings.push("GENERATOR_MODEL and JUDGE_MODEL are the same model; Phase 3 will refuse this.");
  const maxRetries = Number.parseInt(env.AI_MAX_RETRIES ?? "", 10);
  return { provider, apiKey: env.GEMINI_API_KEY?.trim() || null, models, maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 6, warnings };
}
