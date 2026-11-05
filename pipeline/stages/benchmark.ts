import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { evaluateItemAudit, itemAuditVersion, type Band, type ItemAudit } from "@/modules/factory/audit";
import { costStages, type CostStage, type GenerationTrace } from "@/modules/factory/generation";
import type { CandidateRecord } from "@/modules/factory/review";
import { defaultFactoryThresholds, type FactoryThresholds } from "@/modules/factory/thresholds";
import { stemOverlap } from "@/modules/factory/validator";
import { factoryVersions } from "@/modules/factory/versions";
import { loadAIConfig, type AIConfig } from "../ai/config";
import { itemAuditPromptVersion } from "../ai/prompts/item-audit.v2";
import { createAIService } from "../ai/service";
import { addTokens, emptyRow, estimateCost, type Prices, type TokenUsage } from "../ai/prices";
import type { AIService, Usage as ModelUsage } from "../ai/types";
import { cached } from "../lib/artifacts";
import { mapLimit } from "../lib/limit";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const readDir = <T>(dir: string): T[] => (existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".json")).sort().map((name) => JSON.parse(readFileSync(path.join(dir, name), "utf8")) as T) : []);
const records = (runDir: string) => readDir<CandidateRecord>(path.join(runDir, "candidates"));
const traces = (runDir: string) => readDir<GenerationTrace>(path.join(runDir, "traces"));
const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 1000 : null);

/** The final judge's band as it was: its estimate shows up as a difficulty_* concern only when it differs from the target. */
export function originalBand(record: CandidateRecord): Band {
  const concern = record.judge?.concerns.find((entry) => /^difficulty_(easy|medium|hard)$/.test(entry));
  return (concern ? concern.slice("difficulty_".length) : record.spec.difficulty.band) as Band;
}

export type RunAudit = { version: typeof itemAuditVersion; promptVersion: string; model: string; run: string; audits: ItemAudit[]; errors: { specId: string; error: string }[] };

/** Audits every item of a run that reached the final judge. Writes `<run>/audit.json`; cached calls make reruns free. */
export async function factoryAudit(options: { runDir: string; service?: AIService; config?: AIConfig; log?: (message: string) => void }): Promise<RunAudit> {
  const config = options.config ?? loadAIConfig();
  const service = options.service ?? createAIService(config);
  if (!service.audit) throw new Error("This AI service has no item auditor");
  const log = options.log ?? (() => undefined);
  const judged = records(options.runDir).filter((record) => record.judge);
  const errors: RunAudit["errors"] = [];
  const audits = (
    await mapLimit(judged, 3, async (record) => {
      const candidate = record.versions[0].candidate;
      try {
        const result = await service.audit!.item({ stem: candidate.question.stem, options: candidate.question.options, targetRelation: record.spec.discourseRelation });
        const audit = evaluateItemAudit({
          specId: record.id,
          stem: candidate.question.stem,
          options: candidate.question.options,
          key: candidate.correctOption,
          targetRelation: record.spec.discourseRelation,
          roles: Object.fromEntries((record.generation?.distractorSpecs ?? []).map((dspec) => [dspec.option, dspec.role])),
          diagnoses: record.diagnoses ?? [],
          original: originalBand(record),
          requested: record.spec.difficulty.band as Band,
          report: result.value,
        });
        log(`${record.id}: calibrated ${audit.calibrated.band ?? "not calibrated"} (judge ${audit.original}), functional ${audit.distractorQuality.functional}/${audit.distractorQuality.of}${result.cached ? " (cached)" : ""}`);
        return audit;
      } catch (error) {
        errors.push({ specId: record.id, error: (error as Error).message.slice(0, 200) });
        return null;
      }
    })
  ).filter((audit): audit is ItemAudit => !!audit);
  const result: RunAudit = { version: itemAuditVersion, promptVersion: itemAuditPromptVersion, model: config.models.judge, run: path.basename(options.runDir), audits, errors };
  writeFileSync(path.join(options.runDir, "audit.json"), json(result));
  return result;
}

