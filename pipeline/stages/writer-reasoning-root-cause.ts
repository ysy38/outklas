import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { postJson } from "../ai/http";
import { openrouterBrevity, openrouterUsage } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { writerBakeoffPromptVersion, writerBakeoffResponseSchema, writerBakeoffSystem } from "../ai/prompts/writer-bakeoff.v1";
import { extractJsonText } from "../ai/service";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { buildV6PilotTask } from "@/modules/factory/item-model/factory-v6-live-pilot";
import { challengePricesFromCatalog, parseOpenRouterCatalog } from "@/modules/factory/item-model/factory-v6-writer-challenge";
import {
  reasoningProtectedDirs,
  refuseWriterReasoningRootCause,
  technicalSuccess,
  technicalTestReasoning,
  visibleOutputTokens,
  writeOfflineWriterReasoningRootCause,
  writerReasoningRootCauseAuthorization,
  writerReasoningRootCauseLiveAuthorized,
  writerReasoningRootCauseMaxCalls,
  writerReasoningRootCauseModels,
  writerReasoningRootCauseOutputDir,
  writerReasoningRootCauseOutputTokens,
  writerReasoningRootCauseRetry,
  writerReasoningRootCauseSourceId,
  writerReasoningRootCauseSpendCapUsd,
} from "@/modules/factory/item-model/writer-reasoning-root-cause";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { parseBakeoffWriterOutput } from "@/modules/factory/item-model/writer-bakeoff";
import { assessJsonSchemaHonor } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { qualityFirstFrozenModels } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";

type ChatBody = {
  choices?: { message?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null }; finish_reason?: string }[];
  usage?: Parameters<typeof openrouterUsage>[0];
  model?: string;
  error?: { message?: string } | string;
};

