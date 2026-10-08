import { defaultFactoryThresholds, type FactoryThresholds } from "@/modules/factory/thresholds";

export type ModelRole = "analyzer" | "verifier" | "generator" | "distractor" | "distractorJudge" | "judge" | "explanation";

/**
 * The only place model names live. Chosen from ListModels and live probes on 2026-10-07; see
 * docs/architecture/phase-2-plan.md §2 and docs/analysis/phase-2.1-report.md. Analyzer and verifier
 * stay on different models so the blind solve is independent of the analysis pass; every factory writer
 * (generator, distractor) is checked by a different model (distractorJudge, judge).
 */
export const modelDefaults: Record<ModelRole, string> = {
  analyzer: "gemini-3.1-flash-lite",
  verifier: "gemini-flash-lite-latest",
  generator: "gemini-flash-lite-latest",
  distractor: "gemini-flash-lite-latest",
  distractorJudge: "gemini-3.1-flash-lite",
  judge: "gemini-3.1-flash-lite",
  explanation: "gemini-flash-lite-latest",
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
};

export const providers = ["gemini"] as const;
export type ProviderName = (typeof providers)[number];

export type AIConfig = {
  provider: ProviderName;
  apiKey: string | null;
  models: Record<ModelRole, string>;
  thresholds: FactoryThresholds;
  maxRetries: number;
  warnings: string[];
};

function loadThresholds(env: Record<string, string | undefined>): FactoryThresholds {
  return Object.fromEntries(
    (Object.keys(defaultFactoryThresholds) as (keyof FactoryThresholds)[]).map((key) => {
      const raw = env[thresholdEnv[key]]?.trim();
      if (!raw) return [key, defaultFactoryThresholds[key]];
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0 || value > 1) throw new Error(`${thresholdEnv[key]} must be a number in (0, 1]`);
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
  if (models.generator === models.judge) warnings.push("GENERATOR_MODEL and JUDGE_MODEL are the same model; the judge refuses to run.");
  if (models.distractor === models.judge) warnings.push("DISTRACTOR_MODEL and FINAL_JUDGE_MODEL are the same model; the judge refuses to run.");
  if (models.distractor === models.distractorJudge) warnings.push("DISTRACTOR_MODEL and DISTRACTOR_JUDGE_MODEL are the same model; the distractor judge refuses to run.");
  const maxRetries = Number.parseInt(env.AI_MAX_RETRIES ?? "", 10);
  return {
    provider,
    apiKey: env.GEMINI_API_KEY?.trim() || null,
    models,
    thresholds: loadThresholds(env),
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 6,
    warnings,
  };
}
