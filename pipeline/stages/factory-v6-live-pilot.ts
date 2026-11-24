import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { writerBakeoffOutput, writerBakeoffPromptVersion, writerBakeoffResponseSchema, writerBakeoffSystem } from "../ai/prompts/writer-bakeoff.v1";
import { extractJsonText } from "../ai/service";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import {
  assessFactoryV6LivePilotReport,
  buildV6PilotTask,
  compareV6PilotToHaikuBenchmark,
  factoryV6LivePilotAuthorization,
  factoryV6LivePilotLiveAuthorized,
  factoryV6LivePilotMaxCalls,
  factoryV6LivePilotOutputDir,
  factoryV6LivePilotOutputTokens,
  factoryV6LivePilotRetry,
  factoryV6LivePilotSourceIds,
  factoryV6LivePilotSpendCapUsd,
  factoryV6LivePilotWriter,
  loadHaikuBenchmarkCell,
  pilotCeilingUsd,
  refuseFactoryV6LivePilot,
  validateAllV6PilotPreFlight,
  v6PilotProtectedDirs,
  writeFactoryV6LivePilotOfflinePreFlight,
} from "@/modules/factory/item-model/factory-v6-live-pilot";
import { parseBakeoffWriterOutput } from "@/modules/factory/item-model/writer-bakeoff";
import { assessJsonSchemaHonor } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: null as number | null };
}

export async function runFactoryV6ControlledLivePilot(
  authorization: string,
  outDir = factoryV6LivePilotOutputDir,
) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== factoryV6LivePilotAuthorization || !factoryV6LivePilotLiveAuthorized) {
    return refuseFactoryV6LivePilot("factory v6 controlled live pilot authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (v6PilotProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseFactoryV6LivePilot("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseFactoryV6LivePilot("a completed v6 pilot is already stored", "completed");
  }

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);

  const preFlight = writeFactoryV6LivePilotOfflinePreFlight();
  if (!preFlight.ok) {
    writeFileSync(
      path.join(resolved, "summary.json"),
      `${JSON.stringify({ executed: false, preFlightOk: false, reason: "pre_flight_failed", errors: preFlight.bySource }, null, 2)}\n`,
    );
    return {
      ...refuseFactoryV6LivePilot("writer prompt pre-flight failed", "pre_flight"),
      preFlight,
    };
  }

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseFactoryV6LivePilot("FACTORY_PRICES missing", "budget");
  const ceiling = pilotCeilingUsd(prices.table);
  if (ceiling.threeCallUsd == null) return refuseFactoryV6LivePilot("haiku writer is unpriced", "budget");
  if (!ceiling.fitsCap) {
    return {
      ...refuseFactoryV6LivePilot(
        `conservative three-call ceiling $${ceiling.threeCallUsd.toFixed(4)} exceeds $${factoryV6LivePilotSpendCapUsd}`,
        "budget",
      ),
      ceiling,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return refuseFactoryV6LivePilot("missing openrouter API key", "credentials");

  try {
    publishToStudentBank();
    return refuseFactoryV6LivePilot("student bank opened", "runner");
  } catch {
    /* closed */
  }

  for (const sourceId of factoryV6LivePilotSourceIds) {
  if (!loadHaikuBenchmarkCell(sourceId)) {
    return refuseFactoryV6LivePilot(`missing haiku benchmark cell for ${sourceId}`, "benchmark");
  }
  }

  mkdirSync(resolved, { recursive: true });
  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory-v6-pilot",
    maxRetries: factoryV6LivePilotRetry,
    minOutputTokens: factoryV6LivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; cacheWriteTokens?: number; cacheReadTokens?: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const callRows: Parameters<typeof assessFactoryV6LivePilotReport>[0]["calls"] = [];

  for (const sourceId of factoryV6LivePilotSourceIds) {
    if (calls >= factoryV6LivePilotMaxCalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > factoryV6LivePilotSpendCapUsd) break;

    const task = buildV6PilotTask(sourceId);
    const schema = writerBakeoffResponseSchema(task.planCount);
    const model = parseModel(factoryV6LivePilotWriter, "openrouter").model;
    console.error(`factory-v6-pilot call ${calls + 1}/${factoryV6LivePilotMaxCalls} ${sourceId} capRemaining=$${(factoryV6LivePilotSpendCapUsd - spentUsd).toFixed(4)}`);

    writeFileSync(path.join(resolved, `${sourceId}.prompt.json`), `${JSON.stringify({ promptVersion: writerBakeoffPromptVersion, writerUser: task.writerUser, planIds: task.plans.map((plan) => plan.planId) }, null, 2)}\n`);

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

    try {
      const response = await provider.generate({
        model,
        system: writerBakeoffSystem,
        parts: [{ text: task.writerUser }],
        jsonSchema: schema,
        temperature: 0,
        maxOutputTokens: factoryV6LivePilotOutputTokens,
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
      writeFileSync(
        path.join(resolved, `${sourceId}.raw.json`),
        `${JSON.stringify({ sourceId, model, usage, finishReason, latencyMs: Date.now() - startedAt, contentText, reasoningText, combinedText }, null, 2)}\n`,
      );
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

    const latencyMs = Date.now() - startedAt;
    let parsed: unknown = null;
    try {
      if (!error) parsed = JSON.parse(extractJsonText(contentText || combinedText));
    } catch {
      error = error ?? "output is not valid JSON";
    }
    const shape = parsed ? parseBakeoffWriterOutput(parsed, task.planCount) : parseBakeoffWriterOutput(combinedText, task.planCount);
    const candidates = shape.status === "ok" ? shape.candidates : [];
    const jsonHonor = assessJsonSchemaHonor({
      contentText,
      reasoningText,
      combinedText,
      planCount: task.planCount,
    });

    const benchmark = loadHaikuBenchmarkCell(sourceId);
    const compare =
      shape.status === "ok" && benchmark
        ? compareV6PilotToHaikuBenchmark({ task, v6Candidates: shape.candidates, benchmark })
        : null;

    if (shape.status === "ok") {
      writeFileSync(
        path.join(resolved, `${sourceId}.v6.json`),
        `${JSON.stringify({ sourceId, candidates, jsonHonor, compare: compare ? { compareRows: compare.compareRows, secondAnswerRisk: compare.secondAnswerRisk, facultyRoleCarry: compare.facultyRoleCarry } : null }, null, 2)}\n`,
      );
    }

    callRows.push({
      sourceId,
      providerCallOk,
      jsonHonor,
      usage,
      costUsd,
      latencyMs,
      candidates,
      compare,
      ...(error ? { error } : {}),
    } as (typeof callRows)[number]);
  }

  const recordsImmutable = {
    writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
    qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
  };

  const report = assessFactoryV6LivePilotReport({
    preFlight,
    ceiling,
    calls: callRows,
    spentUsd,
    recordsImmutable,
  });

  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify({ ...report, executed: true, providerCalls: calls }, null, 2)}\n`);
  writeFileSync(path.join(resolved, "quality-comparison.json"), `${JSON.stringify(report.qualityComparison, null, 2)}\n`);
  writeFileSync(
    path.join(resolved, "calls.json"),
    `${JSON.stringify(
      callRows.map((row) => ({
        sourceId: row.sourceId,
        providerCallOk: row.providerCallOk,
        jsonHonor: row.jsonHonor,
        usage: row.usage,
        reasoningTokens: row.usage.reasoningTokens,
        costUsd: row.costUsd,
        latencyMs: row.latencyMs,
        candidates: row.candidates,
      })),
      null,
      2,
    )}\n`,
  );

  return { started: true, executed: true, providerCalls: calls, ...report };
}