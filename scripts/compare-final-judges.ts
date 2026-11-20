/**
 * Re-run the final judge on one factory run with several models; compare verdicts to human blind ratings.
 * Usage: npx tsx scripts/compare-final-judges.ts --run <dir> --blind <dir> --models a,b --out <dir>
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { judgeDecision } from "@/modules/factory/judge";
import type { CandidateRecord } from "@/modules/factory/review";
import { BudgetExceeded, SpendBudget } from "../pipeline/ai/budget";
import { loadAIConfig, parseModel } from "../pipeline/ai/config";
import { createAIService, providerRouter } from "../pipeline/ai/service";
import { estimateCost } from "../pipeline/ai/prices";
import { mapLimit } from "../pipeline/lib/limit";

const arg = (name: string, fallback = "") => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] ?? fallback : fallback;
};

const parseCsv = (file: string) => {
  const [header, ...lines] = readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const cols = header.split(",");
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') (cur += '"'), i++;
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") cells.push(cur), (cur = "");
      else cur += c;
    }
    cells.push(cur);
    return Object.fromEntries(cols.map((col, i) => [col, (cells[i] ?? "").trim()]));
  });
};

async function main() {
  const runDir = arg("run");
  const blindDir = arg("blind");
  const out = arg("out", ".data/analysis/_factory/final-judge-compare");
  const models = arg("models")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (!runDir || !blindDir || !models.length) throw new Error("need --run --blind --models");

  const key = JSON.parse(readFileSync(path.join(blindDir, "key.json"), "utf8")) as {
    items: Record<string, { run: string; specId: string; key: OptionLabel; options: Record<OptionLabel, OptionLabel> }>;
  };
  const ratings = new Map(parseCsv(path.join(blindDir, "ratings.csv")).map((r) => [r.blind_id, r]));
  const base = loadAIConfig();
  mkdirSync(out, { recursive: true });

  type Row = {
    blindId: string;
    specId: string;
    humanKey: string;
    humanOverall: string;
    model: string;
    verdict: string | null;
    blindAnswer: string | null;
    blindAgrees: boolean | null;
    failures: string[];
    concerns: string[];
    qualityScore: number | null;
    cached: boolean;
    error: string | null;
    latencyMs: number;
  };

  const summary: Record<string, unknown> = { at: new Date().toISOString(), runDir, blindDir, models: {} };

  for (const model of models) {
    const owner = parseModel(model, base.provider).provider;
    if (!base.keys[owner]) throw new Error(`${model} needs ${owner} key`);
    const writer = "gateway:anthropic/claude-haiku-5.5";
    const config = {
      ...base,
      models: { ...base.models, judge: model, generator: writer, distractor: writer, distractorJudge: "gateway:google/gemini-3.8-flash", explanation: writer },
    };
    const budget = new SpendBudget(config.limits ?? {}, config.prices ?? null, [`${parseModel(model, config.provider).provider}:${parseModel(model, config.provider).model}`]);
    const service = createAIService(config, providerRouter(config, undefined, (p) => budget.meter(p)));
    const rows: Row[] = [];

    const items = Object.entries(key.items).filter(([, item]) => ratings.get(item.specId ? "" : "") || true);
    // key maps blindId → item; match ratings by blindId
    const jobs = Object.entries(key.items)
      .filter(([blindId]) => ratings.has(blindId))
      .map(([blindId, item]) => ({ blindId, item, rating: ratings.get(blindId)! }));

    await mapLimit(jobs, 2, async ({ blindId, item, rating }) => {
      const candidatePath = path.join(runDir, "candidates", `${item.specId}.json`);
      if (!existsSync(candidatePath)) {
        rows.push({
          blindId,
          specId: item.specId,
          humanKey: rating.my_answer,
          humanOverall: rating.overall,
          model,
          verdict: null,
          blindAnswer: null,
          blindAgrees: null,
          failures: [],
          concerns: [],
          qualityScore: null,
          cached: false,
          error: "missing candidate",
          latencyMs: 0,
        });
        return;
      }
      const record = JSON.parse(readFileSync(candidatePath, "utf8")) as CandidateRecord;
      const version = record.versions[0];
      const started = Date.now();
      try {
        const judged = await service.judge.evaluate(version.candidate, record.spec, version.validation, []);
        const decision = judgeDecision({
          spec: record.spec,
          validation: version.validation,
          judge: {
            blindAnswer: judged.blind.value.answer,
            blindConfidence: judged.blind.value.confidence,
            acceptability: judged.acceptability.value,
            report: judged.report.value,
          },
          thresholds: config.thresholds,
        });
        rows.push({
          blindId,
          specId: item.specId,
          humanKey: rating.my_answer,
          humanOverall: rating.overall,
          model,
          verdict: decision.verdict,
          blindAnswer: decision.blindAnswer,
          blindAgrees: decision.blindAgrees,
          failures: decision.failures,
          concerns: decision.concerns,
          qualityScore: decision.qualityScore,
          cached: judged.blind.cached && judged.acceptability.cached && judged.report.cached,
          error: null,
          latencyMs: Date.now() - started,
        });
        console.log(`${model} ${blindId}: human=${rating.overall}/${rating.my_answer} → ${decision.verdict} blind=${decision.blindAnswer}${decision.blindAgrees ? "=" : "≠"}key`);
      } catch (error) {
        const message = error instanceof BudgetExceeded ? error.message : (error as Error).message.slice(0, 200);
        rows.push({
          blindId,
          specId: item.specId,
          humanKey: rating.my_answer,
          humanOverall: rating.overall,
          model,
          verdict: null,
          blindAnswer: null,
          blindAgrees: null,
          failures: [],
          concerns: [],
          qualityScore: null,
          cached: false,
          error: message,
          latencyMs: Date.now() - started,
        });
        console.log(`${model} ${blindId}: ERROR ${message}`);
      }
    });

    const cost = estimateCost(budget.usage, config.prices ?? null);
    const approveHuman = rows.filter((r) => /^APPROVE$/i.test(r.humanOverall));
    const keep = (v: string | null) => v === "ACCEPT" || v === "REVIEW"; // REVIEW → HUMAN_REVIEW path in pipeline
    // In judge-contract, ACCEPT = approve, REVIEW = human review, REJECT = reject
    const falseReject = approveHuman.filter((r) => r.verdict === "REJECT");
    const keyHit = rows.filter((r) => r.blindAnswer && r.blindAnswer === r.humanKey);
    const metrics = {
      model,
      items: rows.length,
      errors: rows.filter((r) => r.error).length,
      blindKeyAgreement: { n: keyHit.length, of: rows.filter((r) => r.blindAnswer).length },
      rejectOnHumanApprove: { n: falseReject.length, of: approveHuman.length },
      verdicts: Object.fromEntries(
        ["ACCEPT", "REVIEW", "REJECT"].map((v) => [v, rows.filter((r) => r.verdict === v).length]),
      ),
      costUsd: cost.usd,
      calls: budget.calls,
      tokens: budget.tokens,
      meanLatencyMs: Math.round(rows.reduce((a, b) => a + b.latencyMs, 0) / Math.max(rows.length, 1)),
      sonnetBaseline: null as null | unknown,
    };
    summary.models = { ...(summary.models as object), [model]: { metrics, rows } };
    writeFileSync(path.join(out, `${model.replace(/[/:]/g, "__")}.json`), JSON.stringify({ metrics, rows }, null, 2) + "\n");
    console.log(`done ${model}: reject-on-approve ${falseReject.length}/${approveHuman.length} blind-key ${keyHit.length}/${rows.length} cost $${cost.usd}`);
  }

  // Attach Sonnet baseline from stored records
  const baseline = Object.entries(key.items)
    .filter(([id]) => ratings.has(id))
    .map(([blindId, item]) => {
      const record = JSON.parse(readFileSync(path.join(runDir, "candidates", `${item.specId}.json`), "utf8")) as CandidateRecord;
      const rating = ratings.get(blindId)!;
      return {
        blindId,
        humanOverall: rating.overall,
        humanKey: rating.my_answer,
        verdict: record.judge?.verdict ?? null,
        blindAnswer: record.judge?.blindAnswer ?? null,
        failures: record.judge?.failures ?? [],
      };
    });
  (summary as { sonnetStored: unknown }).sonnetStored = baseline;
  writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify({ out, sonnetStored: baseline.map((b) => ({ id: b.blindId, v: b.verdict, blind: b.blindAnswer, human: b.humanKey })) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
