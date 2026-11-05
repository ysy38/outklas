import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { contextIssues, hasPastPerfect, mainClauseFrame } from "@/modules/factory/context";
import { distractorDecision, distractorJudgeReportFor, experimentalJudgeFields, validateDistractor, type DistractorDecision } from "@/modules/factory/distractor";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import { parseExperiments, type ExperimentSet } from "@/modules/factory/experiments";
import type { GenerationTrace } from "@/modules/factory/generation";
import { attemptLimits, defaultFactoryThresholds, type FactoryThresholds } from "@/modules/factory/thresholds";
import { optionBody, type OriginalityIndex } from "@/modules/factory/validator";
import { cached } from "../lib/artifacts";

/**
 * Offline relabeling: stored distractor attempts and the stored judge reports (from the local request cache) are
 * re-scored with the current deterministic validator and decision rules. No model is called. The result says how the
 * current rules would have labeled what the old prompts produced; it is not evidence of what the current prompts
 * would generate, and an option the old run never wrote stays unknown.
 */
export const relabelNotice =
  "RELABEL of stored outputs: current validator and decision rules applied to stored distractors and stored judge reports. No model was called. This is not new model output and does not show the generation quality of the current prompts.";

type Row = {
  attempt: number;
  text: string | null;
  storedRejection: string | null;
  storedFailures: string[];
  validator: string[];
  decision: Pick<DistractorDecision, "decision" | "failures" | "concerns"> | null;
  note: string | null;
};
export type SlotRelabel = {
  option: string;
  role: string;
  storedAccepted: number | null;
  status: "accepted" | "review" | "lost" | "unknown" | "not_generated";
  attempt: number | null;
  reason: string | null;
  rows: Row[];
};
export type ItemRelabel = { specId: string; storedState: string; status: "complete" | "lost" | "unknown"; changed: boolean; slots: SlotRelabel[] };

type ReportSource = (hash: string) => unknown;

