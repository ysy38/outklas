import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { distributionCorpus } from "@/modules/analysis/corpus";
import type { DnaQuestion } from "@/modules/analysis/dna";
import { optionLabels } from "@/modules/analysis/contract";
import { itemText } from "@/modules/analysis/validate";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { generatedQuestionCandidate } from "@/modules/factory/candidate";
import { distractorDiagnosisVersion } from "@/modules/factory/diagnosis";
import { familyBlueprints } from "@/modules/factory/families";
import { buildExamProfile, type YdsExamProfile } from "@/modules/factory/profile";
import { applyReview, reviewDecisions, type CandidateRecord, type ReviewDecision } from "@/modules/factory/review";
import { buildQuestionSpec } from "@/modules/factory/spec-engine";
import type { QuestionSpec } from "@/modules/factory/spec";
import { attemptLimits } from "@/modules/factory/thresholds";
import { originalityIndex, validateCandidate, type OriginalityIndex } from "@/modules/factory/validator";
import { dnaVersion, factoryVersions } from "@/modules/factory/versions";
import { SpendBudget } from "../ai/budget";
import { loadAIConfig, parseModel, type AIConfig } from "../ai/config";
import { addTokens, emptyRow, estimateCost, type Prices, type TokenUsage } from "../ai/prices";
import { acceptabilityPromptVersion } from "../ai/prompts/acceptability.v1";
import { skeletonCheckPromptVersion } from "../ai/prompts/skeleton-check.v1";
import { explanationPromptVersion } from "../ai/prompts/explanation.v2";
import { judgePromptVersion } from "../ai/prompts/judge.v2";
import { skeletonPromptVersion } from "../ai/prompts/skeleton.v1";
import { assertIndependent, createAIService, providerRouter } from "../ai/service";
import type { AIService } from "../ai/types";
import { dataRoot, readJson, readManifest } from "../lib/artifacts";
import { mapLimit } from "../lib/limit";
import { assertTextFree } from "../lib/text-free";
import { distractorPromptsFor, generateItem, type ItemOutcome, type RunContext } from "./atomic";

/** Hard ceiling until bulk generation is approved: the factory only runs vertical slices. */
export const sliceLimit = 20;

const factoryRoot = () => path.join(dataRoot(), "_factory");
const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

function loadDnaRows(): DnaQuestion[] {
  return distributionCorpus.flatMap((slug) => {
    if (!readManifest(slug, "dna")) throw new Error(`DNA missing for ${slug}.`);
    return readJson<{ questions: DnaQuestion[] }>(slug, "dna", "rows.json").questions;
  });
}

/** Text-free YDS exam profile from the four distribution exams. */
export function factoryProfile(): { profile: YdsExamProfile; file: string } {
  const profile = buildExamProfile(loadDnaRows());
  assertTextFree(profile);
  const dir = path.join(factoryRoot(), "profile");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "yds-profile-v1.json");
  writeFileSync(file, json(profile));
  return { profile, file };
}

/** Every reading of every locally reconstructed historical item, reduced to shingles. Used only to reject overlap; never sent to a model. */
export function historicalIndex(): { index: OriginalityIndex; documents: number; items: number } {
  const texts: string[] = [];
  let documents = 0;
  for (const slug of readdirSync(dataRoot())) {
    const dir = path.join(dataRoot(), slug, "reconstruct");
    if (!existsSync(dir)) continue;
    const readings = readdirSync(dir).filter((name) => /^questions-[a-z]+\.json$/.test(name));
    if (readings.length > 0) documents += 1;
    for (const name of readings) {
      for (const row of JSON.parse(readFileSync(path.join(dir, name), "utf8")) as { question: ReconstructedQuestion }[]) texts.push(itemText(row.question));
    }
  }
  return { index: originalityIndex(texts), documents, items: texts.length };
}

