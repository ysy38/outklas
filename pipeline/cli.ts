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
import { factoryJudgeCalibrate, mergeCalibration } from "./stages/calibrate";
import { factoryProfile, factoryReview, factorySlice, historicalIndex } from "./stages/factory";
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
    console.log(JSON.stringify(factoryReview({ runDir: option("run", ""), candidateId: option("candidate", ""), decision: option("decision", ""), reviewer: option("reviewer", ""), notes: option("notes", ""), editFile: edit || undefined }), null, 2));
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
    if (!stage) throw new Error(`Unknown stage "${stageName}". Stages: ${[...Object.keys(stages), ...Object.keys(aliases), "smoke", "corpus", "profile", "factory", "factory-review", "factory-audit", "factory-compare", "factory-blind", "factory-blind-score", "factory-rescore", "factory-judge-calibrate"].join(", ")}`);
    console.log(`▸ ${stageName} (${document.slug})`);
    const result = await stage(context);
    if (result) console.log(`  ${result.cached ? "cached" : "done"} · input ${result.manifest.inputHash.slice(0, 12)} · output ${result.manifest.outputHash.slice(0, 12)}`, JSON.stringify(result.manifest.stats));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
