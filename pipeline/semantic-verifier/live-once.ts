import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseModel } from "../ai/config";
import { openrouterBrevity, OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices, priceFor } from "../ai/prices";
import { openrouterPrecheckModels } from "../stages/item-precheck";
import { deterministicBaseline, pilotRates, scoreClaim, type ClaimOutcome } from "./compare";
import { readVerification, refuseLiveVerification, semanticVerifierRequest, semanticVerifierSystem, type SemanticVerification } from "./contract";
import { pilotPairs, verifierInputOf, type PilotPair } from "./fixture";

const budgetUsd = 0.065;
const outputCeiling = 400;
const outDir = ".data/analysis/_factory/semantic-verifier/live-v1";
const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const modelSetting = openrouterPrecheckModels.judge;

function tokens(chars: number): number {
  return Math.ceil(chars / 3);
}

function requestChars(user: string, schema: string): number {
  return semanticVerifierSystem.length + 2 + openrouterBrevity.length + schema.length + user.length;
}

function ceilingUsd(inputTokens: number, calls: number): number | null {
  const cost = estimateCost({ [modelSetting]: { calls, inputTokens, outputTokens: calls * outputCeiling } }, prices);
  return cost.usd;
}

type Row = {
  id: string;
  humanClass: PilotPair["humanClass"];
  questionType: PilotPair["questionType"];
  targetLanguage: PilotPair["targetLanguage"];
  source: string;
  option: string;
  claim: SemanticVerification | null;
  outcome: ClaimOutcome;
  baseline: ReturnType<typeof deterministicBaseline>;
  usage: { inputTokens: number; outputTokens: number; cacheWriteTokens?: number; cacheReadTokens?: number } | null;
  error: string | null;
};

function loadKey(): string {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  return key;
}

async function main(): Promise<void> {
  if (process.argv[2] !== "semantic-verifier-v2-live") {
    console.log(JSON.stringify(refuseLiveVerification()));
    return;
  }
  if (!prices) throw new Error("OpenRouter price table is missing");
  const price = priceFor(prices.table, modelSetting);
  if (!price) throw new Error(`no price for ${modelSetting}`);
  const pairs = pilotPairs();
  if (pairs.length !== 11) throw new Error(`expected 11 pairs, found ${pairs.length}`);
  const prepared = pairs.map((pair) => {
    const input = verifierInputOf(pair);
    const request = semanticVerifierRequest(input);
    if (request.user.includes(pair.humanClass) || request.user.includes(pair.note)) throw new Error(`prompt leaks the human label for ${pair.id}`);
    return { pair, request, inputCeiling: tokens(requestChars(request.user, JSON.stringify(request.jsonSchema))) };
  });
  const inputTokens = prepared.reduce((sum, row) => sum + row.inputCeiling, 0);
  const upper = ceilingUsd(inputTokens, prepared.length);
  const summaryPath = path.join(outDir, "summary.json");
  if (existsSync(summaryPath)) {
    const previous = JSON.parse(readFileSync(summaryPath, "utf8")) as { executed?: boolean };
    if (previous.executed) throw new Error("a completed verifier run is already stored; it was not run again");
  }
  if (upper === null || upper > budgetUsd) {
    writeFileSync(path.resolve("pipeline/semantic-verifier/live-once-refused.json"), JSON.stringify({ started: false, providerCalls: 0, upperUsd: upper, budgetUsd, outputCeiling, reason: "estimate exceeds the authorized budget" }, null, 2));
    console.log(JSON.stringify({ started: false, providerCalls: 0, upperUsd: upper, budgetUsd }));
    return;
  }
  const provider = new OpenRouterProvider({
    apiKey: loadKey(),
    maxRetries: 0,
    minOutputTokens: outputCeiling,
    promptCache: "off",
    dataCollection: process.env.OPENROUTER_DATA_COLLECTION === "deny" ? "deny" : "allow",
    title: "tomo-semantic-verifier",
  });
  const model = parseModel(modelSetting).model;
  const rows: Row[] = [];
  let spentInput = 0;
  let spentOutput = 0;
  let calls = 0;
  for (const [index, item] of prepared.entries()) {
    const pending = prepared.slice(index);
    const projected = estimateCost({
      [modelSetting]: {
        calls: calls + pending.length,
        inputTokens: spentInput + pending.reduce((sum, row) => sum + row.inputCeiling, 0),
        outputTokens: spentOutput + pending.length * outputCeiling,
      },
    }, prices).usd;
    if (projected !== null && projected > budgetUsd) break;
    let claim: SemanticVerification | null = null;
    let error: string | null = null;
    let usage: Row["usage"] = null;
    try {
      const response = await provider.generate({
        model,
        system: item.request.system,
        parts: [{ text: item.request.user }],
        jsonSchema: item.request.jsonSchema,
        maxOutputTokens: outputCeiling,
        temperature: 0,
      });
      calls += 1;
      usage = {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
        ...(response.usage?.cacheWriteTokens ? { cacheWriteTokens: response.usage.cacheWriteTokens } : {}),
        ...(response.usage?.cacheReadTokens ? { cacheReadTokens: response.usage.cacheReadTokens } : {}),
      };
      spentInput += usage.inputTokens;
      spentOutput += usage.outputTokens;
      claim = readVerification(JSON.parse(response.text)).claim;
    } catch (caught) {
      if (!usage) calls += 1;
      error = caught instanceof Error ? caught.message : "verifier call failed";
    }
    rows.push({
      id: item.pair.id,
      humanClass: item.pair.humanClass,
      questionType: item.pair.questionType,
      targetLanguage: item.pair.targetLanguage,
      source: item.pair.source,
      option: item.pair.option,
      claim,
      outcome: scoreClaim(item.pair, claim),
      baseline: deterministicBaseline(item.pair),
      usage,
      error,
    });
    const actual = estimateCost({ [modelSetting]: { calls, inputTokens: spentInput, outputTokens: spentOutput } }, prices).usd;
    if (actual !== null && actual > budgetUsd) break;
  }
  const claims = new Map(rows.map((row) => [row.id, row.claim]));
  const rates = pilotRates(pairs, claims);
  const actual = estimateCost({
    [modelSetting]: {
      calls,
      inputTokens: spentInput,
      outputTokens: spentOutput,
    },
  }, prices);
  const report = {
    executed: calls > 0,
    providerCalls: calls,
    retry: 0,
    model: modelSetting,
    outputCeiling,
    budgetUsd,
    upperUsd: upper,
    actualUsd: actual.usd,
    price: { in: price.in, out: price.out },
    rates,
    integrated: false,
    studentBankWrites: 0,
    rows,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    providerCalls: calls,
    upperUsd: upper,
    actualUsd: actual.usd,
    rates,
    rows: rows.map((row) => ({ id: row.id, humanClass: row.humanClass, outcome: row.outcome, relation: row.claim?.relation ?? null, relationMutation: row.claim?.relationMutation ?? null, unsupportedExtension: row.claim?.unsupportedExtension ?? null, confidence: row.claim?.confidence ?? null, error: row.error })),
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "verifier run failed";
  console.error(message);
  process.exitCode = 1;
});
