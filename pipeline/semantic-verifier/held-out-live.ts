import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseModel } from "../ai/config";
import { openrouterBrevity, OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, loadPrices, priceFor } from "../ai/prices";
import { openrouterPrecheckModels } from "../stages/item-precheck";
import { readVerification, refuseLiveVerification, semanticVerifierRequest, semanticVerifierSystem, type SemanticVerification } from "./contract";
import { heldOutInput, heldOutItems, type HeldOutItem } from "./held-out";

const budgetUsd = 0.065;
const outputCeiling = 400;
const outDir = ".data/analysis/_factory/semantic-verifier/held-out-v1";
const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const modelSetting = openrouterPrecheckModels.judge;

function tokens(chars: number): number {
  return Math.ceil(chars / 3);
}

function requestChars(user: string, schema: string): number {
  return semanticVerifierSystem.length + 2 + openrouterBrevity.length + schema.length + user.length;
}

export type ReferenceAgreement = {
  relation: "match" | "mismatch";
  relationMutation: "match" | "mismatch";
  unsupportedExtension: "match" | "mismatch";
  matchesReference: boolean;
  modelUncertain: boolean;
};

export function compareReference(item: HeldOutItem, claim: SemanticVerification | null): ReferenceAgreement | null {
  if (!claim) return null;
  const relation = claim.relation === item.provisional.relation ? "match" : "mismatch";
  const relationMutation = claim.relationMutation === item.provisional.relationMutation ? "match" : "mismatch";
  const unsupportedExtension = claim.unsupportedExtension === item.provisional.unsupportedExtension ? "match" : "mismatch";
  return {
    relation,
    relationMutation,
    unsupportedExtension,
    matchesReference: relation === "match" && relationMutation === "match" && unsupportedExtension === "match",
    modelUncertain: claim.relation === "uncertain" || claim.relationMutation === "uncertain" || claim.unsupportedExtension === "uncertain",
  };
}

export function heldOutCeilingUsd(): { upperUsd: number | null; inputTokens: number; calls: number; outputCeiling: number } {
  const items = heldOutItems();
  let inputTokens = 0;
  for (const item of items) {
    const request = semanticVerifierRequest(heldOutInput(item));
    if (request.user.includes(item.reviewNote) || request.system.includes(item.id)) throw new Error(`prompt leaks the review reference for ${item.id}`);
    inputTokens += tokens(requestChars(request.user, JSON.stringify(request.jsonSchema)));
  }
  const cost = estimateCost({ [modelSetting]: { calls: items.length, inputTokens, outputTokens: items.length * outputCeiling } }, prices);
  return { upperUsd: cost.usd, inputTokens, calls: items.length, outputCeiling };
}

function loadKey(): string {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  return key;
}

async function main(): Promise<void> {
  if (process.argv[2] !== "semantic-verifier-held-out-v1") {
    console.log(JSON.stringify(refuseLiveVerification()));
    return;
  }
  if (!prices) throw new Error("OpenRouter price table is missing");
  const price = priceFor(prices.table, modelSetting);
  if (!price) throw new Error(`no price for ${modelSetting}`);
  const ceiling = heldOutCeilingUsd();
  if (ceiling.calls !== 10 || ceiling.upperUsd === null || ceiling.upperUsd > budgetUsd) {
    console.log(JSON.stringify({ started: false, providerCalls: 0, ...ceiling, budgetUsd }));
    return;
  }
  const summaryPath = path.join(outDir, "summary.json");
  if (existsSync(summaryPath)) {
    const previous = JSON.parse(readFileSync(summaryPath, "utf8")) as { executed?: boolean };
    if (previous.executed) throw new Error("a completed held-out run is already stored; it was not run again");
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
  const rows = [];
  let spentInput = 0;
  let spentOutput = 0;
  let calls = 0;
  for (const item of heldOutItems()) {
    const request = semanticVerifierRequest(heldOutInput(item));
    let claim: SemanticVerification | null = null;
    let error: string | null = null;
    let usage: { inputTokens: number; outputTokens: number } | null = null;
    try {
      const response = await provider.generate({
        model,
        system: request.system,
        parts: [{ text: request.user }],
        jsonSchema: request.jsonSchema,
        maxOutputTokens: outputCeiling,
        temperature: 0,
      });
      calls += 1;
      usage = { inputTokens: response.usage?.inputTokens ?? 0, outputTokens: response.usage?.outputTokens ?? 0 };
      spentInput += usage.inputTokens;
      spentOutput += usage.outputTokens;
      claim = readVerification(JSON.parse(response.text)).claim;
    } catch (caught) {
      if (!usage) calls += 1;
      error = caught instanceof Error ? caught.message : "verifier call failed";
    }
    rows.push({
      id: item.id,
      reference: item.provisional,
      expertApproval: false,
      source: item.source,
      option: item.option,
      claim,
      agreement: compareReference(item, claim),
      usage,
      error,
    });
  }
  const actual = estimateCost({ [modelSetting]: { calls, inputTokens: spentInput, outputTokens: spentOutput } }, prices);
  const report = {
    executed: calls > 0,
    providerCalls: calls,
    retry: 0,
    model: modelSetting,
    outputCeiling,
    budgetUsd,
    upperUsd: ceiling.upperUsd,
    actualUsd: actual.usd,
    integrated: false,
    studentBankWrites: 0,
    benchmarkStarted: false,
    rows,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    providerCalls: calls,
    upperUsd: ceiling.upperUsd,
    actualUsd: actual.usd,
    rows: rows.map((row) => ({
      id: row.id,
      relation: row.claim?.relation ?? null,
      relationMutation: row.claim?.relationMutation ?? null,
      unsupportedExtension: row.claim?.unsupportedExtension ?? null,
      alteredMeaning: row.claim?.alteredMeaning ?? null,
      agreement: row.agreement,
      error: row.error,
    })),
  }, null, 2));
}

const isDirectRun = process.argv[1]?.endsWith("held-out-live.ts");
if (isDirectRun) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "verifier run failed";
    console.error(message);
    process.exitCode = 1;
  });
}
