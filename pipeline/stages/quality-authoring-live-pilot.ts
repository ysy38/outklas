import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { qualityAuthoringResponseSchema, qualityAuthoringSystem, qualityAuthoringUser } from "../ai/prompts/quality-authoring.v1";
import { extractJsonText } from "../ai/service";
import { assembleQualityAuthoring } from "@/modules/factory/item-model/quality-authoring";
import {
  classifyLivePilotDefects,
  emptyEditorialSheet,
  qualityAuthoringLivePilotAuthorization,
  qualityAuthoringLivePilotCeiling,
  qualityAuthoringLivePilotJudgeCalls,
  qualityAuthoringLivePilotLiveAuthorized,
  qualityAuthoringLivePilotLocks,
  qualityAuthoringLivePilotMaxCalls,
  qualityAuthoringLivePilotOutputDir,
  qualityAuthoringLivePilotOutputTokens,
  qualityAuthoringLivePilotProtectedDirs,
  qualityAuthoringLivePilotRetry,
  qualityAuthoringLivePilotSpendCapUsd,
  qualityAuthoringLivePilotTasks,
  qualityAuthoringLivePilotWriter,
  qualityAuthoringCodesignAuthorization,
  qualityAuthoringCodesignCeiling,
  qualityAuthoringCodesignItemId,
  qualityAuthoringCodesignLiveAuthorized,
  qualityAuthoringCodesignMaxCalls,
  qualityAuthoringCodesignOutputDir,
  qualityAuthoringCodesignRetry,
  qualityAuthoringCodesignSpendCapUsd,
  qualityAuthoringCodesignTask,
  qualityAuthoringKnownDefects,
  qualityAuthoringGenerationExperimentAuthorization,
  qualityAuthoringGenerationExperimentCeiling,
  qualityAuthoringGenerationExperimentItemId,
  qualityAuthoringGenerationExperimentLiveAuthorized,
  qualityAuthoringGenerationExperimentMaxCalls,
  qualityAuthoringGenerationExperimentOutputDir,
  qualityAuthoringGenerationExperimentRetry,
  qualityAuthoringGenerationExperimentSpendCapUsd,
  qualityAuthoringGenerationExperimentTask,
  generationExperimentBriefAvoidsFrozenPhrases,
  refuseQualityAuthoringCodesign,
  refuseQualityAuthoringGenerationExperiment,
  refuseQualityAuthoringLivePilot,
  restatementHardBenchmark5Authorization,
  restatementHardBenchmark5BriefsAvoidFrozen,
  restatementHardBenchmark5Ceiling,
  restatementHardBenchmark5LiveAuthorized,
  restatementHardBenchmark5MaxCalls,
  restatementHardBenchmark5OutputDir,
  restatementHardBenchmark5Retry,
  restatementHardBenchmark5SpendCapUsd,
  restatementHardBenchmark5Tasks,
  refuseRestatementHardBenchmark5,
  seedsAvoidFrozenBenchmarks,
  technicalNotesFromAssemble,
} from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: null as number | null };
}

