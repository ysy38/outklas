import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { architectureV2WriterBakeoffCandidates, loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { writerBakeoffOutput, writerBakeoffPromptVersion, writerBakeoffResponseSchema, writerBakeoffSystem } from "../ai/prompts/writer-bakeoff.v1";
import { extractJsonText } from "../ai/service";
import { bakeoffWriterUser, parseBakeoffWriterOutput, refuseWriterBakeoffLive, writerBakeoffAuthorization } from "@/modules/factory/item-model/writer-bakeoff";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import {
  assessJsonSchemaHonor,
  nextCallAllowed,
  platesSmokeTask,
  previewOptions,
  qualityFirstPilotFingerprint,
  refuseWriterBakeoffSmoke,
  reuseDecision,
  smokeCeilingUsd,
  smokeProtectedDirs,
  technicalSmokeSuccess,
  writerBakeoffSmokeAuthorization,
  writerBakeoffSmokeLiveAuthorized,
  writerBakeoffSmokeMaxCalls,
  writerBakeoffSmokeOutputDir,
  writerBakeoffSmokeOutputTokens,
  writerBakeoffSmokeRetry,
  writerBakeoffSmokeSpendCapUsd,
  writerBakeoffV1Fingerprint,
} from "@/modules/factory/item-model/writer-bakeoff-smoke";

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

export async function runWriterBakeoffTechnicalSmoke(
  authorization: string,
  outDir = writerBakeoffSmokeOutputDir,
) {
  if (authorization !== writerBakeoffSmokeAuthorization || !writerBakeoffSmokeLiveAuthorized) {
    return refuseWriterBakeoffSmoke("writer bake-off technical smoke authorization required", "authorization");
  }
  const resolved = path.resolve(outDir);
  if (smokeProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    return refuseWriterBakeoffSmoke("technical smoke refuses to overwrite earlier experiment records", "output");
  }
  if (existsSync(path.join(resolved, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(resolved, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refuseWriterBakeoffSmoke("a completed technical smoke is already stored", "completed");
  }

  const beforeBakeoff = writerBakeoffV1Fingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const task = platesSmokeTask();
  const targetLanguage = task.direction === "en_tr" ? "tr" : task.direction === "tr_en" ? "en" : null;
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refuseWriterBakeoffSmoke("FACTORY_PRICES missing", "budget");
  const models = [...architectureV2WriterBakeoffCandidates];
  const ceiling = smokeCeilingUsd(prices.table, models);
  if (ceiling.totalUsd == null) return refuseWriterBakeoffSmoke("a requested writer is unpriced", "budget");
  if (!ceiling.fitsCap) {
    return {
      ...refuseWriterBakeoffSmoke(
        `conservative four-call ceiling $${ceiling.totalUsd.toFixed(4)} exceeds $${writerBakeoffSmokeSpendCapUsd}`,
        "budget",
      ),
      smokeCeilingUsd: ceiling.totalUsd,
      perModelCeiling: ceiling.perModel,
    };
  }

  const config = loadAIConfig();
  if (!config.keys.openrouter) return refuseWriterBakeoffSmoke("missing openrouter API key", "credentials");

  try {
    publishToStudentBank();
    return refuseWriterBakeoffSmoke("student bank opened", "runner");
  } catch {
    /* bank stays closed */
  }

  const fullBakeoff = refuseWriterBakeoffLive(writerBakeoffAuthorization);
  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory",
    maxRetries: writerBakeoffSmokeRetry,
    minOutputTokens: writerBakeoffSmokeOutputTokens,
    timeoutMs: 300_000,
  });
  const schema = writerBakeoffResponseSchema(task.plans.length);
  const user = bakeoffWriterUser({
    source: task.source,
    key: task.key,
    targetLanguage,
    framePresent: task.framePresent,
    plans: task.plans,
  });
  const expectedPlanIds = task.plans.map((plan) => plan.planId);

  mkdirSync(resolved, { recursive: true });
  const rows = [];
  let spentUsd = 0;
  let calls = 0;
  const usageRows: Record<string, { calls: number; inputTokens: number; outputTokens: number; cacheWriteTokens?: number; cacheReadTokens?: number; reasoningTokens?: number }> = {};

  for (const setting of models) {
    if (calls >= writerBakeoffSmokeMaxCalls) break;
    const perCall = ceiling.perModel.find((row) => row.setting === setting)?.perCallUsd ?? null;
    if (perCall == null || !nextCallAllowed(spentUsd, perCall)) {
      rows.push({
        setting,
        started: false,
        providerCallOk: false,
        technicalSuccess: false,
        reusable: false,
        reason: "spend limit: next call would exceed $0.10",
        options: [],
      });
      break;
    }

    const model = parseModel(setting, "openrouter").model;
    console.error(`writer-bakeoff-smoke call ${calls + 1}/4 ${setting} remainingCap=$${(writerBakeoffSmokeSpendCapUsd - spentUsd).toFixed(4)}`);
    const startedAt = Date.now();
    let providerCallOk = false;
    let latencyMs = 0;
    let usage = emptyUsage();
    let contentText = "";
    let reasoningText = "";
    let combinedText = "";
    let finishReason: string | undefined;
    let error: string | null = null;
    try {
      const response = await provider.generate({
        model,
        system: writerBakeoffSystem,
        parts: [{ text: user }],
        jsonSchema: schema,
        temperature: 0,
        maxOutputTokens: writerBakeoffSmokeOutputTokens,
      });
      latencyMs = Date.now() - startedAt;
      providerCallOk = true;
      calls += 1;
      usage = response.usage;
      contentText = response.contentText ?? "";
      reasoningText = response.reasoningText ?? "";
      combinedText = response.text;
      finishReason = response.finishReason;
      writeFileSync(
        path.join(resolved, `${setting.replaceAll("/", "_")}.raw.json`),
        `${JSON.stringify({ setting, model, usage, latencyMs, finishReason, contentText, reasoningText, combinedText }, null, 2)}\n`,
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
      spentUsd = cost.usd ?? spentUsd;
    } catch (caught) {
      latencyMs = Date.now() - startedAt;
      calls += 1;
      error = caught instanceof Error ? caught.message : "call failed";
    }

    let parsed: unknown = null;
    let parseError: string | null = error;
    try {
      if (!parseError) parsed = JSON.parse(extractJsonText(contentText || combinedText));
    } catch {
      parseError = "output is not valid JSON";
    }
    const zod = parsed ? writerBakeoffOutput(task.plans.length).safeParse(parsed) : null;
    const shape = parseBakeoffWriterOutput(parsed ?? combinedText, task.plans.length);
    const fourOptionTexts = shape.status === "ok";
    const honor = assessJsonSchemaHonor({
      contentText,
      reasoningText,
      combinedText,
      planCount: task.plans.length,
    });
    const technicalSuccess = technicalSmokeSuccess({ providerCallOk, fourOptionTexts });
    const reuse = reuseDecision({
      raw: parsed ?? combinedText,
      planCount: task.plans.length,
      source: task.source,
      key: task.key,
      targetLanguage,
      expectedPlanIds,
      technicalSuccess,
    });
    const preview = fourOptionTexts
      ? previewOptions({
          source: task.source,
          key: task.key,
          targetLanguage,
          plans: task.plans,
          candidates: shape.candidates,
        })
      : { options: [], setFormalCues: [], writerClaimIsNotProof: true as const };

    const record = {
      setting,
      model,
      promptVersion: writerBakeoffPromptVersion,
      sourceId: task.id,
      sourceHash: task.sourceHash,
      keyHash: task.keyHash,
      frameHash: task.frameHash,
      planHash: task.planHash,
      providerCallOk,
      jsonSchemaHonor: honor,
      fourOptionTexts,
      technicalSuccess,
      reusable: reuse.reusable,
      reuseBlocks: reuse.blocks,
      parseReason: shape.reason,
      zodOk: zod?.success ?? false,
      zodError: zod && !zod.success ? zod.error.issues.slice(0, 6).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") : null,
      technicalFailure: technicalSuccess ? null : (error ?? parseError ?? honor.path),
      weakOptionsDoNotFailTechnicalSmoke: true,
      writerClaimIsNotProof: true,
      meaningProven: false,
      qualityProven: false,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        reasoningTokens: usage.reasoningTokens ?? null,
        cacheWriteTokens: usage.cacheWriteTokens ?? null,
        cacheReadTokens: usage.cacheReadTokens ?? null,
        totalTokens: usage.totalTokens,
      },
      latencyMs,
      finishReason: finishReason ?? null,
      costUsd: estimateCost({ [`openrouter:${model}`]: { calls: 1, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cacheWriteTokens: usage.cacheWriteTokens, cacheReadTokens: usage.cacheReadTokens } }, prices).usd,
      preview,
      options: (shape.candidates ?? []).map((row) => row.candidateText),
      candidates: shape.candidates,
    };
    rows.push(record);
    writeFileSync(path.join(resolved, `${setting.replaceAll("/", "_")}.json`), `${JSON.stringify(record, null, 2)}\n`);
  }

  const actual = estimateCost(usageRows, prices);
  const summary = {
    version: writerBakeoffSmokeAuthorization,
    started: true,
    executed: true,
    liveAuthorized: true,
    retry: writerBakeoffSmokeRetry,
    maxCalls: writerBakeoffSmokeMaxCalls,
    providerCalls: calls,
    studentBankWrites: 0,
    judgeCalls: 0,
    recoveryCalls: 0,
    bakeoffStarted: false,
    fullBakeoffRefused: fullBakeoff.reason,
    productionWriterUnchanged: true,
    productionJudgeUnchanged: true,
    smokeCeilingUsd: ceiling.totalUsd,
    spendCapUsd: writerBakeoffSmokeSpendCapUsd,
    actualUsd: actual.usd,
    measuredBill: false,
    sourceId: task.id,
    sourceHash: task.sourceHash,
    keyHash: task.keyHash,
    frameHash: task.frameHash,
    planHash: task.planHash,
    models,
    jsonSchemaHonorUnverifiedWithoutLive: false,
    meaningProven: false,
    qualityProven: false,
    writerClaimIsNotProof: true,
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeBakeoff,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    },
    rows: rows.map((row) => ({
      setting: row.setting,
      providerCallOk: row.providerCallOk,
      jsonSchemaHonored: "jsonSchemaHonor" in row ? row.jsonSchemaHonor.honored : false,
      jsonSchemaPath: "jsonSchemaHonor" in row ? row.jsonSchemaHonor.path : null,
      fourOptionTexts: "fourOptionTexts" in row ? row.fourOptionTexts : false,
      technicalSuccess: row.technicalSuccess,
      reusable: row.reusable,
      technicalFailure: "technicalFailure" in row ? row.technicalFailure : row.reason,
      inputTokens: "usage" in row ? row.usage.inputTokens : 0,
      outputTokens: "usage" in row ? row.usage.outputTokens : 0,
      reasoningTokens: "usage" in row ? row.usage.reasoningTokens : null,
      latencyMs: "latencyMs" in row ? row.latencyMs : null,
      costUsd: "costUsd" in row ? row.costUsd : null,
      options: row.options,
      preview: "preview" in row ? row.preview : null,
    })),
  };
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(
    path.join(resolved, "prompt.json"),
    `${JSON.stringify({ promptVersion: writerBakeoffPromptVersion, system: writerBakeoffSystem, user, schema, plans: task.plans.map((plan) => ({ planId: plan.planId, family: plan.family, changeRelation: plan.changeRelation })) }, null, 2)}\n`,
  );
  return summary;
}
