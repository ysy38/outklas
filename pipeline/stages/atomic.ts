import type { OptionLabel } from "@/modules/analysis/contract";
import { distractorDiagnosisVersion } from "@/modules/factory/diagnosis";
import { mainClauseFrame, type MainClauseFrame } from "@/modules/factory/context";
import { distractorDecision, validateDistractor, type ExperimentalJudgeReport } from "@/modules/factory/distractor";
import { buildDistractorSpecs } from "@/modules/factory/distractor-spec";
import { assembleCandidate, assembleCore, isExplanationIssue } from "@/modules/factory/explanation";
import { advance, newTrace, type AcceptedDistractor, type CallRecord, type CostStage, type DistractorAudit, type GenerationTrace, type ItemCost, type StageAttempt } from "@/modules/factory/generation";
import { judgeDecision, planReviewConcerns, type JudgeDecision, type JudgeInput } from "@/modules/factory/judge";
import { provenance as provenanceSchema } from "@/modules/factory/provenance";
import { engineAdmission, initialStatus, type CandidateRecord } from "@/modules/factory/review";
import { experimentGeneration, type ExperimentSet } from "@/modules/factory/experiments";
import { sameScenario, sameScenarioPlan, type ScenarioRoles } from "@/modules/factory/scenario";
import { assignedStrategy, claimTargetLemma, clauseRepair, completeStem, distractorPlanIssues, gateFailureNote, isPlannerDecline, planFailureNote, repairSkeletonSurface, skeletonGateDecision, validateSkeleton, type DistractorBlueprint, type QuestionSkeleton, type SkeletonCheckReport } from "@/modules/factory/skeleton";
import { buildSentenceLesson } from "@/modules/content/xray";
import type { QuestionSpec } from "@/modules/factory/spec";
import { attemptLimits } from "@/modules/factory/thresholds";
import { validateCandidate, leadingConnector, type CandidateValidation, type OriginalityIndex, type Sibling, type ValidationIssue } from "@/modules/factory/validator";
import { dnaVersion, factoryVersions } from "@/modules/factory/versions";
import type { NodeRef } from "@/modules/knowledge/graph";
import { parseModel, type AIConfig, type DistractorJudgeStyle } from "../ai/config";
import { acceptabilityPromptVersion } from "../ai/prompts/acceptability.v1";
import { distractorJudgePromptVersion } from "../ai/prompts/distractor-judge.v3";
import { distractorVerdictPromptVersion } from "../ai/prompts/distractor-judge.v7";
import { distractorJudgeExperimentalPromptVersion } from "../ai/prompts/distractor-judge.v4";
import { distractorPromptVersion } from "../ai/prompts/distractor.v4";
import { distractorExperimentalPromptVersion } from "../ai/prompts/distractor.v5";
import { distractorRevisionPromptVersion } from "../ai/prompts/distractor.v6";
import { distractorJudgeRevisionPromptVersion } from "../ai/prompts/distractor-judge.v6";
import { skeletonCheckPromptVersion } from "../ai/prompts/skeleton-check.v2";
import { explanationPromptVersion } from "../ai/prompts/explanation.v2";
import type { DistractorCheckSummary } from "../ai/prompts/judge.v2";
import { judgePromptVersion } from "../ai/prompts/judge.v2";
import { distractorPlanPromptVersion, skeletonPromptVersion } from "../ai/prompts/skeleton.v2";
import { solvePromptVersion } from "../ai/prompts/verifier.v1";
import type { SpendBudget } from "../ai/budget";
import { AIOutputError } from "../ai/service";
import type { AIResult, AIService, Usage } from "../ai/types";

/** Distractor writer and judge prompts in force for an experiment set. Verdict stays blind even when an experiment is on. */
export function distractorPromptsFor(experiments: ExperimentSet, style: DistractorJudgeStyle = "rubric") {
  const blind = style === "verdict";
  return {
    baseline: { distractor: distractorPromptVersion, judge: blind ? distractorVerdictPromptVersion : distractorJudgePromptVersion, judgeVersion: factoryVersions.distractorJudge },
    first: { distractor: distractorExperimentalPromptVersion, judge: blind ? distractorVerdictPromptVersion : distractorJudgeExperimentalPromptVersion, judgeVersion: blind ? factoryVersions.distractorJudge : factoryVersions.distractorJudgeExperimental },
    second: { distractor: distractorRevisionPromptVersion, judge: blind ? distractorVerdictPromptVersion : distractorJudgeRevisionPromptVersion, judgeVersion: blind ? factoryVersions.distractorJudge : factoryVersions.distractorJudgeRevision },
  }[experimentGeneration(experiments)];
}

/** The rubric and the experiment judges built on it show the intended correct option. The verdict prompt does not. */
export function distractorJudgeKeyExposure(style: DistractorJudgeStyle): "shown" | "hidden" {
  return style === "verdict" ? "hidden" : "shown";
}

