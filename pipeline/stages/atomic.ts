import type { OptionLabel } from "@/modules/analysis/contract";
import { distractorDiagnosisVersion } from "@/modules/factory/diagnosis";
import { mainClauseFrame, type MainClauseFrame } from "@/modules/factory/context";
import { distractorDecision, validateDistractor, type ExperimentalJudgeReport } from "@/modules/factory/distractor";
import { buildDistractorSpecs } from "@/modules/factory/distractor-spec";
import { assembleCandidate, assembleCore, isExplanationIssue } from "@/modules/factory/explanation";
import { advance, newTrace, type AcceptedDistractor, type CallRecord, type CostStage, type GenerationTrace, type ItemCost, type StageAttempt } from "@/modules/factory/generation";
import { judgeDecision, type JudgeDecision } from "@/modules/factory/judge";
import { provenance as provenanceSchema } from "@/modules/factory/provenance";
import { initialStatus, type CandidateRecord } from "@/modules/factory/review";
import { experimentGeneration, type ExperimentSet } from "@/modules/factory/experiments";
import { completeStem, skeletonGateDecision, validateSkeleton, type QuestionSkeleton } from "@/modules/factory/skeleton";
import type { QuestionSpec } from "@/modules/factory/spec";
import { attemptLimits } from "@/modules/factory/thresholds";
import { validateCandidate, leadingConnector, type CandidateValidation, type OriginalityIndex, type Sibling, type ValidationIssue } from "@/modules/factory/validator";
import { dnaVersion, factoryVersions } from "@/modules/factory/versions";
import type { NodeRef } from "@/modules/knowledge/graph";
import { parseModel, type AIConfig } from "../ai/config";
import { acceptabilityPromptVersion } from "../ai/prompts/acceptability.v1";
import { distractorJudgePromptVersion } from "../ai/prompts/distractor-judge.v3";
import { distractorJudgeExperimentalPromptVersion } from "../ai/prompts/distractor-judge.v4";
import { distractorPromptVersion } from "../ai/prompts/distractor.v4";
import { distractorExperimentalPromptVersion } from "../ai/prompts/distractor.v5";
import { distractorRevisionPromptVersion } from "../ai/prompts/distractor.v6";
import { distractorJudgeRevisionPromptVersion } from "../ai/prompts/distractor-judge.v6";
import { skeletonCheckPromptVersion } from "../ai/prompts/skeleton-check.v1";
import { explanationPromptVersion } from "../ai/prompts/explanation.v2";
import type { DistractorCheckSummary } from "../ai/prompts/judge.v2";
import { judgePromptVersion } from "../ai/prompts/judge.v2";
import { skeletonPromptVersion } from "../ai/prompts/skeleton.v1";
import { solvePromptVersion } from "../ai/prompts/verifier.v1";
import type { SpendBudget } from "../ai/budget";
import type { AIResult, AIService } from "../ai/types";

/** Distractor writer and judge prompts in force for an experiment set. */
export function distractorPromptsFor(experiments: ExperimentSet) {
  return {
    baseline: { distractor: distractorPromptVersion, judge: distractorJudgePromptVersion, judgeVersion: factoryVersions.distractorJudge },
    first: { distractor: distractorExperimentalPromptVersion, judge: distractorJudgeExperimentalPromptVersion, judgeVersion: factoryVersions.distractorJudgeExperimental },
    second: { distractor: distractorRevisionPromptVersion, judge: distractorJudgeRevisionPromptVersion, judgeVersion: factoryVersions.distractorJudgeRevision },
  }[experimentGeneration(experiments)];
}

/** Shared across the items of one run so that siblings never repeat each other. */
export type RunContext = { service: AIService; config: AIConfig; originality: OriginalityIndex; siblingStems: string[]; siblings: Sibling[]; profileVersion: string; budget?: SpendBudget };

