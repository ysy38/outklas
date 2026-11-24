import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { stageAPlanningOutput, stageAPlanningResponseSchema, stageAPlanningSystem, stageAPlanningUser } from "../ai/prompts/stage-a-planning.v1";
import { stageBWordingOutput, stageBWordingResponseSchema, stageBWordingSystem, stageBWordingUser } from "../ai/prompts/stage-b-wording.v1";
import { qualityAuthoringPromptVersion } from "../ai/prompts/quality-authoring.v1";
import { extractJsonText } from "../ai/service";
import {
  qualityAuthoringLivePilotOutputTokens,
  qualityAuthoringLivePilotWriter,
  restatementHardBenchmark5OutputDir,
} from "@/modules/factory/item-model/quality-authoring-live-pilot";
import {
  refuseRestatementHardStageAPlanning,
  restatementHardStageAPlanningAuthorization,
  restatementHardStageAPlanningCeiling,
  restatementHardStageAPlanningLiveAuthorized,
  restatementHardStageAPlanningMaxStageACalls,
  restatementHardStageAPlanningMaxStageBCalls,
  restatementHardStageAPlanningOutputDir,
  restatementHardStageAPlanningProtectedDirs,
  restatementHardStageAPlanningRetry,
  restatementHardStageAPlanningSpendCapUsd,
  restatementHardStageAPlanningTasks,
} from "@/modules/factory/item-model/restatement-hard-stage-a-planning";
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
  if (authorization !== restatementHardStageAPlanningAuthorization || !restatementHardStageAPlanningLiveAuthorized) {
    return refuseRestatementHardStageAPlanning("restatement hard stage-a planning authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (restatementHardStageAPlanningProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseRestatementHardStageAPlanning("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseRestatementHardStageAPlanning("pilot refuses an enabled root-cause flag or recovery", "safety");
  }
  try {
    publishToStudentBank();
    return refuseRestatementHardStageAPlanning("student bank opened", "runner");
  } catch {
    /* closed */
  }
  return { ok: true as const, resolved };
}

