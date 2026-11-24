import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { v6WriterExperimentReasoningProfiles } from "../ai/openrouter-reasoning";
import { estimateCost, loadPrices } from "../ai/prices";
import { writerBakeoffPromptVersion, writerBakeoffResponseSchema, writerBakeoffSystem } from "../ai/prompts/writer-bakeoff.v1";
import { extractJsonText } from "../ai/service";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { buildV6PilotTask } from "@/modules/factory/item-model/factory-v6-live-pilot";
import {
  allowBakeoffCall,
  assessFactoryV6WriterComparison,
  buildBlindModelPacks,
  challengePricesFromCatalog,
  comparisonLiveJobs,
  comparisonProtectedDirs,
  comparisonSourceIds,
  factoryV6WriterComparisonAuthorization,
  factoryV6WriterComparisonLiveAuthorized,
  factoryV6WriterComparisonMaxCalls,
  factoryV6WriterComparisonOutputDir,
  factoryV6WriterComparisonOutputTokens,
  factoryV6WriterComparisonRetry,
  factoryV6WriterComparisonSpendCapUsd,
  parseOpenRouterCatalog,
  refuseFactoryV6WriterComparison,
  visibleTokens,
  writeFactoryV6WriterComparisonPreFlight,
  type ComparisonCell,
} from "@/modules/factory/item-model/factory-v6-writer-comparison";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { parseBakeoffWriterOutput } from "@/modules/factory/item-model/writer-bakeoff";
import { assessJsonSchemaHonor } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { qualityFirstFrozenModels } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: null as number | null };
}

async function fetchCatalog(apiKey: string, baseUrl: string): Promise<unknown> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
  });
  if (!response.ok) throw new Error(`openrouter catalog GET ${response.status}`);
  return response.json();
}