export type ItemOutcome = { trace: GenerationTrace; record: CandidateRecord | null; modelCalls: number; latencyMs: number; error: string | null };

const codes = (issues: ValidationIssue[], severity: "critical" | "warn" = "critical") =>
  issues.filter((issue) => issue.severity === severity).map((issue) => `${issue.code}${issue.option ? `@${issue.option}` : ""}${issue.detail ? `(${issue.detail})` : ""}`);

/** The model that actually answered (aliases resolved), with its provider prefix unless it is Gemini. */
const servedModel = (result: AIResult<unknown>) => (result.provider === "gemini" ? result.model : `${result.provider}:${result.model}`);

async function timed<T>(call: () => Promise<AIResult<T>>): Promise<{ result: AIResult<T> | null; error: string | null; latencyMs: number }> {
  const started = Date.now();
  try {
    return { result: await call(), error: null, latencyMs: Date.now() - started };
  } catch (error) {
    return { result: null, error: (error as Error).message.slice(0, 200), latencyMs: Date.now() - started };
  }
}

/**
 * Builds one item stage by stage. A failing stage retries only itself: a rejected distractor regenerates that
 * option alone, a rejected explanation regenerates the explanation alone, and nothing ever returns to the skeleton
 * once it is validated. The model never sees or changes the spec; deterministic code places every option.
 */