export async function runRestatementHardStageAPlanning(authorization: string, outDir = restatementHardStageAPlanningOutputDir) {
  const gate = safetyGate(authorization, outDir);
  if (!("ok" in gate)) return gate;
  const resolved = gate.resolved;
  if (existsSync(path.join(resolved, "stage-a-summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "stage-a-summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseRestatementHardStageAPlanning("a completed stage A run is already stored", "completed");
  }

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseRestatementHardStageAPlanning("FACTORY_PRICES missing", "budget");
  const ceiling = restatementHardStageAPlanningCeiling(prices.table);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "estimate.json"),
    `${JSON.stringify(
      {
        ...ceiling,
        note: "Conservative ten-call ceiling exceeds $0.02. Stage A may start. Stage B is gated on remaining cap and four CONTRADICTED plans.",
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
  if (ceiling.fiveStageAUsd == null) return { ...refuseRestatementHardStageAPlanning("haiku writer is unpriced", "budget"), ceiling };
  if (!ceiling.fitsStageACap) {
    return {
      ...refuseRestatementHardStageAPlanning(
        `conservative five Stage A ceiling $${ceiling.fiveStageAUsd.toFixed(4)} exceeds $${restatementHardStageAPlanningSpendCapUsd}`,
        "budget",
      ),
      ceiling,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return { ...refuseRestatementHardStageAPlanning("missing openrouter API key", "credentials"), ceiling };

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
  const beforeBenchmark = fingerprintFiles(restatementHardBenchmark5OutputDir, ["summary.json", "editorial-evaluation.json"]);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-restatement-hard-stage-a-planning",
    maxRetries: restatementHardStageAPlanningRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const items: Record<string, unknown>[] = [];

  for (const task of restatementHardStageAPlanningTasks) {
    if (calls >= restatementHardStageAPlanningMaxStageACalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > restatementHardStageAPlanningSpendCapUsd) break;

    const writerUser = stageAPlanningUser({ situationBrief: task.situationBrief });
    writeFileSync(path.join(resolved, `${task.id}.stage-a.prompt.json`), `${JSON.stringify({ id: task.id, writerUser, productionPrompt: qualityAuthoringPromptVersion }, null, 2)}\n`);

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

    console.error(`stage-a-planning call ${calls + 1}/${restatementHardStageAPlanningMaxStageACalls} ${task.id} capRemaining=$${(restatementHardStageAPlanningSpendCapUsd - spentUsd).toFixed(4)}`);

    try {
      const response = await provider.generate({
        model,
        system: stageAPlanningSystem,
        parts: [{ text: writerUser }],
        jsonSchema: stageAPlanningResponseSchema,
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
      path.join(resolved, `${task.id}.stage-a.raw.json`),
      `${JSON.stringify({ id: task.id, model: qualityAuthoringLivePilotWriter, usage, finishReason, latencyMs: Date.now() - startedAt, costUsd, contentText, reasoningText, combinedText, error }, null, 2)}\n`,
    );

    let parsed: unknown = null;
    try {
      if (!error) parsed = JSON.parse(extractJsonText(contentText || combinedText));
    } catch {
      error = error ?? "output is not valid JSON";
    }
    const parsedCheck = stageAPlanningOutput.safeParse(parsed);
    const parsedRecord = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const plans = Array.isArray(parsedRecord.plans) ? parsedRecord.plans : [];
    writeFileSync(
      path.join(resolved, `${task.id}.stage-a.writer.json`),
      `${JSON.stringify({ parsed, error, parseOk: parsedCheck.success, planCount: plans.length, status: parsedRecord.status ?? null }, null, 2)}\n`,
    );

    items.push({
      id: task.id,
      providerCallOk,
      error,
      usage,
      costUsd,
      latencyMs: Date.now() - startedAt,
      parseOk: parsedCheck.success,
      planCount: plans.length,
      status: parsedRecord.status ?? null,
      source: typeof parsedRecord.source === "string" ? parsedRecord.source : null,
      key: typeof parsedRecord.key === "string" ? parsedRecord.key : null,
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
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
      compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
      benchmark5Unchanged: fingerprintFiles(restatementHardBenchmark5OutputDir, ["summary.json", "editorial-evaluation.json"]) === beforeBenchmark,
    },
    qualityAccepted: false,
    meaningProven: false,
    hardCalibrationStatus: "not_run",
    studentBankWrites: 0,
    productionGate: false,
    originalBenchmarkConstructionPass: "0/5 not updated",
    liveGenerate: calls,
  };
  writeFileSync(path.join(resolved, "stage-a-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function runRestatementHardStageBWording(
  authorization: string,
  allowIds: string[],
  outDir = restatementHardStageAPlanningOutputDir,
) {
  const gate = safetyGate(authorization, outDir);
  if (!("ok" in gate)) return gate;
  const resolved = gate.resolved;
  if (!existsSync(path.join(resolved, "stage-a-summary.json"))) {
    return refuseRestatementHardStageAPlanning("stage A records are required before Stage B", "stage_a");
  }
  if (existsSync(path.join(resolved, "stage-b-summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "stage-b-summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseRestatementHardStageAPlanning("a completed stage B run is already stored", "completed");
  }

  const stageA = JSON.parse(readFileSync(path.join(resolved, "stage-a-summary.json"), "utf8")) as {
    spentUsd: number;
    items: { id: string }[];
  };
  const editorialPath = path.join(resolved, "stage-a-editorial.json");
  if (!existsSync(editorialPath)) return refuseRestatementHardStageAPlanning("stage A editorial is required before Stage B", "editorial");
  const editorial = JSON.parse(readFileSync(editorialPath, "utf8")) as {
    items: { id: string; fourContradictedPlans: boolean; keyAddsUnentailedClaim: boolean }[];
  };

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseRestatementHardStageAPlanning("FACTORY_PRICES missing", "budget");
  const ceiling = restatementHardStageAPlanningCeiling(prices.table);
  const allowed = new Set(allowIds);
  const eligible = editorial.items.filter((row) => allowed.has(row.id) && row.fourContradictedPlans && !row.keyAddsUnentailedClaim);
  if (eligible.length === 0) {
    const skipped = { executed: true, started: true, phase: "stage-b", providerCalls: 0, stageBCalls: 0, spentUsd: stageA.spentUsd, reason: "no item with four CONTRADICTED plans", items: [] as unknown[] };
    writeFileSync(path.join(resolved, "stage-b-summary.json"), `${JSON.stringify(skipped, null, 2)}\n`);
    return skipped;
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return refuseRestatementHardStageAPlanning("missing openrouter API key", "credentials");

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-restatement-hard-stage-b-wording",
    maxRetries: restatementHardStageAPlanningRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = stageA.spentUsd;
  let calls = 0;
  const items: Record<string, unknown>[] = [];

  for (const row of eligible) {
    if (calls >= restatementHardStageAPlanningMaxStageBCalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > restatementHardStageAPlanningSpendCapUsd) break;
    const writerPath = path.join(resolved, `${row.id}.stage-a.writer.json`);
    const writer = JSON.parse(readFileSync(writerPath, "utf8")) as {
      parsed: {
        source: string;
        key: string;
        plans: { planId: string; sourceProposition: string; semanticMutation: string; trapType: string; whyContradicted: string }[];
      };
    };
    if (!writer.parsed?.plans || writer.parsed.plans.length !== 4) continue;

    const writerUser = stageBWordingUser({ source: writer.parsed.source, key: writer.parsed.key, plans: writer.parsed.plans });
    writeFileSync(path.join(resolved, `${row.id}.stage-b.prompt.json`), `${JSON.stringify({ id: row.id, writerUser }, null, 2)}\n`);

    const startedAt = Date.now();
    let usage = emptyUsage();
    let contentText = "";
    let combinedText = "";
    let error: string | null = null;
    let costUsd: number | null = null;
    const spentBefore = spentUsd;
    console.error(`stage-b-wording call ${calls + 1}/${restatementHardStageAPlanningMaxStageBCalls} ${row.id} capRemaining=$${(restatementHardStageAPlanningSpendCapUsd - spentUsd).toFixed(4)}`);

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
    writeFileSync(
      path.join(resolved, `${row.id}.stage-b.writer.json`),
      `${JSON.stringify({
        parsed,
        error,
        parseOk: parsedCheck.success,
        sourceUnchanged: parsedRecord.source === writer.parsed.source,
        keyUnchanged: parsedRecord.key === writer.parsed.key,
      }, null, 2)}\n`,
    );
    items.push({ id: row.id, error, costUsd, parseOk: parsedCheck.success, usage });
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
  };
  writeFileSync(path.join(resolved, "stage-b-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