/** Tokens of every call an item's pipeline made, read from the request cache, so cached replays count like fresh calls. */
function pipelineUsage(runTraces: GenerationTrace[], runRecords: CandidateRecord[]): { usage: TokenUsage; missing: number } {
  const hashes = [
    ...runTraces.flatMap((trace) => trace.attempts.flatMap((attempt) => [attempt.requestHash, attempt.judge?.requestHash ?? null])),
    ...runRecords.flatMap((record) => Object.values(record.provenance.requestHashes)),
  ].filter((hash): hash is string => !!hash);
  const usage: TokenUsage = {};
  let missing = 0;
  for (const hash of hashes) {
    const entry = cached<{ provider: string; response: { model: string; usage: ModelUsage } }>("ai", hash);
    if (!entry) {
      missing += 1;
      continue;
    }
    addTokens((usage[`${entry.provider}:${entry.response.model}`] ??= emptyRow()), entry.response.usage);
  }
  return { usage, missing };
}

/** A variant pools one or more runs (one per seed); every run of a variant uses the same experiments. */
export type VariantInput = { label: string; runDirs: string[] };

type Count = { n: number; of: number; rate: number | null };
const count = (n: number, of: number): Count => ({ n, of, rate: rate(n, of) });

type StageTotals = { calls: number; cachedCalls: number; freshLatencyMs: number };

function stageTotals(runTraces: GenerationTrace[]) {
  const totals: Partial<Record<CostStage, StageTotals>> = {};
  for (const trace of runTraces)
    for (const [stage, row] of Object.entries(trace.cost?.byStage ?? {}) as [CostStage, StageTotals][]) {
      const total = (totals[stage] ??= { calls: 0, cachedCalls: 0, freshLatencyMs: 0 });
      total.calls += row.calls;
      total.cachedCalls += row.cachedCalls;
      total.freshLatencyMs += row.freshLatencyMs;
    }
  return totals;
}

export type StageMeans = Partial<Record<CostStage, number>>;

/** Mean fresh-call latency per stage over every run given; the fallback for a stage a variant only replayed from cache. */
export function pooledStageMeans(runDirs: string[]): StageMeans {
  const totals = stageTotals(runDirs.flatMap((dir) => traces(dir)));
  return Object.fromEntries(
    (Object.entries(totals) as [CostStage, StageTotals][]).flatMap(([stage, row]) => (row.calls > row.cachedCalls ? [[stage, row.freshLatencyMs / (row.calls - row.cachedCalls)]] : [])),
  );
}

/**
 * Latency per item, independent of cache hits: each stage's calls per item times that stage's mean fresh-call latency.
 * Variants share cached skeletons, so raw wall time would favour whichever variant ran later; a stage this variant
 * only replayed takes the pooled mean of all compared variants.
 */
function estimatedLatency(runTraces: GenerationTrace[], fallback: StageMeans = {}) {
  const totals = stageTotals(runTraces);
  if (!runTraces.length || !Object.keys(totals).length) return null;
  let perItem = 0;
  const byStage: Record<string, { callsPerItem: number; freshCalls: number; meanFreshMs: number | null; pooled: boolean }> = {};
  for (const stage of costStages) {
    const total = totals[stage];
    if (!total) continue;
    const fresh = total.calls - total.cachedCalls;
    const mean = fresh ? total.freshLatencyMs / fresh : (fallback[stage] ?? null);
    const callsPerItem = total.calls / runTraces.length;
    byStage[stage] = { callsPerItem: Math.round(callsPerItem * 100) / 100, freshCalls: fresh, meanFreshMs: mean === null ? null : Math.round(mean), pooled: !fresh && mean !== null };
    if (mean !== null) perItem += callsPerItem * mean;
  }
  const calls = Object.values(totals).reduce((sum, row) => sum + row.calls, 0);
  const cachedCalls = Object.values(totals).reduce((sum, row) => sum + row.cachedCalls, 0);
  return { perItemMs: Math.round(perItem), calls, cachedCalls, byStage };
}

const secondAnswerFailure = (failure: string) => failure.startsWith("second_defensible") || failure.startsWith("acceptable_distractor") || failure.startsWith("blind_answer");