export async function runQualityAuthoringLivePilot(authorization: string, outDir = qualityAuthoringLivePilotOutputDir) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== qualityAuthoringLivePilotAuthorization || !qualityAuthoringLivePilotLiveAuthorized) {
    return refuseQualityAuthoringLivePilot("quality authoring live pilot authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (qualityAuthoringLivePilotProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseQualityAuthoringLivePilot("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseQualityAuthoringLivePilot("a completed live pilot is already stored", "completed");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseQualityAuthoringLivePilot("pilot refuses an enabled root-cause flag or recovery", "safety");
  }
  try {
    publishToStudentBank();
    return refuseQualityAuthoringLivePilot("student bank opened", "runner");
  } catch {
    /* closed */
  }

  const seedCheck = seedsAvoidFrozenBenchmarks();
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseQualityAuthoringLivePilot("FACTORY_PRICES missing", "budget");
  const ceiling = qualityAuthoringLivePilotCeiling(prices.table);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(path.join(resolved, "estimate.json"), `${JSON.stringify({ ...ceiling, seedCheck, judgeCalls: qualityAuthoringLivePilotJudgeCalls }, null, 2)}\n`);
  if (!seedCheck.ok) return { ...refuseQualityAuthoringLivePilot("seed overlaps a frozen benchmark phrase", "seed"), ceiling, seedCheck };
  if (ceiling.threeCallUsd == null) return { ...refuseQualityAuthoringLivePilot("haiku writer is unpriced", "budget"), ceiling };
  if (!ceiling.fitsCap) {
    return {
      ...refuseQualityAuthoringLivePilot(
        `conservative three-call ceiling $${ceiling.threeCallUsd.toFixed(4)} exceeds $${qualityAuthoringLivePilotSpendCapUsd}`,
        "budget",
      ),
      ceiling,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return { ...refuseQualityAuthoringLivePilot("missing openrouter API key", "credentials"), ceiling };

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
  const beforeQualityDir = fingerprintFiles(qualityFirstPilotOutputDir, ["summary.json"]);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-quality-authoring-live-pilot",
    maxRetries: qualityAuthoringLivePilotRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const items: Record<string, unknown>[] = [];
  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;

  for (const task of qualityAuthoringLivePilotTasks) {
    if (calls >= qualityAuthoringLivePilotMaxCalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > qualityAuthoringLivePilotSpendCapUsd) break;

    const writerUser = qualityAuthoringUser({ questionType: task.questionType, direction: task.direction, situationBrief: task.seed });
    writeFileSync(
      path.join(resolved, `${task.id}.prompt.json`),
      `${JSON.stringify({ id: task.id, questionType: task.questionType, direction: task.direction, seed: task.seed, writerUser }, null, 2)}\n`,
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

    console.error(`quality-authoring-live-pilot call ${calls + 1}/${qualityAuthoringLivePilotMaxCalls} ${task.id} capRemaining=$${(qualityAuthoringLivePilotSpendCapUsd - spentUsd).toFixed(4)}`);

    try {
      const response = await provider.generate({
        model,
        system: qualityAuthoringSystem,
        parts: [{ text: writerUser }],
        jsonSchema: qualityAuthoringResponseSchema,
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

    const assemble = assembleQualityAuthoring(parsed ?? {});
    const keptRisks = assemble.selection?.rows.filter((row) => row.decision === "keep").flatMap((row) => row.risks) ?? [];
    const defects = classifyLivePilotDefects({
      id: task.id,
      requestedType: task.questionType,
      requestedDirection: task.direction,
      parsedType: parsed && typeof parsed === "object" && "questionType" in parsed ? String((parsed as { questionType: string }).questionType) : undefined,
      parsedDirection: parsed && typeof parsed === "object" && "direction" in parsed ? String((parsed as { direction: string }).direction) : undefined,
      parseOk: assemble.parseOk,
      uniquePlanIds: assemble.uniquePlanIds,
      keyValid: assemble.keyValid,
      complete: assemble.complete,
      dropped: assemble.dropped,
      keptRisks,
    });
    const notes = technicalNotesFromAssemble(assemble);
    const editorial = emptyEditorialSheet(task.id);

    writeFileSync(path.join(resolved, `${task.id}.writer.json`), `${JSON.stringify({ parsed, error }, null, 2)}\n`);
    writeFileSync(path.join(resolved, `${task.id}.assemble.json`), `${JSON.stringify(assemble, null, 2)}\n`);
    writeFileSync(path.join(resolved, `${task.id}.pack.json`), `${JSON.stringify(assemble.pack, null, 2)}\n`);
    writeFileSync(path.join(resolved, `${task.id}.dropped.json`), `${JSON.stringify(assemble.dropped, null, 2)}\n`);
    writeFileSync(path.join(resolved, `${task.id}.editorial.json`), `${JSON.stringify({ ...editorial, technical: notes, defects }, null, 2)}\n`);

    items.push({
      id: task.id,
      providerCallOk,
      error,
      usage,
      costUsd,
      latencyMs: Date.now() - startedAt,
      parseOk: assemble.parseOk,
      complete: assemble.complete,
      uniquePlanIds: assemble.uniquePlanIds,
      keyValid: assemble.keyValid,
      dropped: assemble.dropped,
      pack: assemble.pack,
      defects,
      editorialAcceptance: "pending",
    });
  }

  const recordsImmutable = {
    writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
    qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
    qualityFirstDirUnchanged: fingerprintFiles(qualityFirstPilotOutputDir, ["summary.json"]) === beforeQualityDir,
  };

  const summary = {
    executed: true,
    started: true,
    providerCalls: calls,
    spentUsd,
    ceiling,
    items,
    recordsImmutable,
    ...qualityAuthoringLivePilotLocks,
    meaningProven: false,
    qualityProven: false,
    winnerDeclared: false,
    fixtureIsNotQualityProof: true,
    liveGenerate: calls,
  };
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(
    path.join(resolved, "editorial-queue.json"),
    `${JSON.stringify(
      {
        editorialAcceptance: "pending",
        humanEditorial: "pending",
        writerClaimIsNotProof: true,
        items: items.map((item) => ({ id: item.id, complete: item.complete, defects: item.defects })),
      },
      null,
      2,
    )}\n`,
  );
  return summary;
}

export async function runQualityAuthoringCodesignRestatement(authorization: string, outDir = qualityAuthoringCodesignOutputDir) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== qualityAuthoringCodesignAuthorization || !qualityAuthoringCodesignLiveAuthorized) {
    return refuseQualityAuthoringCodesign("quality authoring codesign restatement authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  const protectedDirs = qualityAuthoringLivePilotProtectedDirs().filter((dir) => path.resolve(dir) !== path.resolve(qualityAuthoringCodesignOutputDir));
  if (protectedDirs.some((dir) => path.resolve(dir) === resolved) || path.resolve(resolved) === path.resolve(qualityAuthoringLivePilotOutputDir)) {
    return refuseQualityAuthoringCodesign("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseQualityAuthoringCodesign("a completed codesign restatement is already stored", "completed");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseQualityAuthoringCodesign("pilot refuses an enabled root-cause flag or recovery", "safety");
  }
  try {
    publishToStudentBank();
    return refuseQualityAuthoringCodesign("student bank opened", "runner");
  } catch {
    /* closed */
  }

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseQualityAuthoringCodesign("FACTORY_PRICES missing", "budget");
  const ceiling = qualityAuthoringCodesignCeiling(prices.table);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "estimate.json"),
    `${JSON.stringify({ ...ceiling, knownDefects: qualityAuthoringKnownDefects, situationBrief: qualityAuthoringCodesignTask.situationBrief, judgeCalls: 0 }, null, 2)}\n`,
  );
  if (ceiling.oneCallUsd == null) return { ...refuseQualityAuthoringCodesign("haiku writer is unpriced", "budget"), ceiling };
  if (!ceiling.fitsCap) {
    return {
      ...refuseQualityAuthoringCodesign(
        `conservative one-call ceiling $${ceiling.oneCallUsd.toFixed(4)} exceeds $${qualityAuthoringCodesignSpendCapUsd}`,
        "budget",
      ),
      ceiling,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return { ...refuseQualityAuthoringCodesign("missing openrouter API key", "credentials"), ceiling };

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-quality-authoring-codesign-restatement",
    maxRetries: qualityAuthoringCodesignRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const task = qualityAuthoringCodesignTask;
  const writerUser = qualityAuthoringUser({ questionType: task.questionType, direction: task.direction, situationBrief: task.situationBrief });
  writeFileSync(path.join(resolved, "brief.json"), `${JSON.stringify({ id: task.id, questionType: task.questionType, direction: task.direction, situationBrief: task.situationBrief, writerUser }, null, 2)}\n`);

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const startedAt = Date.now();
  let providerCallOk = false;
  let usage = emptyUsage();
  let contentText = "";
  let reasoningText = "";
  let combinedText = "";
  let finishReason: string | undefined;
  let error: string | null = null;
  let costUsd: number | null = null;

  console.error(`quality-authoring-codesign-restatement call 1/${qualityAuthoringCodesignMaxCalls} ${task.id} cap=$${qualityAuthoringCodesignSpendCapUsd}`);

  try {
    const response = await provider.generate({
      model,
      system: qualityAuthoringSystem,
      parts: [{ text: writerUser }],
      jsonSchema: qualityAuthoringResponseSchema,
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
    costUsd = cost.usd != null ? Math.round(spentUsd * 1_000_000) / 1_000_000 : null;
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

  const assemble = assembleQualityAuthoring(parsed ?? {});
  const fourKept = assemble.selection?.kept === 4;
  const selectorComplete = Boolean(assemble.selection?.complete);
  const structurallyComplete = assemble.complete;
  const keptRisks = assemble.selection?.rows.filter((row) => row.decision === "keep").flatMap((row) => row.risks) ?? [];
  const defects = {
    id: task.id,
    writer: [
      ...(!assemble.parseOk ? ["schema_or_json"] : []),
      ...(assemble.parseOk && !assemble.uniquePlanIds ? ["plan_id_not_unique_p1_p6"] : []),
      ...(assemble.parseOk && !assemble.keyValid ? ["key_structurally_invalid"] : []),
      ...assemble.dropped.filter((row) => row.decision === "drop_equivalent").map((row) => `${row.planId}:gate_equivalent`),
    ],
    selector: [
      ...(assemble.parseOk && assemble.uniquePlanIds && !fourKept ? ["fewer_than_four_kept_no_pad"] : []),
      ...(keptRisks.includes("high_overlap_unverified") ? ["kept_high_overlap_unverified"] : []),
      ...(keptRisks.includes("only_to_at_least") ? ["kept_only_to_at_least_as_risk"] : []),
    ],
    editorialAcceptance: "pending" as const,
  };
  const notes = technicalNotesFromAssemble(assemble);
  const editorial = emptyEditorialSheet(task.id);

  writeFileSync(path.join(resolved, `${task.id}.writer.json`), `${JSON.stringify({ parsed, error }, null, 2)}\n`);
  writeFileSync(path.join(resolved, `${task.id}.assemble.json`), `${JSON.stringify(assemble, null, 2)}\n`);
  writeFileSync(path.join(resolved, `${task.id}.pack.json`), `${JSON.stringify(assemble.pack, null, 2)}\n`);
  writeFileSync(path.join(resolved, `${task.id}.dropped.json`), `${JSON.stringify(assemble.dropped, null, 2)}\n`);
  writeFileSync(path.join(resolved, `${task.id}.editorial.json`), `${JSON.stringify({ ...editorial, technical: notes, defects, structurallyComplete, editoriallyAccepted: false, selectorFourKept: fourKept, selectorComplete }, null, 2)}\n`);

  const summary = {
    executed: true,
    started: true,
    providerCallOk,
    providerCalls: calls,
    spentUsd,
    costUsd,
    ceiling,
    error,
    id: qualityAuthoringCodesignItemId,
    parseOk: assemble.parseOk,
    uniquePlanIds: assemble.uniquePlanIds,
    keyValid: assemble.keyValid,
    selectorFourKept: fourKept,
    selectorComplete,
    structurallyComplete,
    editoriallyAccepted: false,
    pack: assemble.pack,
    dropped: assemble.dropped,
    defects,
    knownDefects: qualityAuthoringKnownDefects,
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
      compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
    },
    ...qualityAuthoringLivePilotLocks,
    meaningProven: false,
    qualityProven: false,
    winnerDeclared: false,
    liveGenerate: calls,
  };
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function runQualityAuthoringGenerationExperiment(authorization: string, outDir = qualityAuthoringGenerationExperimentOutputDir) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== qualityAuthoringGenerationExperimentAuthorization || !qualityAuthoringGenerationExperimentLiveAuthorized) {
    return refuseQualityAuthoringGenerationExperiment("quality authoring generation experiment authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  const protectedDirs = qualityAuthoringLivePilotProtectedDirs().filter((dir) => path.resolve(dir) !== path.resolve(qualityAuthoringGenerationExperimentOutputDir));
  if (
    protectedDirs.some((dir) => path.resolve(dir) === resolved) ||
    path.resolve(resolved) === path.resolve(qualityAuthoringLivePilotOutputDir) ||
    path.resolve(resolved) === path.resolve(qualityAuthoringCodesignOutputDir)
  ) {
    return refuseQualityAuthoringGenerationExperiment("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseQualityAuthoringGenerationExperiment("a completed generation quality experiment is already stored", "completed");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseQualityAuthoringGenerationExperiment("pilot refuses an enabled root-cause flag or recovery", "safety");
  }
  try {
    publishToStudentBank();
    return refuseQualityAuthoringGenerationExperiment("student bank opened", "runner");
  } catch {
    /* closed */
  }

  const briefCheck = generationExperimentBriefAvoidsFrozenPhrases();
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseQualityAuthoringGenerationExperiment("FACTORY_PRICES missing", "budget");
  const ceiling = qualityAuthoringGenerationExperimentCeiling(prices.table);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "estimate.json"),
    `${JSON.stringify(
      {
        ...ceiling,
        briefCheck,
        situationBrief: qualityAuthoringGenerationExperimentTask.situationBrief,
        judgeCalls: 0,
        recoveryCalls: 0,
        studentBankWrites: 0,
        qualityAuthoringTrapEnabled: false,
      },
      null,
      2,
    )}\n`,
  );
  if (!briefCheck.ok) return { ...refuseQualityAuthoringGenerationExperiment("brief overlaps a frozen or reused seed phrase", "seed"), ceiling, briefCheck };
  if (ceiling.oneCallUsd == null) return { ...refuseQualityAuthoringGenerationExperiment("haiku writer is unpriced", "budget"), ceiling };
  if (!ceiling.fitsCap) {
    return {
      ...refuseQualityAuthoringGenerationExperiment(
        `conservative one-call ceiling $${ceiling.oneCallUsd.toFixed(4)} exceeds $${qualityAuthoringGenerationExperimentSpendCapUsd}`,
        "budget",
      ),
      ceiling,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return { ...refuseQualityAuthoringGenerationExperiment("missing openrouter API key", "credentials"), ceiling };

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-quality-authoring-generation-quality-experiment",
    maxRetries: qualityAuthoringGenerationExperimentRetry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const task = qualityAuthoringGenerationExperimentTask;
  const writerUser = qualityAuthoringUser({ questionType: task.questionType, direction: task.direction, situationBrief: task.situationBrief });
  writeFileSync(
    path.join(resolved, "brief.json"),
    `${JSON.stringify({ id: task.id, questionType: task.questionType, direction: task.direction, situationBrief: task.situationBrief, writerUser }, null, 2)}\n`,
  );

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const startedAt = Date.now();
  let providerCallOk = false;
  let usage = emptyUsage();
  let contentText = "";
  let reasoningText = "";
  let combinedText = "";
  let finishReason: string | undefined;
  let error: string | null = null;
  let costUsd: number | null = null;

  console.error(`quality-authoring-generation-quality-experiment call 1/${qualityAuthoringGenerationExperimentMaxCalls} ${task.id} cap=$${qualityAuthoringGenerationExperimentSpendCapUsd}`);

  try {
    const response = await provider.generate({
      model,
      system: qualityAuthoringSystem,
      parts: [{ text: writerUser }],
      jsonSchema: qualityAuthoringResponseSchema,
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
    costUsd = cost.usd != null ? Math.round(spentUsd * 1_000_000) / 1_000_000 : null;
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

  const assemble = assembleQualityAuthoring(parsed ?? {});
  const fourKept = assemble.selection?.kept === 4;
  const selectorComplete = Boolean(assemble.selection?.complete);
  const structurallyComplete = assemble.complete;
  const parsedRecord = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const parsedCandidates = Array.isArray(parsedRecord.candidates) ? parsedRecord.candidates : [];
  const keptRisks = assemble.selection?.rows.filter((row) => row.decision === "keep").flatMap((row) => row.risks) ?? [];
  const defects = {
    id: task.id,
    writer: [
      ...(!assemble.parseOk ? ["schema_or_json"] : []),
      ...(assemble.parseOk && !assemble.uniquePlanIds ? ["plan_id_not_unique_p1_p6"] : []),
      ...(assemble.parseOk && !assemble.keyValid ? ["key_structurally_invalid"] : []),
      ...assemble.dropped.filter((row) => row.decision === "drop_equivalent").map((row) => `${row.planId}:gate_equivalent`),
    ],
    selector: [
      ...(assemble.parseOk && assemble.uniquePlanIds && !fourKept ? ["fewer_than_four_kept_no_pad"] : []),
      ...(keptRisks.includes("high_overlap_unverified") ? ["kept_high_overlap_unverified"] : []),
      ...(keptRisks.includes("only_to_at_least") ? ["kept_only_to_at_least_as_risk"] : []),
    ],
    editorialAcceptance: "pending" as const,
    jsonCompleteIsNotSuccess: true as const,
  };
  const notes = technicalNotesFromAssemble(assemble);
  const editorial = emptyEditorialSheet(task.id);
  const blindPack = {
    itemId: task.id,
    questionType: task.questionType,
    direction: task.direction,
    labelsHidden: true as const,
    trapLabelsHidden: true as const,
    selectorHidden: true as const,
    source: typeof parsedRecord.source === "string" ? parsedRecord.source : assemble.authored?.source ?? null,
    key: typeof parsedRecord.key === "string" ? parsedRecord.key : assemble.authored?.key ?? null,
    candidates: parsedCandidates.map((row, index) => ({
      id: `C${index + 1}`,
      text: row && typeof row === "object" && "candidateText" in row && typeof row.candidateText === "string" ? row.candidateText : "",
    })),
    reviewQuestions: [
      "source_faithful_to_brief",
      "key_equivalent_to_source",
      "source_hosts_real_misreadings",
      "candidate_count",
      "filler_count",
      "natural_and_wrong_count",
      "key_equivalent_or_second_answer_count",
      "four_strong_distractors",
    ],
  };

  writeFileSync(path.join(resolved, `${task.id}.writer.json`), `${JSON.stringify({ parsed, error }, null, 2)}\n`);
  writeFileSync(path.join(resolved, `${task.id}.assemble.json`), `${JSON.stringify(assemble, null, 2)}\n`);
  writeFileSync(path.join(resolved, `${task.id}.pack.json`), `${JSON.stringify(assemble.pack, null, 2)}\n`);
  writeFileSync(path.join(resolved, `${task.id}.dropped.json`), `${JSON.stringify(assemble.dropped, null, 2)}\n`);
  writeFileSync(path.join(resolved, `${task.id}.blind-editorial.json`), `${JSON.stringify(blindPack, null, 2)}\n`);
  writeFileSync(
    path.join(resolved, `${task.id}.editorial.json`),
    `${JSON.stringify({ ...editorial, technical: notes, defects, structurallyComplete, editoriallyAccepted: false, selectorFourKept: fourKept, selectorComplete, authoringStatus: assemble.authoringStatus ?? null, candidateCount: parsedCandidates.length }, null, 2)}\n`,
  );

  const summary = {
    executed: true,
    started: true,
    providerCallOk,
    providerCalls: calls,
    recoveryCalls: 0,
    spentUsd,
    costUsd,
    ceiling,
    error,
    id: qualityAuthoringGenerationExperimentItemId,
    parseOk: assemble.parseOk,
    uniquePlanIds: assemble.uniquePlanIds,
    keyValid: assemble.keyValid,
    authoringStatus: assemble.authoringStatus ?? null,
    candidateCount: parsedCandidates.length,
    selectorFourKept: fourKept,
    selectorComplete,
    structurallyComplete,
    editoriallyAccepted: false,
    jsonCompleteIsNotSuccess: true as const,
    pack: assemble.pack,
    dropped: assemble.dropped,
    defects,
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
      compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
    },
    ...qualityAuthoringLivePilotLocks,
    meaningProven: false,
    qualityProven: false,
    winnerDeclared: false,
    liveGenerate: calls,
  };
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function runRestatementHardBenchmark5(authorization: string, outDir = restatementHardBenchmark5OutputDir) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (authorization !== restatementHardBenchmark5Authorization || !restatementHardBenchmark5LiveAuthorized) {
    return refuseRestatementHardBenchmark5("restatement hard benchmark 5 authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  const protectedDirs = qualityAuthoringLivePilotProtectedDirs().filter((dir) => path.resolve(dir) !== path.resolve(restatementHardBenchmark5OutputDir));
  const frozen = [
    qualityAuthoringLivePilotOutputDir,
    qualityAuthoringCodesignOutputDir,
    qualityAuthoringGenerationExperimentOutputDir,
    ".data/analysis/_factory/cognitive-trap/restatement-hard-quality-editorial-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-hard-c1-naturalness-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-hard-blind-validation-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-hard-source-feasibility-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-to-wording-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-semantic-validity-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-semantic-acceptance-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1",
    ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-0-source-key-v1",
  ];
  if (protectedDirs.some((dir) => path.resolve(dir) === resolved) || frozen.some((dir) => path.resolve(dir) === resolved)) {
    return refuseRestatementHardBenchmark5("pilot refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseRestatementHardBenchmark5("a completed restatement hard benchmark 5 is already stored", "completed");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseRestatementHardBenchmark5("pilot refuses an enabled root-cause flag or recovery", "safety");
  }
  try {
    publishToStudentBank();
    return refuseRestatementHardBenchmark5("student bank opened", "runner");
  } catch {
    /* closed */
  }

  const briefCheck = restatementHardBenchmark5BriefsAvoidFrozen();
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseRestatementHardBenchmark5("FACTORY_PRICES missing", "budget");
  const ceiling = restatementHardBenchmark5Ceiling(prices.table);
  mkdirSync(resolved, { recursive: true });
  writeFileSync(
    path.join(resolved, "estimate.json"),
    `${JSON.stringify(
      {
        ...ceiling,
        briefCheck,
        goldSeedForbidden: ["generation-quality-restatement-delta-survey"],
        judgeCalls: 0,
        recoveryCalls: 0,
        studentBankWrites: 0,
        qualityAuthoringTrapEnabled: false,
      },
      null,
      2,
    )}\n`,
  );
  if (!briefCheck.ok) return { ...refuseRestatementHardBenchmark5("brief overlaps a frozen or reused seed phrase", "seed"), ceiling, briefCheck };
  if (ceiling.fiveCallUsd == null) return { ...refuseRestatementHardBenchmark5("haiku writer is unpriced", "budget"), ceiling };
  if (!ceiling.fitsCap) {
    return {
      ...refuseRestatementHardBenchmark5(
        `conservative five-call ceiling $${ceiling.fiveCallUsd.toFixed(4)} exceeds $${restatementHardBenchmark5SpendCapUsd}`,
        "budget",
      ),
      ceiling,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return { ...refuseRestatementHardBenchmark5("missing openrouter API key", "credentials"), ceiling };

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-restatement-hard-benchmark-5",
    maxRetries: restatementHardBenchmark5Retry,
    minOutputTokens: qualityAuthoringLivePilotOutputTokens,
    timeoutMs: 300_000,
  });

  const model = parseModel(qualityAuthoringLivePilotWriter, "openrouter").model;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; reasoningTokens?: number }> = {};
  let spentUsd = 0;
  let calls = 0;
  const items: Record<string, unknown>[] = [];

  for (const task of restatementHardBenchmark5Tasks) {
    if (calls >= restatementHardBenchmark5MaxCalls) break;
    if (spentUsd + (ceiling.perCallUsd ?? 0) > restatementHardBenchmark5SpendCapUsd) break;

    const writerUser = qualityAuthoringUser({ questionType: task.questionType, direction: task.direction, situationBrief: task.situationBrief });
    writeFileSync(
      path.join(resolved, `${task.id}.prompt.json`),
      `${JSON.stringify({ id: task.id, questionType: task.questionType, direction: task.direction, situationBrief: task.situationBrief, writerUser }, null, 2)}\n`,
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

    console.error(`restatement-hard-benchmark-5 call ${calls + 1}/${restatementHardBenchmark5MaxCalls} ${task.id} capRemaining=$${(restatementHardBenchmark5SpendCapUsd - spentUsd).toFixed(4)}`);

    try {
      const response = await provider.generate({
        model,
        system: qualityAuthoringSystem,
        parts: [{ text: writerUser }],
        jsonSchema: qualityAuthoringResponseSchema,
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

    const assemble = assembleQualityAuthoring(parsed ?? {});
    const parsedRecord = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const parsedCandidates = Array.isArray(parsedRecord.candidates) ? parsedRecord.candidates : [];
    writeFileSync(path.join(resolved, `${task.id}.writer.json`), `${JSON.stringify({ parsed, error }, null, 2)}\n`);
    writeFileSync(path.join(resolved, `${task.id}.assemble.json`), `${JSON.stringify(assemble, null, 2)}\n`);
    writeFileSync(path.join(resolved, `${task.id}.pack.json`), `${JSON.stringify(assemble.pack, null, 2)}\n`);
    writeFileSync(path.join(resolved, `${task.id}.dropped.json`), `${JSON.stringify(assemble.dropped, null, 2)}\n`);
    writeFileSync(
      path.join(resolved, `${task.id}.blind-pack.json`),
      `${JSON.stringify(
        {
          itemId: task.id,
          labelsHidden: true,
          trapLabelsHidden: true,
          source: typeof parsedRecord.source === "string" ? parsedRecord.source : assemble.authored?.source ?? null,
          options: parsedCandidates.map((row, index) => ({
            id: `C${index + 1}`,
            text: row && typeof row === "object" && "candidateText" in row && typeof row.candidateText === "string" ? row.candidateText : "",
          })),
          keySeparate: typeof parsedRecord.key === "string" ? parsedRecord.key : assemble.authored?.key ?? null,
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
      parseOk: assemble.parseOk,
      uniquePlanIds: assemble.uniquePlanIds,
      keyValid: assemble.keyValid,
      authoringStatus: assemble.authoringStatus ?? null,
      candidateCount: parsedCandidates.length,
      selectorFourKept: assemble.selection?.kept === 4,
      selectorComplete: Boolean(assemble.selection?.complete),
      structurallyComplete: assemble.complete,
      qualityAccepted: false,
      meaningProven: false,
      dropped: assemble.dropped,
    });
  }

  const summary = {
    executed: true,
    started: true,
    providerCalls: calls,
    recoveryCalls: 0,
    spentUsd,
    ceiling,
    items,
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
      compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
    },
    ...qualityAuthoringLivePilotLocks,
    meaningProven: false,
    qualityProven: false,
    qualityAccepted: false,
    winnerDeclared: false,
    hardCalibrationStatus: "not_run",
    jsonCompleteIsNotSuccess: true as const,
    structurallyCompleteIsNotSuccess: true as const,
    liveGenerate: calls,
  };
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
