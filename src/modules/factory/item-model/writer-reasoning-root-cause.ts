import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { architectureV2WriterTokenCeiling, callCeilingUsd, type CatalogPrice, type PriceCatalog } from "./architecture-v2";
import { scoringSourceAliases } from "./root-cause-audit";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { frozenHashesUnchanged } from "./factory-v6-writer-challenge";
import { factoryV6LivePilotSourceIds } from "./factory-v6-live-pilot";

export const writerReasoningRootCauseAuthorization = "writer-reasoning-configuration-root-cause-v1";
export const writerReasoningRootCauseOutputDir = ".data/analysis/_factory/cognitive-trap/writer-reasoning-root-cause-v1";
export const writerReasoningRootCauseLiveAuthorized = true as const;
export const writerReasoningRootCauseSpendCapUsd = 0.03;
export const writerReasoningRootCauseMaxCalls = 2;
export const writerReasoningRootCauseRetry = 0;
export const writerReasoningRootCauseSourceId = scoringSourceAliases.faculty;
export const writerReasoningRootCauseModels = [
  "openrouter:tencent/hy4",
  "openrouter:deepseek/deepseek-v4.1-flash-1017",
] as const;
export const writerReasoningRootCauseOutputTokens = architectureV2WriterTokenCeiling.output;

/** GET https://openrouter.ai/api/v1/models on 2026-11-20. Not a generate. */
export const catalogReasoningSnapshot = {
  fetched: "2026-11-20",
  source: "https://openrouter.ai/api/v1/models",
  method: "GET" as const,
  generateCalls: 0 as const,
  docs: [
    "https://openrouter.ai/docs/guides/best-practices/reasoning-tokens",
    "https://openrouter.ai/docs/guides/features/structured-outputs",
    "https://openrouter.ai/tencent/hy4",
    "https://openrouter.ai/deepseek/deepseek-v4.1-flash-1017",
  ],
  models: {
    "tencent/hy4": {
      supportedParameters: ["reasoning", "reasoning_effort", "include_reasoning", "max_tokens", "max_completion_tokens", "response_format", "structured_outputs"],
      reasoning: { mandatory: false, defaultEnabled: true, supportedEfforts: ["high", "low", "none"], defaultEffort: "high", supportsMaxTokens: false },
      structuredOutputs: true,
    },
    "deepseek/deepseek-v4.1-flash-1017": {
      supportedParameters: ["reasoning", "reasoning_effort", "include_reasoning", "max_tokens", "max_completion_tokens", "response_format", "structured_outputs"],
      reasoning: { mandatory: false, defaultEnabled: true, supportedEfforts: ["max", "high", "low", "none"], defaultEffort: "high", supportsMaxTokens: false },
      structuredOutputs: true,
    },
  },
} as const;

export const productionAdapterPayload = {
  path: "pipeline/ai/openrouter.ts",
  chatCompletions: true,
  max_tokens: "Math.max(request.maxOutputTokens, minOutputTokens default 4096)",
  reasoning: { exclude: true },
  response_format: "json_schema strict when jsonSchema is set",
  notSent: ["reasoning.effort", "reasoning.max_tokens", "reasoning.enabled"],
} as const;

export const documentedRootCause = {
  excludeHidesNotDisables:
    "OpenRouter: reasoning.exclude=true still uses reasoning; it is omitted from the Chat Completions response; tokens are billed and count against max_tokens.",
  combinedBudget:
    "On Chat Completions, max_tokens covers reasoning + visible output. If reasoning fills the budget, finish_reason is length and content is empty. With exclude, the response can carry no text at all.",
  disable:
    "effort: none disables reasoning entirely when the model lists none in supported_efforts and mandatory is false. Do not send effort none when mandatory is true.",
  budgetCap:
    "reasoning.max_tokens is only for models with supports_max_tokens. Neither HY4 nor flash-1017 expose that flag; do not send it.",
  effortNoneVsExclude: "exclude is not a disable switch. Adapter exclude=true plus default_enabled/default_effort high is the LENGTH failure class.",
} as const;

export const technicalTestReasoning = { effort: "none" as const };

export function compatibilityMatrix() {
  return writerReasoningRootCauseModels.map((setting) => {
    const id = setting.slice("openrouter:".length) as keyof typeof catalogReasoningSnapshot.models;
    const row = catalogReasoningSnapshot.models[id];
    const canDisable = row.reasoning.supportedEfforts.includes("none") && row.reasoning.mandatory === false;
    return {
      setting,
      id,
      reasoningDisableDocumented: canDisable ? ("reasoning.effort=none" as const) : ("not_documented" as const),
      reasoningBudgetDocumented: row.reasoning.supportsMaxTokens ? ("reasoning.max_tokens" as const) : ("not_documented" as const),
      supportedRequest: {
        reasoning: canDisable ? { effort: "none" } : null,
        max_tokens: writerReasoningRootCauseOutputTokens,
        response_format: "json_schema strict",
      },
      jsonSchemaListed: row.structuredOutputs,
      defaultEnabled: row.reasoning.defaultEnabled,
      defaultEffort: row.reasoning.defaultEffort,
      supportedEfforts: row.reasoning.supportedEfforts,
      mandatory: row.reasoning.mandatory,
      reporting:
        "usage.completion_tokens includes reasoning. Visible output ≈ completion_tokens - completion_tokens_details.reasoning_tokens.",
      adapterExcludeWouldStillReason: true,
      sources: catalogReasoningSnapshot.docs,
    };
  });
}

