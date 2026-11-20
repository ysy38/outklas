import { existsSync } from "node:fs";
import { documentBySlug } from "@/modules/analysis/sources";
import { geminiSmoke } from "./ai/smoke";
import type { StageResult } from "./lib/artifacts";
import { analyze } from "./stages/analyze";
import type { StageContext } from "./stages/context";
import { corpus } from "./stages/corpus";
import { dna } from "./stages/dna";
import { dnaSkeleton } from "./stages/dna-skeleton";
import { examSlice } from "./stages/exam-slice";
import { factoryAudit, factoryBlindScore, factoryBlindSheet, factoryCompare, type VariantInput } from "./stages/benchmark";
import { planBankImport } from "./stages/bank-plan";
import { factoryJudgeCalibrate, mergeCalibration } from "./stages/calibrate";
import { restatementJudge, restatementSmoke } from "./stages/restatement";
import { factoryProfile, factoryReview, factorySlice, historicalIndex } from "./stages/factory";
import { itemFactoryBenchmark, itemFactoryPlan } from "./stages/item-factory";
import { itemFactoryCoreSmoke, itemFactoryPrecheck } from "./stages/item-precheck";
import { itemFactoryCognitivePilot, itemFactoryCognitiveTrap, itemFactoryQualityJudgeReplay, itemFactoryQualityRepair, itemFactoryTaxonomyLive } from "./stages/cognitive-trap";
import { taxonomyLiveOutputDir } from "@/modules/factory/item-model/taxonomy-live";
import { factoryRescore } from "./stages/rescore";
import { loadPrices } from "./ai/prices";
import { cleanup, reconstructStage, segmentStage, validateStage } from "./stages/extraction";
import { importStage } from "./stages/import";
import { metrics } from "./stages/metrics";
import { ocr } from "./stages/ocr";
import { ocrVerify } from "./stages/ocr-verify";
import { render } from "./stages/render";
import { report } from "./stages/report";
import { review } from "./stages/review";
import { textExtract } from "./stages/text-extract";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

type Stage = (context: StageContext) => Promise<StageResult | void>;

const stages: Record<string, Stage> = {
  render,
  ocr,
  "ocr-verify": ocrVerify,
  "text-extract": textExtract,
  inspect: textExtract,
  "exam-slice": examSlice,
  cleanup,
  segment: segmentStage,
  reconstruct: reconstructStage,
  validate: validateStage,
  analyze,
  dna,
  "dna-skeleton": dnaSkeleton,
  import: importStage,
  report,
  review,
  metrics,
};

const aliases: Record<string, string[]> = {
  pilot: ["render", "ocr", "ocr-verify", "cleanup", "segment", "reconstruct", "validate", "analyze", "dna", "import", "report", "review", "metrics"],
  extract: ["render", "ocr", "cleanup", "segment", "reconstruct", "validate", "dna-skeleton"],
  "text-extract-all": ["text-extract"],
  "text-exam": ["exam-slice", "segment", "reconstruct", "validate", "dna-skeleton"],
  "text-booklet": ["text-extract", "cleanup", "segment", "reconstruct", "validate", "dna-skeleton"],
};

