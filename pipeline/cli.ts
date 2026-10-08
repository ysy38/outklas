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
import { factoryProfile, factoryReview, factorySlice } from "./stages/factory";
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
    const result = await factorySlice({ family: option("family", ""), count: Number.parseInt(option("count", "0"), 10), band: band as "easy" | "medium" | "hard" | undefined, tag: option("tag", "") || undefined, log: (message) => console.log(`  ${message}`) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (name === "factory-review") {
    const edit = option("edit", "");
    console.log(JSON.stringify(factoryReview({ runDir: option("run", ""), candidateId: option("candidate", ""), decision: option("decision", ""), reviewer: option("reviewer", ""), notes: option("notes", ""), editFile: edit || undefined }), null, 2));
    return;
  }
  const document = documentBySlug(option("doc", "yds-2024-11"));
  const context: StageContext = { document, force: process.argv.includes("--force"), log: (message) => console.log(`  ${message}`) };
  const order = aliases[name] ?? [name];
  for (const stageName of order) {
    const stage = stages[stageName];
    if (!stage) throw new Error(`Unknown stage "${stageName}". Stages: ${[...Object.keys(stages), ...Object.keys(aliases), "smoke", "corpus", "profile", "factory", "factory-review"].join(", ")}`);
    console.log(`▸ ${stageName} (${document.slug})`);
    const result = await stage(context);
    if (result) console.log(`  ${result.cached ? "cached" : "done"} · input ${result.manifest.inputHash.slice(0, 12)} · output ${result.manifest.outputHash.slice(0, 12)}`, JSON.stringify(result.manifest.stats));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
