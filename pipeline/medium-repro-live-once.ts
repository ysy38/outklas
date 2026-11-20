import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { selectEligible, trapAuthorization } from "@/modules/factory/item-model/cognitive-trap";
import { assessMediumRepro, mediumReproItems } from "@/modules/factory/item-model/medium-repro";
import { loadAIConfig, parseModel } from "./ai/config";
import { OpenRouterProvider } from "./ai/openrouter";
import { loadPrices } from "./ai/prices";
import { executeCognitiveTrap, qualityCallGraph, qualityCostEstimate } from "./stages/cognitive-trap";
import { loadOfficialComparisonCorpus, openrouterPrecheckModels } from "./stages/item-precheck";

const token = "medium-repro-live-v1";
const outDir = ".data/analysis/_factory/cognitive-trap/medium-repro-v1";
const capUsd = 0.233;

const direct = process.argv[1]?.endsWith("medium-repro-live-once.ts") === true && process.argv[2] === token;

async function main(): Promise<void> {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const plan = assessMediumRepro();
  if (!plan.ready) throw new Error(`sources are not ready: ${plan.failures.join(", ")}`);
  const items = mediumReproItems().map((entry) => entry.item);
  const eligible = selectEligible(items);
  if (eligible.kept.length !== 4 || eligible.dropped.length) throw new Error(`eligibility dropped ${eligible.dropped.map((row) => row.id).join(", ") || "items"}`);
  const graph = qualityCallGraph(items.length);
  if (graph.writerCalls !== 8 || graph.judgeCalls !== 4 || graph.maxCalls !== 12) throw new Error("call graph is not 8 writer and 4 judge");
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  const estimate = prices ? qualityCostEstimate(prices, items.length) : null;
  if (estimate === null || estimate > 0.233124) throw new Error(`quality ceiling ${estimate} is above the prepared bound`);
  const officialTexts = loadOfficialComparisonCorpus();
  if (!officialTexts?.length) throw new Error("official comparison corpus is not loaded");
  if (existsSync(path.join(outDir, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(outDir, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) throw new Error("a completed medium repro run is already stored");
  }
  const config = loadAIConfig();
  const models = { ...openrouterPrecheckModels };
  const missing = [parseModel(models.generator, "openrouter").provider, parseModel(models.judge, "openrouter").provider].find((name) => !config.keys[name]);
  if (missing) throw new Error(`missing ${missing} API key`);
  const cache = new Map<string, OpenRouterProvider>();
  const run = await executeCognitiveTrap({
    authorization: trapAuthorization,
    prices,
    models,
    outDir,
    officialTexts,
    items,
    profile: "quality",
    cacheSalt: token,
    limits: { maxCalls: graph.maxCalls, maxRegenerations: 0, maxCostUsd: capUsd },
    providerFor: (setting) => {
      const parsed = parseModel(setting, "openrouter");
      const existing = cache.get(parsed.provider);
      if (existing) return existing;
      const created = new OpenRouterProvider({
        apiKey: config.keys.openrouter ?? "",
        baseUrl: config.openrouterBaseUrl,
        promptCache: config.promptCache ?? "5m",
        dataCollection: config.openrouterDataCollection,
        title: "tomo-factory",
        maxRetries: 0,
        ...(config.maxWaitMs !== undefined ? { maxWaitMs: config.maxWaitMs } : {}),
      });
      cache.set(parsed.provider, created);
      return created;
    },
  });
  console.log(JSON.stringify({
    started: run.started,
    executed: run.executed,
    lock: run.lock,
    reason: run.reason,
    providerCalls: run.providerCalls,
    costUsd: run.costUsd,
    maxCalls: run.maxCalls,
    maxCostUsd: run.maxCostUsd,
    estimatedUsd: run.estimatedUsd,
    retry: run.retry,
    qualityProven: run.qualityProven,
    studentBankWrites: run.studentBankWrites,
    benchmarkStarted: run.benchmarkStarted,
    integrate: run.decision.integrate,
    decision: run.decision.reason,
    droppedKeys: run.droppedKeys,
    shrunkForBudget: run.shrunkForBudget,
    ids: run.records.map((record) => record.id),
    qualityEstimateUsd: estimate,
  }));
}

if (direct) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "medium repro run failed";
    console.error(message);
    process.exitCode = 1;
  });
}
