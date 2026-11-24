import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { qualityAuthoringPromptVersion } from "../ai/prompts/quality-authoring.v1";
import { stageAPlanPoolOutput, stageAPlanPoolResponseSchema, stageAPlanPoolSystem, stageAPlanPoolUser } from "../ai/prompts/stage-a-plan-pool.v1";
import { stageBWordingOutput, stageBWordingResponseSchema, stageBWordingSystem, stageBWordingUser } from "../ai/prompts/stage-b-wording.v1";
import { extractJsonText } from "../ai/service";
import {
  qualityAuthoringLivePilotOutputTokens,
  qualityAuthoringLivePilotWriter,
  restatementHardBenchmark5OutputDir,
} from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { restatementHardFourRelationBriefOutputDir } from "@/modules/factory/item-model/restatement-hard-four-relation-brief";
import {
  refuseRestatementHardPlanPool,
  restatementHardPlanPoolAuthorization,
  restatementHardPlanPoolCeiling,
  restatementHardPlanPoolLiveAuthorized,
  restatementHardPlanPoolMaxStageACalls,
  restatementHardPlanPoolMaxStageBCalls,
  restatementHardPlanPoolOutputDir,
  restatementHardPlanPoolProtectedDirs,
  restatementHardPlanPoolRetry,
  restatementHardPlanPoolSpendCapUsd,
  restatementHardPlanPoolStage0Original,
  restatementHardPlanPoolTasks,
} from "@/modules/factory/item-model/restatement-hard-plan-pool";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: null as number | null };
}

function safetyGate(authorization: string, outDir: string) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== restatementHardPlanPoolAuthorization || !restatementHardPlanPoolLiveAuthorized) {
    return refuseRestatementHardPlanPool("restatement hard plan-pool authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (restatementHardPlanPoolProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseRestatementHardPlanPool("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseRestatementHardPlanPool("pilot refuses an enabled root-cause flag or recovery", "safety");
  }
  try {
    publishToStudentBank();
    return refuseRestatementHardPlanPool("student bank opened", "runner");
  } catch {
    /* closed */
  }
  return { ok: true as const, resolved };
}

function recordLocks() {
  return {
    writerBakeoffV1Unchanged: true,
    qualityFirstUnchanged: true,
    compareUnchanged: true,
    benchmark5Unchanged: true,
    fourRelationUnchanged: true,
    fingerprints: {
      beforeBakeoff: writerBakeoffV1Fingerprint(),
      beforeQuality: qualityFirstPilotFingerprint(),
      beforeCompare: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]),
      beforeBenchmark: fingerprintFiles(restatementHardBenchmark5OutputDir, ["summary.json", "editorial-evaluation.json"]),
      beforeFourRelation: fingerprintFiles(restatementHardFourRelationBriefOutputDir, ["summary.json", "editorial-evaluation.json"]),
    },
  };
}

function locksUnchanged(before: ReturnType<typeof recordLocks>) {
  return {
    writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === before.fingerprints.beforeBakeoff,
    qualityFirstUnchanged: qualityFirstPilotFingerprint() === before.fingerprints.beforeQuality,
    compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === before.fingerprints.beforeCompare,
    benchmark5Unchanged: fingerprintFiles(restatementHardBenchmark5OutputDir, ["summary.json", "editorial-evaluation.json"]) === before.fingerprints.beforeBenchmark,
    fourRelationUnchanged:
      fingerprintFiles(restatementHardFourRelationBriefOutputDir, ["summary.json", "editorial-evaluation.json"]) === before.fingerprints.beforeFourRelation,
  };
}

