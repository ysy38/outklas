import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { v6WriterExperimentReasoningProfiles } from "../ai/openrouter-reasoning";
import { estimateCost, loadPrices } from "../ai/prices";
import { writerBakeoffPromptVersion, writerBakeoffResponseSchema, writerBakeoffSystem } from "../ai/prompts/writer-bakeoff.v1";
import { extractJsonText } from "../ai/service";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { auditFacultyRoleCarry, buildV6PilotTask, factoryV6LivePilotWriter } from "@/modules/factory/item-model/factory-v6-live-pilot";
import {
  auditChallengeOption,
  buildBlindPack,
  challengePricesFromCatalog,
  challengeProtectedDirs,
  factoryV6WriterChallengeAuthorization,
  factoryV6WriterChallengeCatalogUrl,
  factoryV6WriterChallengeLiveAuthorized,
  factoryV6WriterChallengeMaxCalls,
  factoryV6WriterChallengeModels,
  factoryV6WriterChallengeOutputDir,
  factoryV6WriterChallengeOutputTokens,
  factoryV6WriterChallengeRetry,
  factoryV6WriterChallengeSourceIds,
  factoryV6WriterChallengeSpendCapUsd,
  parseOpenRouterCatalog,
  refuseFactoryV6WriterChallenge,
  writeFactoryV6WriterChallengePreFlight,
  type ChallengeCandidate,
} from "@/modules/factory/item-model/factory-v6-writer-challenge";
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

