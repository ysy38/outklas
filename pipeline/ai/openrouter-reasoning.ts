import type { Usage } from "./types";

export const openrouterReasoningProfiles = ["disabled", "low", "default", "existing"] as const;
export type OpenRouterReasoningProfile = (typeof openrouterReasoningProfiles)[number];

export const openrouterReasoningEfforts = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export type OpenRouterReasoningEffort = (typeof openrouterReasoningEfforts)[number];

/** exclude=true hides reasoning text. It does not disable reasoning and is not the disabled profile. */
export const existingReasoningHidesOutput = { exclude: true as const };
export const excludeTrueIsNotDisabled = true as const;

export type OpenRouterReasoningCapability = {
  id: string;
  supportedEfforts: readonly OpenRouterReasoningEffort[];
  mandatory: boolean;
  defaultEffort: OpenRouterReasoningEffort | null;
  defaultEnabled: boolean | null;
  supportsMaxTokens: boolean;
};

/**
 * Catalog snapshot 2026-11-20 (GET /api/v1/models + OpenRouter reasoning docs).
 * Only models that a v6 Writer experiment may opt into. Unlisted models stay on existing.
 */
export const openrouterReasoningCapabilities: Record<string, OpenRouterReasoningCapability> = {
  "tencent/hy4": {
    id: "tencent/hy4",
    supportedEfforts: ["high", "low", "none"],
    mandatory: false,
    defaultEffort: "high",
    defaultEnabled: true,
    supportsMaxTokens: false,
  },
  "deepseek/deepseek-v4.1-flash-1017": {
    id: "deepseek/deepseek-v4.1-flash-1017",
    supportedEfforts: ["max", "high", "low", "none"],
    mandatory: false,
    defaultEffort: "high",
    defaultEnabled: true,
    supportsMaxTokens: false,
  },
};

/** Applied only when a v6 Writer experiment passes this map into OpenRouterProvider. Production omits it. */
export const v6WriterExperimentReasoningProfiles: Record<string, OpenRouterReasoningProfile> = {
  "tencent/hy4": "disabled",
  "deepseek/deepseek-v4.1-flash-1017": "disabled",
};

export class UnsupportedReasoningProfileError extends Error {
  readonly code = "unsupported_reasoning_profile";
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedReasoningProfileError";
  }
}

export type ResolvedOpenRouterReasoning = {
  profile: OpenRouterReasoningProfile;
  model: string;
  /** On-wire `reasoning` object. Undefined means omit the field (provider default). */
  reasoning: { exclude: true } | { effort: OpenRouterReasoningEffort } | undefined;
  namedDisabled: boolean;
};

export function normalizeOpenRouterModelId(model: string): string {
  const trimmed = model.trim();
  return trimmed.startsWith("openrouter:") ? trimmed.slice("openrouter:".length) : trimmed;
}

export function selectOpenRouterReasoningProfile(input: {
  model: string;
  requestProfile?: OpenRouterReasoningProfile | null;
  experimentProfiles?: Record<string, OpenRouterReasoningProfile> | null;
}): OpenRouterReasoningProfile {
  if (input.requestProfile) return input.requestProfile;
  const id = normalizeOpenRouterModelId(input.model);
  return input.experimentProfiles?.[id] ?? "existing";
}

export function assertOpenRouterReasoningProfile(value: string): OpenRouterReasoningProfile {
  if ((openrouterReasoningProfiles as readonly string[]).includes(value)) return value as OpenRouterReasoningProfile;
  throw new UnsupportedReasoningProfileError(`unknown reasoning profile ${value}`);
}

export function resolveOpenRouterReasoning(input: {
  model: string;
  profile: string;
  capabilities?: Record<string, OpenRouterReasoningCapability>;
}): ResolvedOpenRouterReasoning {
  const model = normalizeOpenRouterModelId(input.model);
  const profile = assertOpenRouterReasoningProfile(input.profile);
  if (profile === "existing") {
    return { profile, model, reasoning: existingReasoningHidesOutput, namedDisabled: false };
  }
  if (profile === "default") {
    return { profile, model, reasoning: undefined, namedDisabled: false };
  }

  const capability = (input.capabilities ?? openrouterReasoningCapabilities)[model];
  if (!capability) {
    throw new UnsupportedReasoningProfileError(`${model} has no registered reasoning capability for profile ${profile}`);
  }
  if (profile === "disabled") {
    if (capability.mandatory) {
      throw new UnsupportedReasoningProfileError(`${model} rejects effort none (mandatory reasoning)`);
    }
    if (!capability.supportedEfforts.includes("none")) {
      throw new UnsupportedReasoningProfileError(`${model} does not list effort none`);
    }
    return { profile, model, reasoning: { effort: "none" }, namedDisabled: true };
  }
  if (!capability.supportedEfforts.includes("low")) {
    throw new UnsupportedReasoningProfileError(`${model} does not list effort low`);
  }
  return { profile: "low", model, reasoning: { effort: "low" }, namedDisabled: false };
}

export function openrouterVisibleOutputTokens(usage: Usage): number {
  if (usage.reasoningTokens == null) return usage.outputTokens;
  return Math.max(0, usage.outputTokens - usage.reasoningTokens);
}

export function openrouterOutputBudgetOk(input: { maxTokens: number; outputTokens: number }): boolean {
  return input.outputTokens <= input.maxTokens;
}

export const nextControlledQualityComparison = {
  ready: true as const,
  decision: "ready" as const,
  note: "HY4 and flash-1017 can send documented effort none on an explicit v6 Writer experiment path. Production Haiku/Sonnet/Recovery stay on existing exclude=true. Quality and editorial acceptance remain pending. No winner.",
};