/** The stored judge report for a request hash, parsed from the cached response text. */
export const cachedReport: ReportSource = (hash) => {
  const entry = cached<{ response: { text: string } }>("ai", hash);
  if (!entry) return null;
  try {
    return JSON.parse(entry.response.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
};

/** Experiments whose judge fields are missing from a stored report cannot be relabeled from it. */
export function missingJudgeFields(report: Record<string, unknown>, experiments: ExperimentSet): string[] {
  return experiments.flatMap((experiment) => Object.keys(experimentalJudgeFields[experiment]).filter((field) => !(field in report)).map((field) => `${experiment}.${field}`));
}

export function relabelTrace(trace: GenerationTrace, options: { experiments: ExperimentSet; report: ReportSource; thresholds?: FactoryThresholds; originality?: OriginalityIndex }): ItemRelabel {
  const { experiments } = options;
  const thresholds = options.thresholds ?? defaultFactoryThresholds;
  const schema = distractorJudgeReportFor(experiments);
  const accepted: { option: DistractorSpec["option"]; text: string }[] = [];
  const slots: SlotRelabel[] = [];
  let blocked: SlotRelabel["status"] | null = null;
  for (const dspec of trace.distractorSpecs) {
    const attempts = trace.attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === dspec.option);
    const placed = trace.distractors.find((entry) => entry.option === dspec.option);
    const slot: SlotRelabel = { option: dspec.option, role: dspec.role, storedAccepted: placed?.attempts ?? null, status: "lost", attempt: null, reason: null, rows: [] };
    slots.push(slot);
    if (!attempts.length) {
      slot.status = "not_generated";
      slot.reason = "the stored run never wrote this option";
      blocked ??= "unknown";
      continue;
    }
    const rejected: string[] = [];
    for (const attempt of attempts) {
      const row: Row = { attempt: attempt.attempt, text: attempt.output, storedRejection: attempt.rejectionReason, storedFailures: attempt.judge?.failures ?? [], validator: [], decision: null, note: null };
      slot.rows.push(row);
      if (!attempt.output) {
        row.note = attempt.rejectionReason ?? "no output";
        continue;
      }
      const validation = validateDistractor({ dspec, skeleton: trace.skeleton!, text: attempt.output, accepted, rejected, originality: options.originality, thresholds, experiments });
      row.validator = validation.issues.filter((issue) => issue.severity === "critical").map((issue) => issue.code);
      if (validation.status === "reject") continue;
      const raw = attempt.judge?.requestHash ? options.report(attempt.judge.requestHash) : null;
      if (!raw) {
        row.note = attempt.judge ? "stored judge report not found in the local cache" : "passes the current validator, but the stored run never judged it";
        slot.status = "unknown";
        slot.attempt = attempt.attempt;
        slot.reason = row.note;
        break;
      }
      const missing = missingJudgeFields(raw as Record<string, unknown>, experiments);
      if (missing.length) throw new Error(`${trace.specId} ${dspec.option}#${attempt.attempt}: the stored judge report has no ${missing.join(", ")}; these experiments cannot be relabeled from it`);
      const report = schema.parse(raw);
      const decision = distractorDecision({ dspec, report, thresholds, experiments });
      row.decision = { decision: decision.decision, failures: decision.failures, concerns: decision.concerns };
      if (decision.decision === "REGENERATE") {
        rejected.push(attempt.output);
        continue;
      }
      slot.status = decision.decision === "ACCEPT" ? "accepted" : "review";
      slot.attempt = attempt.attempt;
      accepted.push({ option: dspec.option, text: attempt.output });
      break;
    }
    if (slot.status === "lost" && attempts.length < attemptLimits.distractor) {
      slot.status = "unknown";
      slot.reason = `only ${attempts.length} stored attempt(s), all rejected now; the pipeline would write another`;
    } else if (slot.status === "lost") slot.reason = `all ${attempts.length} stored attempts rejected`;
    if (slot.status === "lost" || slot.status === "unknown") blocked ??= slot.status;
  }
  const status: ItemRelabel["status"] = blocked ?? "complete";
  const changed = slots.some((slot) => (slot.status === "accepted" || slot.status === "review" ? slot.attempt : null) !== slot.storedAccepted);
  return { specId: trace.specId, storedState: trace.state, status, changed, slots };
}

/** Option clause form, for reading tense losses: past perfect, simple past (incl. progressive), present, will, mixed. */
export function clauseForm(text: string): string {
  const body = optionBody(text);
  if (hasPastPerfect(body)) return "past_perfect";
  const frame = mainClauseFrame(body);
  return { past_event: "simple_past", past_ongoing: "simple_past", present_general: "present", future: "will", counterfactual: "modal_perfect", unknown: "mixed" }[frame];
}

/**
 * Every attempt of a lost slot that the judge flagged tense_incompatible, with what the deterministic tense rules say
 * about it. "real" when the rules find a clash, "too_strict" when the option's tense fits the main clause frame (simple
 * past in a past frame, past perfect in a past time clause, present in a present frame), and "undetermined" otherwise
 * (unknown frame, a past perfect condition on an ongoing past). The clause form is heuristic; read the text too.
 */
export function tenseLosses(trace: GenerationTrace) {
  if (trace.state !== "DISTRACTORS_FAILED" || !trace.skeleton) return [];
  const option = /^distractor_([A-E])_/.exec(trace.failure ?? "")?.[1];
  const dspec = trace.distractorSpecs.find((entry) => entry.option === option);
  if (!dspec) return [];
  const frame = mainClauseFrame(trace.skeleton.stem);
  const attempts = trace.attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === option);
  if (!attempts.some((attempt) => attempt.judge?.failures.includes("tense_incompatible"))) return [];
  return attempts.map((attempt) => {
    const failures = attempt.judge?.failures ?? [];
    const tense = failures.includes("tense_incompatible");
    const form = attempt.output ? clauseForm(attempt.output) : null;
    const issues = attempt.output ? contextIssues({ expresses: dspec.relationConstraint.targetRelation, frame, text: attempt.output }).filter((issue) => issue.severity === "critical") : [];
    const pastFrame = frame === "past_event" || frame === "past_ongoing";
    const relation = dspec.relationConstraint.targetRelation?.split(":")[1];
    const fits = (pastFrame && (form === "simple_past" || (relation === "sequence" && form === "past_perfect"))) || (frame === "present_general" && form === "present");
    const verdict = !tense ? null : issues.length ? "real" : fits ? "too_strict" : "undetermined";
    return {
      specId: trace.specId,
      option,
      role: dspec.role,
      frame,
      attempt: attempt.attempt,
      text: attempt.output,
      form,
      storedFailures: failures.length ? failures : attempt.rejectionReason ? [attempt.rejectionReason] : [],
      tenseOnly: tense && failures.length === 1,
      deterministic: issues.map((issue) => issue.code),
      verdict,
      tenseReason: (attempt.judge?.reasons ?? []).find((reason) => /tense|past perfect|time frame|counterfactual|conditional|already|completed/i.test(reason)) ?? null,
    };
  });
}

const readDir = <T>(dir: string): T[] => (existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".json")).sort().map((name) => JSON.parse(readFileSync(path.join(dir, name), "utf8")) as T) : []);
const tally = (values: string[]) => Object.fromEntries(Object.entries(values.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]));

