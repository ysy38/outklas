import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { architectureV2WriterBakeoffCandidates, loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { writerBakeoffOutput, writerBakeoffPromptVersion, writerBakeoffResponseSchema, writerBakeoffSystem } from "../ai/prompts/writer-bakeoff.v1";
import { extractJsonText } from "../ai/service";
import { bakeoffWriterUser, freezeWriterBakeoffTasks, parseBakeoffWriterOutput, refuseWriterBakeoffLive, writerBakeoffAuthorization } from "@/modules/factory/item-model/writer-bakeoff";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import {
  fingerprintFiles,
  qualityFirstPilotFingerprint,
  writerBakeoffV1Fingerprint,
} from "@/modules/factory/item-model/writer-bakeoff-smoke";
import {
  auditFrozenPlans,
  buildBlindPack,
  compareProtectedDirs,
  evaluateWriterOption,
  loadPlatesSmokeCells,
  loadRecordedSmokeActualUsd,
  projectedBakeoffSpendUsd,
  refuseWriterBakeoffCompare,
  remainingCallCeilingUsd,
  remainingScoringTasks,
  unrecordedHaikuHit,
  writerBakeoffCompareAuthorization,
  writerBakeoffCompareLiveAuthorized,
  writerBakeoffCompareMaxCalls,
  writerBakeoffCompareOutputDir,
  writerBakeoffCompareOutputTokens,
  writerBakeoffCompareRetry,
  writerBakeoffCompareSpendCapUsd,
  writerBakeoffRemainingSourceIds,
  writerBakeoffSmokeOutputDir,
} from "@/modules/factory/item-model/writer-bakeoff-compare";

function emptyUsage(): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
} {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

function targetLanguageOf(direction: string | null): "tr" | "en" | null {
  return direction === "en_tr" ? "tr" : direction === "tr_en" ? "en" : null;
}

export async function runWriterBakeoffRemainingFive(
  authorization: string,
  outDir = writerBakeoffCompareOutputDir,
) {
  if (authorization !== writerBakeoffCompareAuthorization || !writerBakeoffCompareLiveAuthorized) {
    return refuseWriterBakeoffCompare("writer bake-off remaining-five authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (compareProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseWriterBakeoffCompare("remaining-five refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseWriterBakeoffCompare("a completed remaining-five run is already stored", "completed");
  }

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const beforeSmoke = fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]);
  const remaining = remainingScoringTasks();
  if (remaining.length !== writerBakeoffRemainingSourceIds.length) {
    return refuseWriterBakeoffCompare("remaining scoring source count mismatch", "runner");
  }

  let platesCells;
  try {
    platesCells = loadPlatesSmokeCells();
  } catch (error) {
    return refuseWriterBakeoffCompare(error instanceof Error ? error.message : "plates smoke missing", "smoke");
  }
  if (platesCells.length !== 4) return refuseWriterBakeoffCompare("plates smoke does not have four writer cells", "smoke");

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseWriterBakeoffCompare("FACTORY_PRICES missing", "budget");
  const models = [...architectureV2WriterBakeoffCandidates];
  const remainingCeiling = remainingCallCeilingUsd(prices.table, models);
  const unrecorded = unrecordedHaikuHit(prices.table);
  const recordedSmokeUsd = loadRecordedSmokeActualUsd();
  const projection = projectedBakeoffSpendUsd({
    recordedSmokeUsd,
    unrecordedHaikuUsd: unrecorded.conservativeCeilingUsd,
    remainingTwentyUsd: remainingCeiling.twentyCallUsd,
  });
  if (!projection.fitsCap || remainingCeiling.twentyCallUsd == null) {
    return {
      ...refuseWriterBakeoffCompare(
        `projected bake-off spend $${projection.projectedTotalUsd?.toFixed(4) ?? "unknown"} exceeds $${writerBakeoffCompareSpendCapUsd}`,
        "budget",
      ),
      projection,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return refuseWriterBakeoffCompare("missing openrouter API key", "credentials");
  try {
    publishToStudentBank();
    return refuseWriterBakeoffCompare("student bank opened", "runner");
  } catch {
    /* closed */
  }
  const fullBakeoff = refuseWriterBakeoffLive(writerBakeoffAuthorization);
  const planAudit = auditFrozenPlans();
  mkdirSync(resolved, { recursive: true });
  writeFileSync(path.join(resolved, "plan-audit.json"), `${JSON.stringify({ frozenUnchanged: true, rows: planAudit }, null, 2)}\n`);

  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory",
    maxRetries: writerBakeoffCompareRetry,
    minOutputTokens: writerBakeoffCompareOutputTokens,
    timeoutMs: 300_000,
  });

  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; cacheWriteTokens?: number; cacheReadTokens?: number; reasoningTokens?: number }> = {};
  let spentUsd = (recordedSmokeUsd ?? 0) + (unrecorded.conservativeCeilingUsd ?? 0);
  let calls = 0;
  const newCells: {
    sourceId: string;
    setting: string;
    model: string;
    providerCallOk: boolean;
    fourOptionTexts: boolean;
    candidates: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string }[];
    usage: { inputTokens: number; outputTokens: number; reasoningTokens: number | null; totalTokens: number };
    costUsd: number | null;
    latencyMs: number;
    technicalFailure: string | null;
  }[] = [];

  for (const task of remaining) {
    const targetLanguage = targetLanguageOf(task.direction);
    const schema = writerBakeoffResponseSchema(task.plans.length);
    const user = bakeoffWriterUser({
      source: task.source,
      key: task.key,
      targetLanguage,
      framePresent: task.framePresent,
      plans: task.plans,
    });
    writeFileSync(
      path.join(resolved, `${task.id}.prompt.json`),
      `${JSON.stringify({ sourceId: task.id, sourceHash: task.sourceHash, keyHash: task.keyHash, frameHash: task.frameHash, planHash: task.planHash, promptVersion: writerBakeoffPromptVersion, user, schema }, null, 2)}\n`,
    );
    for (const setting of models) {
      if (calls >= writerBakeoffCompareMaxCalls) break;
      const perCall = remainingCeiling.perModel.find((row) => row.setting === setting)?.perCallUsd ?? null;
      if (perCall == null || spentUsd + perCall > writerBakeoffCompareSpendCapUsd) {
        return {
          ...refuseWriterBakeoffCompare("spend limit: next remaining-five call would exceed $0.62", "budget"),
          providerCalls: calls,
          spentUsd,
        };
      }
      const model = parseModel(setting, "openrouter").model;
      console.error(`writer-bakeoff-compare ${task.id} ${setting} call ${calls + 1}/20 spent=$${spentUsd.toFixed(4)}`);
      const startedAt = Date.now();
      let providerCallOk = false;
      let latencyMs = 0;
      let usage = emptyUsage();
      let contentText = "";
      let combinedText = "";
      let error: string | null = null;
      try {
        const response = await provider.generate({
          model,
          system: writerBakeoffSystem,
          parts: [{ text: user }],
          jsonSchema: schema,
          temperature: 0,
          maxOutputTokens: writerBakeoffCompareOutputTokens,
        });
        latencyMs = Date.now() - startedAt;
        providerCallOk = true;
        calls += 1;
        usage = response.usage;
        contentText = response.contentText ?? "";
        combinedText = response.text;
        writeFileSync(
          path.join(resolved, `${task.id}__${setting.replaceAll("/", "_")}.raw.json`),
          `${JSON.stringify({ setting, model, usage, latencyMs, finishReason: response.finishReason, contentText, reasoningText: response.reasoningText ?? "", combinedText }, null, 2)}\n`,
        );
        const billedKey = `${provider.name}:${model}`;
        const row = (usageRows[billedKey] ??= { calls: 0, inputTokens: 0, outputTokens: 0 });
        row.calls += 1;
        row.inputTokens += usage.inputTokens;
        row.outputTokens += usage.outputTokens;
        if (usage.cacheWriteTokens) row.cacheWriteTokens = (row.cacheWriteTokens ?? 0) + usage.cacheWriteTokens;
        if (usage.cacheReadTokens) row.cacheReadTokens = (row.cacheReadTokens ?? 0) + usage.cacheReadTokens;
        if (usage.reasoningTokens != null) row.reasoningTokens = (row.reasoningTokens ?? 0) + usage.reasoningTokens;
        const cost = estimateCost(usageRows, prices);
        spentUsd = (recordedSmokeUsd ?? 0) + (unrecorded.conservativeCeilingUsd ?? 0) + (cost.usd ?? 0);
      } catch (caught) {
        latencyMs = Date.now() - startedAt;
        calls += 1;
        error = caught instanceof Error ? caught.message : "call failed";
      }
      let parsed: unknown = null;
      try {
        if (!error) parsed = JSON.parse(extractJsonText(contentText || combinedText));
      } catch {
        error = error ?? "output is not valid JSON";
      }
      const shape = parseBakeoffWriterOutput(parsed ?? combinedText, task.plans.length);
      const zod = parsed ? writerBakeoffOutput(task.plans.length).safeParse(parsed) : null;
      const cell = {
        sourceId: task.id,
        setting,
        model,
        providerCallOk,
        fourOptionTexts: shape.status === "ok",
        candidates: shape.candidates,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          reasoningTokens: usage.reasoningTokens ?? null,
          totalTokens: usage.totalTokens,
        },
        costUsd: estimateCost({ [`openrouter:${model}`]: { calls: 1, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cacheWriteTokens: usage.cacheWriteTokens, cacheReadTokens: usage.cacheReadTokens } }, prices).usd,
        latencyMs,
        technicalFailure: shape.status === "ok" && providerCallOk ? null : (error ?? shape.reason),
        zodOk: zod?.success ?? false,
      };
      newCells.push(cell);
      writeFileSync(path.join(resolved, `${task.id}__${setting.replaceAll("/", "_")}.json`), `${JSON.stringify(cell, null, 2)}\n`);
    }
  }

  const allScoring = freezeWriterBakeoffTasks().filter((task) => task.role === "scoring");
  const plates = allScoring.find((task) => task.id === "quality-first-restatement-counterfactual");
  if (!plates) throw new Error("plates scoring task missing");

  const machineEval = [];
  const blindItems: Parameters<typeof buildBlindPack>[0]["items"] = [];
  for (const task of [plates, ...remaining]) {
    for (const setting of models) {
      const cell = task.id === plates.id
        ? platesCells.find((row) => row.setting === setting)
        : newCells.find((row) => row.sourceId === task.id && row.setting === setting);
      const candidates = cell?.candidates ?? [];
      const evaluations = candidates.map((candidate, index) => {
        const plan = task.plans[index] ?? task.plans.find((row) => row.planId === candidate.planId);
        const planRow = planAudit.find((row) => row.sourceId === task.id && row.planId === (plan?.planId ?? candidate.planId));
        return evaluateWriterOption({
          source: task.source,
          key: task.key,
          targetLanguage: targetLanguageOf(task.direction),
          plan: plan!,
          planFeasibility: planRow?.feasibility ?? "strained",
          candidate,
        });
      });
      machineEval.push({
        sourceId: task.id,
        setting,
        reusedPlatesSmoke: task.id === plates.id,
        options: evaluations,
      });
      blindItems.push({
        sourceId: task.id,
        source: task.source,
        key: task.key,
        model: setting,
        plans: task.plans,
        options: candidates.map((candidate) => ({ planId: candidate.planId, text: candidate.candidateText })),
      });
    }
  }

  const blind = buildBlindPack({ items: blindItems });
  mkdirSync(path.join(resolved, "blind"), { recursive: true });
  writeFileSync(path.join(resolved, "blind", "pack.json"), `${JSON.stringify({
    seed: blind.seed,
    modelNameHidden: blind.modelNameHidden,
    judgeApproveIsNotEditorialAcceptance: true,
    automaticGateIsNotEditorialAcceptance: true,
    instructions: "Rate planFeasibility separately from writerExecutionQuality. A fluent option that follows an artificial plan is not a good wrong answer. Do not infer the writer model.",
    units: blind.humanPack,
  }, null, 2)}\n`);
  writeFileSync(path.join(resolved, "blind", "key.json"), `${JSON.stringify({ seed: blind.seed, key: blind.packed.key }, null, 2)}\n`);
  writeFileSync(path.join(resolved, "machine-eval.json"), `${JSON.stringify({ writerClaimIsNotProof: true, meaningProven: false, editorialAcceptance: false, rows: machineEval }, null, 2)}\n`);

  const remainingActual = estimateCost(usageRows, prices);
  const totalUsd = (recordedSmokeUsd ?? 0) + (unrecorded.conservativeCeilingUsd ?? 0) + (remainingActual.usd ?? 0);
  const summary = {
    version: writerBakeoffCompareAuthorization,
    started: true,
    executed: true,
    retry: writerBakeoffCompareRetry,
    maxNewCalls: writerBakeoffCompareMaxCalls,
    providerCalls: calls,
    platesRegenerated: false,
    platesReused: true,
    studentBankWrites: 0,
    judgeCalls: 0,
    recoveryCalls: 0,
    bakeoffFromScratch: false,
    fullBakeoffRefused: fullBakeoff.reason,
    productionWriterUnchanged: true,
    productionJudgeUnchanged: true,
    remainingSourceIds: [...writerBakeoffRemainingSourceIds],
    remainingTwentyCeilingUsd: remainingCeiling.twentyCallUsd,
    recordedSmokeUsd,
    unrecordedHaiku: unrecorded,
    remainingActualUsd: remainingActual.usd,
    totalBakeoffUsd: totalUsd,
    spendCapUsd: writerBakeoffCompareSpendCapUsd,
    underCap: totalUsd <= writerBakeoffCompareSpendCapUsd,
    measuredBill: false,
    meaningProven: false,
    qualityProven: false,
    editorialAcceptance: false,
    writerClaimIsNotProof: true,
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
      platesSmokeUnchanged: fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]) === beforeSmoke,
    },
    cells: [
      ...platesCells.map((cell) => ({ sourceId: cell.sourceId, setting: cell.setting, reused: true, options: cell.candidates.map((row) => row.candidateText), costUsd: cell.costUsd })),
      ...newCells.map((cell) => ({ sourceId: cell.sourceId, setting: cell.setting, reused: false, options: cell.candidates.map((row) => row.candidateText), costUsd: cell.costUsd, technicalFailure: cell.technicalFailure })),
    ],
  };
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
