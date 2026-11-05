import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { distractorDecision, type DistractorDecisionKind } from "@/modules/factory/distractor";
import type { CandidateRecord } from "@/modules/factory/review";
import { BudgetExceeded, SpendBudget } from "../ai/budget";
import { loadAIConfig, parseModel, sameModel, type AIConfig } from "../ai/config";
import { createAIService, providerRouter } from "../ai/service";
import { estimateCost, type TokenUsage } from "../ai/prices";
import { mapLimit } from "../lib/limit";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') (current += '"'), i++;
      else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") cells.push(current), (current = "");
    else current += char;
  }
  cells.push(current);
  return cells;
};

function readRatings(file: string): Record<string, string>[] {
  if (!existsSync(file)) return [];
  const [header, ...lines] = readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.trim());
  const columns = parseCsvLine(header);
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [columns[index], value.trim()])));
}

const letters = (value: string | undefined): OptionLabel[] =>
  [...new Set((value ?? "").toUpperCase().replace(/\bNONE\b/g, "").match(/\b[A-E]\b/g) ?? [])] as OptionLabel[];

type BlindKeyItem = {
  variant: string;
  run: string;
  specId: string;
  part: number;
  key: OptionLabel;
  options: Record<OptionLabel, OptionLabel>;
  finalJudge: string;
  status: string;
};

export type GoldLabel = "good" | "bad";

export function goldForOption(input: {
  factoryOption: OptionLabel;
  key: OptionLabel;
  overall: string;
  second_defensible?: string;
  unnatural?: string;
  implausible?: string;
  obvious?: string;
  blindToFactory: Record<OptionLabel, OptionLabel>;
}): GoldLabel | null {
  if (input.factoryOption === input.key) return null;
  const flagged = new Set<OptionLabel>();
  for (const column of [input.second_defensible, input.unnatural, input.implausible, input.obvious]) {
    for (const blind of letters(column)) {
      const factory = input.blindToFactory[blind];
      if (factory) flagged.add(factory);
    }
  }
  if (flagged.has(input.factoryOption)) return "bad";
  if (/^APPROVE$/i.test(input.overall)) return "good";
  if (/^(EDIT|REJECT)$/i.test(input.overall)) return "bad";
  return null;
}

export type GoldSlot = {
  blindId: string;
  variant: string;
  run: string;
  specId: string;
  factoryOption: OptionLabel;
  text: string;
  gold: GoldLabel;
  overall: string;
};

export function loadGoldSlots(options: { blindDir: string; runsRoot: string }): { slots: GoldSlot[]; items: number; skippedOptions: number } {
  const keyFile = path.join(options.blindDir, "key.json");
  if (!existsSync(keyFile)) throw new Error(`No key.json in ${options.blindDir}`);
  const key = JSON.parse(readFileSync(keyFile, "utf8")) as { version?: string; items: Record<string, BlindKeyItem> };
  if (key.version !== "blind-sheet.v2") throw new Error(`${keyFile} is not a blind-sheet.v2 key`);
  const ratings = new Map(readRatings(path.join(options.blindDir, "ratings.csv")).map((row) => [row.blind_id, row]));
  const slots: GoldSlot[] = [];
  let skippedOptions = 0;
  let items = 0;
  for (const [blindId, item] of Object.entries(key.items)) {
    const row = ratings.get(blindId);
    if (!row || !/^(APPROVE|EDIT|REJECT)$/i.test(row.overall ?? "")) continue;
    items += 1;
    const candidatePath = path.join(options.runsRoot, item.run, "candidates", `${item.specId}.json`);
    if (!existsSync(candidatePath)) throw new Error(`Missing candidate for ${blindId}: ${candidatePath}`);
    const record = JSON.parse(readFileSync(candidatePath, "utf8")) as CandidateRecord;
    const optionsText = record.versions[0].candidate.question.options;
    for (const factoryOption of optionLabels) {
      if (factoryOption === record.versions[0].candidate.correctOption) continue;
      const gold = goldForOption({
        factoryOption,
        key: record.versions[0].candidate.correctOption,
        overall: row.overall,
        second_defensible: row.second_defensible,
        unnatural: row.unnatural,
        implausible: row.implausible,
        obvious: row.obvious,
        blindToFactory: item.options,
      });
      if (!gold) {
        skippedOptions += 1;
        continue;
      }
      slots.push({
        blindId,
        variant: item.variant,
        run: item.run,
        specId: item.specId,
        factoryOption,
        text: optionsText[factoryOption],
        gold,
        overall: row.overall.toUpperCase(),
      });
    }
  }
  return { slots, items, skippedOptions };
}