/** A run that already holds human decisions is never overwritten. */
export function assertRunWritable(runDir: string) {
  const dir = path.join(runDir, "candidates");
  if (!existsSync(dir)) return;
  const reviewed = readdirSync(dir).some((name) => (JSON.parse(readFileSync(path.join(dir, name), "utf8")) as CandidateRecord).reviews.length > 0);
  if (reviewed) throw new Error(`${runDir} already holds human review decisions; it is never overwritten.`);
}

const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 1000 : null);
const per = (part: number, whole: number, digits: number) => (whole ? Math.round((part / whole) * 10 ** digits) / 10 ** digits : null);
const tally = (values: string[]) => Object.entries(values.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
const reasonCode = (reason: string) => reason.split(",").map((part) => part.trim().replace(/\(.*$/, "").replace(/@[A-E]$/, "").replace(/:.*$/, ""));

/**
 * Fresh provider work of a slice from the per-call logs: tokens per item, per item that reached the human review
 * queue, and on items that did not; cost per model when FACTORY_PRICES is set, otherwise "unknown", never zero.
 */
export function sliceSpend(outcomes: ItemOutcome[], prices: Prices | null) {
  const byModel: TokenUsage = {};
  const tokensOf = (outcome: ItemOutcome) => (outcome.trace.cost?.log ?? []).reduce((sum, call) => sum + call.inputTokens + call.outputTokens + call.cacheWriteTokens + call.cacheReadTokens, 0);
  for (const call of outcomes.flatMap((outcome) => outcome.trace.cost?.log ?? [])) {
    if (call.localCache === "hit") continue;
    // Logged Gemini models are bare names; price tables key every model as provider:model.
    const { provider, model } = parseModel(call.model, "gemini");
    addTokens((byModel[`${provider}:${model}`] ??= emptyRow()), { inputTokens: call.inputTokens, outputTokens: call.outputTokens, totalTokens: 0, cacheWriteTokens: call.cacheWriteTokens, cacheReadTokens: call.cacheReadTokens });
  }
  const accepted = outcomes.filter((outcome) => outcome.trace.state === "HUMAN_REVIEW");
  const total = outcomes.reduce((sum, outcome) => sum + tokensOf(outcome), 0);
  const failed = outcomes.filter((outcome) => outcome.trace.state !== "HUMAN_REVIEW").reduce((sum, outcome) => sum + tokensOf(outcome), 0);
  const calls = outcomes.flatMap((outcome) => outcome.trace.cost?.log ?? []);
  const cost = estimateCost(byModel, prices);
  return {
    freshCalls: calls.filter((call) => call.localCache === "miss").length,
    localCacheHits: calls.filter((call) => call.localCache === "hit").length,
    promptCacheReads: calls.filter((call) => call.promptCache === "read").length,
    promptCacheWrites: calls.filter((call) => call.promptCache === "write").length,
    regenerationCalls: calls.filter((call) => call.attempt > 1).length,
    errors: calls.filter((call) => call.error).length,
    tokens: { total, perItem: per(total, outcomes.length, 0), perAcceptedItem: per(total, accepted.length, 0), onFailedItems: failed, acceptedItems: accepted.length },
    byModel,
    cost: { ...cost, perItem: cost.usd === null ? null : per(cost.usd, outcomes.length, 6), perAcceptedItem: cost.usd === null ? null : per(cost.usd, accepted.length, 6), prices: prices?.source ?? null },
  };
}

/** Pipeline behaviour of one slice: where items fall out, how often each stage retries, and what it costs. */
export function sliceMetrics(outcomes: ItemOutcome[], providerCalls: number | null) {
  const attempts = outcomes.flatMap((outcome) => outcome.trace.attempts);
  const skeletonAttempts = attempts.filter((attempt) => attempt.stage === "skeleton");
  const distractorAttempts = attempts.filter((attempt) => attempt.stage === "distractor");
  type Slot = { role: string; attempts: number; accepted: boolean; firstTry: boolean; review: boolean };
  const slots: Slot[] = outcomes.flatMap((outcome) =>
    outcome.trace.distractorSpecs
      .map((dspec) => {
        const mine = outcome.trace.attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === dspec.option);
        const placed = outcome.trace.distractors.find((entry) => entry.option === dspec.option);
        return { role: dspec.role, attempts: mine.length, accepted: !!placed, firstTry: placed?.attempts === 1, review: placed?.decision === "HUMAN_REVIEW" };
      })
      .filter((slot) => slot.attempts > 0),
  );
  const records = outcomes.map((outcome) => outcome.record).filter((record): record is CandidateRecord => !!record);
  const roles = [...new Set(slots.map((slot) => slot.role))].sort();
  const verdict = (value: string) => records.filter((record) => record.judge?.verdict === value).length;
  return {
    items: outcomes.length,
    skeleton: {
      generated: skeletonAttempts.filter((attempt) => attempt.requestHash).length,
      attempts: skeletonAttempts.length,
      acceptedItems: outcomes.filter((outcome) => outcome.trace.skeleton).length,
      validatorRejected: skeletonAttempts.filter((attempt) => attempt.validator.status === "reject").length,
      gateChecked: skeletonAttempts.filter((attempt) => attempt.judge).length,
      gateRejected: skeletonAttempts.filter((attempt) => attempt.judge?.decision === "REGENERATE").length,
      acceptedFirstTry: outcomes.filter((outcome) => outcome.trace.skeleton && outcome.trace.attempts.filter((attempt) => attempt.stage === "skeleton").length === 1).length,
    },
    distractors: {
      generated: distractorAttempts.length,
      slots: slots.length,
      acceptedFirstTry: slots.filter((slot) => slot.firstTry).length,
      regenerated: slots.filter((slot) => slot.attempts > 1).length,
      acceptedAfterRegeneration: slots.filter((slot) => slot.accepted && !slot.firstTry).length,
      rejectedAfterLimit: slots.filter((slot) => !slot.accepted && slot.attempts >= attemptLimits.distractor).length,
      humanReview: slots.filter((slot) => slot.review).length,
      avgAttemptsPerSlot: rate(distractorAttempts.length, slots.length),
    },
    byRole: roles.map((role) => {
      const mine = slots.filter((slot) => slot.role === role);
      return {
        role,
        slots: mine.length,
        attempts: mine.reduce((sum, slot) => sum + slot.attempts, 0),
        firstTryRate: rate(mine.filter((slot) => slot.firstTry).length, mine.length),
        acceptedRate: rate(mine.filter((slot) => slot.accepted).length, mine.length),
        perAttemptAcceptance: rate(mine.filter((slot) => slot.accepted).length, mine.reduce((sum, slot) => sum + slot.attempts, 0)),
        humanReview: mine.filter((slot) => slot.review).length,
      };
    }),
    finalValidator: { reached: records.length, passed: records.filter((record) => record.versions[0].validation.status === "pass").length },
    finalJudge: { APPROVE: verdict("APPROVE"), REVIEW: verdict("REVIEW"), REJECT: verdict("REJECT") },
    humanReview: records.filter((record) => record.status === "pending_review").length,
    humanApproved: records.filter((record) => record.status === "approved").length,
    endStates: tally(outcomes.map((outcome) => outcome.trace.state)),
    avgModelCallsPerItem: rate(outcomes.reduce((sum, outcome) => sum + outcome.modelCalls, 0), outcomes.length),
    avgProviderCallsPerItem: providerCalls === null ? null : rate(providerCalls, outcomes.length),
    avgLatencyMsPerItem: outcomes.length ? Math.round(outcomes.reduce((sum, outcome) => sum + outcome.latencyMs, 0) / outcomes.length) : null,
    freshWork: {
      calls: outcomes.reduce((sum, outcome) => sum + (outcome.trace.cost?.calls ?? 0), 0),
      cachedCalls: outcomes.reduce((sum, outcome) => sum + (outcome.trace.cost?.cachedCalls ?? 0), 0),
      latencyMs: outcomes.reduce((sum, outcome) => sum + (outcome.trace.cost?.freshLatencyMs ?? 0), 0),
      inputTokens: outcomes.reduce((sum, outcome) => sum + (outcome.trace.cost?.inputTokens ?? 0), 0),
      outputTokens: outcomes.reduce((sum, outcome) => sum + (outcome.trace.cost?.outputTokens ?? 0), 0),
    },
    failureReasons: tally([
      ...attempts.flatMap((attempt) => (attempt.rejectionReason ? reasonCode(attempt.rejectionReason).map((code) => `${attempt.stage}:${code}`) : [])),
      ...outcomes.flatMap((outcome) => (outcome.trace.failure ? [`item:${outcome.trace.failure.replace(/_[A-E]_.*$/, "")}`] : [])),
      ...records.flatMap((record) => (record.judge?.failures ?? []).map((failure) => `final_judge:${failure.replace(/_[A-E]+$/, "")}`)),
    ]),
  };
}

/** One line per model call, joined with the outcome of the attempt it belonged to. */
function callLog(outcomes: ItemOutcome[]): string {
  return outcomes
    .flatMap((outcome) =>
      (outcome.trace.cost?.log ?? []).map((call) => {
        const stage = call.stage === "skeletonGate" ? "skeleton" : call.stage === "distractorJudge" ? "distractor" : call.stage;
        const attempt = outcome.trace.attempts.find((entry) => entry.stage === stage && entry.option === call.option && entry.attempt === call.attempt);
        return JSON.stringify({ specId: outcome.trace.specId, ...call, rejection: attempt?.rejectionReason ?? null, itemState: outcome.trace.state });
      }),
    )
    .map((line) => `${line}\n`)
    .join("");
}

function reviewSheet(outcomes: ItemOutcome[]): string {
  const lines = ["# Question factory review sheet", "", `Pipeline ${factoryVersions.pipeline}. Local only. Original generated items; no historical text.`, ""];
  for (const outcome of outcomes) {
    const { trace, record } = outcome;
    lines.push(`## ${trace.specId} — ${record?.status ?? trace.state}`, "", `State: ${trace.state}${trace.failure ? ` (${trace.failure})` : ""} · ${outcome.modelCalls} model calls · ${Math.round(outcome.latencyMs / 100) / 10}s`);
    for (const attempt of trace.attempts) {
      const verdict = attempt.judge ? ` → ${attempt.judge.decision}${attempt.judge.failures.length ? ` [${attempt.judge.failures.join(", ")}]` : ""}${attempt.judge.concerns.length ? ` {${attempt.judge.concerns.join(", ")}}` : ""}` : "";
      lines.push(`- ${attempt.stage}${attempt.option ? ` ${attempt.option}` : ""} #${attempt.attempt}: validator ${attempt.validator.status}${attempt.validator.codes.length ? ` (${attempt.validator.codes.join(", ")})` : ""}${verdict}`);
    }
    if (!record) {
      if (trace.skeleton) lines.push("", `Stem: ${trace.skeleton.stem}`, `Key: ${trace.skeleton.correctAnswer}`, ...trace.distractors.map((entry) => `- ${entry.option}) ${entry.text}`));
      lines.push("");
      continue;
    }
    const { candidate, validation } = record.versions[record.versions.length - 1];
    lines.push(`Validator: ${validation.status} (${validation.critical} critical, ${validation.warnings} warn) ${validation.issues.map((issue) => `${issue.code}${issue.option ? `@${issue.option}` : ""}`).join(", ")}`);
    if (record.judge) {
      lines.push(
        `Judge: ${record.judge.verdict} (model ${record.judge.modelVerdict}, blind ${record.judge.blindAnswer}, acceptable ${record.judge.acceptableOptions.join("") || "none"}, quality ${record.judge.qualityScore}) failures: ${record.judge.failures.join(", ") || "none"}; concerns: ${record.judge.concerns.join(", ") || "none"}`,
      );
    }
    lines.push("", `**${candidate.question.stem}**`, "");
    for (const label of optionLabels) lines.push(`- ${label}) ${candidate.question.options[label]}${label === candidate.correctOption ? "  ✓" : ""}`);
    lines.push("", `Açıklama: ${candidate.explanation}`, ...(candidate.transferNote ? [`Transfer: ${candidate.transferNote}`] : []), "");
    for (const entry of [...candidate.distractorRationales].sort((a, b) => (a.option < b.option ? -1 : 1))) lines.push(`- ${entry.option} (${entry.distractorType.split(":")[1]}${entry.misconception ? `, ${entry.misconception.split(":")[1]}` : ""}): ${entry.whyWrong}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * `tag` separates runs of the same specs with different models; it becomes part of the run directory name.
 * `first` is the ordinal of the first spec (default 1), so a small run can reuse specs of an earlier, larger one.
 */
export type SliceOptions = { family: string; count: number; first?: number; band?: QuestionSpec["difficulty"]["band"]; tag?: string; service?: AIService; config?: AIConfig; log?: (message: string) => void };

/** One vertical slice through the atomic pipeline. Nothing is written to the question bank. */
export async function factorySlice(options: SliceOptions) {
  const family = familyBlueprints[options.family];
  if (!family) throw new Error(`Unknown family "${options.family}". Known: ${Object.keys(familyBlueprints).join(", ")}`);
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > sliceLimit) throw new Error(`count must be 1–${sliceLimit}; bulk generation is not enabled.`);
  if (options.tag !== undefined && !/^[a-z0-9-]+$/.test(options.tag)) throw new Error("tag must be lowercase letters, digits and hyphens");
  const first = options.first ?? 1;
  if (!Number.isInteger(first) || first < 1) throw new Error("first must be a whole number of at least 1");
  const config = options.config ?? loadAIConfig();
  assertIndependent(config);
  const prices = config.prices ?? null;
  const factoryModels = [config.models.generator, config.models.distractor, config.models.distractorJudge, config.models.judge, config.models.explanation].map((setting) => {
    const { provider, model } = parseModel(setting, config.provider);
    return `${provider}:${model}`;
  });
  const budget = new SpendBudget(config.limits ?? {}, prices, factoryModels);
  const service = options.service ?? createAIService(config, providerRouter(config, undefined, (provider) => budget.meter(provider)));
  const providerCalls = options.service ? null : () => budget.calls;
  const log = options.log ?? (() => undefined);

  const { profile } = factoryProfile();
  const specs = Array.from({ length: options.count }, (_, index) => buildQuestionSpec({ profile, family, ordinal: first + index, band: options.band }));
  const runDir = path.join(factoryRoot(), "runs", `${family.id}.${specs[0].difficulty.band}.n${options.count}${first > 1 ? `-from${first}` : ""}.${factoryVersions.pipeline}${options.tag ? `.${options.tag}` : ""}`);
  assertRunWritable(runDir);
  const { index, documents, items } = historicalIndex();
  log(`profile ${profile.version}: ${profile.questions} questions; originality index ${index.shingles.size} shingles from ${items} items in ${documents} documents`);

  const ctx: RunContext = { service, config, originality: index, siblingStems: [], siblings: [], profileVersion: profile.version, budget };
  const skipped: string[] = [];
  const outcomes = (
    await mapLimit(specs, 3, async (spec) => {
      if (budget.stopped) {
        skipped.push(spec.id);
        log(`${spec.id}: skipped, ${budget.stopped}`);
        return null;
      }
      const outcome = await generateItem(spec, ctx);
      log(`${spec.id}: ${outcome.trace.state} (${outcome.modelCalls} calls, ${Math.round(outcome.latencyMs / 1000)}s)`);
      return outcome;
    })
  ).filter((outcome): outcome is ItemOutcome => !!outcome);

  mkdirSync(path.join(runDir, "candidates"), { recursive: true });
  mkdirSync(path.join(runDir, "traces"), { recursive: true });
  for (const outcome of outcomes) {
    writeFileSync(path.join(runDir, "traces", `${outcome.trace.specId}.json`), json(outcome.trace));
    if (outcome.record) writeFileSync(path.join(runDir, "candidates", `${outcome.record.id}.json`), json(outcome.record));
  }
  writeFileSync(path.join(runDir, "calls.jsonl"), callLog(outcomes));
  const summary = {
    family: family.id,
    band: specs[0].difficulty.band,
    requested: options.count,
    metrics: sliceMetrics(outcomes, providerCalls?.() ?? null),
    spend: sliceSpend(outcomes, prices),
    budget: { ...budget.report(), skipped },
    providerUsage: budget.usage,
    promptCache: config.promptCache ?? "5m",
    errors: outcomes.filter((outcome) => outcome.error).map((outcome) => ({ specId: outcome.trace.specId, error: outcome.error })),
    models: config.models,
    thresholds: config.thresholds,
    experiments: config.experiments ?? [],
    seed: config.seed ?? 1,
    skeletonGate: config.skeletonGate !== false,
    versions: {
      ...factoryVersions,
      distractorDiagnosis: distractorDiagnosisVersion,
      skeletonPromptVersion,
      distractorPromptVersion: distractorPromptsFor(config.experiments ?? []).distractor,
      distractorJudgePromptVersion: distractorPromptsFor(config.experiments ?? []).judge,
      skeletonGatePromptVersion: config.skeletonGate === false ? null : skeletonCheckPromptVersion,
      judgePromptVersion,
      acceptabilityPromptVersion,
      explanationPromptVersion,
      dnaVersion,
      knowledgeVersion: specs[0].knowledgeVersion,
    },
  };
  writeFileSync(path.join(runDir, "summary.json"), json(summary));
  writeFileSync(path.join(runDir, "review.md"), reviewSheet(outcomes));
  return { runDir, ...summary };
}

/** Records one human decision on a stored candidate. EDIT takes a JSON file with the full edited candidate. */
export function factoryReview(input: { runDir: string; candidateId: string; decision: string; reviewer: string; notes?: string; editFile?: string }) {
  if (!(reviewDecisions as readonly string[]).includes(input.decision)) throw new Error(`decision must be one of ${reviewDecisions.join(", ")}`);
  const file = path.join(input.runDir, "candidates", `${input.candidateId}.json`);
  if (!existsSync(file)) throw new Error(`No candidate ${input.candidateId} in ${input.runDir}`);
  const record = JSON.parse(readFileSync(file, "utf8")) as CandidateRecord;
  let edit;
  if (input.editFile) {
    const candidate = generatedQuestionCandidate.parse(JSON.parse(readFileSync(input.editFile, "utf8")));
    const siblings = readdirSync(path.join(input.runDir, "candidates"))
      .filter((name) => name !== `${input.candidateId}.json`)
      .map((name) => JSON.parse(readFileSync(path.join(input.runDir, "candidates", name), "utf8")) as CandidateRecord)
      .map((other) => ({ id: other.id, stem: other.versions.at(-1)!.candidate.question.stem, options: other.versions.at(-1)!.candidate.question.options }));
    edit = { candidate, validation: validateCandidate({ spec: record.spec, candidate, originality: historicalIndex().index, siblings }) };
  }
  const next = applyReview(record, { decision: input.decision as ReviewDecision, reviewer: input.reviewer, notes: input.notes, at: new Date().toISOString(), edit });
  writeFileSync(file, json(next));
  return { id: next.id, status: next.status, versions: next.versions.length, reviews: next.reviews.length };
}
