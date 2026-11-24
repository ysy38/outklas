import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { planToWordingOutput, planToWordingResponseSchema, planToWordingSystem, planToWordingUser } from "../ai/prompts/plan-to-wording.v1";
import { qualityAuthoringPromptVersion } from "../ai/prompts/quality-authoring.v1";
import { extractJsonText } from "../ai/service";
import {
  qualityAuthoringLivePilotOutputTokens,
  qualityAuthoringLivePilotWriter,
  restatementHardBenchmark5OutputDir,
} from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { restatementHardSourceFeasibilityOutputDir } from "@/modules/factory/item-model/restatement-hard-source-feasibility";
import {
  refuseRestatementHardPlanToWording,
  restatementHardPlanToWordingAuthorization,
  restatementHardPlanToWordingCeiling,
  restatementHardPlanToWordingLiveAuthorized,
  restatementHardPlanToWordingMaxCalls,
  restatementHardPlanToWordingOutputDir,
  restatementHardPlanToWordingPrecheck,
  restatementHardPlanToWordingProtectedDirs,
  restatementHardPlanToWordingRetry,
  restatementHardPlanToWordingSpendCapUsd,
  restatementHardPlanToWordingTasks,
} from "@/modules/factory/item-model/restatement-hard-plan-to-wording";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: null as number | null };
}

