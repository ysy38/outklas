import type { OptionLabel } from "@/modules/analysis/contract";
import { distractorDecision, validateDistractor, type DistractorJudgeReport } from "@/modules/factory/distractor";
import { buildDistractorSpecs } from "@/modules/factory/distractor-spec";
import { assembleCandidate, assembleCore, isExplanationIssue } from "@/modules/factory/explanation";
import { advance, newTrace, type AcceptedDistractor, type GenerationTrace, type StageAttempt } from "@/modules/factory/generation";
import { judgeDecision, type JudgeDecision } from "@/modules/factory/judge";
import { provenance as provenanceSchema } from "@/modules/factory/provenance";
import { initialStatus, type CandidateRecord } from "@/modules/factory/review";
import { completeStem, validateSkeleton, type QuestionSkeleton } from "@/modules/factory/skeleton";
import type { QuestionSpec } from "@/modules/factory/spec";
import { attemptLimits } from "@/modules/factory/thresholds";
import { validateCandidate, leadingConnector, type CandidateValidation, type OriginalityIndex, type Sibling, type ValidationIssue } from "@/modules/factory/validator";
import { dnaVersion, factoryVersions } from "@/modules/factory/versions";
import type { NodeRef } from "@/modules/knowledge/graph";
import { parseModel, type AIConfig } from "../ai/config";
import { acceptabilityPromptVersion } from "../ai/prompts/acceptability.v1";
import { distractorJudgePromptVersion } from "../ai/prompts/distractor-judge.v2";
import { distractorPromptVersion } from "../ai/prompts/distractor.v2";
import { explanationPromptVersion } from "../ai/prompts/explanation.v2";
import type { DistractorCheckSummary } from "../ai/prompts/judge.v2";
import { judgePromptVersion } from "../ai/prompts/judge.v2";
import { skeletonPromptVersion } from "../ai/prompts/skeleton.v1";
import { solvePromptVersion } from "../ai/prompts/verifier.v1";
import type { AIResult, AIService } from "../ai/types";