/** One column of the comparison. Pipeline metrics come from traces, quality metrics from the AI audit; nothing here is human review. */
export function variantMetrics(input: VariantInput, prices: Prices | null = null, thresholds: FactoryThresholds = defaultFactoryThresholds, latencyFallback: StageMeans = {}) {
  const runs = input.runDirs.map((dir) => {
    const auditFile = path.join(dir, "audit.json");
    return {
      dir,
      traces: traces(dir),
      records: records(dir),
      summary: JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8")) as { experiments?: string[]; seed?: number; skeletonGate?: boolean; versions: Record<string, unknown>; models: Record<string, string> },
      audit: existsSync(auditFile) ? (JSON.parse(readFileSync(auditFile, "utf8")) as RunAudit) : null,
    };
  });
  const experiments = [...new Set(runs.map((run) => (run.summary.experiments ?? []).join("+")))];
  if (experiments.length > 1) throw new Error(`Variant ${input.label} pools runs with different experiments: ${experiments.join(" vs ")}`);
  const runTraces = runs.flatMap((run) => run.traces);
  const runRecords = runs.flatMap((run) => run.records);
  const items = runTraces.length;
  const skeletonAttempts = runTraces.flatMap((trace) => trace.attempts.filter((attempt) => attempt.stage === "skeleton"));
  const withSkeleton = runTraces.filter((trace) => trace.skeleton);
  const slots = runTraces.flatMap((trace) =>
    trace.distractorSpecs
      .map((dspec) => {
        const mine = trace.attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === dspec.option);
        const placed = trace.distractors.find((entry) => entry.option === dspec.option);
        return { role: dspec.role, attempts: mine.length, accepted: !!placed, firstTry: placed?.attempts === 1 };
      })
      .filter((slot) => slot.attempts > 0),
  );
  const judged = runRecords.filter((record) => record.judge);
  const audits = runs.flatMap((run) => run.audit?.audits ?? []);
  const wrong = audits.flatMap((entry) => entry.options);
  const echo = judged.flatMap((record) => {
    const candidate = record.versions[0].candidate;
    return optionLabels.filter((label) => label !== candidate.correctOption).map((label) => stemOverlap(candidate.question.stem, candidate.question.options[label], thresholds).level);
  });
  const calibrated = (band: string | null) => audits.filter((entry) => entry.calibrated.band === band).length;
  const { usage, missing } = pipelineUsage(runTraces, runRecords);
  const tokens = Object.values(usage).reduce((sum, row) => ({ input: sum.input + row.inputTokens, output: sum.output + row.outputTokens }), { input: 0, output: 0 });
  const cost = estimateCost(usage, prices);
  return {
    label: input.label,
    runs: runs.map((run) => ({ run: path.basename(run.dir), seed: run.summary.seed ?? 1, items: run.traces.length, audited: run.audit?.audits.length ?? 0, auditErrors: run.audit?.errors.length ?? null })),
    experiments: runs[0]?.summary.experiments ?? [],
    versions: runs[0]?.summary.versions ?? {},
    models: runs[0]?.summary.models ?? {},
    items,
    skeletonPass: count(withSkeleton.length, items),
    skeletonFirstTry: count(withSkeleton.filter((trace) => trace.attempts.filter((attempt) => attempt.stage === "skeleton").length === 1).length, items),
    skeletonValidatorRejections: count(skeletonAttempts.filter((attempt) => attempt.validator.status === "reject").length, skeletonAttempts.length),
    skeletonGateRejections: count(skeletonAttempts.filter((attempt) => attempt.judge?.decision === "REGENERATE").length, skeletonAttempts.filter((attempt) => attempt.judge).length),
    skeletonGateFailures: Object.fromEntries(
      Object.entries(
        skeletonAttempts.flatMap((attempt) => (attempt.judge?.decision === "REGENERATE" ? attempt.judge.failures : [])).reduce<Record<string, number>>((acc, code) => ({ ...acc, [code]: (acc[code] ?? 0) + 1 }), {}),
      ).sort((a, b) => b[1] - a[1]),
    ),
    distractorFirstAttempt: count(slots.filter((slot) => slot.firstTry).length, slots.length),
    regeneratedSlots: count(slots.filter((slot) => slot.attempts > 1).length, slots.length),
    extraDistractorAttempts: slots.reduce((sum, slot) => sum + slot.attempts - 1, 0),
    lostAtDistractors: count(runTraces.filter((trace) => trace.state === "DISTRACTORS_FAILED").length, withSkeleton.length),
    reachedFinalJudge: count(judged.length, items),
    finalJudgeRejection: count(judged.filter((record) => record.judge!.verdict === "REJECT").length, judged.length),
    finalJudgeSecondAnswer: count(judged.filter((record) => record.judge!.failures.some(secondAnswerFailure)).length, judged.length),
    humanReviewQueue: count(runRecords.filter((record) => record.status === "pending_review").length, items),
    audit: {
      coverage: count(audits.length, judged.length),
      defective: count(calibrated("defective"), audits.length),
      secondAnswerOptions: count(wrong.filter((entry) => entry.secondAnswer).length, wrong.length),
      unnaturalOptions: count(wrong.filter((entry) => entry.natural === false).length, wrong.length),
      unnaturalKeys: count(audits.filter((entry) => entry.calibrated.evidence?.keyNatural === false).length, audits.length),
      implausibleOptions: count(wrong.filter((entry) => entry.implausible).length, wrong.length),
      tenseClashOptions: count(wrong.filter((entry) => entry.tenseClash).length, wrong.length),
      easyEliminationOptions: count(wrong.filter((entry) => !entry.secondAnswer && !entry.functional).length, wrong.length),
      functionalOptions: count(wrong.filter((entry) => entry.functional).length, wrong.length),
      calibratedDifficulty: { defective: calibrated("defective"), easy: calibrated("easy"), medium: calibrated("medium"), hard: calibrated("hard"), notCalibrated: calibrated(null), of: audits.length },
      requestedDifficulty: Object.fromEntries(["easy", "medium", "hard"].map((band) => [band, audits.filter((entry) => (entry.requested ?? null) === band).length])),
    },
    suspiciousEcho: count(echo.filter((level) => level === "copied").length, echo.length),
    topicOverlap: count(echo.filter((level) => level === "topic").length, echo.length),
    latency: (() => {
      const estimate = estimatedLatency(runTraces, latencyFallback);
      return estimate && { ...estimate, perJudgedItemMs: judged.length ? Math.round((estimate.perItemMs * items) / judged.length) : null };
    })(),
    tokens: {
      ...tokens,
      perItem: items ? { input: Math.round(tokens.input / items), output: Math.round(tokens.output / items) } : null,
      perJudgedItem: judged.length ? { input: Math.round(tokens.input / judged.length), output: Math.round(tokens.output / judged.length) } : null,
      missingCalls: missing,
      usage,
    },
    costUsd: cost.usd === null ? null : { total: cost.usd, perItem: items ? Math.round((cost.usd / items) * 1e6) / 1e6 : null, perJudgedItem: judged.length ? Math.round((cost.usd / judged.length) * 1e6) / 1e6 : null },
    costUnknown: cost.reason,
  };
}

