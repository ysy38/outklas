import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { distributionCorpus } from "@/modules/analysis/corpus";
import type { DnaQuestion } from "@/modules/analysis/dna";
import { optionLabels } from "@/modules/analysis/contract";
import { itemText } from "@/modules/analysis/validate";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { generatedQuestionCandidate } from "@/modules/factory/candidate";
import { familyBlueprints } from "@/modules/factory/families";
import { buildExamProfile, type YdsExamProfile } from "@/modules/factory/profile";
import { applyReview, reviewDecisions, type CandidateRecord, type ReviewDecision } from "@/modules/factory/review";
import { buildQuestionSpec } from "@/modules/factory/spec-engine";
import type { QuestionSpec } from "@/modules/factory/spec";
import { attemptLimits } from "@/modules/factory/thresholds";
import { originalityIndex, validateCandidate, type OriginalityIndex } from "@/modules/factory/validator";
import { dnaVersion, factoryVersions } from "@/modules/factory/versions";
import { loadAIConfig, type AIConfig } from "../ai/config";
import { acceptabilityPromptVersion } from "../ai/prompts/acceptability.v1";
import { distractorJudgePromptVersion } from "../ai/prompts/distractor-judge.v1";
import { distractorPromptVersion } from "../ai/prompts/distractor.v1";
import { explanationPromptVersion } from "../ai/prompts/explanation.v1";
import { judgePromptVersion } from "../ai/prompts/judge.v2";
import { skeletonPromptVersion } from "../ai/prompts/skeleton.v1";
import { createAIService, createProvider, JudgeNotIndependent } from "../ai/service";
import type { AIProvider, AIService } from "../ai/types";
import { dataRoot, readJson, readManifest } from "../lib/artifacts";
import { mapLimit } from "../lib/limit";
import { assertTextFree } from "../lib/text-free";
import { generateItem, type ItemOutcome, type RunContext } from "./atomic";

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
function historicalIndex(): { index: OriginalityIndex; documents: number; items: number } {
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

/** Counts real provider requests, including repair attempts and judge calls. */
function counting(provider: AIProvider): AIProvider & { calls: number } {
  const wrapped = {
    name: provider.name,
    calls: 0,
    generate: (request: Parameters<AIProvider["generate"]>[0]) => {
      wrapped.calls += 1;
      return provider.generate(request);
    },
  };
  return wrapped;
}

const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 1000 : null);
const tally = (values: string[]) => Object.entries(values.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
const reasonCode = (reason: string) => reason.split(",").map((part) => part.trim().replace(/\(.*$/, "").replace(/@[A-E]$/, "").replace(/:.*$/, ""));

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
    skeleton: { generated: skeletonAttempts.filter((attempt) => attempt.requestHash).length, attempts: skeletonAttempts.length, acceptedItems: outcomes.filter((outcome) => outcome.trace.skeleton).length },
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
    failureReasons: tally([
      ...attempts.flatMap((attempt) => (attempt.rejectionReason ? reasonCode(attempt.rejectionReason).map((code) => `${attempt.stage}:${code}`) : [])),
      ...outcomes.flatMap((outcome) => (outcome.trace.failure ? [`item:${outcome.trace.failure.replace(/_[A-E]_.*$/, "")}`] : [])),
      ...records.flatMap((record) => (record.judge?.failures ?? []).map((failure) => `final_judge:${failure.replace(/_[A-E]+$/, "")}`)),
    ]),
  };
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

/** `tag` separates runs of the same specs with different models; it becomes part of the run directory name. */
export type SliceOptions = { family: string; count: number; band?: QuestionSpec["difficulty"]["band"]; tag?: string; service?: AIService; config?: AIConfig; log?: (message: string) => void };

/** One vertical slice through the atomic pipeline. Nothing is written to the question bank. */
export async function factorySlice(options: SliceOptions) {
  const family = familyBlueprints[options.family];
  if (!family) throw new Error(`Unknown family "${options.family}". Known: ${Object.keys(familyBlueprints).join(", ")}`);
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > sliceLimit) throw new Error(`count must be 1–${sliceLimit}; bulk generation is not enabled.`);
  if (options.tag !== undefined && !/^[a-z0-9-]+$/.test(options.tag)) throw new Error("tag must be lowercase letters, digits and hyphens");
  const config = options.config ?? loadAIConfig();
  if (config.models.generator === config.models.judge) throw new JudgeNotIndependent(config.models.judge);
  if (config.models.distractor === config.models.judge) throw new JudgeNotIndependent(config.models.judge, "DISTRACTOR_MODEL", "FINAL_JUDGE_MODEL");
  if (config.models.distractor === config.models.distractorJudge) throw new JudgeNotIndependent(config.models.distractor, "DISTRACTOR_MODEL", "DISTRACTOR_JUDGE_MODEL");
  const provider = options.service ? null : counting(createProvider(config));
  const service = options.service ?? createAIService(config, provider!);
  const log = options.log ?? (() => undefined);

  const { profile } = factoryProfile();
  const specs = Array.from({ length: options.count }, (_, index) => buildQuestionSpec({ profile, family, ordinal: index + 1, band: options.band }));
  const runDir = path.join(factoryRoot(), "runs", `${family.id}.${specs[0].difficulty.band}.n${options.count}.${factoryVersions.pipeline}${options.tag ? `.${options.tag}` : ""}`);
  assertRunWritable(runDir);
  const { index, documents, items } = historicalIndex();
  log(`profile ${profile.version}: ${profile.questions} questions; originality index ${index.shingles.size} shingles from ${items} items in ${documents} documents`);

  const ctx: RunContext = { service, config, originality: index, siblingStems: [], siblings: [], profileVersion: profile.version };
  const outcomes = await mapLimit(specs, 3, async (spec) => {
    const outcome = await generateItem(spec, ctx);
    log(`${spec.id}: ${outcome.trace.state} (${outcome.modelCalls} calls, ${Math.round(outcome.latencyMs / 1000)}s)`);
    return outcome;
  });

  mkdirSync(path.join(runDir, "candidates"), { recursive: true });
  mkdirSync(path.join(runDir, "traces"), { recursive: true });
  for (const outcome of outcomes) {
    writeFileSync(path.join(runDir, "traces", `${outcome.trace.specId}.json`), json(outcome.trace));
    if (outcome.record) writeFileSync(path.join(runDir, "candidates", `${outcome.record.id}.json`), json(outcome.record));
  }
  const summary = {
    family: family.id,
    band: specs[0].difficulty.band,
    requested: options.count,
    metrics: sliceMetrics(outcomes, provider?.calls ?? null),
    errors: outcomes.filter((outcome) => outcome.error).map((outcome) => ({ specId: outcome.trace.specId, error: outcome.error })),
    models: config.models,
    thresholds: config.thresholds,
    versions: {
      ...factoryVersions,
      skeletonPromptVersion,
      distractorPromptVersion,
      distractorJudgePromptVersion,
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