export async function runFactoryV6WriterComparison(
  authorization: string,
  outDir = factoryV6WriterComparisonOutputDir,
) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== factoryV6WriterComparisonAuthorization || !factoryV6WriterComparisonLiveAuthorized) {
    return refuseFactoryV6WriterComparison("v6 writer comparison authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (comparisonProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseFactoryV6WriterComparison("comparison refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseFactoryV6WriterComparison("a completed comparison run is already stored", "completed");
  }

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseFactoryV6WriterComparison("FACTORY_PRICES missing", "budget");

  const config = loadAIConfig();
  if (!config.keys.openrouter) return refuseFactoryV6WriterComparison("missing openrouter API key", "credentials");

  try {
    publishToStudentBank();
    return refuseFactoryV6WriterComparison("student bank opened", "runner");
  } catch {
    /* closed */
  }

  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseFactoryV6WriterComparison("production flag or Recovery is on", "guardrail");
  }
  if (qualityFirstFrozenModels.writer !== "openrouter:anthropic/claude-haiku-5.5") {
    return refuseFactoryV6WriterComparison("production writer drifted", "guardrail");
  }

  let catalogRaw: unknown = null;
  try {
    catalogRaw = await fetchCatalog(config.keys.openrouter, config.openrouterBaseUrl);
  } catch {
    catalogRaw = null;
  }
  const catalog = catalogRaw ? parseOpenRouterCatalog(catalogRaw) : [];
  const livePrices = catalog.length ? { ...prices, table: { ...prices.table, ...challengePricesFromCatalog(catalog) } } : prices;
  const preFlight = writeFactoryV6WriterComparisonPreFlight(catalog, livePrices.table);
  if (!preFlight.ok) {
    mkdirSync(resolved, { recursive: true });
    writeFileSync(
      path.join(resolved, "summary.json"),
      `${JSON.stringify({ executed: false, preFlightOk: false, errors: preFlight.errors, providerCalls: 0 }, null, 2)}\n`,
    );
    return { ...refuseFactoryV6WriterComparison("comparison pre-flight failed", "pre_flight"), preFlight };
  }

  mkdirSync(resolved, { recursive: true });
  writeFileSync(path.join(resolved, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory-v6-writer-comparison",
    maxRetries: factoryV6WriterComparisonRetry,
    minOutputTokens: factoryV6WriterComparisonOutputTokens,
    timeoutMs: 300_000,
    reasoningProfiles: v6WriterExperimentReasoningProfiles,
  });

  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const live: ComparisonCell[] = [];

  for (const job of comparisonLiveJobs) {
    if (calls >= factoryV6WriterComparisonMaxCalls) break;
    const perCall = preFlight.ceiling.perCall.find((row) => row.writer === job.writer && row.sourceId === job.sourceId)?.perCallUsd ?? 0;
    if (!allowBakeoffCall(spentUsd, perCall, factoryV6WriterComparisonSpendCapUsd)) {
      writeFileSync(
        path.join(resolved, "summary.json"),
        `${JSON.stringify({ executed: false, reason: "next call would exceed $0.03", providerCalls: calls, spentUsd }, null, 2)}\n`,
      );
      return refuseFactoryV6WriterComparison("next call would exceed $0.03", "budget");
    }

    const task = buildV6PilotTask(job.sourceId);
    const schema = writerBakeoffResponseSchema(task.planCount);
    const model = parseModel(job.writer, "openrouter").model;
    writeFileSync(
      path.join(resolved, `${job.sourceId}__${job.writer.replaceAll("/", "_")}.prompt.json`),
      `${JSON.stringify({ promptVersion: writerBakeoffPromptVersion, writerUser: task.writerUser, planIds: task.plans.map((plan) => plan.planId), reasoningProfile: "disabled" }, null, 2)}\n`,
    );
    console.error(
      `factory-v6-comparison call ${calls + 1}/${factoryV6WriterComparisonMaxCalls} ${job.writer} ${task.alias} remaining=$${(factoryV6WriterComparisonSpendCapUsd - spentUsd).toFixed(4)} ceiling=$${perCall.toFixed(4)}`,
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
    try {
      const response = await provider.generate({
        model,
        system: writerBakeoffSystem,
        parts: [{ text: task.writerUser }],
        jsonSchema: schema,
        temperature: 0,
        maxOutputTokens: factoryV6WriterComparisonOutputTokens,
        reasoningProfile: "disabled",
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
        path.join(resolved, `${job.sourceId}__${job.writer.replaceAll("/", "_")}.raw.json`),
        `${JSON.stringify({ sourceId: job.sourceId, writer: job.writer, usage, finishReason, latencyMs: Date.now() - startedAt, contentText, reasoningText, combinedText, reasoning: { effort: "none" } }, null, 2)}\n`,
      );
      const billedKey = `${provider.name}:${model}`;
      const row = (usageRows[billedKey] ??= { calls: 0, inputTokens: 0, outputTokens: 0 });
      row.calls += 1;
      row.inputTokens += usage.inputTokens;
      row.outputTokens += usage.outputTokens;
      if (usage.reasoningTokens != null) row.reasoningTokens = (row.reasoningTokens ?? 0) + usage.reasoningTokens;
      const cost = estimateCost(usageRows, livePrices);
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
    const jsonHonor = assessJsonSchemaHonor({ contentText, reasoningText, combinedText, planCount: task.planCount });
    const candidates = shape.status === "ok" ? shape.candidates : [];
    if (shape.status === "ok") {
      writeFileSync(
        path.join(resolved, `${job.sourceId}__${job.writer.replaceAll("/", "_")}.json`),
        `${JSON.stringify({ sourceId: job.sourceId, writer: job.writer, candidates, jsonHonor, reasoning: { effort: "none" } }, null, 2)}\n`,
      );
    }
    live.push({
      writer: job.writer,
      sourceId: job.sourceId,
      reused: false,
      origin: "comparison-live-effort-none",
      reasoning: { effort: "none" },
      providerCallOk,
      jsonHonored: jsonHonor.honored,
      finishReason: finishReason ?? null,
      usage,
      visibleOutputTokens: visibleTokens(usage),
      costUsd,
      latencyMs,
      candidates,
      ...(error ? { error } : {}),
    });
  }

  const recordsImmutable = {
    writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
    qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
  };
  const report = assessFactoryV6WriterComparison({
    catalog,
    ceiling: preFlight.ceiling,
    reused: preFlight.reused,
    live,
    spentUsd,
    recordsImmutable,
  });
  const tasks = comparisonSourceIds.map((id) => buildV6PilotTask(id));
  const blind = buildBlindModelPacks({ tasks, cells: [...preFlight.reused, ...live] });

  mkdirSync(path.join(resolved, "blind"), { recursive: true });
  for (const pack of blind.packs) {
    writeFileSync(path.join(resolved, "blind", `${pack.packId}.json`), `${JSON.stringify({ packId: pack.packId, items: pack.items }, null, 2)}\n`);
  }
  writeFileSync(path.join(resolved, "blind", "key.json"), `${JSON.stringify({ seed: blind.seed, key: blind.key }, null, 2)}\n`);
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify({ ...report, executed: true, providerCalls: calls, packedModelHidden: blind.modelNameHidden }, null, 2)}\n`);
  writeFileSync(path.join(resolved, "quality-comparison.json"), `${JSON.stringify({ editorialAcceptance: "pending", winnerDeclared: false, machineOnly: true, scorecards: report.scorecards, optionComparisons: report.optionComparisons }, null, 2)}\n`);
  writeFileSync(path.join(resolved, "calls.json"), `${JSON.stringify(live, null, 2)}\n`);
  writeFileSync(
    path.join(resolved, "high-reasoning-archive.json"),
    `${JSON.stringify(report.highReasoningChallengeArchive, null, 2)}\n`,
  );

  return { started: true, executed: true, providerCalls: calls, ...report };
}
