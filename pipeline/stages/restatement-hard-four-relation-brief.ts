import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { qualityAuthoringPromptVersion, qualityAuthoringResponseSchema, qualityAuthoringSystem, qualityAuthoringUser } from "../ai/prompts/quality-authoring.v1";
import { extractJsonText } from "../ai/service";
import { qualityAuthoringLivePilotOutputTokens, qualityAuthoringLivePilotWriter, restatementHardBenchmark5OutputDir } from "@/modules/factory/item-model/quality-authoring-live-pilot";
import {
  refuseRestatementHardFourRelationBrief,
  restatementHardFourRelationBriefAuthorization,
  restatementHardFourRelationBriefCeiling,
  restatementHardFourRelationBriefLiveAuthorized,
  restatementHardFourRelationBriefMaxCalls,
  restatementHardFourRelationBriefOutputDir,
  restatementHardFourRelationBriefPacks,
  restatementHardFourRelationBriefProtectedDirs,
  restatementHardFourRelationBriefRetry,
  restatementHardFourRelationBriefSpendCapUsd,
  restatementHardFourRelationBriefTasks,
} from "@/modules/factory/item-model/restatement-hard-four-relation-brief";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: null as number | null };
}

export async function runRestatementHardFourRelationBrief(authorization: string, outDir = restatementHardFourRelationBriefOutputDir) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== restatementHardFourRelationBriefAuthorization || !restatementHardFourRelationBriefLiveAuthorized) {
    return refuseRestatementHardFourRelationBrief("restatement hard four-relation brief authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (restatementHardFourRelationBriefProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseRestatementHardFourRelationBrief("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseRestatementHardFourRelationBrief("a completed four-relation brief experiment is already stored", "completed");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseRestatementHardFourRelationBrief("pilot refuses an enabled root-cause flag or recovery", "safety");
  }
  try {
    publishToStudentBank();
    return refuseRestatementHardFourRelationBrief("student bank opened", "runner");
  } catch {
    /* closed */
  }

  const prepared = restatementHardFourRelationBriefTasks.filter((task) => task.prepared);
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseRestatementHardFourRelationBrief("FACTORY_PRICES missing", "budget");
  const ceiling = restatementHardFourRelationBriefCeiling(prices.table);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "estimate.json"),
    `${JSON.stringify({ ...ceiling, productionPromptUnchanged: qualityAuthoringPromptVersion, packs: restatementHardFourRelationBriefPacks, conditionARerun: false, judgeCalls: 0, recoveryCalls: 0, studentBankWrites: 0, productionGate: false }, null, 2)}\n`,
  );
  writeFileSync(path.join(resolved, "four-relation-packs.json"), `${JSON.stringify({ packs: restatementHardFourRelationBriefPacks, preparedIds: prepared.map((task) => task.id) }, null, 2)}\n`);
  if (ceiling.preparedUsd == null) return { ...refuseRestatementHardFourRelationBrief("haiku writer is unpriced", "budget"), ceiling };
  if (!ceiling.fitsCap) {
    return {
      ...refuseRestatementHardFourRelationBrief(
        `conservative prepared-call ceiling $${ceiling.preparedUsd.toFixed(4)} exceeds $${restatementHardFourRelationBriefSpendCapUsd}`,
        "budget",
      ),
      ceiling,
    };
  }
  if (prepared.length === 0) return { ...refuseRestatementHardFourRelationBrief("no brief has four CONTRADICTED relations prepared", "unready"), ceiling };

  const config = loadAIConfig();
  if (!config.keys.openrouter) return { ...refuseRestatementHardFourRelationBrief("missing openrouter API key", "credentials"), ceiling };

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
  const beforeBenchmark = fingerprintFiles(restatementHardBenchmark5OutputDir, ["summary.json", "editorial-evaluation.json"]);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-restatement-hard-four-relation-brief",
    maxRetries: restatementHardFourRelationBriefRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const items: Record<string, unknown>[] = [];

  for (const task of prepared) {
    if (calls >= restatementHardFourRelationBriefMaxCalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > restatementHardFourRelationBriefSpendCapUsd) break;

    const writerUser = qualityAuthoringUser({ questionType: task.questionType, direction: task.direction, situationBrief: task.situationBrief });
    writeFileSync(path.join(resolved, `${task.id}.prompt.json`), `${JSON.stringify({ id: task.id, situationBrief: task.situationBrief, writerUser, productionPrompt: qualityAuthoringPromptVersion, packs: task.packs }, null, 2)}\n`);

    const startedAt = Date.now();
    let usage = emptyUsage();
    let contentText = "";
    let combinedText = "";
    let error: string | null = null;
    let costUsd: number | null = null;
    const spentBefore = spentUsd;
    console.error(`four-relation-brief call ${calls + 1}/${prepared.length} ${task.id} capRemaining=$${(restatementHardFourRelationBriefSpendCapUsd - spentUsd).toFixed(4)}`);

    try {
      const response = await provider.generate({
        model,
        system: qualityAuthoringSystem,
        parts: [{ text: writerUser }],
        jsonSchema: qualityAuthoringResponseSchema,
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

    writeFileSync(path.join(resolved, `${task.id}.raw.json`), `${JSON.stringify({ id: task.id, model: qualityAuthoringLivePilotWriter, usage, costUsd, contentText, combinedText, error, latencyMs: Date.now() - startedAt }, null, 2)}\n`);

    let parsed: unknown = null;
    try {
      if (!error) parsed = JSON.parse(extractJsonText(contentText || combinedText));
    } catch {
      error = error ?? "output is not valid JSON";
    }
    const parsedRecord = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const parsedCandidates = Array.isArray(parsedRecord.candidates) ? parsedRecord.candidates : [];
    writeFileSync(path.join(resolved, `${task.id}.writer.json`), `${JSON.stringify({ parsed, error, candidateCount: parsedCandidates.length }, null, 2)}\n`);
    items.push({
      id: task.id,
      error,
      usage,
      costUsd,
      parseOk: !error && parsed != null,
      candidateCount: parsedCandidates.length,
      status: parsedRecord.status ?? null,
      qualityAccepted: false,
      meaningProven: false,
    });
  }

  const summary = {
    executed: true,
    started: true,
    condition: "B_four_relation_briefs",
    conditionARerun: false,
    providerCalls: calls,
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
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