export function technicalCeilingUsd(localPrices: PriceCatalog): {
  perModel: { setting: string; perCallUsd: number | null }[];
  twoCallUsd: number | null;
  fitsCap: boolean;
} {
  const conservative: Record<string, CatalogPrice> = {
    "openrouter:tencent/hy4": localPrices["openrouter:tencent/hy4"] ?? { in: 0.417, out: 1.2505, cacheRead: 0.021 },
    "openrouter:deepseek/deepseek-v4.1-flash-1017": {
      in: Math.max(localPrices["openrouter:deepseek/deepseek-v4.1-flash-1017"]?.in ?? 0, 0.3),
      out: Math.max(localPrices["openrouter:deepseek/deepseek-v4.1-flash-1017"]?.out ?? 0, 1.2),
    },
  };
  const perModel = writerReasoningRootCauseModels.map((setting) => {
    const price = conservative[setting];
    const perCallUsd = price
      ? callCeilingUsd({ in: price.in, out: price.out, cacheWrite: price.cacheWrite ?? 0 }, architectureV2WriterTokenCeiling)
      : null;
    return { setting, perCallUsd };
  });
  const twoCallUsd = perModel.every((row) => row.perCallUsd != null)
    ? perModel.reduce((sum, row) => sum + (row.perCallUsd ?? 0), 0)
    : null;
  return { perModel, twoCallUsd, fitsCap: twoCallUsd != null && twoCallUsd <= writerReasoningRootCauseSpendCapUsd };
}

export function visibleOutputTokens(usage: { outputTokens: number; reasoningTokens: number | null }): number {
  if (usage.reasoningTokens == null) return usage.outputTokens;
  return Math.max(0, usage.outputTokens - usage.reasoningTokens);
}

export function technicalSuccess(input: { providerCallOk: boolean; jsonHonored: boolean; optionCount: number }): boolean {
  return input.providerCallOk && input.jsonHonored && input.optionCount === 4;
}

export function reasoningProtectedDirs(): string[] {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter(
    (dir) => path.resolve(dir) !== path.resolve(writerReasoningRootCauseOutputDir),
  );
}

export function refuseWriterReasoningRootCause(reason: string, code: string) {
  return {
    started: false,
    executed: false,
    providerCalls: 0,
    reason,
    code,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
  };
}

export function assessOfflineWriterReasoningRootCause(localPrices: PriceCatalog) {
  const hashes = frozenHashesUnchanged();
  const matrix = compatibilityMatrix();
  const ceiling = technicalCeilingUsd(localPrices);
  const disableDocumented = matrix.every((row) => row.reasoningDisableDocumented === "reasoning.effort=none");
  return {
    version: writerReasoningRootCauseAuthorization,
    factoryRootCauseFixEnabled,
    productionWriterUnchanged: qualityFirstFrozenModels.writer,
    productionJudgeUnchanged: qualityFirstFrozenModels.judge,
    recoveryDefault: recoveryDefaultEnabled ? "off" : "off",
    studentBankWrites: 0 as const,
    winnerDeclared: false as const,
    editorialAcceptance: "pending" as const,
    meaningProven: false as const,
    qualityProven: false as const,
    productionAdapterPayload,
    documentedRootCause,
    catalogReasoningSnapshot,
    matrix,
    technicalTest: {
      sourceId: writerReasoningRootCauseSourceId,
      models: [...writerReasoningRootCauseModels],
      maxCalls: writerReasoningRootCauseMaxCalls,
      retry: writerReasoningRootCauseRetry,
      reasoning: technicalTestReasoning,
      max_tokens: writerReasoningRootCauseOutputTokens,
      jsonSchemaUnchanged: true,
      promptUnchanged: true,
      productionAdapterUnchanged: true,
      deltaFromProduction: "replace reasoning.exclude=true with reasoning.effort=none; do not send reasoning.max_tokens",
    },
    hashes,
    ceiling,
    liveReady: disableDocumented && hashes.ok && ceiling.fitsCap && !factoryRootCauseFixEnabled,
    liveReadyErrors: [
      ...(disableDocumented ? [] : ["effort none not documented for a target model"]),
      ...(hashes.ok ? [] : ["freeze hashes drifted"]),
      ...(ceiling.fitsCap ? [] : ["ceiling over $0.03"]),
    ],
  };
}

export function writeOfflineWriterReasoningRootCause(localPrices: PriceCatalog) {
  const report = assessOfflineWriterReasoningRootCause(localPrices);
  mkdirSync(writerReasoningRootCauseOutputDir, { recursive: true });
  writeFileSync(path.join(writerReasoningRootCauseOutputDir, "pre-flight.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(writerReasoningRootCauseOutputDir, "compatibility-matrix.json"), `${JSON.stringify(report.matrix, null, 2)}\n`);
  return report;
}

export function sourceIdsStillFrozen(): boolean {
  return factoryV6LivePilotSourceIds.includes(writerReasoningRootCauseSourceId);
}

export function existsCompletedSummary(dir = writerReasoningRootCauseOutputDir): boolean {
  if (!existsSync(path.join(dir, "summary.json"))) return false;
  const parsed = JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8")) as { executed?: boolean };
  return parsed.executed === true;
}