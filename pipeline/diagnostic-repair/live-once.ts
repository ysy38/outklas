import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig, parseModel } from "../ai/config";
import { OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices } from "../ai/prices";
import { extractJsonText } from "../ai/service";
import { repairOutputSchema, repairSystem, repairUser, readRepairOutput } from "./contract";
import { cautiousRepairCeiling, classifyRepairTransport, refuseRepairLive } from "./call-contract";
import { draftsEditorialRisks, draftsFixedOptions, draftsRecordPath, draftsRepairTasks, loadDraftsRecord } from "./drafts";
import { measureAfter, measureBefore } from "./measure";
import { revalidateRepair } from "./revalidate";

const token = "diagnostic-repair-live-v1";
const outDir = ".data/analysis/_factory/cognitive-trap/diagnostic-repair-v1";
const retryToken = "diagnostic-repair-live-v2";
const retryDir = ".data/analysis/_factory/cognitive-trap/diagnostic-repair-v2";
const direct = process.argv[1]?.endsWith("live-once.ts") === true && process.argv[2] === token;
const retryDirect = process.argv[1]?.endsWith("live-once.ts") === true && process.argv[2] === retryToken;

async function main(): Promise<void> {
  const refused = refuseRepairLive();
  if (!refused.started) throw new Error(refused.reason);
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const recordPath = path.resolve(draftsRecordPath);
  const beforeHash = createHash("sha256").update(readFileSync(recordPath)).digest("hex");
  const record = loadDraftsRecord();
  const tasks = draftsRepairTasks(record);
  if (tasks.length !== 2 || tasks.map((task) => task.optionId).join() !== "C,E") throw new Error("the pilot is only options C and E");
  const fixed = { source: record.source, key: record.key, targetLanguage: "en" as const, fixedOptions: draftsFixedOptions(record) };
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  const ceiling = cautiousRepairCeiling(tasks, prices, fixed);
  if (!ceiling.liveAuthorized) throw new Error(refuseRepairLive().reason);
  if (existsSync(path.join(outDir, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(outDir, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) throw new Error("a completed repair pilot is already stored");
  }
  const config = loadAIConfig();
  if (!config.keys.openrouter) throw new Error("missing openrouter API key");
  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory",
    maxRetries: 0,
    minOutputTokens: ceiling.outputTokensPerCall,
  });
  const model = parseModel(ceiling.model, "openrouter").model;
  const schema = repairOutputSchema;
  let spentInput = 0;
  let spentOutput = 0;
  let calls = 0;
  const rows = [];
  for (const task of tasks) {
    if (calls >= 2) break;
    const projected = estimateCost({ [ceiling.model]: { calls: calls + 1, inputTokens: spentInput + Math.ceil((repairSystem.length + repairUser(task, fixed).length) / 2), outputTokens: spentOutput + ceiling.outputTokensPerCall } }, prices).usd;
    if (projected !== null && projected > 0.02) break;
    calls += 1;
    const response = await provider.generate({
      model,
      system: repairSystem,
      parts: [{ text: repairUser(task, fixed) }],
      jsonSchema: schema,
      temperature: 0,
      maxOutputTokens: ceiling.outputTokensPerCall,
    });
    spentInput += response.usage.inputTokens;
    spentOutput += response.usage.outputTokens;
    let parsed = null;
    let parseError: string | null = null;
    try {
      parsed = readRepairOutput(JSON.parse(extractJsonText(response.text)));
      if (!parsed) parseError = "output did not match the repair schema";
      if (parsed && parsed.optionId !== task.optionId) parseError = "optionId does not match the task";
    } catch {
      parseError = "output is not valid JSON";
    }
    const transportFailure = classifyRepairTransport({ text: response.text, outputTokens: response.usage.outputTokens, reasoningTokens: response.usage.reasoningTokens });
    const common = { source: record.source, key: record.key, options: record.options, targetLanguage: "en" as const, questionType: "translation" as const, correct: "A" as const };
    const verdict = transportFailure.length
      ? {
          outcome: "needs_revision" as const,
          option_repair_success: false as const,
          kept: "original" as const,
          keptText: task.originalOption,
          sourceHash: task.sourceHash,
          keyHash: task.keyHash,
          qualityDecision: "needs_revision" as const,
          editorial: "pending" as const,
          meaningProven: false as const,
          reasons: ["technical_call_failure"],
          ignored: [],
        }
      : parsed && parsed.outcome === "replacement" && !parseError
        ? revalidateRepair({ ...common, task, candidate: parsed.text })
        : {
            outcome: parsed?.outcome === "repair_not_possible" ? "repair_not_possible" as const : "needs_revision" as const,
            option_repair_success: false as const,
            kept: "original" as const,
            keptText: task.originalOption,
            sourceHash: task.sourceHash,
            keyHash: task.keyHash,
            qualityDecision: "needs_revision" as const,
            editorial: "pending" as const,
            meaningProven: false as const,
            reasons: parsed?.outcome === "repair_not_possible" ? ["repair_not_possible"] : [parseError ?? "no_replacement"],
            ignored: [],
          };
    rows.push({
      optionId: task.optionId,
      issueCode: task.issueCode,
      originalOption: task.originalOption,
      proposed: parsed?.outcome === "replacement" ? parsed.text : null,
      modelOutcome: parsed?.outcome ?? null,
      callFailure: transportFailure,
      verdict,
      usage: response.usage,
    });
  }
  const before = measureBefore(record, tasks);
  const after = measureAfter(before, rows.map((row) => ({ task: tasks.find((task) => task.optionId === row.optionId)!, verdict: row.verdict })));
  if (after.whole_set_ready_for_review) throw new Error("the five cannot be ready while D remains an open risk");
  const actual = estimateCost({ [ceiling.model]: { calls, inputTokens: spentInput, outputTokens: spentOutput } }, prices).usd;
  const summary = {
    executed: true,
    providerCalls: calls,
    retry: 0,
    attemptsPerOption: 1,
    model: ceiling.model,
    promptCache: "off",
    outputTokenCeiling: ceiling.outputTokensPerCall,
    providerCeilingUsd: ceiling.estimatedUsd,
    actualUsd: actual,
    measuredBill: false,
    studentBankWrites: 0,
    benchmarkStarted: false,
    factoryIntegrated: false,
    judgeCalls: 0,
    sourceUnchanged: true,
    keyUnchanged: true,
    fixedOptions: ["A", "B", "D"],
    sourceHash: tasks[0]?.sourceHash,
    keyHash: tasks[0]?.keyHash,
    editorialRisks: draftsEditorialRisks,
    meaningProven: false,
    editorial: "pending",
    option_repair_success: after.option_repair_success,
    whole_set_ready_for_review: after.whole_set_ready_for_review,
    rows,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  const afterHash = createHash("sha256").update(readFileSync(recordPath)).digest("hex");
  if (afterHash !== beforeHash) throw new Error("the recorded Drafts file changed");
  console.log(JSON.stringify({
    providerCalls: calls,
    providerCeilingUsd: ceiling.estimatedUsd,
    actualUsd: actual,
    whole_set_ready_for_review: after.whole_set_ready_for_review,
    rows: rows.map((row) => ({ optionId: row.optionId, modelOutcome: row.modelOutcome, outcome: row.verdict.outcome, option_repair_success: row.verdict.option_repair_success, reasons: row.verdict.reasons, kept: row.verdict.kept })),
  }));
}

async function mainRetry(): Promise<void> {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const recordPath = path.resolve(draftsRecordPath);
  const v1Summary = path.join(outDir, "summary.json");
  const v1Failure = path.join(outDir, "call-failure.json");
  const beforeHash = createHash("sha256").update(readFileSync(recordPath)).digest("hex");
  const v1Hash = createHash("sha256").update(readFileSync(v1Summary)).digest("hex");
  const failureHash = createHash("sha256").update(readFileSync(v1Failure)).digest("hex");
  const record = loadDraftsRecord();
  const tasks = draftsRepairTasks(record);
  if (tasks.length !== 2 || tasks.map((task) => task.optionId).join() !== "C,E") throw new Error("the retry is only options C and E");
  const fixed = { source: record.source, key: record.key, targetLanguage: "en" as const, fixedOptions: draftsFixedOptions(record) };
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  const ceiling = cautiousRepairCeiling(tasks, prices, fixed);
  if (ceiling.estimatedUsd === null || ceiling.estimatedUsd > 0.02 || ceiling.calls !== 2 || ceiling.outputTokensPerCall !== 4096) {
    throw new Error(`provider ceiling ${ceiling.estimatedUsd} exceeds $0.02`);
  }
  if (existsSync(path.join(retryDir, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(retryDir, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) throw new Error("the authorized retry is already stored");
  }
  const config = loadAIConfig();
  if (!config.keys.openrouter) throw new Error("missing openrouter API key");
  const provider = new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory",
    maxRetries: 0,
    minOutputTokens: ceiling.outputTokensPerCall,
  });
  const model = parseModel(ceiling.model, "openrouter").model;
  const schema = repairOutputSchema;
  let spentInput = 0;
  let spentOutput = 0;
  let calls = 0;
  const rows = [];
  for (const task of tasks) {
    if (calls >= 2) break;
    calls += 1;
    const response = await provider.generate({
      model,
      system: repairSystem,
      parts: [{ text: repairUser(task, fixed) }],
      jsonSchema: schema,
      temperature: 0,
      maxOutputTokens: ceiling.outputTokensPerCall,
    });
    spentInput += response.usage.inputTokens;
    spentOutput += response.usage.outputTokens;
    let parsed = null;
    let parseError: string | null = null;
    try {
      parsed = readRepairOutput(JSON.parse(extractJsonText(response.text)));
      if (!parsed) parseError = "output did not match the repair schema";
      if (parsed && parsed.optionId !== task.optionId) parseError = "optionId does not match the task";
    } catch {
      parseError = "output is not valid JSON";
    }
    const transportFailure = classifyRepairTransport({ text: response.text, outputTokens: response.usage.outputTokens, reasoningTokens: response.usage.reasoningTokens });
    const common = { source: record.source, key: record.key, options: record.options, targetLanguage: "en" as const, questionType: "translation" as const, correct: "A" as const };
    const visibleJson = Boolean(parsed && !parseError);
    const verdict = !visibleJson
      ? {
          outcome: "needs_revision" as const,
          option_repair_success: false as const,
          kept: "original" as const,
          keptText: task.originalOption,
          sourceHash: task.sourceHash,
          keyHash: task.keyHash,
          qualityDecision: "needs_revision" as const,
          editorial: "pending" as const,
          meaningProven: false as const,
          reasons: transportFailure.length ? ["technical_call_failure"] : [parseError ?? "no_replacement"],
          ignored: [],
        }
      : parsed && parsed.outcome === "replacement"
        ? revalidateRepair({ ...common, task, candidate: parsed.text })
        : {
            outcome: parsed?.outcome === "repair_not_possible" ? "repair_not_possible" as const : "needs_revision" as const,
            option_repair_success: false as const,
            kept: "original" as const,
            keptText: task.originalOption,
            sourceHash: task.sourceHash,
            keyHash: task.keyHash,
            qualityDecision: "needs_revision" as const,
            editorial: "pending" as const,
            meaningProven: false as const,
            reasons: parsed?.outcome === "repair_not_possible" ? ["repair_not_possible"] : [parseError ?? "no_replacement"],
            ignored: [],
          };
    rows.push({
      optionId: task.optionId,
      issueCode: task.issueCode,
      originalOption: task.originalOption,
      proposed: parsed?.outcome === "replacement" ? parsed.text : null,
      modelOutcome: parsed?.outcome ?? null,
      visibleJson,
      callFailure: transportFailure,
      verdict,
      usage: response.usage,
    });
  }
  const before = measureBefore(record, tasks);
  const after = measureAfter(before, rows.map((row) => ({ task: tasks.find((task) => task.optionId === row.optionId)!, verdict: row.verdict })));
  const actual = estimateCost({ [ceiling.model]: { calls, inputTokens: spentInput, outputTokens: spentOutput } }, prices).usd;
  const summary = {
    executed: true,
    version: "diagnostic-repair-v2",
    providerCalls: calls,
    retry: 0,
    attemptsPerOption: 1,
    model: ceiling.model,
    promptCache: "off",
    outputTokenCeiling: ceiling.outputTokensPerCall,
    providerCeilingUsd: ceiling.estimatedUsd,
    actualUsd: actual,
    measuredBill: false,
    studentBankWrites: 0,
    benchmarkStarted: false,
    factoryIntegrated: false,
    judgeCalls: 0,
    sourceUnchanged: true,
    keyUnchanged: true,
    fixedOptions: ["A", "B", "D"],
    sourceHash: tasks[0]?.sourceHash,
    keyHash: tasks[0]?.keyHash,
    editorialRisks: draftsEditorialRisks,
    meaningProven: false,
    editorial: "pending",
    option_repair_success: after.option_repair_success,
    whole_set_ready_for_review: after.whole_set_ready_for_review,
    rows,
  };
  mkdirSync(retryDir, { recursive: true });
  writeFileSync(path.join(retryDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  const afterHash = createHash("sha256").update(readFileSync(recordPath)).digest("hex");
  const v1After = createHash("sha256").update(readFileSync(v1Summary)).digest("hex");
  const failureAfter = createHash("sha256").update(readFileSync(v1Failure)).digest("hex");
  if (afterHash !== beforeHash) throw new Error("the recorded Drafts file changed");
  if (v1After !== v1Hash || failureAfter !== failureHash) throw new Error("the failed v1 records changed");
  console.log(JSON.stringify({
    providerCalls: calls,
    providerCeilingUsd: ceiling.estimatedUsd,
    actualUsd: actual,
    whole_set_ready_for_review: after.whole_set_ready_for_review,
    rows: rows.map((row) => ({
      optionId: row.optionId,
      visibleJson: row.visibleJson,
      proposed: row.proposed,
      modelOutcome: row.modelOutcome,
      outcome: row.verdict.outcome,
      option_repair_success: row.verdict.option_repair_success,
      reasons: row.verdict.reasons,
      kept: row.verdict.kept,
      callFailure: row.callFailure,
      usage: row.usage,
    })),
  }));
}

if (direct) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "repair pilot failed";
    console.error(message);
    process.exitCode = 1;
  });
}

if (retryDirect) {
  mainRetry().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "repair retry failed";
    console.error(message);
    process.exitCode = 1;
  });
}