export async function runRestatementHardPlanPoolStageA(authorization: string, outDir = restatementHardPlanPoolOutputDir) {
  const gate = safetyGate(authorization, outDir);
  if (!("ok" in gate)) return gate;
  const resolved = gate.resolved;
  if (existsSync(path.join(resolved, "stage-a-summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "stage-a-summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseRestatementHardPlanPool("a completed plan-pool Stage A run is already stored", "completed");
  }

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseRestatementHardPlanPool("FACTORY_PRICES missing", "budget");
  const ceiling = restatementHardPlanPoolCeiling(prices.table);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "stage-0-original.json"),
    `${JSON.stringify(
      {
        independence: "same-agent editorial; not independent proof",
        autoFixed: false,
        items: restatementHardPlanPoolStage0Original,
        portKeyBlocked: restatementHardPlanPoolStage0Original.find((row) => row.id === "rhb-port-wrecks")?.keyBlocked === true,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(resolved, "estimate.json"),
    `${JSON.stringify(
      {
        ...ceiling,
        note: "Conservative ten-call ceiling exceeds $0.02. Stage A may start. Stage B is gated on remaining cap, four selected plans, and keyBlocked false.",
        productionPromptUnchanged: qualityAuthoringPromptVersion,
        judgeCalls: 0,
        recoveryCalls: 0,
        studentBankWrites: 0,
        productionGate: false,
      },
      null,
      2,
    )}\n`,
  );
  if (ceiling.fiveStageAUsd == null) return { ...refuseRestatementHardPlanPool("haiku writer is unpriced", "budget"), ceiling };
  if (!ceiling.fitsStageACap) {
    return {
      ...refuseRestatementHardPlanPool(
        `conservative five Stage A ceiling $${ceiling.fiveStageAUsd.toFixed(4)} exceeds $${restatementHardPlanPoolSpendCapUsd}`,
        "budget",
      ),
      ceiling,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return { ...refuseRestatementHardPlanPool("missing openrouter API key", "credentials"), ceiling };

  const before = recordLocks();
  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-restatement-hard-plan-pool",
    maxRetries: restatementHardPlanPoolRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const items: Record<string, unknown>[] = [];

  for (const task of restatementHardPlanPoolTasks) {
    if (calls >= restatementHardPlanPoolMaxStageACalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > restatementHardPlanPoolSpendCapUsd) break;

    const writerUser = stageAPlanPoolUser({ situationBrief: task.situationBrief });
    writeFileSync(
      path.join(resolved, `${task.id}.stage-a.prompt.json`),
      `${JSON.stringify({ id: task.id, writerUser, productionPrompt: qualityAuthoringPromptVersion, experimentalPrompt: "stage-a-plan-pool.v1" }, null, 2)}\n`,
    );

    const startedAt = Date.now();
    let usage = emptyUsage();
    let contentText = "";
    let combinedText = "";
    let error: string | null = null;
    let costUsd: number | null = null;
    const spentBefore = spentUsd;
    console.error(`plan-pool stage-a ${calls + 1}/${restatementHardPlanPoolMaxStageACalls} ${task.id} capRemaining=$${(restatementHardPlanPoolSpendCapUsd - spentUsd).toFixed(4)}`);

    try {
      const response = await provider.generate({
        model,
        system: stageAPlanPoolSystem,
        parts: [{ text: writerUser }],
        jsonSchema: stageAPlanPoolResponseSchema,
        temperature: 0,
        maxOutputTokens: qualityAuthoringLivePilotOutputTokens,
      });
      calls += 1;
      usage = {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        reasoningTokens: response.usage.reasoningTokens ?? null,
      };
      contentText = response.contentText ?? "";
      combinedText = response.text;
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
      path.join(resolved, `${task.id}.stage-a.raw.json`),
      `${JSON.stringify({ id: task.id, model: qualityAuthoringLivePilotWriter, usage, costUsd, contentText, combinedText, error, latencyMs: Date.now() - startedAt }, null, 2)}\n`,
    );

    let parsed: unknown = null;
    try {
      if (!error) parsed = JSON.parse(extractJsonText(contentText || combinedText));
    } catch {
      error = error ?? "output is not valid JSON";
    }
    const parsedCheck = stageAPlanPoolOutput.safeParse(parsed);
    const parsedRecord = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const plans = Array.isArray(parsedRecord.plans) ? parsedRecord.plans : [];
    writeFileSync(
      path.join(resolved, `${task.id}.stage-a.writer.json`),
      `${JSON.stringify({ parsed, error, parseOk: parsedCheck.success, planCount: plans.length, status: parsedRecord.status ?? null }, null, 2)}\n`,
    );
    items.push({
      id: task.id,
      error,
      usage,
      costUsd,
      parseOk: parsedCheck.success,
      planCount: plans.length,
      status: parsedRecord.status ?? null,
      source: typeof parsedRecord.source === "string" ? parsedRecord.source : null,
      key: typeof parsedRecord.key === "string" ? parsedRecord.key : null,
      qualityAccepted: false,
      meaningProven: false,
    });
  }

  const summary = {
    executed: true,
    started: true,
    phase: "stage-a",
    providerCalls: calls,
    stageACalls: calls,
    stageBCalls: 0,
    judgeCalls: 0,
    recoveryCalls: 0,
    spentUsd,
    ceiling,
    items,
    productionPromptUnchanged: qualityAuthoringPromptVersion,
    recordsImmutable: locksUnchanged(before),
    qualityAccepted: false,
    meaningProven: false,
    hardCalibrationStatus: "not_run",
    studentBankWrites: 0,
    productionGate: false,
    originalBenchmarkConstructionPass: "0/5 not updated",
    fourRelationConstructionPass: "2/5 not updated",
    liveGenerate: calls,
  };
  writeFileSync(path.join(resolved, "stage-a-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function runRestatementHardPlanPoolStageB(
  authorization: string,
  allowIds: string[],
  outDir = restatementHardPlanPoolOutputDir,
) {
  const gate = safetyGate(authorization, outDir);
  if (!("ok" in gate)) return gate;
  const resolved = gate.resolved;
  if (!existsSync(path.join(resolved, "stage-a-summary.json"))) {
    return refuseRestatementHardPlanPool("stage A records are required before Stage B", "stage_a");
  }
  if (existsSync(path.join(resolved, "stage-b-summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "stage-b-summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseRestatementHardPlanPool("a completed plan-pool Stage B run is already stored", "completed");
  }

  const stageA = JSON.parse(readFileSync(path.join(resolved, "stage-a-summary.json"), "utf8")) as { spentUsd: number };
  const selectionPath = path.join(resolved, "plan-selection.json");
  if (!existsSync(selectionPath)) return refuseRestatementHardPlanPool("plan selection is required before Stage B", "selection");
  const selection = JSON.parse(readFileSync(selectionPath, "utf8")) as {
    items: { id: string; stageBEligible: boolean; selectedIds: string[]; keyBlocked: boolean }[];
  };

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseRestatementHardPlanPool("FACTORY_PRICES missing", "budget");
  const ceiling = restatementHardPlanPoolCeiling(prices.table);
  const allowed = new Set(allowIds);
  const eligible = selection.items.filter((row) => allowed.has(row.id) && row.stageBEligible && !row.keyBlocked && row.selectedIds.length === 4);
  if (eligible.length === 0) {
    const skipped = {
      executed: true,
      started: true,
      phase: "stage-b",
      providerCalls: 0,
      stageBCalls: 0,
      spentUsd: stageA.spentUsd,
      reason: "no item with four selected plans and unblocked key",
      items: [] as unknown[],
      qualityAccepted: false,
      meaningProven: false,
      hardCalibrationStatus: "not_run",
    };
    writeFileSync(path.join(resolved, "stage-b-summary.json"), `${JSON.stringify(skipped, null, 2)}\n`);
    return skipped;
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return refuseRestatementHardPlanPool("missing openrouter API key", "credentials");

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-restatement-hard-plan-pool-b",
    maxRetries: restatementHardPlanPoolRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = stageA.spentUsd;
  let calls = 0;
  const items: Record<string, unknown>[] = [];

  for (const row of eligible) {
    if (calls >= restatementHardPlanPoolMaxStageBCalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > restatementHardPlanPoolSpendCapUsd) break;
    const writer = JSON.parse(readFileSync(path.join(resolved, `${row.id}.stage-a.writer.json`), "utf8")) as {
      parsed: {
        source: string;
        key: string;
        plans: { planId: string; sourceProposition: string; semanticMutation: string; trapType: string; whyStanding?: string; whyContradicted?: string }[];
      };
    };
    const byId = new Map((writer.parsed.plans ?? []).map((plan) => [plan.planId, plan]));
    const selectedPlans = row.selectedIds.map((planId, index) => {
      const plan = byId.get(planId);
      if (!plan) return null;
      return {
        planId: `p${index + 1}`,
        sourceProposition: plan.sourceProposition,
        semanticMutation: plan.semanticMutation,
        trapType: plan.trapType,
        whyContradicted: plan.whyStanding ?? plan.whyContradicted ?? plan.semanticMutation,
      };
    });
    if (selectedPlans.some((plan) => plan == null) || selectedPlans.length !== 4) continue;
    const plans = selectedPlans as { planId: string; sourceProposition: string; semanticMutation: string; trapType: string; whyContradicted: string }[];

    const writerUser = stageBWordingUser({ source: writer.parsed.source, key: writer.parsed.key, plans });
    writeFileSync(path.join(resolved, `${row.id}.stage-b.prompt.json`), `${JSON.stringify({ id: row.id, poolIds: row.selectedIds, writerUser }, null, 2)}\n`);

    const startedAt = Date.now();
    let usage = emptyUsage();
    let contentText = "";
    let combinedText = "";
    let error: string | null = null;
    let costUsd: number | null = null;
    const spentBefore = spentUsd;
    console.error(`plan-pool stage-b ${calls + 1}/${restatementHardPlanPoolMaxStageBCalls} ${row.id} capRemaining=$${(restatementHardPlanPoolSpendCapUsd - spentUsd).toFixed(4)}`);

    try {
      const response = await provider.generate({
        model,
        system: stageBWordingSystem,
        parts: [{ text: writerUser }],
        jsonSchema: stageBWordingResponseSchema,
        temperature: 0,
        maxOutputTokens: qualityAuthoringLivePilotOutputTokens,
      });
      calls += 1;
      usage = {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        reasoningTokens: response.usage.reasoningTokens ?? null,
      };
      contentText = response.contentText ?? "";
      combinedText = response.text;
      const billedKey = `${provider.name}:${model}`;
      const usageRow = (usageRows[billedKey] ??= { calls: 0, inputTokens: 0, outputTokens: 0 });
      usageRow.calls += 1;
      usageRow.inputTokens += usage.inputTokens;
      usageRow.outputTokens += usage.outputTokens;
      if (usage.reasoningTokens != null) usageRow.reasoningTokens = (usageRow.reasoningTokens ?? 0) + usage.reasoningTokens;
      const estimated = estimateCost(usageRows, prices);
      spentUsd = stageA.spentUsd + (estimated.usd ?? 0);
      costUsd = estimated.usd != null ? Math.round((spentUsd - spentBefore) * 1_000_000) / 1_000_000 : null;
    } catch (caught) {
      calls += 1;
      const message = caught instanceof Error ? caught.message : "call failed";
      error = /api[_-]?key|sk-|or-auth/i.test(message) ? "provider call failed" : message.slice(0, 180);
    }

    writeFileSync(
      path.join(resolved, `${row.id}.stage-b.raw.json`),
      `${JSON.stringify({ id: row.id, model: qualityAuthoringLivePilotWriter, usage, costUsd, contentText, combinedText, error, latencyMs: Date.now() - startedAt }, null, 2)}\n`,
    );

    let parsed: unknown = null;
    try {
      if (!error) parsed = JSON.parse(extractJsonText(contentText || combinedText));
    } catch {
      error = error ?? "output is not valid JSON";
    }
    const parsedCheck = stageBWordingOutput.safeParse(parsed);
    const parsedRecord = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const candidates = Array.isArray(parsedRecord.candidates) ? parsedRecord.candidates : [];
    writeFileSync(
      path.join(resolved, `${row.id}.stage-b.writer.json`),
      `${JSON.stringify(
        {
          parsed,
          error,
          parseOk: parsedCheck.success,
          candidateCount: candidates.length,
          padded: false,
          sourceUnchanged: parsedRecord.source === writer.parsed.source,
          keyUnchanged: parsedRecord.key === writer.parsed.key,
          poolIds: row.selectedIds,
        },
        null,
        2,
      )}\n`,
    );
    items.push({ id: row.id, error, costUsd, parseOk: parsedCheck.success, candidateCount: candidates.length, usage, qualityAccepted: false, meaningProven: false });
  }

  const summary = {
    executed: true,
    started: true,
    phase: "stage-b",
    providerCalls: calls,
    stageBCalls: calls,
    spentUsd,
    ceiling,
    allowIds,
    eligibleIds: eligible.map((row) => row.id),
    items,
    qualityAccepted: false,
    meaningProven: false,
    hardCalibrationStatus: "not_run",
    independentlyVerifiedPass: false,
  };
  writeFileSync(path.join(resolved, "stage-b-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