export type JudgeCallResult = {
  blindId: string;
  factoryOption: OptionLabel;
  gold: GoldLabel;
  decision: DistractorDecisionKind | null;
  failures: string[];
  concerns: string[];
  cached: boolean;
  error: string | null;
  latencyMs?: number;
  at?: string;
};

export type ModelCalibMetrics = {
  model: string;
  slots: number;
  judged: number;
  errors: number;
  jsonErrorRate: { n: number; of: number; rate: number | null };
  agreement: { n: number; of: number; rate: number | null };
  falseReject: { n: number; of: number; rate: number | null };
  missFlaw: { n: number; of: number; rate: number | null };
  catchBad: { n: number; of: number; rate: number | null };
  /** Optional so metrics files written before it still load. */
  flagBad?: { n: number; of: number; rate: number | null };
  humanReview: { n: number; of: number; rate: number | null };
  acceptOnGood: number;
  regenerateOnBad: number;
  calls: number;
  tokens: number;
  costUsd: number | null;
  costReason: string | null;
  meanLatencyMs: number | null;
  stopped: string | null;
};

const rate = (n: number, of: number) => (of ? Math.round((n / of) * 1000) / 1000 : null);
const count = (n: number, of: number) => ({ n, of, rate: rate(n, of) });
const slotKey = (row: { blindId: string; factoryOption: string }) => `${row.blindId}|${row.factoryOption}`;

export function modelSlug(model: string) {
  return model.replace(/^openrouter:/, "").replace(/[/:]/g, "__");
}

export function readJsonlResults(file: string): JudgeCallResult[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as JudgeCallResult);
}

export function metricsFor(model: string, results: JudgeCallResult[], usage: TokenUsage, prices: AIConfig["prices"], budget: SpendBudget): ModelCalibMetrics {
  const judged = results.filter((row) => row.decision);
  const hard = judged.filter((row) => row.decision === "ACCEPT" || row.decision === "REGENERATE");
  const agree = hard.filter((row) => (row.gold === "good" && row.decision === "ACCEPT") || (row.gold === "bad" && row.decision === "REGENERATE"));
  const goods = judged.filter((row) => row.gold === "good");
  const bads = judged.filter((row) => row.gold === "bad");
  const falseReject = goods.filter((row) => row.decision === "REGENERATE");
  const missFlaw = bads.filter((row) => row.decision === "ACCEPT");
  const catchBad = bads.filter((row) => row.decision === "REGENERATE");
  const humanReview = judged.filter((row) => row.decision === "HUMAN_REVIEW");
  const jsonErrors = results.filter((row) => /not valid JSON|JSON/i.test(row.error ?? ""));
  const latencies = results.map((row) => row.latencyMs).filter((ms): ms is number => typeof ms === "number");
  const cost = estimateCost(usage, prices ?? null);
  return {
    model,
    slots: results.length,
    judged: judged.length,
    errors: results.filter((row) => row.error).length,
    jsonErrorRate: count(jsonErrors.length, results.length),
    agreement: count(agree.length, hard.length),
    falseReject: count(falseReject.length, goods.length),
    missFlaw: count(missFlaw.length, bads.length),
    catchBad: count(catchBad.length, bads.length),
    flagBad: count(bads.filter((row) => row.decision !== "ACCEPT").length, bads.length),
    humanReview: count(humanReview.length, judged.length),
    acceptOnGood: goods.filter((row) => row.decision === "ACCEPT").length,
    regenerateOnBad: catchBad.length,
    calls: budget.calls,
    tokens: budget.tokens,
    costUsd: cost.usd,
    costReason: cost.reason,
    meanLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
    stopped: budget.stopped,
  };
}