export type VariantMetrics = ReturnType<typeof variantMetrics>;

const cell = (value: Count | undefined) => (!value ? "–" : `${value.n}/${value.of}${value.rate === null ? "" : ` (${Math.round(value.rate * 100)}%)`}`);
const audited = (row: VariantMetrics, value: Count) => (row.audit.coverage.n ? cell(value) : "not audited");

export function comparisonTable(rows: VariantMetrics[], human: Record<string, HumanMetrics> = {}): string {
  const lines: [string, (row: VariantMetrics) => string][] = [
    ["Experiments", (row) => (row.experiments.length ? row.experiments.join("+") : "baseline")],
    ["Runs (seeds)", (row) => row.runs.map((run) => `s${run.seed}`).join("+")],
    ["1. Skeleton pass (items)", (row) => cell(row.skeletonPass)],
    ["   skeleton gate rejections (gate checks)", (row) => cell(row.skeletonGateRejections)],
    ["2. Distractor first-attempt acceptance (slots)", (row) => cell(row.distractorFirstAttempt)],
    ["3. Regenerated slots / extra attempts", (row) => `${cell(row.regeneratedSlots)} / ${row.extraDistractorAttempts}`],
    ["4. Items lost at distractor stage (of skeletons)", (row) => cell(row.lostAtDistractors)],
    ["   reached final judge (items)", (row) => cell(row.reachedFinalJudge)],
    ["5. Final judge rejection (judged)", (row) => cell(row.finalJudgeRejection)],
    ["6a. Second answer, final judge (judged)", (row) => cell(row.finalJudgeSecondAnswer)],
    ["6b. Defective items, AI audit (audited)", (row) => audited(row, row.audit.defective)],
    ["6c. Defensible wrong options, AI audit", (row) => audited(row, row.audit.secondAnswerOptions)],
    ["7. Unnatural wrong options, AI audit", (row) => audited(row, row.audit.unnaturalOptions)],
    ["   unnatural keys, AI audit", (row) => audited(row, row.audit.unnaturalKeys)],
    ["8. Implausible scenario, AI audit", (row) => audited(row, row.audit.implausibleOptions)],
    ["9. Suspicious stem echo (deterministic)", (row) => cell(row.suspiciousEcho)],
    ["10. Easy elimination, AI audit", (row) => audited(row, row.audit.easyEliminationOptions)],
    ["11. Calibrated difficulty def/easy/med/hard/not", (row) => { const d = row.audit.calibratedDifficulty; return d.of ? `${d.defective}/${d.easy}/${d.medium}/${d.hard}/${d.notCalibrated} of ${d.of}` : "not audited"; }],
    ["12. Human approval (blind review)", (row) => (human[row.label] ? cell(human[row.label].approved) : "not rated yet")],
    ["13. Latency per item (estimated)", (row) => (row.latency ? `${(row.latency.perItemMs / 1000).toFixed(1)} s` : "–")],
    ["    per item reaching the final judge", (row) => (row.latency?.perJudgedItemMs == null ? "–" : `${(row.latency.perJudgedItemMs / 1000).toFixed(1)} s`)],
    ["14. Tokens per item in/out", (row) => (row.tokens.perItem ? `${row.tokens.perItem.input}/${row.tokens.perItem.output}` : "–")],
    ["    per item reaching the final judge", (row) => (row.tokens.perJudgedItem ? `${row.tokens.perJudgedItem.input}/${row.tokens.perJudgedItem.output}` : "–")],
    ["15. Cost per item", (row) => (row.costUsd?.perItem == null ? `unknown (${row.costUnknown ?? "no items"})` : `$${row.costUsd.perItem} ($${row.costUsd.perJudgedItem ?? "–"} per judged item)`)],
  ];
  return [`| Metric | ${rows.map((row) => row.label).join(" | ")} |`, `|---|${rows.map(() => "---").join("|")}|`, ...lines.map(([name, render]) => `| ${name} | ${rows.map(render).join(" | ")} |`)].join("\n");
}

