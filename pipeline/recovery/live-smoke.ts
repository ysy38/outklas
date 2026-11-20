import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assessWholeSet } from "@/modules/factory/item-model/whole-set";
import { loadAIConfig, parseModel } from "../ai/config";
import { loadPrices } from "../ai/prices";
import { OpenRouterProvider } from "../ai/openrouter";
import { openRouterWriterWire } from "../diagnostic-repair/call-contract";
import { draftsEditorialRisks } from "../diagnostic-repair/drafts";
import { executeActiveRecovery } from "./active";
import {
  draftsRecordFileHash,
  loadDraftsQualityRecord,
  recoveryLiveSmokeOutDir,
  recoveryLiveSmokeToken,
  smokeActiveInput,
  verifyDraftsCSmokeContract,
} from "./smoke-case";
import type { AIProvider, ModelRequest, ModelResponse } from "../ai/types";

const direct = process.argv[1]?.endsWith("live-smoke.ts") === true && process.argv[2] === recoveryLiveSmokeToken;

function mockRepairProvider(): AIProvider & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  return {
    name: "mock-openrouter",
    calls,
    async generate(request): Promise<ModelResponse> {
      calls.push(request);
      return {
        text: JSON.stringify({
          optionId: "C",
          text: "Most of the drafts were not taken up for the second reading, but all of the drafts were distributed to the board afterwards.",
        }),
        model: request.model,
        usage: { inputTokens: 500, outputTokens: 80, totalTokens: 580 },
      };
    },
  };
}

export async function runActiveRecoveryLiveSmoke(): Promise<Record<string, unknown>> {
  const outDir = path.resolve(recoveryLiveSmokeOutDir);
  const summaryPath = path.join(outDir, "summary.json");
  if (existsSync(summaryPath)) {
    const previous = JSON.parse(readFileSync(summaryPath, "utf8")) as { executed?: boolean };
    if (previous.executed) throw new Error("the authorized active recovery live smoke is already stored");
  }

  const beforeHash = draftsRecordFileHash();
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  const contract = verifyDraftsCSmokeContract(prices);
  const quality = loadDraftsQualityRecord();
  const frozenOptions = { ...quality.arms.B.options };

  if (!contract.ok) {
    return {
      executed: false,
      started: false,
      providerCalls: 0,
      studentBankWrites: 0,
      reason: "smoke contract failed",
      contract,
    };
  }

  const mock = mockRepairProvider();
  const routed = await executeActiveRecovery(quality, { ...smokeActiveInput(prices), provider: mock });
  const routedC = routed.activeReport?.results.find((row) => row.optionId === "C");
  const routingOk =
    mock.calls.length === 1 &&
    routed.providerCalls === 1 &&
    routed.activeReport?.repairCalls === 1 &&
    routed.activeReport?.replaceCalls === 0 &&
    routedC?.action === "repair" &&
    routed.meaningProven === false &&
    routed.qualityProven === false &&
    quality.arms.B.options?.C === frozenOptions.C &&
    quality.arms.B.qualityDecision === "needs_revision";

  if (!routingOk) {
    return {
      executed: false,
      started: false,
      providerCalls: 0,
      studentBankWrites: 0,
      reason: "mock routing failed",
      contract,
      mockCalls: mock.calls.length,
      routedCalls: routed.providerCalls,
      replaceCalls: routed.activeReport?.replaceCalls ?? 0,
    };
  }

  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const config = loadAIConfig();
  if (!config.keys.openrouter) throw new Error("missing openrouter API key");
  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory",
    maxRetries: 0,
    minOutputTokens: openRouterWriterWire.outputFloor,
  });

  const live = await executeActiveRecovery(quality, { ...smokeActiveInput(prices), provider });
  const rowC = live.activeReport?.results.find((row) => row.optionId === "C");
  const proposed = rowC?.proposedText ?? null;
  const originalFive = assessWholeSet({
    source: quality.source,
    key: quality.key,
    options: {
      A: frozenOptions.A ?? "",
      B: frozenOptions.B ?? "",
      C: frozenOptions.C ?? "",
      D: frozenOptions.D ?? "",
      E: frozenOptions.E ?? "",
    },
    correct: quality.arms.B.keyLetter ?? "A",
  });
  const hypothetical = proposed
    ? assessWholeSet({
        source: quality.source,
        key: quality.key,
        options: {
          A: frozenOptions.A ?? "",
          B: frozenOptions.B ?? "",
          C: proposed,
          D: frozenOptions.D ?? "",
          E: frozenOptions.E ?? "",
        },
        correct: quality.arms.B.keyLetter ?? "A",
      })
    : null;
  const afterHash = draftsRecordFileHash();
  if (afterHash !== beforeHash) throw new Error("the recorded Drafts file changed");
  if (quality.arms.B.options?.C !== frozenOptions.C) throw new Error("option C was mutated in memory");

  const report = {
    executed: true,
    version: recoveryLiveSmokeToken,
    model: parseModel(live.activeReport?.model ?? "", "openrouter").model,
    retry: 0,
    providerCalls: live.providerCalls,
    repairCalls: live.activeReport?.repairCalls ?? 0,
    replaceCalls: live.activeReport?.replaceCalls ?? 0,
    ceilingUsd: contract.ceilingUsd,
    actualCostUsd: live.recoveryCostUsd,
    measuredBill: false,
    technicalSuccess: Boolean(rowC && rowC.technicalFailures.length === 0 && live.providerCalls === 1),
    semanticSuccess: rowC?.repairSuccess === true,
    localRepairDecision: rowC?.repairSuccess ? "option_repair_success" : rowC?.validationFailures.includes("repair_not_possible") ? "repair_not_possible" : "needs_revision",
    originalC: frozenOptions.C,
    proposedC: proposed,
    kept: "original" as const,
    validationFailures: rowC?.validationFailures ?? [],
    technicalFailures: rowC?.technicalFailures ?? [],
    remainingIssues: live.activeReport?.remainingIssues ?? [],
    remainingWholeSetRisks: originalFive.risks,
    hypotheticalWholeSetRisks: hypothetical?.risks ?? null,
    editorialRisks: draftsEditorialRisks,
    qualityDecision: quality.arms.B.qualityDecision,
    meaningProven: false as const,
    qualityProven: false as const,
    editorial: "pending" as const,
    studentBankWrites: 0 as const,
    sourceUnchanged: true,
    keyUnchanged: true,
    optionHashes: live.activeReport?.finalOptionHashes,
    provenance: "editorial_fixture" as const,
    factoryCRepairEligible: false as const,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(summaryPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (direct) {
  runActiveRecoveryLiveSmoke()
    .then((report) => {
      console.log(JSON.stringify(report));
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "active recovery live smoke failed";
      console.error(message);
      process.exitCode = 1;
    });
}