/** Shared across the items of one run so that siblings never repeat each other or the same target lemma. */
export type RunContext = {
  service: AIService;
  config: AIConfig;
  originality: OriginalityIndex;
  siblingStems: string[];
  siblings: Sibling[];
  usedTargets?: string[];
  /** Published sentences plus sentences of approved candidates from earlier runs. Tests leave it empty. */
  bankScenarios?: string[];
  /** Event plans of those approved candidates. A plan is not a sentence. */
  bankPlans?: ScenarioRoles[];
  /** Plots already accepted in this slice. */
  batchScenarios?: string[];
  /** Plans already accepted in this slice. */
  batchPlans?: ScenarioRoles[];
  profileVersion: string;
  budget?: SpendBudget;
};

export type ItemOutcome = { trace: GenerationTrace; record: CandidateRecord | null; modelCalls: number; latencyMs: number; error: string | null };

const codes = (issues: ValidationIssue[], severity: "critical" | "warn" = "critical") =>
  issues.filter((issue) => issue.severity === severity).map((issue) => `${issue.code}${issue.option ? `@${issue.option}` : ""}${issue.detail ? `(${issue.detail})` : ""}`);

/** Planned failure of one wrong option, kept on the trace for audit. Learners never see it. */
const distractorAudit = (dspec: { distractorType: string; targetMisconception: string | null; semanticConstraint: { failureMode: string } }, value: { rationale: string; whyPlausible?: string }, blueprint?: DistractorBlueprint): DistractorAudit => ({
  distractor_type: dspec.distractorType,
  intended_misconception: blueprint?.intendedMisconception.trim() || dspec.targetMisconception,
  why_it_looks_plausible: blueprint?.whyPlausible.trim() || value.whyPlausible?.trim() || dspec.semanticConstraint.failureMode,
  decisive_failure_reason: blueprint?.decisiveFailureReason.trim() || value.rationale,
});

/** The three final calls stay as they are. Plan concerns and the blind solver's extra fields ride on the existing result. */
const finalJudgeInput = (
  evaluation: { blind: { value: { answer: OptionLabel; confidence: number; stemEvidence?: string; uncertain?: boolean; equallyDefensible?: OptionLabel | null } }; acceptability: { value: JudgeInput["acceptability"] }; report: { value: JudgeInput["report"] } },
  reviews: OptionLabel[],
  attempts: { stage: string; judge: { concerns: string[] } | null }[],
): JudgeInput => ({
  blindAnswer: evaluation.blind.value.answer,
  blindConfidence: evaluation.blind.value.confidence,
  blindEvidence: evaluation.blind.value.stemEvidence ?? "",
  blindUncertain: evaluation.blind.value.uncertain === true,
  blindAlternative: evaluation.blind.value.equallyDefensible ?? null,
  acceptability: evaluation.acceptability.value,
  report: evaluation.report.value,
  distractorReviews: reviews,
  planConcerns: planReviewConcerns(attempts),
});

/** Letters of a second-answer failure. Other failures, including a broken key, are not repairable. */
const repairLetters = (failure: string, correct: string): string[] => {
  if (failure.startsWith("second_defensible_")) return [...failure.slice("second_defensible_".length)];
  if (failure.startsWith("acceptable_distractor_")) return [...failure.slice("acceptable_distractor_".length)];
  const blind = /^blind_answer_([A-E])$/.exec(failure);
  return blind && blind[1] !== correct ? [blind[1]] : [];
};

/** The model that actually answered (aliases resolved), with its provider prefix unless it is Gemini. */
const servedModel = (result: AIResult<unknown>) => (result.provider === "gemini" ? result.model : `${result.provider}:${result.model}`);

async function timed<T>(call: () => Promise<AIResult<T>>): Promise<{ result: AIResult<T> | null; error: string | null; latencyMs: number; usage?: Usage; finishReason?: string; servedProvider?: string; requestHash?: string; cached?: boolean }> {
  const started = Date.now();
  try {
    return { result: await call(), error: null, latencyMs: Date.now() - started };
  } catch (error) {
    const failed = error instanceof AIOutputError ? error : null;
    return {
      result: null,
      error: (error as Error).message.slice(0, 200),
      latencyMs: Date.now() - started,
      ...(failed?.usage ? { usage: failed.usage } : {}),
      ...(failed?.finishReason ? { finishReason: failed.finishReason } : {}),
      ...(failed?.servedProvider ? { servedProvider: failed.servedProvider } : {}),
      ...(failed?.requestHash ? { requestHash: failed.requestHash } : {}),
      ...(failed ? { cached: failed.cached } : {}),
    };
  }
}

/**
 * Builds one item stage by stage. A failing stage retries only itself: a rejected distractor regenerates that
 * option alone, a rejected explanation regenerates the explanation alone, and nothing ever returns to the skeleton
 * once it is validated. If the final judge's only failure is a second answer, those options are rewritten once
 * and the item is judged again. A repeated target lemma regenerates the skeleton before any distractor is written.
 * The model never sees or changes the spec; deterministic code places every option.
 */