export async function generateItem(spec: QuestionSpec, ctx: RunContext): Promise<ItemOutcome> {
  const { service, config } = ctx;
  const thresholds = config.thresholds;
  const experiments = config.experiments ?? [];
  const started = Date.now();
  const now = () => new Date().toISOString();
  const prompts = distractorPromptsFor(experiments);
  const gate = config.skeletonGate !== false && !!service.factory.checkSkeleton;
  let trace = newTrace(spec.id);
  let modelCalls = 0;
  const log: CallRecord[] = [];
  const cost: ItemCost = { calls: 0, cachedCalls: 0, freshLatencyMs: 0, inputTokens: 0, outputTokens: 0, byStage: {}, log };
  const spend = (stage: CostStage, call: { result: AIResult<unknown> | null; error: string | null; latencyMs: number }, at: { option?: OptionLabel | null; attempt: number; model: string; promptVersion: string }) => {
    const { result } = call;
    const fresh = result && !result.cached ? result.usage : null;
    log.push({
      stage,
      option: at.option ?? null,
      attempt: at.attempt,
      model: result ? servedModel(result) : at.model,
      promptVersion: result?.promptVersion ?? at.promptVersion,
      requestHash: result?.requestHash ?? null,
      localCache: result?.cached ? "hit" : "miss",
      promptCache: fresh?.cacheReadTokens ? "read" : fresh?.cacheWriteTokens ? "write" : "none",
      latencyMs: result?.cached ? 0 : call.latencyMs,
      inputTokens: fresh?.inputTokens ?? 0,
      outputTokens: fresh?.outputTokens ?? 0,
      cacheWriteTokens: fresh?.cacheWriteTokens ?? 0,
      cacheReadTokens: fresh?.cacheReadTokens ?? 0,
      error: call.error,
    });
    if (!result) return;
    for (const row of [cost, (cost.byStage[stage] ??= { calls: 0, cachedCalls: 0, freshLatencyMs: 0, inputTokens: 0, outputTokens: 0 })]) {
      row.calls += 1;
      if (!fresh) row.cachedCalls += 1;
      else {
        row.freshLatencyMs += call.latencyMs;
        row.inputTokens += fresh.inputTokens;
        row.outputTokens += fresh.outputTokens;
        if (fresh.cacheWriteTokens) row.cacheWriteTokens = (row.cacheWriteTokens ?? 0) + fresh.cacheWriteTokens;
        if (fresh.cacheReadTokens) row.cacheReadTokens = (row.cacheReadTokens ?? 0) + fresh.cacheReadTokens;
      }
    }
  };
  // Set when the run's spend budget refuses a retry; the stage then fails with this reason instead of retrying.
  let halted: string | null = null;
  const regenerate = () => {
    if (!ctx.budget || ctx.budget.allowRegeneration()) return true;
    halted = ctx.budget.stopped ?? `max regenerations (${ctx.budget.limits.maxRegenerations}) reached`;
    return false;
  };
  const exhausted = (otherwise: string) => (halted ? `budget_stopped: ${halted}` : otherwise);
  const attempts: StageAttempt[] = [];
  const done = (record: CandidateRecord | null, error: string | null = null): ItemOutcome => ({ trace: { ...trace, attempts, cost }, record, modelCalls, latencyMs: Date.now() - started, error });
  const fail = (state: GenerationTrace["state"], failure: string) => {
    trace = { ...advance(trace, state, now(), failure), failure };
    return done(null);
  };

  // Stage 1–2: skeleton, validated deterministically and then by the independent skeleton gate; up to three tries,
  // each a fresh skeleton. No distractor is written for a skeleton that fails either check.
  let skeleton: QuestionSkeleton | null = null;
  let feedback: string[] = [];
  for (let n = 1; n <= attemptLimits.skeleton && !skeleton; n++) {
    if (n > 1 && !regenerate()) break;
    const call = await timed(() => service.factory.skeleton(spec, feedback));
    modelCalls += 1;
    spend("skeleton", call, { attempt: n, model: config.models.generator, promptVersion: skeletonPromptVersion });
    const base = { stage: "skeleton" as const, option: null, attempt: n, model: config.models.generator, promptVersion: skeletonPromptVersion, latencyMs: call.latencyMs, judge: null };
    if (!call.result) {
      attempts.push({ ...base, requestHash: null, cached: false, output: null, validator: { status: "reject", codes: [] }, rejectionReason: `model_error: ${call.error}` });
      continue;
    }
    trace = advance(trace, "SKELETON_GENERATED", now());
    const validation = validateSkeleton({ spec, skeleton: call.result.value, originality: ctx.originality, siblingStems: ctx.siblingStems });
    const critical = codes(validation.issues);
    const output = completeStem(call.result.value.stem, call.result.value.correctAnswer).slice(0, 800);
    const validator = { status: validation.status, codes: [...critical, ...codes(validation.issues, "warn")] };
    const attempt = { ...base, requestHash: call.result.requestHash, cached: call.result.cached, output, validator };
    if (validation.status !== "pass") {
      attempts.push({ ...attempt, rejectionReason: critical.join(", ") });
      feedback = critical;
      continue;
    }
    if (!gate) {
      attempts.push({ ...attempt, rejectionReason: null });
      skeleton = call.result.value;
      continue;
    }
    const candidate = call.result.value;
    const checked = await timed(() => service.factory.checkSkeleton!({ spec, skeleton: candidate }));
    modelCalls += 1;
    spend("skeletonGate", checked, { attempt: n, model: config.models.distractorJudge, promptVersion: skeletonCheckPromptVersion });
    if (!checked.result) {
      attempts.push({ ...attempt, latencyMs: call.latencyMs + checked.latencyMs, rejectionReason: `gate_error: ${checked.error}` });
      continue;
    }
    const verdict = skeletonGateDecision(checked.result.value, thresholds.distractorAcceptability);
    attempts.push({
      ...attempt,
      cached: call.result.cached && checked.result.cached,
      latencyMs: call.latencyMs + checked.latencyMs,
      judge: { model: servedModel(checked.result), promptVersion: checked.result.promptVersion, requestHash: checked.result.requestHash, decision: verdict.decision, failures: verdict.failures, concerns: verdict.concerns, reasons: checked.result.value.reasons },
      rejectionReason: verdict.decision === "REGENERATE" ? verdict.failures.join(", ") : null,
    });
    if (verdict.decision === "ACCEPT") skeleton = candidate;
    else feedback = verdict.failures.map((failure, index) => (index === 0 && checked.result!.value.reasons[0] ? `${failure} (${checked.result!.value.reasons[0]})` : failure));
  }
  if (!skeleton) return fail("SKELETON_FAILED", exhausted(`skeleton_rejected_after_${attemptLimits.skeleton}`));
  ctx.siblingStems.push(skeleton.stem);
  trace = { ...advance(advance(trace, "SKELETON_VALIDATED", now()), "DISTRACTORS_GENERATING", now()), skeleton };

  // Under the compatibility experiment the stem's time frame sets the clause form each wrong option must take.
  let frame: MainClauseFrame | undefined;
  if (experiments.includes("compatibility")) {
    frame = mainClauseFrame(skeleton.stem);
    trace = { ...trace, context: { frame } };
  }

  // Stage 3–6: one DistractorSpec per wrong option, each generated, checked and judged on its own.
  const dspecs = buildDistractorSpecs(spec, thresholds, { experiments, frame });
  trace = { ...trace, distractorSpecs: dspecs };
  const accepted: AcceptedDistractor[] = [];
  const checks: DistractorCheckSummary[] = [];
  for (const dspec of dspecs) {
    feedback = [];
    let placed: AcceptedDistractor | null = null;
    let last: { failures: string[]; concerns: string[] } = { failures: [], concerns: [] };
    for (let n = 1; n <= attemptLimits.distractor && !placed; n++) {
      if (n > 1 && !regenerate()) break;
      const usedConnectors = accepted.map((entry) => leadingConnector(entry.text)).filter((value): value is NodeRef => !!value);
      const call = await timed(() => service.factory.distractor({ dspec, skeleton, usedConnectors, feedback }));
      modelCalls += 1;
      spend("distractor", call, { option: dspec.option, attempt: n, model: config.models.distractor, promptVersion: prompts.distractor });
      const base = { stage: "distractor" as const, option: dspec.option, attempt: n, model: config.models.distractor, promptVersion: call.result?.promptVersion ?? prompts.distractor };
      if (!call.result) {
        attempts.push({ ...base, requestHash: null, cached: false, latencyMs: call.latencyMs, output: null, validator: { status: "reject", codes: [] }, judge: null, rejectionReason: `model_error: ${call.error}` });
        continue;
      }
      const text = call.result.value.text.trim();
      const output = text.slice(0, 800);
      const rejected = attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === dspec.option && attempt.judge?.decision === "REGENERATE" && attempt.output).map((attempt) => attempt.output!);
      const validation = validateDistractor({ dspec, skeleton, text, accepted, rejected, originality: ctx.originality, thresholds, experiments });
      const critical = codes(validation.issues);
      const validator = { status: validation.status, codes: [...critical, ...codes(validation.issues, "warn")] };
      if (validation.status === "reject") {
        attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, latencyMs: call.latencyMs, output, validator, judge: null, rejectionReason: critical.join(", ") });
        feedback.push(`"${text}" was rejected: ${critical.join(", ")}`);
        continue;
      }
      const judged = await timed(() => service.factory.judgeDistractor({ dspec, skeleton, text, lexical: validation.lexical }));
      modelCalls += 1;
      spend("distractorJudge", judged, { option: dspec.option, attempt: n, model: config.models.distractorJudge, promptVersion: prompts.judge });
      if (!judged.result) {
        attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, latencyMs: call.latencyMs + judged.latencyMs, output, validator, judge: null, rejectionReason: `judge_error: ${judged.error}` });
        continue;
      }
      const report: ExperimentalJudgeReport = judged.result.value;
      const decision = distractorDecision({ dspec, report, thresholds, experiments });
      last = decision;
      attempts.push({
        ...base,
        requestHash: call.result.requestHash,
        cached: call.result.cached && judged.result.cached,
        latencyMs: call.latencyMs + judged.latencyMs,
        output,
        validator,
        judge: {
          model: servedModel(judged.result),
          promptVersion: judged.result.promptVersion,
          requestHash: judged.result.requestHash,
          decision: decision.decision,
          failures: decision.failures,
          concerns: decision.concerns,
          reasons: report.reasons,
        },
        rejectionReason: decision.decision === "REGENERATE" ? decision.failures.join(", ") : null,
      });
      if (decision.decision === "REGENERATE") feedback.push(`"${text}" was rejected by the reviewer: ${decision.failures.join(", ")}${report.reasons[0] ? ` (${report.reasons[0]})` : ""}`);
      else placed = { option: dspec.option, text, decision: decision.decision, attempts: n };
    }
    if (!placed) {
      trace = { ...trace, distractors: accepted };
      return fail("DISTRACTORS_FAILED", exhausted(`distractor_${dspec.option}_${dspec.role}_rejected_after_${attemptLimits.distractor}`));
    }
    accepted.push(placed);
    checks.push({ option: placed.option, decision: placed.decision, attempts: placed.attempts, failures: last.failures, concerns: last.concerns });
  }
  trace = { ...advance(trace, "DISTRACTORS_VALIDATED", now()), distractors: accepted };

  // Explanation: its own stage; a bad explanation is rewritten, the question is not.
  const core = assembleCore(spec, skeleton, accepted);
  let finished: { candidate: ReturnType<typeof assembleCandidate>; validation: CandidateValidation } | null = null;
  feedback = [];
  for (let n = 1; n <= attemptLimits.explanation && !finished; n++) {
    if (n > 1 && !regenerate()) break;
    const call = await timed(() => service.factory.explain({ spec, core, dspecs, feedback }));
    modelCalls += 1;
    spend("explanation", call, { attempt: n, model: config.models.explanation, promptVersion: explanationPromptVersion });
    const base = { stage: "explanation" as const, option: null, attempt: n, model: config.models.explanation, promptVersion: explanationPromptVersion, latencyMs: call.latencyMs, judge: null };
    if (!call.result) {
      attempts.push({ ...base, requestHash: null, cached: false, output: null, validator: { status: "reject", codes: [] }, rejectionReason: `model_error: ${call.error}` });
      continue;
    }
    const candidate = assembleCandidate(spec, core, call.result.value);
    const validation = validateCandidate({ spec, candidate, originality: ctx.originality, siblings: ctx.siblings, thresholds, experiments });
    const own = validation.issues.filter((issue) => isExplanationIssue(issue.code));
    const blocking = codes(own);
    attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, output: null, validator: { status: blocking.length ? "reject" : "pass", codes: [...blocking, ...codes(own, "warn")] }, rejectionReason: blocking.length ? blocking.join(", ") : null });
    if (blocking.length) feedback = blocking;
    else finished = { candidate, validation };
  }
  if (!finished) return fail("EXPLANATION_FAILED", exhausted(`explanation_rejected_after_${attemptLimits.explanation}`));
  trace = advance(trace, "EXPLAINED", now());
  const { candidate, validation } = finished;
  ctx.siblings.push({ id: spec.id, stem: candidate.question.stem, options: candidate.question.options });

  // Final validator and final judge over the complete item.
  let judge: JudgeDecision | null = null;
  const hashes = { blindSolve: null as string | null, acceptability: null as string | null, judge: null as string | null };
  let judgeModel = config.models.judge;
  let error: string | null = null;
  if (validation.status !== "pass") {
    trace = { ...advance(trace, "ITEM_REJECTED", now(), codes(validation.issues).join(", ")), failure: "final_validator" };
  } else {
    trace = advance(trace, "ITEM_VALIDATED", now());
    try {
      const judgeStarted = Date.now();
      const evaluation = await service.judge.evaluate(candidate, spec, validation, checks);
      modelCalls += 3;
      const judgeLatency = Date.now() - judgeStarted;
      const fresh = [evaluation.blind, evaluation.acceptability, evaluation.report].filter((result) => !result.cached).length;
      for (const result of [evaluation.blind, evaluation.acceptability, evaluation.report])
        spend("finalJudge", { result, error: null, latencyMs: result.cached ? 0 : Math.round(judgeLatency / fresh) }, { attempt: 1, model: config.models.judge, promptVersion: result.promptVersion });
      judge = judgeDecision({
        spec,
        validation,
        thresholds,
        judge: {
          blindAnswer: evaluation.blind.value.answer,
          blindConfidence: evaluation.blind.value.confidence,
          acceptability: evaluation.acceptability.value,
          report: evaluation.report.value,
          distractorReviews: accepted.filter((entry) => entry.decision === "HUMAN_REVIEW").map((entry) => entry.option as OptionLabel),
        },
      });
      hashes.blindSolve = evaluation.blind.requestHash;
      hashes.acceptability = evaluation.acceptability.requestHash;
      hashes.judge = evaluation.report.requestHash;
      judgeModel = servedModel(evaluation.report);
      trace = advance(trace, "JUDGED", now());
      trace = judge.verdict === "REJECT" ? { ...advance(trace, "REJECTED", now(), judge.failures.join(", ")), failure: "final_judge" } : advance(trace, "HUMAN_REVIEW", now());
    } catch (caught) {
      error = (caught as Error).message.slice(0, 200);
      spend("finalJudge", { result: null, error, latencyMs: 0 }, { attempt: 1, model: config.models.judge, promptVersion: judgePromptVersion });
    }
  }

  const provenance = provenanceSchema.parse({
    pipelineVersion: factoryVersions.pipeline,
    provider: [...new Set([config.models.generator, config.models.distractor, config.models.distractorJudge, config.models.judge, config.models.explanation].map((setting) => parseModel(setting, config.provider).provider))].join("+"),
    generatorModel: config.models.generator,
    distractorModel: config.models.distractor,
    distractorJudgeModel: config.models.distractorJudge,
    judgeModel,
    explanationModel: config.models.explanation,
    generatorPromptVersion: skeletonPromptVersion,
    distractorPromptVersion: prompts.distractor,
    distractorJudgePromptVersion: prompts.judge,
    judgePromptVersion,
    blindSolvePromptVersion: solvePromptVersion,
    acceptabilityPromptVersion,
    explanationPromptVersion,
    questionSpecVersion: spec.version,
    distractorSpecVersion: factoryVersions.distractorSpec,
    specId: spec.id,
    knowledgeVersion: spec.knowledgeVersion,
    dnaVersion,
    examProfileVersion: ctx.profileVersion,
    candidateVersion: factoryVersions.candidate,
    validatorVersion: validation.version,
    judgeVersion: factoryVersions.judge,
    distractorJudgeVersion: prompts.judgeVersion,
    ...(gate ? { skeletonGatePromptVersion: skeletonCheckPromptVersion, skeletonGateVersion: factoryVersions.skeletonGate } : {}),
    ...(config.seed && config.seed > 1 ? { seed: config.seed } : {}),
    experiments: [...experiments],
    distractorDiagnosisVersion,
    originalityVersion: factoryVersions.originality,
    generatedAt: now(),
    attempts,
    requestHashes: hashes,
    sourceContextIds: spec.evidenceReferences.documents,
  });
  const record: CandidateRecord = {
    id: spec.id,
    spec,
    versions: [{ version: 1, author: "generator", candidate, validation, createdAt: provenance.generatedAt }],
    judge,
    provenance,
    reviews: [],
    status: initialStatus(validation, judge),
    generation: { ...trace, attempts, cost },
    diagnoses: dspecs.flatMap((dspec) => (dspec.diagnosis ? [{ option: dspec.option, role: dspec.role, diagnosis: dspec.diagnosis }] : [])),
  };
  return { ...done(record, error), record };
}