/**
 * Distractor-judge bakeoff on gold wrong options. Resumable via per-model JSONL; skips completed slots.
 * One process typically runs one model; launch four processes for parallel bakeoff.
 */
export async function factoryJudgeCalibrate(options: {
  blindDir: string;
  runsRoot?: string;
  out: string;
  models: string[];
  limit?: number;
  concurrency?: number;
  config?: AIConfig;
  log?: (message: string) => void;
}) {
  const log = options.log ?? (() => undefined);
  const runsRoot = options.runsRoot ?? path.join(".data/analysis/_factory/runs");
  const { slots: allSlots, items, skippedOptions } = loadGoldSlots({ blindDir: options.blindDir, runsRoot });
  const slots = options.limit && options.limit > 0 ? allSlots.slice(0, options.limit) : allSlots;
  log(`gold: ${items} rated items → ${allSlots.length} labeled wrong options (${skippedOptions} skipped); pool ${slots.length}`);

  const base = options.config ?? loadAIConfig();
  for (const model of options.models) {
    const owner = parseModel(model, base.provider).provider;
    if (!base.keys[owner]) throw new Error(`${model} needs the ${owner} API key in .env.local`);
  }
  const concurrency = options.concurrency ?? 6;
  mkdirSync(options.out, { recursive: true });
  const byModel: Record<string, { metrics: ModelCalibMetrics; results: JudgeCallResult[] }> = {};

  for (const model of options.models) {
    // Only the judge is called; the writer setting just has to differ so the independence check passes.
    const writer = sameModel(model, "calibration:writer-a", base.provider) ? "calibration:writer-b" : "calibration:writer-a";
    const config: AIConfig = {
      ...base,
      experiments: [],
      models: { ...base.models, distractor: writer, distractorJudge: model, generator: writer, explanation: writer },
    };
    const priced = [`${parseModel(model, config.provider).provider}:${parseModel(model, config.provider).model}`];
    const budget = new SpendBudget(config.limits ?? {}, config.prices ?? null, priced);
    const service = createAIService(config, providerRouter(config, undefined, (provider) => budget.meter(provider)));
    const jsonlPath = path.join(options.out, `${modelSlug(model)}.jsonl`);
    const prior = readJsonlResults(jsonlPath);
    // Only successful judgments count as done; JSON/429 errors are retried on resume.
    const done = new Set(prior.filter((row) => row.decision).map(slotKey));
    const pending = slots.filter((slot) => !done.has(slotKey(slot)));
    log(`model ${model}: resume ${done.size} ok, ${pending.length} pending (concurrency ${concurrency})`);

    const fresh = await mapLimit(pending, concurrency, async (slot): Promise<JudgeCallResult> => {
      if (budget.stopped) {
        return { blindId: slot.blindId, factoryOption: slot.factoryOption, gold: slot.gold, decision: null, failures: [], concerns: [], cached: false, error: `stopped: ${budget.stopped}`, at: new Date().toISOString() };
      }
      const candidatePath = path.join(runsRoot, slot.run, "candidates", `${slot.specId}.json`);
      const record = JSON.parse(readFileSync(candidatePath, "utf8")) as CandidateRecord;
      const generation = record.generation;
      if (!generation?.skeleton) {
        return { blindId: slot.blindId, factoryOption: slot.factoryOption, gold: slot.gold, decision: null, failures: [], concerns: [], cached: false, error: "missing skeleton", at: new Date().toISOString() };
      }
      const dspec = generation.distractorSpecs.find((entry) => entry.option === slot.factoryOption);
      if (!dspec) {
        return { blindId: slot.blindId, factoryOption: slot.factoryOption, gold: slot.gold, decision: null, failures: [], concerns: [], cached: false, error: "missing distractorSpec", at: new Date().toISOString() };
      }
      const started = Date.now();
      try {
        const judged = await service.factory.judgeDistractor({ dspec, skeleton: generation.skeleton, text: slot.text });
        const decision = distractorDecision({ dspec, report: judged.value, thresholds: config.thresholds, experiments: [] });
        const row: JudgeCallResult = {
          blindId: slot.blindId,
          factoryOption: slot.factoryOption,
          gold: slot.gold,
          decision: decision.decision,
          failures: decision.failures,
          concerns: decision.concerns,
          cached: judged.cached,
          error: null,
          latencyMs: Date.now() - started,
          at: new Date().toISOString(),
        };
        appendFileSync(jsonlPath, `${JSON.stringify(row)}\n`);
        log(`  ${slot.blindId} ${slot.factoryOption}: gold=${slot.gold} → ${decision.decision}${judged.cached ? " (cache)" : ""}`);
        return row;
      } catch (error) {
        const message = error instanceof BudgetExceeded ? error.message : (error as Error).message.slice(0, 200);
        if ((error as { status?: number }).status === 429) budget.stopped ??= `provider quota (429) on ${model}`;
        if (/429|rate limit/i.test(message)) budget.stopped ??= `provider quota (429) on ${model}`;
        const row: JudgeCallResult = {
          blindId: slot.blindId,
          factoryOption: slot.factoryOption,
          gold: slot.gold,
          decision: null,
          failures: [],
          concerns: [],
          cached: false,
          error: message,
          latencyMs: Date.now() - started,
          at: new Date().toISOString(),
        };
        appendFileSync(jsonlPath, `${JSON.stringify(row)}\n`);
        log(`  ${slot.blindId} ${slot.factoryOption}: ERROR ${message}`);
        return row;
      }
    });

    // Re-read JSONL so metrics include prior + fresh (and dedupe by last write wins).
    const mergedByKey = new Map<string, JudgeCallResult>();
    for (const row of [...prior, ...fresh]) mergedByKey.set(slotKey(row), row);
    const results = [...mergedByKey.values()];
    byModel[model] = { metrics: metricsFor(model, results, budget.usage, config.prices, budget), results };
    writeFileSync(path.join(options.out, `${modelSlug(model)}.metrics.json`), json(byModel[model].metrics));
    log(`model ${model}: done · agreement ${byModel[model].metrics.agreement.rate} · jsonErr ${byModel[model].metrics.jsonErrorRate.rate} · cost $${byModel[model].metrics.costUsd ?? "?"}`);
    if (budget.stopped?.includes("429")) {
      log(`stopping remaining models in this process: ${budget.stopped}`);
      break;
    }
  }

  const summary = {
    at: new Date().toISOString(),
    blindDir: options.blindDir,
    ratedItems: items,
    labeledSlots: allSlots.length,
    ranSlots: slots.length,
    skippedOptions,
    goldCounts: { good: allSlots.filter((s) => s.gold === "good").length, bad: allSlots.filter((s) => s.gold === "bad").length },
    prompt: base.distractorJudgeStyle === "verdict" ? "distractor-judge.v7 (verdict)" : "distractor-judge.v3 (rubric, FACTORY_EXPERIMENTS empty)",
    dataCollection: base.openrouterDataCollection,
    prices: base.prices?.source ?? null,
    limits: base.limits ?? {},
    models: Object.fromEntries(Object.entries(byModel).map(([model, row]) => [model, row.metrics])),
  };
  writeFileSync(path.join(options.out, `summary-${options.models.map(modelSlug).join("+") || "all"}.json`), json(summary));
  writeFileSync(path.join(options.out, `summary-${options.models.map(modelSlug).join("+") || "all"}.md`), `${calibrationMarkdown(summary)}\n`);
  return summary;
}