export async function runWriterReasoningRootCause(
  authorization: string,
  outDir = writerReasoningRootCauseOutputDir,
) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== writerReasoningRootCauseAuthorization || !writerReasoningRootCauseLiveAuthorized) {
    return refuseWriterReasoningRootCause("writer reasoning root-cause authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (reasoningProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseWriterReasoningRootCause("root-cause test refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseWriterReasoningRootCause("a completed reasoning root-cause run is already stored", "completed");
  }

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseWriterReasoningRootCause("FACTORY_PRICES missing", "budget");
  const offline = writeOfflineWriterReasoningRootCause(prices.table);
  if (!offline.liveReady) {
    mkdirSync(resolved, { recursive: true });
    writeFileSync(
      path.join(resolved, "summary.json"),
      `${JSON.stringify({ executed: false, preFlightOk: false, errors: offline.liveReadyErrors, providerCalls: 0 }, null, 2)}\n`,
    );
    return { ...refuseWriterReasoningRootCause("offline pre-flight failed", "pre_flight"), offline };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return refuseWriterReasoningRootCause("missing openrouter API key", "credentials");

  try {
    publishToStudentBank();
    return refuseWriterReasoningRootCause("student bank opened", "runner");
  } catch {
    /* closed */
  }

  let catalogRaw: unknown = null;
  try {
    const catalogResponse = await fetch(`${config.openrouterBaseUrl.replace(/\/$/, "")}/models`, {
      headers: { authorization: `Bearer ${config.keys.openrouter}`, accept: "application/json" },
    });
    if (catalogResponse.ok) catalogRaw = await catalogResponse.json();
  } catch {
    catalogRaw = null;
  }
  const liveCatalog = catalogRaw ? parseOpenRouterCatalog(catalogRaw) : [];
  const livePrices = liveCatalog.length
    ? { ...prices, table: { ...prices.table, ...challengePricesFromCatalog(liveCatalog) } }
    : prices;

  const task = buildV6PilotTask(writerReasoningRootCauseSourceId);
  const schema = writerBakeoffResponseSchema(task.planCount);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "prompt.json"),
    `${JSON.stringify({ promptVersion: writerBakeoffPromptVersion, writerUser: task.writerUser, planIds: task.plans.map((plan) => plan.planId) }, null, 2)}\n`,
  );

  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const rows: Record<string, unknown>[] = [];

  for (const setting of writerReasoningRootCauseModels) {
    if (calls >= writerReasoningRootCauseMaxCalls) break;
    const perCall = offline.ceiling.perModel.find((row) => row.setting === setting)?.perCallUsd ?? 0;
    if (spentUsd + perCall > writerReasoningRootCauseSpendCapUsd) {
      return refuseWriterReasoningRootCause("next call would exceed $0.03", "budget");
    }
    const model = parseModel(setting, "openrouter").model;
    const requestBody = {
      model,
      messages: [
        { role: "system", content: `${writerBakeoffSystem}\n\n${openrouterBrevity}` },
        { role: "user", content: task.writerUser },
      ],
      temperature: 0,
      max_tokens: writerReasoningRootCauseOutputTokens,
      reasoning: { ...technicalTestReasoning },
      response_format: { type: "json_schema", json_schema: { name: "output", strict: true, schema } },
    };
    writeFileSync(
      path.join(resolved, `${setting.replaceAll("/", "_")}.request.json`),
      `${JSON.stringify({ ...requestBody, notes: { productionWas: { reasoning: { exclude: true } }, technicalTest: { reasoning: technicalTestReasoning }, jsonSchemaUnchanged: true } }, null, 2)}\n`,
    );
    console.error(`writer-reasoning-root-cause call ${calls + 1}/${writerReasoningRootCauseMaxCalls} remaining=$${(writerReasoningRootCauseSpendCapUsd - spentUsd).toFixed(4)}`);
    const startedAt = Date.now();
    let providerCallOk = false;
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: null as number | null };
    let contentText = "";
    let reasoningText = "";
    let finishReason: string | undefined;
    let error: string | null = null;
    let costUsd: number | null = null;
    const spentBefore = spentUsd;
    try {
      const body = (await postJson({
        url: `${config.openrouterBaseUrl.replace(/\/$/, "")}/chat/completions`,
        headers: {
          authorization: `Bearer ${config.keys.openrouter}`,
          accept: "application/json",
          "X-OpenRouter-Title": "tomo-writer-reasoning-root-cause",
        },
        body: requestBody,
        model,
        label: "openrouter",
        retryable: new Set(),
        errorMessage: (parsed, raw) => {
          const chat = parsed as ChatBody | null;
          return (typeof chat?.error === "string" ? chat.error : chat?.error?.message ?? raw.slice(0, 200)).toString();
        },
        options: { maxRetries: writerReasoningRootCauseRetry, timeoutMs: 300_000 },
      })) as ChatBody;
      providerCallOk = true;
      calls += 1;
      const choice = body.choices?.[0];
      contentText = (choice?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      reasoningText = (choice?.message?.reasoning ?? choice?.message?.reasoning_content ?? "").trim();
      finishReason = choice?.finish_reason?.toUpperCase();
      const parsedUsage = openrouterUsage(body.usage);
      usage = {
        inputTokens: parsedUsage.inputTokens,
        outputTokens: parsedUsage.outputTokens,
        totalTokens: parsedUsage.totalTokens,
        reasoningTokens: parsedUsage.reasoningTokens ?? null,
      };
      const billedKey = `openrouter:${model}`;
      const acc = (usageRows[billedKey] ??= { calls: 0, inputTokens: 0, outputTokens: 0 });
      acc.calls += 1;
      acc.inputTokens += usage.inputTokens;
      acc.outputTokens += usage.outputTokens;
      if (usage.reasoningTokens != null) acc.reasoningTokens = (acc.reasoningTokens ?? 0) + usage.reasoningTokens;
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
      if (!error) parsed = JSON.parse(extractJsonText(contentText));
    } catch {
      error = error ?? "output is not valid JSON";
    }
    const shape = parsed ? parseBakeoffWriterOutput(parsed, task.planCount) : parseBakeoffWriterOutput(contentText, task.planCount);
    const jsonHonor = assessJsonSchemaHonor({
      contentText,
      reasoningText,
      combinedText: contentText,
      planCount: task.planCount,
    });
    const candidates = shape.status === "ok" ? shape.candidates : [];
    const success = technicalSuccess({ providerCallOk, jsonHonored: jsonHonor.honored, optionCount: candidates.length });
    writeFileSync(
      path.join(resolved, `${setting.replaceAll("/", "_")}.raw.json`),
      `${JSON.stringify({ model, usage, finishReason, latencyMs, contentText, reasoningText }, null, 2)}\n`,
    );
    rows.push({
      writer: setting,
      request: {
        model,
        temperature: 0,
        max_tokens: writerReasoningRootCauseOutputTokens,
        reasoning: technicalTestReasoning,
        response_format: "json_schema strict",
        productionAdapterUnchanged: true,
      },
      providerCallOk,
      finishReason: finishReason ?? null,
      reasoningTokens: usage.reasoningTokens,
      outputTokens: usage.outputTokens,
      visibleOutputTokens: visibleOutputTokens(usage),
      jsonSchemaHonor: jsonHonor,
      optionCount: candidates.length,
      candidates,
      latencyMs,
      costUsd,
      technicalSuccess: success,
      ...(error ? { error } : {}),
    });
  }

  const recordsImmutable = {
    writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
    qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
  };

  const report = {
    version: writerReasoningRootCauseAuthorization,
    executed: true,
    factoryRootCauseFixEnabled,
    productionWriter: qualityFirstFrozenModels.writer,
    productionJudge: qualityFirstFrozenModels.judge,
    judgeCalls: 0,
    recoveryDefault: recoveryDefaultEnabled ? "off" : "off",
    studentBankWrites: 0,
    winnerDeclared: false as const,
    editorialAcceptance: "pending" as const,
    qualityProven: false as const,
    meaningProven: false as const,
    purpose: "json_generation_technical_test_not_quality",
    productionAdapterUnchanged: true,
    documentedRootCause: offline.documentedRootCause,
    providerCalls: calls,
    spendCapUsd: writerReasoningRootCauseSpendCapUsd,
    spentUsd,
    ceiling: offline.ceiling,
    recordsImmutable,
    rows,
  };
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(resolved, "calls.json"), `${JSON.stringify(rows, null, 2)}\n`);
  return { started: true, ...report };
}