export function factoryCompare(options: { variants: VariantInput[]; out: string; prices?: Prices | null; blindDir?: string }) {
  const fallback = pooledStageMeans(options.variants.flatMap((variant) => variant.runDirs));
  const rows = options.variants.map((variant) => variantMetrics(variant, options.prices ?? null, defaultFactoryThresholds, fallback));
  const human = options.blindDir ? factoryBlindScore({ dir: options.blindDir }).byVariant : {};
  mkdirSync(options.out, { recursive: true });
  writeFileSync(path.join(options.out, "comparison.json"), json({ generatedAt: new Date().toISOString(), pipeline: factoryVersions.pipeline, prices: options.prices?.source ?? null, rows, human }));
  writeFileSync(path.join(options.out, "comparison.md"), `${comparisonTable(rows, human)}\n`);
  return rows;
}

/** Deterministic shuffle (mulberry32), so the sheet can be rebuilt identically from the same runs and seed. */
function shuffled<T>(list: T[], seed: number): T[] {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const blindColumns = ["part", "blind_id", "my_answer", "second_defensible", "unnatural", "implausible", "obvious", "overall", "difficulty", "confidence", "notes"] as const;
const ratingColumns = blindColumns.filter((column) => column !== "part" && column !== "blind_id");

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

const rated = (row: Record<string, string>) => ratingColumns.some((column) => (row[column] ?? "") !== "");

type BlindKeyItem = { variant: string; run: string; specId: string; part: number; key: OptionLabel; options: Record<OptionLabel, OptionLabel>; finalJudge: string; status: string };

/**
 * Blind human-review sheet, v2. Every item that reached the final judge, from every run of every variant. Variant,
 * model, prompt version, seed, verdicts, labels and the key are hidden; the key and the letter mapping live only in
 * key.json. Items sharing a stem (same skeleton, different variants) go to different parts, so a part never shows a
 * stem twice; item order and option order are shuffled. Refuses to overwrite a ratings file that holds any rating.
 */
export function factoryBlindSheet(options: { variants: VariantInput[]; out: string; seed?: number }) {
  const seed = options.seed ?? 20261013;
  const ratingsFile = path.join(options.out, "ratings.csv");
  if (readRatings(ratingsFile).some(rated)) throw new Error(`${ratingsFile} already holds ratings; it is never overwritten. Use a new --out directory.`);
  type Entry = { variant: string; run: string; record: CandidateRecord };
  const entries: Entry[] = options.variants.flatMap((variant) =>
    variant.runDirs.flatMap((runDir) => records(runDir).filter((record) => record.judge).map((record) => ({ variant: variant.label, run: path.basename(runDir), record }))),
  );
  const byStem = new Map<string, Entry[]>();
  for (const entry of entries) {
    const stem = entry.record.versions[0].candidate.question.stem;
    byStem.set(stem, [...(byStem.get(stem) ?? []), entry]);
  }
  const groups = shuffled([...byStem.values()], seed);
  const parts = Math.max(1, ...groups.map((group) => group.length));
  const placed: { part: number; entry: Entry }[] = [];
  groups.forEach((group, g) => shuffled(group, seed + g + 1).forEach((entry, i) => placed.push({ part: ((i + g) % parts) + 1, entry })));

  const key: Record<string, BlindKeyItem> = {};
  const csv = [blindColumns.join(",")];
  const readme = [
    "# Blind review — question factory benchmark",
    "",
    "Original generated items; no historical exam text. Nothing here tells you which variant, model, prompt or seed produced an item.",
    "Do NOT open key.json until every rating is in ratings.csv.",
    "",
    "Work part by part (part-1.md first). A part never shows the same stem twice; later parts repeat stems with different option sets.",
    "For each item fill one row of ratings.csv:",
    "- my_answer: the option you think is correct (A–E). Solve it before reading the other fields.",
    "- second_defensible: letters of any OTHER option a careful candidate could defend as correct, or `none`.",
    "- unnatural: letters of options that are ungrammatical or unnatural English, or `none`.",
    "- implausible: letters of wrong options whose scenario is unrealistic in this context, or `none`.",
    "- obvious: letters of wrong options a candidate could eliminate without understanding the sentence's logic (absurd, off-topic, form clash, echoes the stem), or `none`.",
    "- overall: APPROVE (usable as is), EDIT (usable after a small edit) or REJECT.",
    "- difficulty: defective (ambiguous or broken; never use hard for this), easy, medium or hard.",
    "- confidence: 1 (unsure) to 3 (sure).",
    "- notes: free text, optional.",
    "",
  ];
  for (let part = 1; part <= parts; part++) {
    const mine = shuffled(
      placed.filter((entry) => entry.part === part),
      seed * 31 + part,
    );
    const sheet = [`# Part ${part} of ${parts}`, ""];
    mine.forEach(({ entry }, index) => {
      const id = `P${part}-${String(index + 1).padStart(3, "0")}`;
      const candidate = entry.record.versions[0].candidate;
      const order = shuffled([...optionLabels], seed + part * 1000 + index + 1);
      const mapping = Object.fromEntries(optionLabels.map((label, i) => [label, order[i]])) as Record<OptionLabel, OptionLabel>;
      const blindKey = optionLabels.find((label) => mapping[label] === candidate.correctOption)!;
      key[id] = { variant: entry.variant, run: entry.run, specId: entry.record.id, part, key: blindKey, options: mapping, finalJudge: entry.record.judge!.verdict, status: entry.record.status };
      sheet.push(`## ${id}`, "", candidate.question.stem, "", ...optionLabels.map((label) => `${label}) ${candidate.question.options[mapping[label]]}`), "");
      csv.push(`${part},${id}${",".repeat(ratingColumns.length)}`);
    });
    mkdirSync(options.out, { recursive: true });
    writeFileSync(path.join(options.out, `part-${part}.md`), `${sheet.join("\n")}\n`);
    readme.push(`- part-${part}.md: ${mine.length} items`);
  }
  mkdirSync(options.out, { recursive: true });
  writeFileSync(path.join(options.out, "README.md"), `${readme.join("\n")}\n`);
  writeFileSync(ratingsFile, `${csv.join("\n")}\n`);
  writeFileSync(
    path.join(options.out, "key.json"),
    json({ note: "Answer key and variant mapping. Do not open before all ratings are done.", version: "blind-sheet.v2", seed, variants: options.variants.map((variant) => ({ label: variant.label, runs: variant.runDirs.map((dir) => path.basename(dir)) })), items: key }),
  );
  return { items: Object.keys(key).length, stems: groups.length, parts };
}

export type HumanMetrics = {
  items: number;
  rated: number;
  approved: Count;
  edit: Count;
  rejected: Count;
  keyAgreement: Count;
  secondAnswerItems: Count;
  unnaturalOptions: Count;
  implausibleWrong: Count;
  obviousWrong: Count;
  difficulty: Record<string, number>;
  meanConfidence: number | null;
};

// `none` is the sheet's explicit empty answer; its letters (the E in NONE) are not option labels.
const letters = (value: string | undefined): OptionLabel[] => [...new Set((value ?? "").toUpperCase().replace(/\bNONE\b/g, "").match(/\b[A-E]\b/g) ?? [])] as OptionLabel[];

/** Scores filled blind ratings against key.json, per variant. Blank rows are unrated, never counted as anything. */
export function factoryBlindScore(options: { dir: string }) {
  const keyFile = path.join(options.dir, "key.json");
  if (!existsSync(keyFile)) throw new Error(`No key.json in ${options.dir}`);
  const key = JSON.parse(readFileSync(keyFile, "utf8")) as { version?: string; items: Record<string, BlindKeyItem> };
  if (key.version !== "blind-sheet.v2") throw new Error(`${keyFile} is not a blind-sheet.v2 key`);
  const ratings = new Map(readRatings(path.join(options.dir, "ratings.csv")).filter(rated).map((row) => [row.blind_id, row]));
  const byVariant: Record<string, HumanMetrics> = {};
  const variants = [...new Set(Object.values(key.items).map((item) => item.variant))];
  for (const variant of variants) {
    const mine = Object.entries(key.items).filter(([, item]) => item.variant === variant);
    const rows = mine.flatMap(([id, item]) => (ratings.has(id) ? [{ item, row: ratings.get(id)! }] : []));
    const answered = rows.filter(({ row }) => letters(row.my_answer).length === 1);
    const decided = rows.filter(({ row }) => /^(APPROVE|EDIT|REJECT)$/i.test(row.overall ?? ""));
    const overall = (value: string) => decided.filter(({ row }) => row.overall.toUpperCase() === value).length;
    const optionRated = (column: string) => rows.filter(({ row }) => (row[column] ?? "") !== "");
    const wrongCount = (column: string) => optionRated(column).reduce((sum, { item, row }) => sum + letters(row[column]).filter((label) => label !== item.key).length, 0);
    const confidences = rows.map(({ row }) => Number(row.confidence)).filter((value) => Number.isFinite(value) && value >= 1 && value <= 3);
    byVariant[variant] = {
      items: mine.length,
      rated: rows.length,
      approved: count(overall("APPROVE"), decided.length),
      edit: count(overall("EDIT"), decided.length),
      rejected: count(overall("REJECT"), decided.length),
      keyAgreement: count(answered.filter(({ item, row }) => letters(row.my_answer)[0] === item.key).length, answered.length),
      secondAnswerItems: count(optionRated("second_defensible").filter(({ item, row }) => letters(row.second_defensible).some((label) => label !== item.key)).length, optionRated("second_defensible").length),
      unnaturalOptions: count(optionRated("unnatural").reduce((sum, { row }) => sum + letters(row.unnatural).length, 0), optionRated("unnatural").length * optionLabels.length),
      implausibleWrong: count(wrongCount("implausible"), optionRated("implausible").length * (optionLabels.length - 1)),
      obviousWrong: count(wrongCount("obvious"), optionRated("obvious").length * (optionLabels.length - 1)),
      difficulty: Object.fromEntries(["defective", "easy", "medium", "hard"].map((band) => [band, rows.filter(({ row }) => (row.difficulty ?? "").toLowerCase() === band).length])),
      meanConfidence: confidences.length ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100 : null,
    };
  }
  return { rated: ratings.size, items: Object.keys(key.items).length, byVariant };
}