/** Shared across the items of one run so that siblings never repeat each other. */
export type RunContext = { service: AIService; config: AIConfig; originality: OriginalityIndex; siblingStems: string[]; siblings: Sibling[]; profileVersion: string };

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
  const started = Date.now();
  const now = () => new Date().toISOString();
  let trace = newTrace(spec.id);
  let modelCalls = 0;
  const attempts: StageAttempt[] = [];
  const done = (record: CandidateRecord | null, error: string | null = null): ItemOutcome => ({ trace: { ...trace, attempts }, record, modelCalls, latencyMs: Date.now() - started, error });
  const fail = (state: GenerationTrace["state"], failure: string) => {
    trace = { ...advance(trace, state, now(), failure), failure };
    return done(null);
  };

  // Stage 1–2: skeleton, validated deterministically; up to three tries, each a fresh skeleton.
  let skeleton: QuestionSkeleton | null = null;
  let feedback: string[] = [];
  for (let n = 1; n <= attemptLimits.skeleton && !skeleton; n++) {
    const call = await timed(() => service.factory.skeleton(spec, feedback));
    modelCalls += 1;
    const base = { stage: "skeleton" as const, option: null, attempt: n, model: config.models.generator, promptVersion: skeletonPromptVersion, latencyMs: call.latencyMs, judge: null };
    if (!call.result) {
      attempts.push({ ...base, requestHash: null, cached: false, output: null, validator: { status: "reject", codes: [] }, rejectionReason: `model_error: ${call.error}` });
      continue;
    }
    trace = advance(trace, "SKELETON_GENERATED", now());
    const validation = validateSkeleton({ spec, skeleton: call.result.value, originality: ctx.originality, siblingStems: ctx.siblingStems });
    const critical = codes(validation.issues);
    const output = completeStem(call.result.value.stem, call.result.value.correctAnswer).slice(0, 800);
    attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, output, validator: { status: validation.status, codes: [...critical, ...codes(validation.issues, "warn")] }, rejectionReason: critical.length ? critical.join(", ") : null });
    if (validation.status === "pass") skeleton = call.result.value;
    else feedback = critical;
  }
  if (!skeleton) return fail("SKELETON_FAILED", `skeleton_rejected_after_${attemptLimits.skeleton}`);
  ctx.siblingStems.push(skeleton.stem);
  trace = { ...advance(advance(trace, "SKELETON_VALIDATED", now()), "DISTRACTORS_GENERATING", now()), skeleton };

  // Stage 3–6: one DistractorSpec per wrong option, each generated, checked and judged on its own.
  const dspecs = buildDistractorSpecs(spec, thresholds);
  trace = { ...trace, distractorSpecs: dspecs };
  const accepted: AcceptedDistractor[] = [];
  const checks: DistractorCheckSummary[] = [];
  for (const dspec of dspecs) {
    feedback = [];
    let placed: AcceptedDistractor | null = null;
    let last: { failures: string[]; concerns: string[] } = { failures: [], concerns: [] };
    for (let n = 1; n <= attemptLimits.distractor && !placed; n++) {
      const usedConnectors = accepted.map((entry) => leadingConnector(entry.text)).filter((value): value is NodeRef => !!value);
      const call = await timed(() => service.factory.distractor({ dspec, skeleton, usedConnectors, feedback }));
      modelCalls += 1;
      const base = { stage: "distractor" as const, option: dspec.option, attempt: n, model: config.models.distractor, promptVersion: distractorPromptVersion };
      if (!call.result) {
        attempts.push({ ...base, requestHash: null, cached: false, latencyMs: call.latencyMs, output: null, validator: { status: "reject", codes: [] }, judge: null, rejectionReason: `model_error: ${call.error}` });
        continue;
      }
      const text = call.result.value.text.trim();
      const output = text.slice(0, 800);
      const rejected = attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === dspec.option && attempt.judge?.decision === "REGENERATE" && attempt.output).map((attempt) => attempt.output!);
      const validation = validateDistractor({ dspec, skeleton, text, accepted, rejected, originality: ctx.originality, thresholds });
      const critical = codes(validation.issues);
      const validator = { status: validation.status, codes: [...critical, ...codes(validation.issues, "warn")] };
      if (validation.status === "reject") {
        attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, latencyMs: call.latencyMs, output, validator, judge: null, rejectionReason: critical.join(", ") });
        feedback.push(`"${text}" was rejected: ${critical.join(", ")}`);
        continue;
      }
      const judged = await timed(() => service.factory.judgeDistractor({ dspec, skeleton, text }));
      modelCalls += 1;
      if (!judged.result) {
        attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, latencyMs: call.latencyMs + judged.latencyMs, output, validator, judge: null, rejectionReason: `judge_error: ${judged.error}` });
        continue;
      }
      const report: DistractorJudgeReport = judged.result.value;
      const decision = distractorDecision({ dspec, report, thresholds });
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
          promptVersion: distractorJudgePromptVersion,
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
      return fail("DISTRACTORS_FAILED", `distractor_${dspec.option}_${dspec.role}_rejected_after_${attemptLimits.distractor}`);
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
    const call = await timed(() => service.factory.explain({ spec, core, dspecs, feedback }));
    modelCalls += 1;
    const base = { stage: "explanation" as const, option: null, attempt: n, model: config.models.explanation, promptVersion: explanationPromptVersion, latencyMs: call.latencyMs, judge: null };
    if (!call.result) {
      attempts.push({ ...base, requestHash: null, cached: false, output: null, validator: { status: "reject", codes: [] }, rejectionReason: `model_error: ${call.error}` });
      continue;
    }
    const candidate = assembleCandidate(spec, core, call.result.value);
    const validation = validateCandidate({ spec, candidate, originality: ctx.originality, siblings: ctx.siblings, thresholds });
    const own = validation.issues.filter((issue) => isExplanationIssue(issue.code));
    const blocking = codes(own);
    attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, output: null, validator: { status: blocking.length ? "reject" : "pass", codes: [...blocking, ...codes(own, "warn")] }, rejectionReason: blocking.length ? blocking.join(", ") : null });
    if (blocking.length) feedback = blocking;
    else finished = { candidate, validation };
  }
  if (!finished) return fail("EXPLANATION_FAILED", `explanation_rejected_after_${attemptLimits.explanation}`);
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
      const evaluation = await service.judge.evaluate(candidate, spec, validation, checks);
      modelCalls += 3;
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
    distractorPromptVersion,
    distractorJudgePromptVersion,
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
    distractorJudgeVersion: factoryVersions.distractorJudge,
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
    generation: { ...trace, attempts },
  };
  return { ...done(record, error), record };
}