export async function runRestatementHardPlanToWording(authorization: string, outDir = restatementHardPlanToWordingOutputDir) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== restatementHardPlanToWordingAuthorization || !restatementHardPlanToWordingLiveAuthorized) {
    return refuseRestatementHardPlanToWording("restatement hard plan-to-wording authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  const protectedDirs = restatementHardPlanToWordingProtectedDirs();
  if (protectedDirs.some((dir) => path.resolve(dir) === resolved)) {
    return refuseRestatementHardPlanToWording("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseRestatementHardPlanToWording("a completed plan-to-wording experiment is already stored", "completed");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseRestatementHardPlanToWording("pilot refuses an enabled root-cause flag or recovery", "safety");
  }
  try {
    publishToStudentBank();
    return refuseRestatementHardPlanToWording("student bank opened", "runner");
  } catch {
    /* closed */
  }

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseRestatementHardPlanToWording("FACTORY_PRICES missing", "budget");
  const ceiling = restatementHardPlanToWordingCeiling(prices.table);
  const precheck = restatementHardPlanToWordingPrecheck();
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "estimate.json"),
    `${JSON.stringify(
      {
        ...ceiling,
        precheck,
        productionPromptUnchanged: qualityAuthoringPromptVersion,
        judgeCalls: 0,
        recoveryCalls: 0,
        studentBankWrites: 0,
        qualityAuthoringTrapEnabled: false,
        productionGate: false,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(path.join(resolved, "plan-precheck.json"), `${JSON.stringify({ independence: "same-agent plan check vs source; not NLI", precheck, tasks: restatementHardPlanToWordingTasks }, null, 2)}\n`);
  if (ceiling.fiveCallUsd == null) return { ...refuseRestatementHardPlanToWording("haiku writer is unpriced", "budget"), ceiling, precheck };
  if (!ceiling.fitsCap) {
    return {
      ...refuseRestatementHardPlanToWording(
        `conservative five-call ceiling $${ceiling.fiveCallUsd.toFixed(4)} exceeds $${restatementHardPlanToWordingSpendCapUsd}`,
        "budget",
      ),
      ceiling,
      precheck,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return { ...refuseRestatementHardPlanToWording("missing openrouter API key", "credentials"), ceiling, precheck };

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
  const beforeBenchmark = fingerprintFiles(restatementHardBenchmark5OutputDir, ["summary.json", "editorial-evaluation.json", "restatement-hard-benchmark-5-v1.md"]);
  const beforeFeasibility = fingerprintFiles(restatementHardSourceFeasibilityOutputDir, ["source-feasibility.json", "restatement-hard-source-feasibility-v1.md"]);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-restatement-hard-plan-to-wording",
    maxRetries: restatementHardPlanToWordingRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const items: Record<string, unknown>[] = [];

  for (const task of restatementHardPlanToWordingTasks) {
    if (calls >= restatementHardPlanToWordingMaxCalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > restatementHardPlanToWordingSpendCapUsd) break;

    const writerUser = planToWordingUser({
      source: task.source,
      key: task.key,
      plans: task.plans.map((row) => ({
        id: row.id,
        trapType: row.trapType,
        sourceProposition: row.sourceProposition,
        intendedMisreading: row.intendedMisreading,
        semanticMutation: row.semanticMutation,
        whySourceDoesNotSupportIt: row.whySourceDoesNotSupportIt,
      })),
    });
    writeFileSync(
      path.join(resolved, `${task.id}.prompt.json`),
      `${JSON.stringify({ id: task.id, writerUser, planIds: task.plans.map((row) => row.id), productionPrompt: qualityAuthoringPromptVersion }, null, 2)}\n`,
    );

    const startedAt = Date.now();
    let providerCallOk = false;
    let usage = emptyUsage();
    let contentText = "";
    let reasoningText = "";
    let combinedText = "";
    let finishReason: string | undefined;
    let error: string | null = null;
    let costUsd: number | null = null;
    const spentBefore = spentUsd;

    console.error(
      `restatement-hard-plan-to-wording call ${calls + 1}/${restatementHardPlanToWordingMaxCalls} ${task.id} capRemaining=$${(restatementHardPlanToWordingSpendCapUsd - spentUsd).toFixed(4)}`,
    );

    try {
      const response = await provider.generate({
        model,
        system: planToWordingSystem,
        parts: [{ text: writerUser }],
        jsonSchema: planToWordingResponseSchema,
        temperature: 0,
        maxOutputTokens: qualityAuthoringLivePilotOutputTokens,
      });
      providerCallOk = true;
      calls += 1;
      usage = {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        reasoningTokens: response.usage.reasoningTokens ?? null,
      };
      contentText = response.contentText ?? "";
      reasoningText = response.reasoningText ?? "";
      combinedText = response.text;
      finishReason = response.finishReason;
      const billedKey = `${provider.name}:${model}`;
      const row = (usageRows[billedKey] ??= { calls: 0, inputTokens: 0, outputTokens: 0 });
      row.calls += 1;
      row.inputTokens += usage.inputTokens;
      row.outputTokens += usage.outputTokens;
      if (usage.reasoningTokens != null) row.reasoningTokens = (row.reasoningTokens ?? 0) + usage.reasoningTokens;
      const cost = estimateCost(usageRows, prices);
      spentUsd = cost.usd ?? spentUsd;
      costUsd = cost.usd != null ? Math.round((spentUsd - spentBefore) * 1_000_000) / 1_000_000 : null;
    } catch (caught) {
      calls += 1;
      const message = caught instanceof Error ? caught.message : "call failed";
      error = /api[_-]?key|sk-|or-auth/i.test(message) ? "provider call failed" : message.slice(0, 180);
    }

    writeFileSync(
      path.join(resolved, `${task.id}.raw.json`),
      `${JSON.stringify({ id: task.id, model: qualityAuthoringLivePilotWriter, usage, finishReason, latencyMs: Date.now() - startedAt, costUsd, contentText, reasoningText, combinedText, error }, null, 2)}\n`,
    );

    let parsed: unknown = null;
    try {
      if (!error) parsed = JSON.parse(extractJsonText(contentText || combinedText));
    } catch {
      error = error ?? "output is not valid JSON";
    }

    const parsedCheck = planToWordingOutput.safeParse(parsed);
    const parsedRecord = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const parsedCandidates = Array.isArray(parsedRecord.candidates) ? parsedRecord.candidates : [];
    const echoedSource = typeof parsedRecord.source === "string" ? parsedRecord.source : "";
    const echoedKey = typeof parsedRecord.key === "string" ? parsedRecord.key : "";
    const planIds = parsedCandidates.map((row) => (row && typeof row === "object" && "planId" in row ? String(row.planId) : ""));
    const expectedIds = task.plans.map((row) => row.id);
    writeFileSync(
      path.join(resolved, `${task.id}.writer.json`),
      `${JSON.stringify(
        {
          parsed,
          error,
          parseOk: parsedCheck.success,
          sourceUnchanged: echoedSource === task.source,
          keyUnchanged: echoedKey === task.key,
          planOrderOk: planIds.join(" ") === expectedIds.join(" "),
          candidateCount: parsedCandidates.length,
        },
        null,
        2,
      )}\n`,
    );

    items.push({
      id: task.id,
      providerCallOk,
      error,
      usage,
      costUsd,
      latencyMs: Date.now() - startedAt,
      parseOk: parsedCheck.success,
      sourceUnchanged: echoedSource === task.source,
      keyUnchanged: echoedKey === task.key,
      planOrderOk: planIds.join(" ") === expectedIds.join(" "),
      candidateCount: parsedCandidates.length,
      validSuppliedPlans: task.plans.filter((row) => row.planValid).length,
      qualityAccepted: false,
      meaningProven: false,
    });
  }

  const summary = {
    executed: true,
    started: true,
    providerCalls: calls,
    judgeCalls: 0,
    recoveryCalls: 0,
    spentUsd,
    ceiling,
    precheck,
    items,
    productionPromptUnchanged: qualityAuthoringPromptVersion,
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
      compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
      benchmark5Unchanged: fingerprintFiles(restatementHardBenchmark5OutputDir, ["summary.json", "editorial-evaluation.json", "restatement-hard-benchmark-5-v1.md"]) === beforeBenchmark,
      feasibilityUnchanged: fingerprintFiles(restatementHardSourceFeasibilityOutputDir, ["source-feasibility.json", "restatement-hard-source-feasibility-v1.md"]) === beforeFeasibility,
    },
    qualityAccepted: false,
    meaningProven: false,
    qualityProven: false,
    hardCalibrationStatus: "not_run",
    studentBankWrites: 0,
    productionGate: false,
    winnerDeclared: false,
    originalBenchmarkConstructionPass: "0/5 not updated",
    liveGenerate: calls,
  };
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