/** Merge per-model JSONL/metrics into one summary after parallel workers finish. */
export function mergeCalibration(options: { out: string; models: string[]; blindDir?: string }) {
  const models: Record<string, ModelCalibMetrics> = {};
  for (const model of options.models) {
    const metricsPath = path.join(options.out, `${modelSlug(model)}.metrics.json`);
    if (existsSync(metricsPath)) {
      models[model] = JSON.parse(readFileSync(metricsPath, "utf8")) as ModelCalibMetrics;
      continue;
    }
    const results = readJsonlResults(path.join(options.out, `${modelSlug(model)}.jsonl`));
    const emptyBudget = new SpendBudget({}, null);
    models[model] = metricsFor(model, results, {}, null, emptyBudget);
  }
  const summary = {
    at: new Date().toISOString(),
    blindDir: options.blindDir ?? ".data/analysis/_factory/blind-review/2026-10-13-calibration",
    models,
  };
  writeFileSync(path.join(options.out, "summary.json"), json(summary));
  writeFileSync(path.join(options.out, "summary.md"), `${calibrationMarkdown({ ...summary, ratedItems: 54, labeledSlots: 216, ranSlots: 216, goldCounts: { good: 172, bad: 44 }, prompt: "distractor-judge.v3", prices: "pipeline/ai/prices.openrouter.json" })}\n`);
  return summary;
}