function option(name: string, fallback: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const name = process.argv[2];
  if (name === "smoke") {
    const result = await geminiSmoke();
    console.log(JSON.stringify({ ok: result.ok, keyLocation: result.keyLocation, clientExposed: result.clientExposed, proPreview: result.proPreview, working: result.working, probed: result.probed.map((entry) => ({ model: entry.model, status: entry.status, httpStatus: entry.httpStatus })) }, null, 2));
    process.exit(result.ok ? 0 : 2);
  }
  if (name === "corpus") {
    const result = await corpus();
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (name === "profile") {
    const { profile, file } = factoryProfile();
    console.log(JSON.stringify({ file, version: profile.version, questions: profile.questions, families: profile.families.length, unsupported: profile.unsupported.length }, null, 2));
    return;
  }
  if (name === "factory") {
    const band = option("band", "") || undefined;
    const result = await factorySlice({ family: option("family", ""), count: Number.parseInt(option("count", "0"), 10), first: Number.parseInt(option("first", "1"), 10), band: band as "easy" | "medium" | "hard" | undefined, tag: option("tag", "") || undefined, log: (message) => console.log(`  ${message}`) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (name === "factory-review") {
    const edit = option("edit", "");
    const approvedBand = option("approved-band", "");
    console.log(JSON.stringify(factoryReview({ runDir: option("run", ""), candidateId: option("candidate", ""), decision: option("decision", ""), reviewer: option("reviewer", ""), notes: option("notes", ""), editFile: edit || undefined, ...(approvedBand ? { band: approvedBand } : {}) }), null, 2));
    return;
  }
  if (name === "factory-audit") {
    const result = await factoryAudit({ runDir: option("run", ""), log: (message) => console.log(`  ${message}`) });
    console.log(JSON.stringify({ run: result.run, audited: result.audits.length, errors: result.errors }, null, 2));
    return;
  }
  if (name === "factory-compare" || name === "factory-blind") {
    // --variants "A=<runDir>[+<runDir>…],B=<runDir>+<runDir>,…": one run per seed, pooled per variant.
    const variants: VariantInput[] = option("variants", "")
      .split(",")
      .filter(Boolean)
      .map((entry) => {
        const [label, dirs] = entry.split("=");
        return { label, runDirs: dirs.split("+").filter(Boolean) };
      });
    if (name === "factory-compare") {
      const blind = option("blind", "");
      console.log(JSON.stringify(factoryCompare({ variants, out: option("out", ""), prices: loadPrices(), ...(blind ? { blindDir: blind } : {}) }), null, 2));
    } else console.log(JSON.stringify(factoryBlindSheet({ variants, out: option("out", "") }), null, 2));
    return;
  }
  if (name === "factory-rescore") {
    // Offline: stored outputs and stored judge reports re-scored with the current rules; no model is called.
    const as = option("as", "");
    console.log(JSON.stringify(factoryRescore({ runDirs: option("runs", "").split(",").filter(Boolean), out: option("out", ""), originality: historicalIndex().index, ...(as ? { as } : {}) }), null, 2));
    return;
  }
  if (name === "factory-blind-score") {
    console.log(JSON.stringify(factoryBlindScore({ dir: option("dir", "") }), null, 2));
    return;
  }
  if (name === "factory-bank-plan") {
    const result = planBankImport({
      blindDir: option("dir", ".data/analysis/_factory/blind-review/2026-11-05-gateway-20x2"),
      out: option("out", ".data/analysis/_factory/bank-import/2026-11-06"),
    });
    console.log(JSON.stringify({ out: option("out", ".data/analysis/_factory/bank-import/2026-11-06"), ...result.counts, writes: result.writes }, null, 2));
    return;
  }
  if (name === "factory-item-plan") {
    console.log(JSON.stringify(itemFactoryPlan(), null, 2));
    return;
  }
  if (name === "factory-item-benchmark") {
    console.log(JSON.stringify(itemFactoryBenchmark(option("authorize", "")), null, 2));
    return;
  }
  if (name === "factory-item-core-smoke") {
    const via = option("via", "");
    if (via !== "openrouter") throw new Error("--via openrouter is required");
    const result = await itemFactoryCoreSmoke(option("authorize", ""), option("out", ".data/analysis/_factory/item-core-smoke/openrouter-v1"));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (name === "factory-taxonomy-live") {
    const via = option("via", "");
    if (via !== "openrouter") throw new Error("--via openrouter is required");
    const result = await itemFactoryTaxonomyLive(option("authorize", ""), option("out", taxonomyLiveOutputDir));
    console.log(JSON.stringify({ started: result.started, executed: result.executed, lock: result.lock, reason: result.reason, providerCalls: result.providerCalls, costUsd: result.costUsd, maxCalls: result.maxCalls, maxCostUsd: result.maxCostUsd, estimatedUsd: result.estimatedUsd }, null, 2));
    return;
  }
  if (name === "factory-quality-repair") {
    const via = option("via", "");
    if (via !== "openrouter") throw new Error("--via openrouter is required");
    const result = await itemFactoryQualityRepair(option("authorize", ""), option("out", ".data/analysis/_factory/cognitive-trap/quality-v1"));
    console.log(JSON.stringify({ started: result.started, executed: result.executed, lock: result.lock, reason: result.reason, providerCalls: result.providerCalls, costUsd: result.costUsd, maxCalls: result.maxCalls, maxCostUsd: result.maxCostUsd, estimatedUsd: result.estimatedUsd }, null, 2));
    return;
  }
  if (name === "factory-quality-judge-replay") {
    const via = option("via", "");
    if (via !== "openrouter") throw new Error("--via openrouter is required");
    const result = await itemFactoryQualityJudgeReplay(option("authorize", ""), option("out", ".data/analysis/_factory/cognitive-trap/quality-judge-replay-v1"));
    console.log(JSON.stringify({ started: result.started, executed: result.executed, lock: result.lock, reason: result.reason, providerCalls: result.providerCalls, costUsd: result.costUsd, maxCalls: result.maxCalls, maxCostUsd: result.maxCostUsd, estimatedUsd: result.estimatedUsd, writerCalls: result.writerCalls, studentBankWrites: result.studentBankWrites, editorApproved: result.editorApproved, records: result.records.map((record) => ({ id: record.id, factoryVerdict: record.factoryVerdict, editorialRemaining: record.editorialRemaining, blindAnswer: record.judge?.blindAnswer ?? null, modelVerdict: record.judge?.modelVerdict ?? null, ruled: record.ruled?.verdict ?? null })) }, null, 2));
    return;
  }
  if (name === "factory-cognitive-trap-pilot") {
    const via = option("via", "");
    if (via !== "openrouter") throw new Error("--via openrouter is required");
    const result = await itemFactoryCognitivePilot(option("authorize", ""), option("out", ".data/analysis/_factory/cognitive-trap/pilot-v1"));
    console.log(JSON.stringify({ started: result.started, executed: result.executed, lock: result.lock, reason: result.reason, providerCalls: result.providerCalls, costUsd: result.costUsd, maxCalls: result.maxCalls, maxCostUsd: result.maxCostUsd, estimatedUsd: result.estimatedUsd }, null, 2));
    return;
  }
  if (name === "factory-cognitive-trap") {
    const via = option("via", "");
    if (via !== "openrouter") throw new Error("--via openrouter is required");
    const result = await itemFactoryCognitiveTrap(option("authorize", ""), option("out", ".data/analysis/_factory/cognitive-trap/openrouter-v1"));
    console.log(JSON.stringify({ started: result.started, executed: result.executed, lock: result.lock, reason: result.reason, providerCalls: result.providerCalls, costUsd: result.costUsd, records: result.records.length, decision: result.decision }, null, 2));
    return;
  }
  if (name === "factory-item-precheck") {
    const via = option("via", "anthropic");
    if (via !== "anthropic" && via !== "openrouter") throw new Error("--via must be anthropic or openrouter");
    const result = await itemFactoryPrecheck(option("authorize", ""), option("out", via === "openrouter" ? ".data/analysis/_factory/item-precheck/openrouter-v1" : ".data/analysis/_factory/item-precheck/v1"), via);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (name === "factory-restatement") {
    const result = await restatementSmoke({
      count: Number.parseInt(option("count", "10"), 10),
      out: option("out", ".data/analysis/_factory/runs/restatement-smoke-v1"),
      log: (message) => console.log(`  ${message}`),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (name === "factory-restatement-judge") {
    const result = await restatementJudge({
      dir: option("dir", ".data/analysis/_factory/runs/restatement-smoke-v1b"),
      model: option("model", "") || undefined,
      log: (message) => console.log(`  ${message}`),
    });
    console.log(JSON.stringify({ model: result.model, judged: result.judged, keep: result.keep, revise: result.revise, costUsd: result.costUsd }, null, 2));
    return;
  }
  if (name === "factory-judge-calibrate") {
    const models = option("models", "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!models.length) throw new Error("factory-judge-calibrate needs --models openrouter:…,openrouter:…");
    const limitRaw = option("limit", "");
    const out = option("out", ".data/analysis/_factory/judge-calibration/openrouter-2026-11-05");
    const result = await factoryJudgeCalibrate({
      blindDir: option("dir", ".data/analysis/_factory/blind-review/2026-10-13-calibration"),
      out,
      models,
      ...(limitRaw ? { limit: Number.parseInt(limitRaw, 10) } : {}),
      concurrency: Number.parseInt(option("concurrency", "6"), 10) || 6,
      log: (message) => console.log(`  ${message}`),
    });
    console.log(JSON.stringify({ out, ratedItems: result.ratedItems, ranSlots: result.ranSlots, models: result.models }, null, 2));
    return;
  }
  if (name === "factory-judge-calibrate-merge") {
    const models = option("models", "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!models.length) throw new Error("factory-judge-calibrate-merge needs --models …");
    const out = option("out", ".data/analysis/_factory/judge-calibration/openrouter-2026-11-05");
    console.log(JSON.stringify(mergeCalibration({ out, models, blindDir: option("dir", ".data/analysis/_factory/blind-review/2026-10-13-calibration") }), null, 2));
    return;
  }
  const document = documentBySlug(option("doc", "yds-2024-11"));
  const context: StageContext = { document, force: process.argv.includes("--force"), log: (message) => console.log(`  ${message}`) };
  const order = aliases[name] ?? [name];
  for (const stageName of order) {
    const stage = stages[stageName];
    if (!stage) throw new Error(`Unknown stage "${stageName}". Stages: ${[...Object.keys(stages), ...Object.keys(aliases), "smoke", "corpus", "profile", "factory", "factory-review", "factory-audit", "factory-compare", "factory-blind", "factory-blind-score", "factory-rescore", "factory-judge-calibrate", "factory-item-plan", "factory-item-benchmark", "factory-item-precheck", "factory-item-core-smoke", "factory-cognitive-trap", "factory-cognitive-trap-pilot", "factory-quality-repair", "factory-quality-judge-replay", "factory-taxonomy-live"].join(", ")}`);
    console.log(`▸ ${stageName} (${document.slug})`);
    const result = await stage(context);
    if (result) console.log(`  ${result.cached ? "cached" : "done"} · input ${result.manifest.inputHash.slice(0, 12)} · output ${result.manifest.outputHash.slice(0, 12)}`, JSON.stringify(result.manifest.stats));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
