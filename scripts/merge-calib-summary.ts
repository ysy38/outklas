import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SpendBudget } from "../pipeline/ai/budget";
import { calibrationMarkdown, metricsFor, modelSlug, readJsonlResults, type ModelCalibMetrics } from "../pipeline/stages/calibrate";

if (!process.env.OPENROUTER_API_KEY && existsSync(".env.local")) process.loadEnvFile(".env.local");

const out = ".data/analysis/_factory/judge-calibration/openrouter-2026-11-05-v2";
const models = [
  "openrouter:deepseek/deepseek-v4.1-flash",
  "openrouter:qwen/qwen3.8-flash",
  "openrouter:xiaomi/mimo-v2.6-pro",
  "openrouter:google/gemini-3.8-flash",
];

const byModel: Record<string, ModelCalibMetrics> = {};
let totalCost = 0;

for (const model of models) {
  const rows = readJsonlResults(path.join(out, `${modelSlug(model)}.jsonl`));
  const by = new Map<string, (typeof rows)[number]>();
  for (const row of rows) by.set(`${row.blindId}|${row.factoryOption}`, row);
  const results = [...by.values()];
  const metricsPath = path.join(out, `${modelSlug(model)}.metrics.json`);
  const prev = existsSync(metricsPath) ? (JSON.parse(readFileSync(metricsPath, "utf8")) as ModelCalibMetrics) : null;
  const budget = new SpendBudget({}, null);
  budget.calls = prev?.calls ?? results.length;
  const metrics = metricsFor(model, results, {}, null, budget);
  if (prev) {
    metrics.costUsd = prev.costUsd;
    metrics.costReason = prev.costReason;
    metrics.calls = prev.calls;
    metrics.tokens = prev.tokens;
    metrics.meanLatencyMs = prev.meanLatencyMs ?? metrics.meanLatencyMs;
    metrics.stopped = prev.stopped;
  }
  byModel[model] = metrics;
  if (typeof metrics.costUsd === "number") totalCost += metrics.costUsd;
  writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);
  console.log(
    JSON.stringify({
      model,
      judged: metrics.judged,
      errors: metrics.errors,
      agreement: metrics.agreement.rate,
      falseReject: metrics.falseReject.rate,
      catchBad: metrics.catchBad.rate,
      jsonErr: metrics.jsonErrorRate.rate,
      cost: metrics.costUsd,
    }),
  );
}

const summary = {
  at: new Date().toISOString(),
  blindDir: ".data/analysis/_factory/blind-review/2026-10-13-calibration",
  ratedItems: 54,
  labeledSlots: 216,
  ranSlots: 216,
  goldCounts: { good: 172, bad: 44 },
  prompt: "distractor-judge.v3 (FACTORY_EXPERIMENTS empty); OpenRouter reasoning.exclude=true",
  dataCollection: "deny",
  prices: "pipeline/ai/prices.openrouter.json",
  totalCostUsdApprox: Math.round(totalCost * 1e6) / 1e6,
  models: byModel,
  notes: [
    "DeepSeek JSON error rate ~14% after reasoning.exclude — drop as distractor-judge (ok as cheap writer).",
    "Qwen/Xiaomi: reliable JSON but high false-reject (~62–63%) on gold=good.",
    "Gemini completed after RPM-limited resume (concurrency 1); 0 JSON errors.",
    "Production modelDefaults unchanged (Claude). Env overrides only.",
  ],
};

writeFileSync(path.join(out, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(path.join(out, "summary.md"), `${calibrationMarkdown(summary)}\n`);
console.log("totalCostApprox", summary.totalCostUsdApprox);