export function calibrationMarkdown(summary: {
  at: string;
  ratedItems: number;
  labeledSlots: number;
  ranSlots: number;
  goldCounts: { good: number; bad: number };
  prompt: string;
  dataCollection?: string;
  prices: string | null;
  models: Record<string, ModelCalibMetrics>;
}): string {
  const rows = Object.values(summary.models);
  const flag = (m: ModelCalibMetrics) => (m.flagBad ? `${m.flagBad.n}/${m.flagBad.of} (${pct(m.flagBad.rate)})` : "—");
  const line = (m: ModelCalibMetrics) =>
    `| \`${m.model}\` | ${m.agreement.n}/${m.agreement.of} (${pct(m.agreement.rate)}) | ${m.falseReject.n}/${m.falseReject.of} (${pct(m.falseReject.rate)}) | ${m.catchBad.n}/${m.catchBad.of} (${pct(m.catchBad.rate)}) | ${flag(m)} | ${m.humanReview.n}/${m.humanReview.of} | ${m.jsonErrorRate.n}/${m.jsonErrorRate.of} (${pct(m.jsonErrorRate.rate)}) | $${m.costUsd ?? "?"} | ${m.meanLatencyMs ?? "—"} ms | ${m.stopped ?? "—"} |`;
  return [
    "# Distractor-judge calibration",
    "",
    `At: ${summary.at}`,
    "",
    `Gold: ${summary.ratedItems} rated items → ${summary.labeledSlots} labeled wrong options (good ${summary.goldCounts.good}, bad ${summary.goldCounts.bad}); ran ${summary.ranSlots}.`,
    `Prompt: ${summary.prompt}. Data collection: ${summary.dataCollection ?? "—"}. Prices: ${summary.prices ?? "none"}.`,
    "",
    "Agreement = ACCEPT on good + REGENERATE on bad (HUMAN_REVIEW excluded from hard agreement).",
    "False-reject = REGENERATE on human-good (the option is thrown away; this is what costs yield). Catch-bad = REGENERATE on human-bad.",
    "Flag-bad = REGENERATE or HUMAN_REVIEW on human-bad (a HUMAN_REVIEW option is kept but flagged for the reviewer).",
    "",
    "| Model | Agreement | False-reject | Catch-bad | Flag-bad | Human-review | JSON-error | Cost | Mean latency | Stop |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map(line),
    "",
    "Provisional only — production `modelDefaults` stay Claude; use env overrides for serial runs.",
  ].join("\n");
}

const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);