export async function runFactoryV6WriterChallenge(
  authorization: string,
  outDir = factoryV6WriterChallengeOutputDir,
) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== factoryV6WriterChallengeAuthorization || !factoryV6WriterChallengeLiveAuthorized) {
    return refuseFactoryV6WriterChallenge("factory v6 writer challenge authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (challengeProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseFactoryV6WriterChallenge("challenge refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseFactoryV6WriterChallenge("a completed writer challenge is already stored", "completed");
  }

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseFactoryV6WriterChallenge("FACTORY_PRICES missing", "budget");

  const config = loadAIConfig();
  if (!config.keys.openrouter) return refuseFactoryV6WriterChallenge("missing openrouter API key", "credentials");

  let catalogRaw: unknown;
  try {
    catalogRaw = await fetchCatalog(config.keys.openrouter, config.openrouterBaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "catalog GET failed";
    return refuseFactoryV6WriterChallenge(/api[_-]?key/i.test(message) ? "catalog GET failed" : message.slice(0, 160), "catalog");
  }
  const catalog = parseOpenRouterCatalog(catalogRaw);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "catalog.json"),
    `${JSON.stringify({ method: "GET", url: factoryV6WriterChallengeCatalogUrl, generateCalls: 0, models: catalog }, null, 2)}\n`,
  );

  const preFlight = writeFactoryV6WriterChallengePreFlight(catalog, prices.table);
  if (!preFlight.ok) {
    writeFileSync(
      path.join(resolved, "summary.json"),
      `${JSON.stringify({ executed: false, preFlightOk: false, reason: "pre_flight_failed", errors: preFlight.errors, providerCalls: 0 }, null, 2)}\n`,
    );
    return { ...refuseFactoryV6WriterChallenge("writer challenge pre-flight failed", "pre_flight"), preFlight };
  }

  try {
    publishToStudentBank();
    return refuseFactoryV6WriterChallenge("student bank opened", "runner");
  } catch {
    /* closed */
  }

  const livePrices = { ...prices, table: { ...prices.table, ...challengePricesFromCatalog(catalog) } };
  const tasks = factoryV6WriterChallengeSourceIds.map((id) => buildV6PilotTask(id));
  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory-v6-writer-challenge",
    maxRetries: factoryV6WriterChallengeRetry,
    minOutputTokens: factoryV6WriterChallengeOutputTokens,
    timeoutMs: 300_000,
    reasoningProfiles: v6WriterExperimentReasoningProfiles,
  });

  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; cacheWriteTokens?: number; cacheReadTokens?: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const callRows: {
    writer: string;
    sourceId: string;
    providerCallOk: boolean;
    jsonHonor: ReturnType<typeof assessJsonSchemaHonor>;
    usage: ReturnType<typeof emptyUsage>;
    costUsd: number | null;
    latencyMs: number;
    finishReason: string | undefined;
    candidates: ChallengeCandidate[];
    error?: string;
  }[] = [];

  for (const sourceId of factoryV6WriterChallengeSourceIds) {
    const task = tasks.find((row) => row.id === sourceId)!;
    const schema = writerBakeoffResponseSchema(task.planCount);
    writeFileSync(
      path.join(resolved, `${sourceId}.prompt.json`),
      `${JSON.stringify({ promptVersion: writerBakeoffPromptVersion, writerUser: task.writerUser, planIds: task.plans.map((plan) => plan.planId) }, null, 2)}\n`,
    );
    for (const setting of factoryV6WriterChallengeModels) {
      if (calls >= factoryV6WriterChallengeMaxCalls) break;
      const perCall = preFlight.ceiling.perModel.find((row) => row.setting === setting)?.perCallUsd ?? 0;
      if (spentUsd + perCall > factoryV6WriterChallengeSpendCapUsd) {
        return refuseFactoryV6WriterChallenge("next call would exceed $0.05", "budget");
      }
      const model = parseModel(setting, "openrouter").model;
      console.error(`factory-v6-challenge call ${calls + 1}/${factoryV6WriterChallengeMaxCalls} ${sourceId} remaining=$${(factoryV6WriterChallengeSpendCapUsd - spentUsd).toFixed(4)}`);
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
          maxOutputTokens: factoryV6WriterChallengeOutputTokens,
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
          path.join(resolved, `${sourceId}__${setting.replaceAll("/", "_")}.raw.json`),
          `${JSON.stringify({ sourceId, model, usage, finishReason, latencyMs: Date.now() - startedAt, contentText, reasoningText, combinedText }, null, 2)}\n`,
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
          path.join(resolved, `${sourceId}__${setting.replaceAll("/", "_")}.json`),
          `${JSON.stringify({ sourceId, writer: setting, candidates, jsonHonor }, null, 2)}\n`,
        );
      }
      callRows.push({
        writer: setting,
        sourceId,
        providerCallOk,
        jsonHonor,
        usage,
        costUsd,
        latencyMs,
        finishReason,
        candidates,
        ...(error ? { error } : {}),
      });
    }
  }

  const haikuCells = preFlight.haiku.map((row) => ({ writer: factoryV6LivePilotWriter, sourceId: row.sourceId, candidates: row.candidates }));
  const allCells = [
    ...haikuCells,
    ...callRows.map((row) => ({ writer: row.writer, sourceId: row.sourceId, candidates: row.candidates })),
  ];
  const optionAudits = allCells.flatMap((cell) => {
    const task = tasks.find((row) => row.id === cell.sourceId)!;
    return cell.candidates.map((candidate, index) =>
      auditChallengeOption({ writer: cell.writer, task, plan: task.plans[index]!, candidate }),
    );
  });
  const facultyCarry = allCells
    .filter((cell) => cell.sourceId === "quality-first-translation-en_tr" && cell.candidates.length === 4)
    .map((cell) => ({
      writer: cell.writer,
      ...auditFacultyRoleCarry({
        sourceId: cell.sourceId,
        plans: tasks.find((row) => row.id === cell.sourceId)!.plans,
        candidates: cell.candidates,
      }),
    }));
  const special = {
    embargoQuantity: optionAudits.filter((row) => row.notes.includes("embargo_quantity_weakened") || (row.sourceId.endsWith("hard") && row.planId.includes("QUANTITY"))),
    facultyPurposeResult: optionAudits.filter((row) => row.planId.includes("PURPOSE_RESULT")),
    boardQuantityFocus: optionAudits.filter((row) => row.sourceId.endsWith("tr_en") && (row.planId.includes("QUANTITY") || row.notes.some((note) => note.startsWith("board_")))),
  };
  const packed = buildBlindPack({ tasks, cells: allCells.filter((cell) => cell.candidates.length === 4) });
  mkdirSync(path.join(resolved, "blind"), { recursive: true });
  writeFileSync(path.join(resolved, "blind/pack.json"), `${JSON.stringify({ seed: packed.seed, packHasModelId: packed.packHasModelId, pack: packed.pack }, null, 2)}\n`);
  writeFileSync(path.join(resolved, "blind/key.json"), `${JSON.stringify({ seed: packed.seed, key: packed.key }, null, 2)}\n`);

  const recordsImmutable = {
    writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
    qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
  };

  const report = {
    version: factoryV6WriterChallengeAuthorization,
    executed: true,
    factoryRootCauseFixEnabled,
    livePath: "isolated_runner_only",
    productionWriter: qualityFirstFrozenModels.writer,
    productionJudge: qualityFirstFrozenModels.judge,
    judgeCalls: 0,
    recoveryDefault: recoveryDefaultEnabled ? "off" : "off",
    studentBankWrites: 0,
    meaningProven: false as const,
    qualityProven: false as const,
    editorialAcceptance: "pending" as const,
    humanEditorial: "pending" as const,
    winnerDeclared: false as const,
    writerClaimIsNotProof: true as const,
    haikuRecalled: false,
    providerCalls: calls,
    spendCapUsd: factoryV6WriterChallengeSpendCapUsd,
    spentUsd,
    ceiling: preFlight.ceiling,
    catalog,
    hashes: preFlight.hashes,
    recordsImmutable,
  };

  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    path.join(resolved, "calls.json"),
    `${JSON.stringify(
      callRows.map((row) => ({
        writer: row.writer,
        sourceId: row.sourceId,
        providerCallOk: row.providerCallOk,
        jsonHonor: row.jsonHonor,
        usage: row.usage,
        reasoningTokens: row.usage.reasoningTokens,
        costUsd: row.costUsd,
        latencyMs: row.latencyMs,
        finishReason: row.finishReason,
        candidates: row.candidates,
        ...(row.error ? { error: row.error } : {}),
      })),
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(resolved, "quality-comparison.json"),
    `${JSON.stringify(
      {
        editorialAcceptance: "pending",
        winnerDeclared: false,
        machineOnly: true,
        haikuBaseline: factoryV6LivePilotWriter,
        optionAudits,
        facultyRoleCarry: facultyCarry,
        special,
        evidenceSummary: "inconclusive_machine_only_pending_human_editorial",
      },
      null,
      2,
    )}\n`,
  );

  return { started: true, ...report };
}