function rescoreRun(dir: string, options: { as?: string; originality?: OriginalityIndex; report: ReportSource }) {
  const summary = JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8")) as { experiments?: string[]; thresholds?: FactoryThresholds };
  const stored = parseExperiments((summary.experiments ?? []).join(","));
  const experiments = options.as ? parseExperiments(options.as) : stored;
  const traces = readDir<GenerationTrace>(path.join(dir, "traces")).filter((trace) => trace.skeleton);
  const items = traces.map((trace) => relabelTrace(trace, { experiments, report: options.report, thresholds: summary.thresholds, originality: options.originality }));
  const slots = items.flatMap((item) => item.slots.filter((slot) => slot.rows.length));
  return {
    run: path.basename(dir),
    storedExperiments: stored,
    experiments,
    whatIf: !!options.as,
    items: items.length,
    slots: slots.length,
    storedFirstAttempt: slots.filter((slot) => slot.storedAccepted === 1).length,
    relabeledFirstAttempt: slots.filter((slot) => (slot.status === "accepted" || slot.status === "review") && slot.attempt === 1).length,
    relabeledReview: slots.filter((slot) => slot.status === "review").length,
    storedLost: items.filter((item) => item.storedState === "DISTRACTORS_FAILED").length,
    relabeled: tally(items.map((item) => (item.storedState === "DISTRACTORS_FAILED" ? `stored lost → ${item.status}` : `stored ${item.storedState} → ${item.status}${item.changed ? " (other options)" : ""}`))),
    storedFailures: tally(slots.flatMap((slot) => slot.rows.flatMap((row) => row.storedFailures))),
    relabeledFailures: tally(slots.flatMap((slot) => slot.rows.flatMap((row) => row.decision?.failures ?? []))),
    relabeledConcerns: tally(slots.flatMap((slot) => slot.rows.flatMap((row) => row.decision?.concerns ?? []))),
    tenseLosses: traces.flatMap(tenseLosses),
    itemsDetail: items,
  };
}
type RunRescore = ReturnType<typeof rescoreRun>;

/** Relabels each run; `as` replaces the run's experiments (a what-if, flagged as such in the output). */
export function factoryRescore(options: { runDirs: string[]; out: string; as?: string; originality?: OriginalityIndex; report?: ReportSource }) {
  const runs = options.runDirs.map((dir) => rescoreRun(dir, { as: options.as, originality: options.originality, report: options.report ?? cachedReport }));
  mkdirSync(options.out, { recursive: true });
  writeFileSync(path.join(options.out, "rescore.json"), `${JSON.stringify({ notice: relabelNotice, generatedAt: new Date().toISOString(), runs }, null, 2)}\n`);
  writeFileSync(path.join(options.out, "rescore.md"), rescoreMarkdown(runs));
  return runs.map(({ itemsDetail: _items, tenseLosses: losses, ...rest }) => ({ ...rest, tenseLossAttempts: losses.length }));
}

function rescoreMarkdown(runs: RunRescore[]): string {
  const lines = ["# Offline relabeling", "", `> ${relabelNotice}`, ""];
  for (const run of runs) {
    lines.push(`## ${run.run}`, "", `Experiments: ${run.experiments.join("+") || "baseline"}${run.whatIf ? ` (what-if; the run used ${run.storedExperiments.join("+") || "baseline"})` : ""}`, "");
    lines.push(`- Slots with stored attempts: ${run.slots}; accepted at the first attempt: stored ${run.storedFirstAttempt}, relabeled ${run.relabeledFirstAttempt} (${run.relabeledReview} of the relabeled acceptances go to a human)`);
    lines.push(`- Items lost at the distractor stage (stored): ${run.storedLost}`);
    for (const [label, n] of Object.entries(run.relabeled)) lines.push(`  - ${label}: ${n}`);
    lines.push(`- Stored judge failures: ${JSON.stringify(run.storedFailures)}`, `- Relabeled judge failures: ${JSON.stringify(run.relabeledFailures)}`, `- Relabeled concerns: ${JSON.stringify(run.relabeledConcerns)}`, "");
    if (run.tenseLosses.length) {
      lines.push("### Lost slots with a tense_incompatible rejection", "", "| item | option/role | frame | # | form | stored failures | deterministic | verdict | option |", "|---|---|---|---|---|---|---|---|---|");
      for (const row of run.tenseLosses)
        lines.push(`| ${row.specId.split(".").slice(-1)[0]} | ${row.option} ${row.role} | ${row.frame} | ${row.attempt} | ${row.form ?? "–"} | ${row.storedFailures.join(", ")} | ${row.deterministic.join(", ") || "–"} | ${row.verdict ?? "–"} | ${row.text ?? "–"} |`);
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}
