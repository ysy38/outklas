import { existsSync } from "node:fs";
import { documentBySlug } from "@/modules/analysis/sources";
import type { StageResult } from "./lib/artifacts";
import { analyze } from "./stages/analyze";
import type { StageContext } from "./stages/context";
import { dna } from "./stages/dna";
import { examSlice } from "./stages/exam-slice";
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
  "exam-slice": examSlice,
  cleanup,
  segment: segmentStage,
  reconstruct: reconstructStage,
  validate: validateStage,
  analyze,
  dna,
  import: importStage,
  report,
  review,
  metrics,
};

const pilotOrder = ["render", "ocr", "ocr-verify", "cleanup", "segment", "reconstruct", "validate", "analyze", "dna", "import", "report", "review", "metrics"];
const extractOrder = ["render", "ocr", "cleanup", "segment", "reconstruct", "validate"];
const textOrder = ["text-extract"];
const textExamOrder = ["exam-slice", "segment", "reconstruct", "validate"];

function option(name: string, fallback: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const name = process.argv[2];
  const document = documentBySlug(option("doc", "yds-2024-11"));
  const context: StageContext = { document, force: process.argv.includes("--force"), log: (message) => console.log(`  ${message}`) };
  const order = name === "pilot" ? pilotOrder : name === "extract" ? extractOrder : name === "text-extract-all" ? textOrder : name === "text-exam" ? textExamOrder : [name];
  for (const stageName of order) {
    const stage = stages[stageName];
    if (!stage) throw new Error(`Unknown stage "${stageName}". Stages: ${[...Object.keys(stages), "pilot", "extract"].join(", ")}`);
    console.log(`▸ ${stageName} (${document.slug})`);
    const result = await stage(context);
    if (result) console.log(`  ${result.cached ? "cached" : "done"} · input ${result.manifest.inputHash.slice(0, 12)} · output ${result.manifest.outputHash.slice(0, 12)}`, JSON.stringify(result.manifest.stats));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