export async function generateItem(spec: QuestionSpec, ctx: RunContext): Promise<ItemOutcome> {
  const { service, config } = ctx;
  const usedTargets = (ctx.usedTargets ??= []);
  const thresholds = config.thresholds;
  const experiments = config.experiments ?? [];
  const started = Date.now();
  const now = () => new Date().toISOString();
  const prompts = distractorPromptsFor(experiments, config.distractorJudgeStyle);
  const gate = config.skeletonGate !== false && !!service.factory.checkSkeleton;
  // answer_first splits only the relational item: the stem and the key are accepted before the four beliefs. Other bands stay one skeleton call.
  const answerFirst = (config.productionSequence ?? "plan_first") === "answer_first" && assignedStrategy(spec) === "relational_inference";
  let trace = newTrace(spec.id);
  let modelCalls = 0;
  const log: CallRecord[] = [];
  const cost: ItemCost = { calls: 0, cachedCalls: 0, freshLatencyMs: 0, inputTokens: 0, outputTokens: 0, byStage: {}, log };
  const spend = (stage: CostStage, call: { result: AIResult<unknown> | null; error: string | null; latencyMs: number; usage?: Usage; finishReason?: string; servedProvider?: string; requestHash?: string; cached?: boolean }, at: { option?: OptionLabel | null; attempt: number; model: string; promptVersion: string }) => {
    const { result } = call;
    const cached = result?.cached || call.cached === true;
    const fresh = cached ? null : result ? result.usage : call.usage ?? null;
    const finishReason = result?.finishReason ?? call.finishReason;
    const servedProvider = result?.servedProvider ?? call.servedProvider;
    log.push({
      stage,
      option: at.option ?? null,
      attempt: at.attempt,
      model: result ? servedModel(result) : at.model,
      promptVersion: result?.promptVersion ?? at.promptVersion,
      requestHash: result?.requestHash ?? call.requestHash ?? null,
      localCache: cached ? "hit" : "miss",
      promptCache: fresh?.cacheReadTokens ? "read" : fresh?.cacheWriteTokens ? "write" : "none",
      latencyMs: cached ? 0 : call.latencyMs,
      inputTokens: fresh?.inputTokens ?? 0,
      outputTokens: fresh?.outputTokens ?? 0,
      cacheWriteTokens: fresh?.cacheWriteTokens ?? 0,
      cacheReadTokens: fresh?.cacheReadTokens ?? 0,
      error: call.error,
      ...(fresh?.reasoningTokens != null ? { reasoningTokens: fresh.reasoningTokens } : {}),
      ...(finishReason ? { finishReason } : {}),
      ...(servedProvider ? { servedProvider } : {}),
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
        if (fresh.reasoningTokens != null) row.reasoningTokens = (row.reasoningTokens ?? 0) + fresh.reasoningTokens;
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
  let acceptedGate: SkeletonCheckReport | null = null;
  let feedback: string[] = [];
  let lockedStem: string | null = null;
  for (let n = 1; n <= attemptLimits.skeleton && !skeleton; n++) {
    if (n > 1 && !regenerate()) break;
    const call = await timed(() => service.factory.skeleton(spec, feedback, usedTargets));
    modelCalls += 1;
    spend("skeleton", call, { attempt: n, model: config.models.generator, promptVersion: skeletonPromptVersion });
    const base = { stage: "skeleton" as const, option: null, attempt: n, model: config.models.generator, promptVersion: skeletonPromptVersion, latencyMs: call.latencyMs, judge: null };
    if (!call.result) {
      attempts.push({ ...base, requestHash: call.requestHash ?? null, cached: call.cached === true, output: null, validator: { status: "reject", codes: [] }, rejectionReason: `model_error: ${call.error}` });
      continue;
    }
    if (isPlannerDecline(call.result.value)) {
      const declined = call.result.value;
      const reason = `planner_decline: ${declined.declineReason}`;
      const shown = JSON.stringify({
        stem: declined.stem,
        correctBlueprint: declined.correctBlueprint,
        distractorBlueprints: declined.distractorBlueprints,
        missingDistractors: declined.missingDistractors,
      });
      attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, output: shown, validator: { status: "reject", codes: ["planner_decline"] }, rejectionReason: reason });
      return fail("SKELETON_FAILED", reason);
    }
    trace = advance(trace, "SKELETON_GENERATED", now());
    const repaired = repairSkeletonSurface(spec, lockedStem ? { ...call.result.value, stem: lockedStem } : call.result.value);
    const drafted = answerFirst ? { ...repaired, distractorBlueprints: undefined, facts: undefined } : repaired;
    const validation = validateSkeleton({ spec, skeleton: drafted, originality: ctx.originality, siblingStems: ctx.siblingStems, planCheck: answerFirst ? "later" : "now" });
    const critical = codes(validation.issues);
    const output = completeStem(drafted.stem, drafted.correctAnswer).slice(0, 800);
    const validator = { status: validation.status, codes: [...critical, ...codes(validation.issues, "warn")] };
    const attempt = { ...base, requestHash: call.result.requestHash, cached: call.result.cached, output, validator };
    if (validation.status !== "pass") {
      attempts.push({ ...attempt, rejectionReason: critical.join(", ") });
      feedback = critical.map((entry) => {
        const note = planFailureNote(entry.split("(")[0].split("@")[0]);
        return note === entry.split("(")[0].split("@")[0] ? entry : note;
      });
      lockedStem = null;
      continue;
    }
    if (!gate) {
      attempts.push({ ...attempt, rejectionReason: null });
      skeleton = drafted;
      continue;
    }
    const candidate = drafted;
    const checked = await timed(() => service.factory.checkSkeleton!({ spec, skeleton: candidate }));
    modelCalls += 1;
    spend("skeletonGate", checked, { attempt: n, model: config.models.distractorJudge, promptVersion: skeletonCheckPromptVersion });
    if (!checked.result) {
      attempts.push({ ...attempt, latencyMs: call.latencyMs + checked.latencyMs, rejectionReason: `gate_error: ${checked.error}` });
      lockedStem = null;
      feedback = ["Technical scoring error, not a content reject. Write a different skeleton. On lexical_pivot, a plain verb such as affect in place of the academic word makes the concession clearly weaker. The sentence does not have to become impossible."];
      continue;
    }
    const verdict = skeletonGateDecision(checked.result.value, thresholds.distractorAcceptability, {
      band: spec.difficulty.band,
      sentence: candidate.correctAnswer,
      strategy: assignedStrategy(spec),
      plansShown: answerFirst ? 0 : (candidate.distractorBlueprints?.length ?? 0),
    });
    attempts.push({
      ...attempt,
      cached: call.result.cached && checked.result.cached,
      latencyMs: call.latencyMs + checked.latencyMs,
      judge: { model: servedModel(checked.result), promptVersion: checked.result.promptVersion, requestHash: checked.result.requestHash, decision: verdict.decision, failures: verdict.failures, concerns: verdict.concerns, reasons: checked.result.value.reasons },
      rejectionReason: verdict.decision === "REGENERATE" ? verdict.failures.join(", ") : null,
    });
    const note = (failure: string, index: number) => {
      const word = checked.result!.value.preciseTerm?.trim().split(/\s+/)[0];
      const text = failure === "hard_no_term" && word ? `${gateFailureNote(failure)} The word "${word}" does not count.` : gateFailureNote(failure);
      return index === 0 && checked.result!.value.reasons[0] ? `${text} (${checked.result!.value.reasons[0]})` : text;
    };
    if (verdict.decision === "ACCEPT") {
      const term = (checked.result.value.preciseTerm ?? "").trim().split(/\s+/)[0] ?? "";
      const scene = completeStem(candidate.stem, candidate.correctAnswer);
      const prior = [...(ctx.bankScenarios ?? []), ...(ctx.batchScenarios ?? [])];
      const repeatedScenario = prior.find((other) => sameScenario(scene, other));
      const plans = [...(ctx.bankPlans ?? []), ...(ctx.batchPlans ?? [])];
      const repeatedPlan = candidate.scenario ? plans.find((plan) => sameScenarioPlan(candidate.scenario!, plan)) : undefined;
      if (!claimTargetLemma(usedTargets, term)) {
        const last = attempts[attempts.length - 1];
        last.rejectionReason = "repeated_target_lemma";
        if (last.judge) {
          last.judge.decision = "REGENERATE";
          last.judge.failures = [...last.judge.failures, "repeated_target_lemma"];
        }
        lockedStem = null;
        feedback = [`The target word "${term}" repeats a lemma already used in this batch (${usedTargets.join(", ")}). Write a new skeleton whose concession is carried by a different academic verb, adjective, or abstract noun. Do not switch to a corner noun, an archaic word, or a weak synonym just to be different.`];
      } else if (repeatedScenario || repeatedPlan) {
        const last = attempts[attempts.length - 1];
        last.rejectionReason = "scenario_duplicate";
        if (last.judge) {
          last.judge.decision = "REGENERATE";
          last.judge.failures = [...last.judge.failures, "scenario_duplicate"];
        }
        lockedStem = null;
        const sample = repeatedScenario ?? `${repeatedPlan!.actor}; ${repeatedPlan!.obstacle}; ${repeatedPlan!.outcome}`;
        feedback = [`This event repeats an existing concession item: ${sample.slice(0, 160)}. Write a different actor, obstacle, and outcome. The same broad topic is allowed.`];
      } else {
        (ctx.batchScenarios ??= []).push(scene);
        if (candidate.scenario) (ctx.batchPlans ??= []).push({ actor: candidate.scenario.actor, obstacle: candidate.scenario.obstacle, outcome: candidate.scenario.outcome });
        skeleton = candidate;
        acceptedGate = checked.result.value;
      }
    } else if (clauseRepair(verdict.failures)) {
      lockedStem = candidate.stem;
      feedback = [`Keep this stem exactly and rewrite only the correct option: ${candidate.stem}`, `The rejected option was: ${candidate.correctAnswer}`, ...verdict.failures.map(note)];
    } else {
      lockedStem = null;
      feedback = [`The rejected option was: ${candidate.correctAnswer}`, ...verdict.failures.map(note)];
    }
  }
  if (!skeleton) return fail("SKELETON_FAILED", exhausted(`skeleton_rejected_after_${attemptLimits.skeleton}`));
  if (answerFirst) {
    if (!service.factory.planDistractors) return fail("SKELETON_FAILED", "model_error: plan_writer_missing");
    let plans: DistractorBlueprint[] | null = null;
    let planFeedback: string[] = [];
    for (let n = 1; n <= attemptLimits.skeleton && !plans; n++) {
      if (n > 1 && !regenerate()) break;
      const call = await timed(() => service.factory.planDistractors!({ spec, skeleton: skeleton!, feedback: planFeedback }));
      modelCalls += 1;
      spend("distractorPlan", call, { attempt: n, model: config.models.generator, promptVersion: distractorPlanPromptVersion });
      const base = { stage: "distractorPlan" as const, option: null, attempt: n, model: config.models.generator, promptVersion: distractorPlanPromptVersion, latencyMs: call.latencyMs, judge: null };
      if (!call.result) {
        attempts.push({ ...base, requestHash: call.requestHash ?? null, cached: call.cached === true, output: null, validator: { status: "reject", codes: [] }, rejectionReason: `model_error: ${call.error}` });
        continue;
      }
      const blueprints = call.result.value.distractorBlueprints;
      const issues = distractorPlanIssues(spec, { ...skeleton, distractorBlueprints: blueprints });
      const critical = codes(issues);
      const output = blueprints.map((entry) => entry.proposition).join(" | ").slice(0, 800);
      if (critical.length) {
        attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, output, validator: { status: "reject", codes: critical }, rejectionReason: critical.join(", ") });
        planFeedback = critical.map((entry) => {
          const code = entry.split("(")[0].split("@")[0];
          const note = planFailureNote(code);
          return note === code ? entry : note;
        });
        continue;
      }
      if (!gate) {
        attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, output, validator: { status: "pass", codes: [] }, rejectionReason: null });
        plans = blueprints;
        continue;
      }
      const reviewed = await timed(() => service.factory.checkSkeleton!({ spec, skeleton: { ...skeleton!, distractorBlueprints: blueprints } }));
      modelCalls += 1;
      spend("planReview", reviewed, { attempt: n, model: config.models.distractorJudge, promptVersion: skeletonCheckPromptVersion });
      if (!reviewed.result) {
        attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, latencyMs: call.latencyMs + reviewed.latencyMs, output, validator: { status: "reject", codes: [] }, rejectionReason: `plan_review_error: ${reviewed.error}` });
        planFeedback = ["The plan review did not return. Keep this stem and this correct continuation, and plan four beliefs again."];
        continue;
      }
      const planVerdict = skeletonGateDecision(reviewed.result.value, thresholds.distractorAcceptability, {
        band: spec.difficulty.band,
        sentence: skeleton!.correctAnswer,
        strategy: assignedStrategy(spec),
        plansShown: blueprints.length,
        focus: "plans",
      });
      attempts.push({
        ...base,
        requestHash: call.result.requestHash,
        cached: call.result.cached && reviewed.result.cached,
        latencyMs: call.latencyMs + reviewed.latencyMs,
        output,
        validator: { status: planVerdict.decision === "REGENERATE" ? "reject" : "pass", codes: planVerdict.decision === "REGENERATE" ? planVerdict.failures : [] },
        judge: {
          model: servedModel(reviewed.result),
          promptVersion: reviewed.result.promptVersion,
          requestHash: reviewed.result.requestHash,
          decision: planVerdict.decision,
          failures: planVerdict.failures,
          concerns: planVerdict.concerns,
          reasons: reviewed.result.value.reasons,
        },
        rejectionReason: planVerdict.decision === "REGENERATE" ? planVerdict.failures.join(", ") : null,
      });
      if (planVerdict.decision === "REGENERATE") {
        planFeedback = planVerdict.failures.map((failure) => gateFailureNote(failure));
        continue;
      }
      plans = blueprints;
    }
    if (!plans) return fail("SKELETON_FAILED", exhausted(`distractor_plan_rejected_after_${attemptLimits.skeleton}`));
    skeleton = { ...skeleton, distractorBlueprints: plans };
  }
  ctx.siblingStems.push(skeleton.stem);
  trace = { ...advance(advance(trace, "SKELETON_VALIDATED", now()), "DISTRACTORS_GENERATING", now()), skeleton };

  // Under the compatibility experiment the stem's time frame sets the clause form each wrong option must take.
  let frame: MainClauseFrame | undefined;
  if (experiments.includes("compatibility")) {
    frame = mainClauseFrame(skeleton.stem);
    trace = { ...trace, context: { frame } };
  }

  // Stage 3–6: one DistractorSpec per wrong option, each generated, checked and judged on its own.
  const dspecs = buildDistractorSpecs(spec, thresholds, { experiments, frame, blueprints: skeleton.distractorBlueprints });
  trace = { ...trace, distractorSpecs: dspecs };
  const accepted: AcceptedDistractor[] = [];
  const checks: DistractorCheckSummary[] = [];
  for (const dspec of dspecs) {
    feedback = [];
    let placed: AcceptedDistractor | null = null;
    let last: { failures: string[]; concerns: string[] } = { failures: [], concerns: [] };
    let planFaults = 0;
    const blueprint = skeleton.distractorBlueprints?.find((entry) => entry.option === dspec.option);
    for (let n = 1; n <= attemptLimits.distractor && !placed; n++) {
      if (n > 1 && !regenerate()) break;
      const usedConnectors = accepted.map((entry) => leadingConnector(entry.text)).filter((value): value is NodeRef => !!value);
      const call = await timed(() => service.factory.distractor({ dspec, skeleton, usedConnectors, feedback, strategy: assignedStrategy(spec), blueprints: skeleton.distractorBlueprints }));
      modelCalls += 1;
      spend("distractor", call, { option: dspec.option, attempt: n, model: config.models.distractor, promptVersion: prompts.distractor });
      const base = { stage: "distractor" as const, option: dspec.option, attempt: n, model: config.models.distractor, promptVersion: call.result?.promptVersion ?? prompts.distractor };
      if (!call.result) {
        attempts.push({ ...base, requestHash: call.requestHash ?? null, cached: call.cached === true, latencyMs: call.latencyMs, output: null, validator: { status: "reject", codes: [] }, judge: null, rejectionReason: `model_error: ${call.error}` });
        continue;
      }
      const text = call.result.value.text.trim();
      const output = text.slice(0, 800);
      const rejected = attempts.filter((attempt) => attempt.stage === "distractor" && attempt.option === dspec.option && attempt.judge?.decision === "REGENERATE" && attempt.output).map((attempt) => attempt.output!);
      const validation = validateDistractor({ dspec, skeleton, text, accepted, rejected, originality: ctx.originality, thresholds, experiments, strategy: assignedStrategy(spec) });
      const critical = codes(validation.issues);
      const validator = { status: validation.status, codes: [...critical, ...codes(validation.issues, "warn")] };
      if (validation.status === "reject") {
        attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, latencyMs: call.latencyMs, output, validator, judge: null, rejectionReason: critical.join(", ") });
        const planFault = critical.some((entry) => entry.startsWith("plan_mismatch") || entry.startsWith("plan_polarity_shift") || entry.startsWith("plan_repeats_sibling"));
        if (planFault) planFaults += 1;
        feedback.push(`"${text}" was rejected: ${critical.join(", ")}`);
        if (planFault) feedback.push(planFailureNote(critical.find((entry) => entry.startsWith("plan_"))?.split("(")[0].split("@")[0] ?? "plan_mismatch"));
        if (planFaults >= 2) break;
        continue;
      }
      const judged = await timed(() => service.factory.judgeDistractor({ dspec, skeleton, text, lexical: validation.lexical, strategy: assignedStrategy(spec) }));
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
      if (decision.decision === "REGENERATE") feedback.push(`"${text}" was rejected by the reviewer: ${decision.failures.join(", ")}${report.reasons[0] ? ` (${report.reasons[0]})` : ""}${decision.failures.includes("plan_fidelity") ? " The clause changed the planned proposition." : ""}`);
      else placed = { option: dspec.option, text, decision: decision.decision, attempts: n, audit: distractorAudit(dspec, call.result.value, blueprint) };
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
      attempts.push({ ...base, requestHash: call.requestHash ?? null, cached: call.cached === true, output: null, validator: { status: "reject", codes: [] }, rejectionReason: `model_error: ${call.error}` });
      continue;
    }
    const candidate = assembleCandidate(spec, core, call.result.value, acceptedGate);
    const validation = validateCandidate({ spec, candidate, originality: ctx.originality, siblings: ctx.siblings, thresholds, experiments, blueprints: skeleton.distractorBlueprints });
    const own = validation.issues.filter((issue) => isExplanationIssue(issue.code));
    const blocking = codes(own);
    attempts.push({ ...base, requestHash: call.result.requestHash, cached: call.result.cached, output: null, validator: { status: blocking.length ? "reject" : "pass", codes: [...blocking, ...codes(own, "warn")] }, rejectionReason: blocking.length ? blocking.join(", ") : null });
    if (blocking.length) feedback = blocking;
    else finished = { candidate, validation };
  }
  if (!finished) return fail("EXPLANATION_FAILED", exhausted(`explanation_rejected_after_${attemptLimits.explanation}`));
  trace = advance(trace, "EXPLAINED", now());
  let { candidate, validation } = finished;
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
        judge: finalJudgeInput(evaluation, accepted.filter((entry) => entry.decision === "HUMAN_REVIEW").map((entry) => entry.option as OptionLabel), attempts),
      });
      hashes.blindSolve = evaluation.blind.requestHash;
      hashes.acceptability = evaluation.acceptability.requestHash;
      hashes.judge = evaluation.report.requestHash;
      judgeModel = servedModel(evaluation.report);
      candidate = { ...candidate, metadata: { ...candidate.metadata, judgeEstimatedBand: evaluation.report.value.estimatedDifficulty } };
      const correct = spec.answerConstraints.correctOption;
      const secondLetters = [...new Set(judge.failures.flatMap((failure) => repairLetters(failure, correct)))];
      const repairable = judge.failures.length > 0 && judge.failures.every((failure) => repairLetters(failure, correct).length > 0) && secondLetters.length > 0 && regenerate();
      if (repairable && skeleton) {
        const reason = evaluation.report.value.reasons[0] ?? "a careful reader could defend it";
        let replaced = false;
        for (const letter of secondLetters) {
          const dspec = dspecs.find((entry) => entry.option === letter);
          const index = accepted.findIndex((entry) => entry.option === letter);
          if (!dspec || index < 0) continue;
          const previous = accepted[index].text;
          const others = accepted.filter((entry) => entry.option !== letter);
          const usedConnectors = others.map((entry) => leadingConnector(entry.text)).filter((value): value is NodeRef => !!value);
          const note = `"${previous}" can be defended as another answer (${reason}). Rewrite only this option. Do not restate the correct option as a concession or as a weaker version of the same obstacle. Topic similarity is not correctness. Its content must not explain, enable, time, or leave standing the outcome. A reader who ignores the connector must still find the sentence indefensible.`;
          const call = await timed(() => service.factory.distractor({ dspec, skeleton, usedConnectors, feedback: [note], strategy: assignedStrategy(spec), blueprints: skeleton.distractorBlueprints }));
          modelCalls += 1;
          spend("distractor", call, { option: dspec.option, attempt: accepted[index].attempts + 1, model: config.models.distractor, promptVersion: prompts.distractor });
          const repairAttempt = accepted[index].attempts + 1;
          const repairBase = { stage: "distractor" as const, option: dspec.option, attempt: repairAttempt, model: config.models.distractor, promptVersion: prompts.distractor };
          if (!call.result) {
            attempts.push({ ...repairBase, requestHash: call.requestHash ?? null, cached: call.cached === true, latencyMs: call.latencyMs, output: null, validator: { status: "reject", codes: [] }, judge: null, rejectionReason: `repair_model_error: ${call.error}` });
            continue;
          }
          const text = call.result.value.text.trim();
          const validationOfOption = validateDistractor({ dspec, skeleton, text, accepted: others, rejected: [previous], originality: ctx.originality, thresholds, experiments, strategy: assignedStrategy(spec) });
          if (validationOfOption.status === "reject") {
            attempts.push({ ...repairBase, requestHash: call.result.requestHash, cached: call.result.cached, latencyMs: call.latencyMs, output: text.slice(0, 800), validator: { status: "reject", codes: codes(validationOfOption.issues) }, judge: null, rejectionReason: codes(validationOfOption.issues).join(", ") });
            continue;
          }
          const judged = await timed(() => service.factory.judgeDistractor({ dspec, skeleton, text, lexical: validationOfOption.lexical, strategy: assignedStrategy(spec) }));
          modelCalls += 1;
          spend("distractorJudge", judged, { option: dspec.option, attempt: repairAttempt, model: config.models.distractorJudge, promptVersion: prompts.judge });
          if (!judged.result) {
            attempts.push({ ...repairBase, requestHash: call.result.requestHash, cached: call.result.cached, latencyMs: call.latencyMs + judged.latencyMs, output: text.slice(0, 800), validator: { status: "pass", codes: [] }, judge: null, rejectionReason: `repair_judge_error: ${judged.error}` });
            continue;
          }
          const decision = distractorDecision({ dspec, report: judged.result.value, thresholds, experiments });
          if (decision.decision === "REGENERATE") {
            attempts.push({
              ...repairBase,
              requestHash: call.result.requestHash,
              cached: call.result.cached && judged.result.cached,
              latencyMs: call.latencyMs + judged.latencyMs,
              output: text.slice(0, 800),
              validator: { status: "pass", codes: [] },
              judge: { model: servedModel(judged.result), promptVersion: judged.result.promptVersion, requestHash: judged.result.requestHash, decision: decision.decision, failures: decision.failures, concerns: decision.concerns, reasons: judged.result.value.reasons },
              rejectionReason: decision.failures.join(", ") || "repair_rejected",
            });
            continue;
          }
          accepted[index] = { option: dspec.option, text, decision: decision.decision, attempts: accepted[index].attempts + 1, audit: distractorAudit(dspec, call.result.value, skeleton.distractorBlueprints?.find((entry) => entry.option === dspec.option)) };
          attempts.push({
            ...repairBase,
            requestHash: call.result.requestHash,
            cached: call.result.cached && judged.result.cached,
            latencyMs: call.latencyMs + judged.latencyMs,
            output: text.slice(0, 800),
            validator: { status: "pass", codes: [] },
            judge: { model: servedModel(judged.result), promptVersion: judged.result.promptVersion, requestHash: judged.result.requestHash, decision: decision.decision, failures: decision.failures, concerns: decision.concerns, reasons: judged.result.value.reasons },
            rejectionReason: null,
          });
          const check = checks.find((entry) => entry.option === dspec.option);
          if (check) Object.assign(check, { decision: decision.decision, attempts: accepted[index].attempts, failures: decision.failures, concerns: decision.concerns });
          replaced = true;
        }
        if (replaced) {
          const core = assembleCore(spec, skeleton, accepted);
          const explained = await timed(() =>
            service.factory.explain({
              spec,
              core,
              dspecs,
              feedback: ["The wrong options changed. Explain the item as it stands now.", "explanation_language"],
            }),
          );
          modelCalls += 1;
          spend("explanation", explained, { attempt: 2, model: config.models.explanation, promptVersion: explanationPromptVersion });
          if (explained.result) {
            const rebuilt = assembleCandidate(spec, core, explained.result.value, acceptedGate);
            const revalidated = validateCandidate({ spec, candidate: rebuilt, originality: ctx.originality, siblings: ctx.siblings.filter((sibling) => sibling.id !== spec.id), thresholds, experiments, blueprints: skeleton.distractorBlueprints });
            candidate = rebuilt;
            validation = revalidated;
            const sibling = ctx.siblings.find((entry) => entry.id === spec.id);
            if (sibling) sibling.options = candidate.question.options;
            if (revalidated.status === "pass") {
              const again = await service.judge.evaluate(candidate, spec, validation, checks);
              modelCalls += 3;
              for (const result of [again.blind, again.acceptability, again.report])
                spend("finalJudge", { result, error: null, latencyMs: 0 }, { attempt: 2, model: config.models.judge, promptVersion: result.promptVersion });
              judge = judgeDecision({
                spec,
                validation,
                thresholds,
                judge: finalJudgeInput(again, accepted.filter((entry) => entry.decision === "HUMAN_REVIEW").map((entry) => entry.option as OptionLabel), attempts),
              });
              hashes.blindSolve = again.blind.requestHash;
              hashes.acceptability = again.acceptability.requestHash;
              hashes.judge = again.report.requestHash;
              judgeModel = servedModel(again.report);
              candidate = { ...candidate, metadata: { ...candidate.metadata, judgeEstimatedBand: again.report.value.estimatedDifficulty } };
            } else {
              judge = null;
              const own = revalidated.issues.filter((issue) => isExplanationIssue(issue.code));
              const blocking = codes(own.length ? own : revalidated.issues);
              attempts.push({
                stage: "explanation",
                option: null,
                attempt: 2,
                model: config.models.explanation,
                promptVersion: explanationPromptVersion,
                requestHash: explained.result.requestHash,
                cached: explained.result.cached,
                latencyMs: explained.latencyMs,
                output: null,
                validator: { status: "reject", codes: blocking },
                judge: null,
                rejectionReason: blocking.join(", ") || "explanation_rejected",
              });
            }
          }
        }
      }
      const admission = engineAdmission({ validation, judge });
      if (admission.status === "approved") {
        const estimate = candidate.metadata.judgeEstimatedBand;
        if (estimate) candidate = { ...candidate, metadata: { ...candidate.metadata, approvedBand: estimate, difficultyBasis: "engine" } };
      }
      const critical = validation.issues.filter((issue) => issue.severity === "critical");
      const explanationLanguage = critical.some((issue) => issue.code === "explanation_language") && critical.every((issue) => isExplanationIssue(issue.code));
      const failure = explanationLanguage ? "explanation_language" : admission.failure;
      trace = advance(trace, "JUDGED", now());
      trace = admission.state === "APPROVED" ? advance(trace, "APPROVED", now(), "engine") : { ...advance(trace, "REJECTED", now(), failure ?? judge?.failures.join(", ") ?? "rejected"), failure };
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
    distractorJudgeKey: distractorJudgeKeyExposure(config.distractorJudgeStyle ?? "rubric"),
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
    lesson: buildSentenceLesson({
      stem: candidate.question.stem,
      options: candidate.question.options,
      correct: candidate.correctOption,
      relation: spec.discourseRelation?.split(":").pop() ?? null,
      explanation: candidate.explanation,
      rationales: candidate.distractorRationales.map((entry) => ({
        option: entry.option,
        distractorType: entry.distractorType,
        whyPlausible: entry.whyPlausible,
        whyWrong: entry.whyWrong,
      })),
    }),
  };
  return { ...done(record, error), record };
}
