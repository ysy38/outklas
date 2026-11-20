import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { judgeDecision, judgeThresholds, type JudgeDecision } from "@/modules/factory/judge";
import type { DistractorCandidate } from "@/modules/factory/item-model/contract";
import {
  analysisNotes,
  assertTrapOutput,
  distractorRationale,
  layoutOptions,
  misreadingPatterns,
  patternUse,
  recommendIntegration,
  selectEligible,
  sourceSentence,
  trapAuthorization,
  trapCallGraph,
  trapItems,
  trapMaxCostUsd,
  trapRetry,
  type TrapItem,
} from "@/modules/factory/item-model/cognitive-trap";
import { pilotAuthorization, pilotItems, pilotOutputDir } from "@/modules/factory/item-model/cognitive-trap-pilot";
import { qualityItems, qualityOutputDir, qualityRepairAuthorization } from "@/modules/factory/item-model/quality-profile";
import {
  assessQualityFirstPilot,
  qualityFirstActualCallOrder,
  qualityFirstFrozenModels,
  qualityFirstItems,
  qualityFirstMetricsPlaceholder,
  qualityFirstPilotAuthorization,
  qualityFirstPilotForbiddenDirs,
  qualityFirstPilotLiveAuthorized,
  qualityFirstPilotMaxJudgeCalls,
  qualityFirstPilotMaxProviderCalls,
  qualityFirstPilotMaxWriterCalls,
  qualityFirstPilotOutputDir,
  qualityFirstPilotSpendCapUsd,
  qualityFirstPilotWriterCallsPerItem,
  qualityFirstPilotJudgeCallsPerItem,
  qualityFirstPilotRetry,
} from "@/modules/factory/item-model/quality-first-pilot";
import { assessTaxonomyLive, taxonomyLiveAuthorization, taxonomyLiveForbiddenDirs, taxonomyLiveItems, taxonomyLiveOutputDir } from "@/modules/factory/item-model/taxonomy-live";
import { screenExamSurface } from "@/modules/factory/item-model/gold";
import { contentVersion, describeDroppedDistractors, selectCognitiveDistractors, type DroppedDistractor } from "@/modules/factory/item-model/distractor-strategy";
import { assessTargetLanguage } from "@/modules/factory/item-model/option-language";
import { assessProposition, propositionHoldsQuality, qualityAfterJudge, type PropositionGuard } from "@/modules/factory/item-model/proposition-guard";
import { selectMisreadingMechanisms, type RelationEvaluation } from "@/modules/factory/item-model/misreading-mechanisms";
import { assessWholeSet, type WholeSetGate } from "@/modules/factory/item-model/whole-set";
import { executeActiveRecovery } from "../recovery/active";
import { attachRecovery, type DiagnosticEvidence, type RecoveryAttachment, type RecoveryMode, type RecoveryRequest } from "../recovery/attach";
import { acceptDistractorPool, selectDistractors } from "@/modules/factory/item-model/pool";
import { typeSemanticFocus } from "@/modules/factory/item-model/precheck";
import { restatementModel, translationModel } from "@/modules/factory/item-model/registry";
import { BudgetExceeded, SpendBudget, loadSpendLimits } from "../ai/budget";
import { cachedGenerate } from "../ai/cache";
import { loadAIConfig, parseModel } from "../ai/config";
import { extractJsonText } from "../ai/service";
import { loadPrices, priceFor, type Prices } from "../ai/prices";
import {
  distractorPoolEnvelope,
  distractorResponseSchema,
  distractorSystem,
  distractorUser,
  itemJudgePacket,
  itemJudgePromptVersion,
  judgeResponseSchemaForItem,
  judgeSystem,
  judgeUser,
} from "../ai/prompts/item-model.v1";
import {
  misreadingOptionsOutput,
  misreadingOptionsPromptVersion,
  misreadingOptionsResponseSchema,
  misreadingOptionsSystem,
  misreadingOptionsUser,
  misreadingOutput,
  misreadingOutputFor,
  misreadingPromptVersion,
  misreadingSystem,
  misreadingUser,
} from "../ai/prompts/cognitive-trap.v1";
import { responseSchema } from "../ai/prompts/schema";
import type { AIProvider, Usage } from "../ai/types";
import { loadOfficialComparisonCorpus, openrouterPrecheckModels } from "./item-precheck";

const emptyUsage = (): Usage => ({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
const protectedDirs = [
  ".data/analysis/_factory/item-precheck/v1",
  ".data/analysis/_factory/item-precheck/openrouter-v1",
  ".data/analysis/_factory/item-precheck/openrouter-v1-v33",
  ".data/analysis/_factory/item-precheck/openrouter-v1-first-run",
  ".data/analysis/_factory/item-core-smoke/openrouter-v1",
];

type Ran = { ran: true; value: unknown; error: string | null; usage: Usage; cached: boolean } | { ran: false; error: string };

async function oneCall(provider: AIProvider, promptVersion: string, schema: z.ZodType, request: { model: string; system: string; user: string; jsonSchema: Record<string, unknown>; maxOutputTokens: number; cacheSalt: string }): Promise<Ran> {
  try {
    const hit = await cachedGenerate(provider, promptVersion, {
      model: request.model,
      system: request.system,
      parts: [{ text: request.user }],
      jsonSchema: request.jsonSchema,
      temperature: 0,
      maxOutputTokens: request.maxOutputTokens,
      cacheSalt: request.cacheSalt,
    });
    let value: unknown = null;
    let error: string | null = null;
    try {
      const parsed = schema.safeParse(JSON.parse(extractJsonText(hit.response.text)));
      if (parsed.success) value = parsed.data;
      else error = parsed.error.issues.slice(0, 4).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    } catch {
      error = "output is not valid JSON";
    }
    return { ran: true, value, error, usage: hit.response.usage, cached: hit.cached };
  } catch (error) {
    if (error instanceof BudgetExceeded) return { ran: false, error: error.message };
    return { ran: true, value: null, error: error instanceof Error ? error.message : "call failed", usage: emptyUsage(), cached: false };
  }
}

export type TrapArm = {
  method: "A" | "B";
  status: "five_options" | "fail" | "not_run";
  failures: string[];
  keyLetter: OptionLabel | null;
  options: Record<OptionLabel, string> | null;
  rationales: ReturnType<typeof distractorRationale>[];
  readings: { studentMisreading: string; temptingEvidence: string; actualSemanticDifference: string; whyIncorrect: string; prevalence: "unmeasured"; prevalenceClaimDiscarded: boolean; explanationIsNotProof: true; misreadingMechanism: string | null; additionalMechanisms: string[]; mechanismIsNotProof: true }[];
  meaningMap: { roles: string; quantity: string; modality: string; polarity: string; tense: string; cause: string; reference: string } | null;
  preservedRelations: string[];
  selectedMechanisms: string[];
  supportableMisreadings: number;
  relationEvaluations: RelationEvaluation[];
    judgeAgreesWithKey: boolean | null;
  decisionRisks: { key_semantic_risk: string[]; distractor_equivalence_risk: string[]; whole_set_clue_risk: string[] } | null;
  secondAnswerOptions: OptionLabel[];
  acceptableOptions: OptionLabel[];
  droppedDistractors: DroppedDistractor[];
  qualityDecision: "pending" | "fail" | "needs_revision";
  qualityReasons: string[];
  propositionGuards: { label: OptionLabel; text: string; guard: PropositionGuard }[];
  modelVerdict: string | null;
  modelDifficulty: string | null;
  modelDifficultyIsNotMeasured: true;
  clueRisk: number | null;
  blindConfidence: number | null;
  editorial: "pending";
};

export type TrapComparison = {
  id: string;
  questionType: TrapItem["questionType"];
  direction: TrapItem["direction"];
  source: string;
  key: string;
  meaning: "unverified" | "fail" | "not_run";
  keyFailures: string[];
  designTarget: "medium" | "hard" | null;
  estimatedDifficulty: string | null;
  observedDifficulty: null;
  arms: { A: TrapArm; B: TrapArm };
  /** Separate from qualityDecision. Absent only before the item is committed. */
  recovery?: RecoveryAttachment;
};

export type TrapRun = {
  started: boolean;
  executed: boolean;
  ready: boolean;
  lock: "authorization" | "budget" | "corpus" | "output" | "runner" | null;
  reason: string | null;
  planId: typeof trapAuthorization;
  qualityProven: false;
  studentBankWrites: 0;
  benchmarkStarted: false;
  retry: 0;
  providerCalls: number;
  costUsd: number | null;
  maxCalls: number;
  maxCostUsd: number;
  costAssumption: string;
  estimatedUsd: number | null;
  droppedKeys: { id: string; failures: string[] }[];
  shrunkForBudget: string[];
  records: TrapComparison[];
  decision: ReturnType<typeof recommendIntegration>;
  recoveryMode: RecoveryMode;
  recoveryProviderCalls: number;
  recoveryCostUsd: number;
};

const pendingDecision = recommendIntegration({ winners: [], editorialPasses: 0 });

function refused(lock: TrapRun["lock"], reason: string | null): TrapRun {
  return {
    started: false,
    executed: false,
    ready: false,
    lock,
    reason,
    planId: trapAuthorization,
    qualityProven: false,
    studentBankWrites: 0,
    benchmarkStarted: false,
    retry: trapRetry,
    providerCalls: 0,
    costUsd: null,
    maxCalls: trapCallGraph(0).maxCalls,
    maxCostUsd: trapMaxCostUsd,
    costAssumption: "",
    estimatedUsd: null,
    droppedKeys: [],
    shrunkForBudget: [],
    records: [],
    decision: pendingDecision,
    recoveryMode: "off",
    recoveryProviderCalls: 0,
    recoveryCostUsd: 0,
  };
}

function emptyArm(method: "A" | "B"): TrapArm {
  return {
    method,
    status: "not_run",
    failures: [],
    keyLetter: null,
    options: null,
    rationales: [],
    readings: [],
    meaningMap: null,
    preservedRelations: [],
    selectedMechanisms: [],
    supportableMisreadings: 0,
    relationEvaluations: [],
    judgeAgreesWithKey: null,
    decisionRisks: null,
    secondAnswerOptions: [],
    acceptableOptions: [],
    droppedDistractors: [],
    qualityDecision: "pending",
    qualityReasons: [],
    propositionGuards: [],
    modelVerdict: null,
    modelDifficulty: null,
    modelDifficultyIsNotMeasured: true,
    clueRisk: null,
    blindConfidence: null,
    editorial: "pending",
  };
}

export function qualityCallGraph(itemCount: number): { writerCalls: number; judgeCalls: number; maxCalls: number } {
  const writerCalls = itemCount * 2;
  const judgeCalls = itemCount;
  return { writerCalls, judgeCalls, maxCalls: writerCalls + judgeCalls };
}

export function qualityCostEstimate(prices: Prices, items: number): number | null {
  const writer = priceFor(prices.table, openrouterPrecheckModels.generator);
  const judge = priceFor(prices.table, openrouterPrecheckModels.judge);
  if (!writer || !judge) return null;
  const writerUsd = items * 2 * (3000 * writer.in + 4096 * writer.out + 1500 * (writer.cacheWrite ?? 0));
  const judgeUsd = items * (4000 * judge.in + 4096 * judge.out + 1700 * (judge.cacheWrite ?? 0));
  return (writerUsd + judgeUsd) / 1_000_000;
}

export function trapCostEstimate(prices: Prices, items: number): number | null {
  const writer = priceFor(prices.table, openrouterPrecheckModels.generator);
  const judge = priceFor(prices.table, openrouterPrecheckModels.judge);
  if (!writer || !judge) return null;
  const writerUsd = items * 3 * (3000 * writer.in + 4096 * writer.out + 1500 * (writer.cacheWrite ?? 0));
  const judgeUsd = items * 2 * (4000 * judge.in + 4096 * judge.out + 1700 * (judge.cacheWrite ?? 0));
  return (writerUsd + judgeUsd) / 1_000_000;
}

const costAssumption = "Upper bound uses 3000/4096/1500 writer tokens and 4000/4096/1700 judge tokens, including the OpenRouter output floor. It is not a measured bill.";

function modelOf(item: TrapItem) {
  return item.questionType === "restatement" ? restatementModel : translationModel;
}

function readingsOf(value: unknown): { kept: TrapArm["readings"]; relations: string[]; meaningMap: TrapArm["meaningMap"]; failures: string[] } {
  const parsed = misreadingOutput.safeParse(value);
  if (!parsed.success) return { kept: [], relations: [], meaningMap: null, failures: ["misreading_schema"] };
  const seen = new Set<string>();
  const kept: TrapArm["readings"] = [];
  for (const reading of parsed.data.readings) {
    const key = reading.studentMisreading.trim().toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    const claim = reading.prevalence.trim().toLocaleLowerCase("en-US");
    kept.push({
      studentMisreading: reading.studentMisreading,
      temptingEvidence: reading.temptingEvidence,
      actualSemanticDifference: reading.actualSemanticDifference,
      whyIncorrect: reading.whyIncorrect,
      prevalence: "unmeasured",
      prevalenceClaimDiscarded: claim !== "unmeasured",
      explanationIsNotProof: true,
      misreadingMechanism: reading.misreadingMechanism ?? null,
      additionalMechanisms: reading.additionalMechanisms ?? [],
      mechanismIsNotProof: true,
    });
  }
  const failures = kept.length < 4 ? ["fewer_than_four_misreadings"] : [];
  return { kept, relations: parsed.data.preservedRelations, meaningMap: parsed.data.meaningMap, failures };
}

function secondAnswers(packet: { report: { alternativeDefensibleOptions: OptionLabel[] }; blindAlternative: OptionLabel | null }, key: OptionLabel): OptionLabel[] {
  const rivals = packet.report.alternativeDefensibleOptions.filter((label) => label !== key);
  if (packet.blindAlternative && packet.blindAlternative !== key && !rivals.includes(packet.blindAlternative)) rivals.push(packet.blindAlternative);
  return rivals;
}

function applyJudge(arm: TrapArm, value: unknown): void {
  const parsed = itemJudgePacket.safeParse(value);
  if (!parsed.success || !arm.keyLetter || !arm.options) {
    arm.failures.push("judge_schema");
    arm.qualityDecision = "needs_revision";
    arm.qualityReasons = [...arm.qualityReasons, "judge_schema"];
    return;
  }
  const packet = parsed.data;
  arm.judgeAgreesWithKey = packet.blindAnswer === arm.keyLetter;
  arm.modelVerdict = packet.report.verdict;
  arm.modelDifficulty = packet.report.estimatedDifficulty;
  arm.clueRisk = packet.report.scores.clueRisk;
  arm.blindConfidence = packet.blindConfidence;
  arm.acceptableOptions = packet.acceptability.sentences.filter((row) => row.acceptable).map((row) => row.option);
  arm.secondAnswerOptions = secondAnswers(packet, arm.keyLetter);
  const reasons: string[] = [];
  if (!arm.judgeAgreesWithKey) reasons.push("blind_answer_mismatch");
  if (arm.secondAnswerOptions.length) reasons.push("second_defensible");
  if (packet.report.scores.clueRisk > judgeThresholds.reject.clueRisk) reasons.push("clue_risk_high");
  if (packet.report.verdict === "REVIEW") reasons.push("judge_review");
  if (packet.report.verdict === "REJECT") reasons.push("judge_reject");
  const next = qualityAfterJudge({ prior: arm.qualityDecision, priorReasons: arm.qualityReasons, judgeReasons: reasons });
  arm.qualityDecision = next.decision;
  arm.qualityReasons = next.reasons;
}

function recordPropositionGuard(arm: TrapArm, source: string, key: string, candidates: readonly { candidateText: string; misreadingMechanism?: string | null; semanticRisk?: string | null }[]): void {
  if (!arm.options || !arm.keyLetter) return;
  const guards = (Object.entries(arm.options) as [OptionLabel, string][])
    .filter(([label]) => label !== arm.keyLetter)
    .map(([label, text]) => {
      const candidate = candidates.find((entry) => entry.candidateText === text);
      return {
        label,
        text,
        guard: assessProposition({
          source,
          key,
          option: text,
          mechanismId: candidate?.misreadingMechanism ?? null,
          semanticRisk: candidate?.semanticRisk ?? null,
        }),
      };
    });
  arm.propositionGuards = guards;
  if (arm.qualityDecision === "fail") return;
  const codes = [
    guards.some((entry) => entry.guard.status === "unsupported_clause") ? "unsupported_clause" : null,
    guards.some((entry) => entry.guard.status === "unverified") ? "proposition_unverified" : null,
    guards.some((entry) => entry.guard.mechanismStatus === "mechanism_unverified") ? "mechanism_unverified" : null,
  ].filter((code): code is string => Boolean(code));
  if (!guards.some((entry) => propositionHoldsQuality(entry.guard))) return;
  arm.qualityDecision = "needs_revision";
  for (const code of codes) if (!arm.qualityReasons.includes(code)) arm.qualityReasons.push(code);
}

function holdLanguage(arm: TrapArm, item: TrapItem): void {
  if (arm.status !== "five_options" || !arm.options || item.questionType !== "translation") return;
  const target = item.source.kind === "translation" ? item.source.targetLanguage : null;
  const report = assessTargetLanguage({ questionType: item.questionType, targetLanguage: target, options: arm.options });
  if (report.status === "pass") return;
  arm.failures.push(...report.failures);
  arm.qualityDecision = report.status === "fail" ? "fail" : "needs_revision";
  arm.qualityReasons = report.failures;
}

function textVersions(source: string, key: string): { sourceVersion: string; keyVersion: string } {
  return { sourceVersion: contentVersion(source), keyVersion: contentVersion(key) };
}

function finishArm(arm: TrapArm, selected: DistractorCandidate[], key: string, slot: number): void {
  if (selected.length < 4) {
    arm.status = "fail";
    arm.failures.push("fewer_than_four_options");
    return;
  }
  const laid = layoutOptions(key, selected.slice(0, 4).map((candidate) => candidate.candidateText), slot);
  if (Object.values(laid.options).some((text) => !text.trim())) {
    arm.status = "fail";
    arm.failures.push("empty_option");
    return;
  }
  arm.status = "five_options";
  arm.keyLetter = laid.keyLetter;
  arm.options = laid.options;
  arm.rationales = selected.slice(0, 4).map(distractorRationale);
}

/**
 * Same writer, same judge, same source, same key. Method A is the v3.4 pool.
 * Method B writes misreadings first. The judge prompt does not name the method.
 * Retry stays zero. The ceilings are not raised.
 */
export async function executeCognitiveTrap(input: {
  authorization: string;
  providerFor: ((setting: string) => AIProvider) | null;
  prices: Prices | null;
  models: { generator: string; judge: string };
  outDir?: string;
  officialTexts?: string[];
  cacheSalt?: string;
  items?: readonly TrapItem[];
  limits?: { maxCalls?: number; maxRegenerations?: number; maxCostUsd?: number };
  /** comparison runs A and B. quality runs only Cognitive Trap First and the whole-set gate. */
  profile?: "comparison" | "quality";
  /** Default off. dry_run classifies after quality. active uses the attached recovery path under separate caps. */
  recovery?: RecoveryRequest & { provider?: AIProvider | null; allowLiveOpenRouter?: boolean };
}): Promise<TrapRun> {
  if (input.authorization !== trapAuthorization) return refused("authorization", "cognitive trap authorization required");
  if (input.models.generator !== openrouterPrecheckModels.generator || input.models.judge !== openrouterPrecheckModels.judge) return refused("authorization", "writer and judge stay on the precheck rail");
  if (input.limits?.maxRegenerations && input.limits.maxRegenerations > 0) return refused("budget", "retry stays zero");
  const officialTexts = input.officialTexts ?? [];
  if (!officialTexts.length) return refused("corpus", "official comparison corpus is not loaded");
  if (!input.prices) return refused("budget", "prices are required");
  const gated = selectEligible(input.items ?? trapItems());
  const screened: TrapItem[] = [];
  const dropped = gated.dropped.map((row) => ({ id: row.id, failures: row.failures }));
  for (const item of gated.kept) {
    const screen = screenExamSurface({ instructions: "", content: `${sourceSentence(item)}\n${item.core.correctAnswer}` }, officialTexts);
    if (screen.status === "overlap") dropped.push({ id: item.id, failures: ["official_surface_overlap"] });
    else screened.push(item);
  }
  let items = screened;
  const shrunk: string[] = [];
  let estimate = trapCostEstimate(input.prices, items.length);
  while (estimate !== null && estimate > trapMaxCostUsd && items.length > 0) {
    const removed = items.at(-1);
    if (!removed) break;
    shrunk.push(removed.id);
    items = items.slice(0, -1);
    estimate = trapCostEstimate(input.prices, items.length);
  }
  const graph = trapCallGraph(items.length);
  const env = input.limits ?? {};
  const maxCalls = Math.min(graph.maxCalls, env.maxCalls ?? graph.maxCalls);
  const maxCostUsd = Math.min(trapMaxCostUsd, env.maxCostUsd ?? trapMaxCostUsd);
  const base: TrapRun = {
    ...refused(null, null),
    started: false,
    ready: true,
    droppedKeys: dropped,
    shrunkForBudget: shrunk,
    maxCalls,
    maxCostUsd,
    costAssumption,
    estimatedUsd: estimate,
    benchmarkStarted: false,
  };
  if (!input.providerFor) return { ...base, lock: "runner", reason: "provider runner is not attached; the comparison was not started" };
  if (input.outDir) {
    try {
      assertTrapOutput(input.outDir);
    } catch (error) {
      return { ...base, lock: "output", reason: error instanceof Error ? error.message : "output refused" };
    }
    if (protectedDirs.some((dir) => path.resolve(dir) === path.resolve(input.outDir!))) return { ...base, lock: "output", reason: "refusing to write a saved factory run" };
  }
  let budget: SpendBudget;
  try {
    budget = new SpendBudget({ maxCalls, maxRegenerations: trapRetry, maxCostUsd }, input.prices, [input.models.generator, input.models.judge]);
  } catch (error) {
    return { ...base, lock: "budget", reason: error instanceof Error ? error.message : "budget refused" };
  }
  const cache = new Map<string, AIProvider>();
  const providerFor = (setting: string) => {
    const found = cache.get(setting);
    if (found) return found;
    const wrapped = budget.meter(input.providerFor!(setting));
    cache.set(setting, wrapped);
    return wrapped;
  };
  const writer = parseModel(input.models.generator);
  const judge = parseModel(input.models.judge);
  const records: TrapComparison[] = [];
  let stopped = false;
  let spentRecoveryCalls = 0;
  let spentRecoveryCostUsd = 0;

  for (const [index, item] of items.entries()) {
    const model = modelOf(item);
    const sentence = sourceSentence(item);
    const key = item.core.correctAnswer;
    const comparison: TrapComparison = {
      id: item.id,
      questionType: item.questionType,
      direction: item.direction,
      source: sentence,
      key,
      meaning: "unverified",
      keyFailures: [],
      designTarget: item.designTarget ?? null,
      estimatedDifficulty: null,
      observedDifficulty: null,
      arms: { A: emptyArm("A"), B: emptyArm("B") },
    };
    const versions = textVersions(sentence, key);
    let bCandidates: { candidateText: string; misreadingMechanism?: string | null; semanticRisk?: string | null }[] = [];
    const commit = async () => {
      comparison.estimatedDifficulty = comparison.arms.B.modelDifficulty ?? comparison.arms.A.modelDifficulty;
      const attached = attachRecovery(comparison, { ...input.recovery, productionCostUsd: null });
      if (input.recovery?.mode === "active") {
        const activeProvider = input.recovery.provider ?? (input.recovery.allowLiveOpenRouter ? null : input.providerFor!(input.models.generator));
        comparison.recovery = await executeActiveRecovery(comparison, {
          ...input.recovery,
          provider: activeProvider,
          prices: input.prices,
          productionCostUsd: null,
          spentCallsBefore: spentRecoveryCalls,
          spentCostUsdBefore: spentRecoveryCostUsd,
        });
        spentRecoveryCalls += comparison.recovery.providerCalls;
        spentRecoveryCostUsd += comparison.recovery.recoveryCostUsd;
      } else {
        comparison.recovery = attached;
      }
      records.push(comparison);
    };
    if (stopped || budget.stopped) {
      comparison.arms.A.failures.push(budget.stopped ?? "budget");
      comparison.arms.B.failures.push(budget.stopped ?? "budget");
      await commit();
      continue;
    }
    const salt = `${input.cacheSalt ?? trapAuthorization}:${item.id}`;
    const quality = input.profile === "quality";
    if (quality) {
      comparison.arms.A.status = "not_run";
      comparison.arms.A.failures.push("quality_profile_uses_cognitive_trap_only");
    }
    const aCall = quality ? null : await oneCall(providerFor(input.models.generator), model.promptVersion, distractorPoolEnvelope, {
      model: writer.model,
      system: distractorSystem,
      user: distractorUser(model, item.source, { stem: item.core.stem, correctAnswer: key }),
      jsonSchema: distractorResponseSchema(model.errorMechanisms),
      maxOutputTokens: 1600,
      cacheSalt: `${salt}:A`,
    });
    if (aCall && !aCall.ran) {
      stopped = true;
      comparison.arms.A.failures.push(aCall.error);
      comparison.arms.B.status = "not_run";
      await commit();
      continue;
    }
    if (aCall) {
      const aSplit = aCall.value ? acceptDistractorPool(aCall.value, model.errorMechanisms) : { accepted: [], rejected: [] };
      const aSelected = selectDistractors({ candidates: aSplit.accepted, keyText: key, allowedMechanisms: model.errorMechanisms });
      comparison.arms.A.droppedDistractors = describeDroppedDistractors([...aSplit.rejected, ...aSelected.rejected], versions);
      if (aCall.error) comparison.arms.A.failures.push(aCall.error);
      finishArm(comparison.arms.A, aSelected.selected, key, index);
      holdLanguage(comparison.arms.A, item);
      recordPropositionGuard(comparison.arms.A, sentence, key, aSelected.selected);
    }

    const support = selectMisreadingMechanisms(sentence, item.questionType);
    comparison.arms.B.selectedMechanisms = support.mechanisms.map((item) => item.id);
    comparison.arms.B.supportableMisreadings = support.supportableMisreadings;
    comparison.arms.B.relationEvaluations = support.evaluations;
    if (support.status === "fail") {
      comparison.arms.B.status = "fail";
      comparison.arms.B.failures.push(support.failure ?? "insufficient_source_relations");
      await commit();
      continue;
    }
    const readSchema = misreadingOutputFor(support.mechanisms.map((item) => item.id));
    const bRead = await oneCall(providerFor(input.models.generator), misreadingPromptVersion, readSchema, {
      model: writer.model,
      system: misreadingSystem,
      user: misreadingUser(sentence, key, support.mechanisms),
      jsonSchema: responseSchema(readSchema),
      maxOutputTokens: 1600,
      cacheSalt: `${salt}:B-read`,
    });
    if (!bRead.ran) {
      stopped = true;
      comparison.arms.B.failures.push(bRead.error);
      await commit();
      continue;
    }
    const readings = readingsOf(bRead.value);
    comparison.arms.B.readings = readings.kept;
    comparison.arms.B.meaningMap = readings.meaningMap;
    comparison.arms.B.preservedRelations = readings.relations;
    comparison.arms.B.failures.push(...readings.failures);
    if (bRead.error) comparison.arms.B.failures.push(bRead.error);
    if (readings.failures.length === 0 && readings.kept.length >= 4) {
      const bCall = await oneCall(providerFor(input.models.generator), misreadingOptionsPromptVersion, misreadingOptionsOutput(model.errorMechanisms), {
        model: writer.model,
        system: misreadingOptionsSystem,
        user: misreadingOptionsUser(model, sentence, key, readings.kept.map((reading) => reading.studentMisreading), support.mechanisms, item.source.kind === "translation" ? item.source.targetLanguage : null),
        jsonSchema: misreadingOptionsResponseSchema(model.errorMechanisms),
        maxOutputTokens: 1600,
        cacheSalt: `${salt}:B-options`,
      });
      if (!bCall.ran) {
        stopped = true;
        comparison.arms.B.failures.push(bCall.error);
        await commit();
        continue;
      }
      const parsed = bCall.value && typeof bCall.value === "object" && "candidates" in bCall.value && Array.isArray((bCall.value as { candidates?: unknown }).candidates)
        ? (bCall.value as { candidates: { candidateText: string; errorMechanism: string; shiftTarget: string; semanticRisk: "none" | "second_answer" | "off_construct" | "ungrammatical"; studentMisreading: string }[] }).candidates
        : [];
      const linked = {
        candidates: parsed.flatMap((candidate) => {
          const reading = readings.kept.find((entry) => entry.studentMisreading === candidate.studentMisreading);
          if (!reading) return [];
          return [{
            ...candidate,
            whyPlausible: reading.temptingEvidence,
            whyInferior: reading.whyIncorrect,
            sourceEvidence: reading.temptingEvidence.slice(0, 200),
            temptingEvidence: reading.temptingEvidence,
            actualSemanticDifference: reading.actualSemanticDifference,
            whyIncorrect: reading.whyIncorrect,
            misreadingMechanism: reading.misreadingMechanism,
            additionalMechanisms: reading.additionalMechanisms,
          }];
        }),
      };
      const bSplit = acceptDistractorPool(linked, model.errorMechanisms);
      const cognitive = bSplit.accepted.flatMap((candidate) => {
        const source = linked.candidates.find((entry) => entry.candidateText === candidate.candidateText);
        if (!source) return [];
        return [{
          ...candidate,
          studentMisreading: source.studentMisreading,
          temptingEvidence: source.temptingEvidence,
          actualSemanticDifference: source.actualSemanticDifference,
          whyIncorrect: source.whyIncorrect,
          misreadingMechanism: source.misreadingMechanism,
          additionalMechanisms: source.additionalMechanisms,
        }];
      });
      const bSelected = selectCognitiveDistractors({ candidates: cognitive, keyText: key, sourceText: sentence, allowedMechanisms: model.errorMechanisms });
      comparison.arms.B.droppedDistractors = describeDroppedDistractors([...bSplit.rejected, ...bSelected.removed, ...bSelected.rejected], versions);
      if (bSelected.removed.some((entry) => entry.reason === "surface_edit")) comparison.arms.B.failures.push("surface_edit_removed");
      if (bSelected.removed.some((entry) => entry.reason === "second_answer")) comparison.arms.B.failures.push("second_answer_removed");
      if (bCall.error) comparison.arms.B.failures.push(bCall.error);
      bCandidates = bSelected.selected;
      finishArm(comparison.arms.B, bSelected.selected, key, index + 2);
      holdLanguage(comparison.arms.B, item);
    } else comparison.arms.B.status = "fail";

    if (quality && comparison.arms.B.status === "five_options" && comparison.arms.B.options && comparison.arms.B.qualityDecision === "pending") {
      const gate = assessWholeSet({ source: sentence, key, options: comparison.arms.B.options, correct: comparison.arms.B.keyLetter ?? "A" });
      comparison.arms.B.decisionRisks = gate.risks;
      if (gate.decision === "fail") {
        comparison.arms.B.failures.push(gate.failure ?? "confirmed_defect");
        comparison.arms.B.qualityDecision = "fail";
        const failure = gate.failure ?? "confirmed_defect";
        comparison.arms.B.qualityReasons = [failure, ...comparison.arms.B.qualityReasons.filter((reason) => reason !== failure)];
      }
    }
    recordPropositionGuard(comparison.arms.B, sentence, key, bCandidates);

    for (const method of ["A", "B"] as const) {
      const arm = comparison.arms[method];
      const languageHeld = arm.failures.includes("target_language_mismatch") || arm.failures.includes("language_unverified");
      if (arm.status !== "five_options" || !arm.options || languageHeld || arm.qualityDecision === "fail" || stopped || budget.stopped) continue;
      const user = judgeUser(model, item.core.stem, arm.options, item.source, item.designTarget ?? null);
      const judged = await oneCall(providerFor(input.models.judge), itemJudgePromptVersion, itemJudgePacket, {
        model: judge.model,
        system: judgeSystem,
        user,
        jsonSchema: judgeResponseSchemaForItem(),
        maxOutputTokens: 1200,
        cacheSalt: `${salt}:judge-${method}`,
      });
      if (!judged.ran) {
        stopped = true;
        arm.failures.push(judged.error);
        continue;
      }
      if (judged.error) arm.failures.push(judged.error);
      applyJudge(arm, judged.value);
    }
    await commit();
  }

  const cost = budget.cost();
  const summary: TrapRun = {
    ...base,
    started: true,
    executed: true,
    ready: true,
    lock: null,
    reason: budget.stopped,
    providerCalls: budget.calls,
    costUsd: cost.usd,
    records,
    decision: { integrate: false, propose: null, reason: "editorial review is pending; a model verdict is not a result" },
    recoveryMode: input.recovery?.mode ?? "off",
    recoveryProviderCalls: spentRecoveryCalls,
    recoveryCostUsd: Number(spentRecoveryCostUsd.toFixed(8)),
  };
  if (input.outDir) {
    mkdirSync(input.outDir, { recursive: true });
    writeFileSync(path.join(input.outDir, "summary.json"), `${JSON.stringify({ ...summary, records: summary.records.length }, null, 2)}\n`);
    writeFileSync(path.join(input.outDir, "catalog.json"), `${JSON.stringify({ patternUse, patterns: misreadingPatterns, analysis: analysisNotes }, null, 2)}\n`);
    for (const record of records) writeFileSync(path.join(input.outDir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
    if (summary.recoveryMode === "active") {
      const recoverySummary = {
        mode: "active",
        calls: spentRecoveryCalls,
        actualCostUsd: summary.recoveryCostUsd,
        meaningProven: false,
        qualityProven: false,
        editorial: "pending",
        studentBankWrites: 0,
        items: records.map((record) => ({
          id: record.id,
          blocked: record.recovery?.blocked ?? null,
          applied: record.recovery?.applied ?? false,
          calls: record.recovery?.providerCalls ?? 0,
          actualCostUsd: record.recovery?.recoveryCostUsd ?? 0,
          repairSuccessCount: record.recovery?.activeReport?.repairSuccessCount ?? 0,
          replacementSuccessCount: record.recovery?.activeReport?.replacementSuccessCount ?? 0,
          replacementUnavailableCount: record.recovery?.activeReport?.replacementUnavailableCount ?? 0,
          technicalFailureCount: record.recovery?.activeReport?.technicalFailureCount ?? 0,
          remainingIssues: record.recovery?.activeReport?.remainingIssues ?? [],
          editorial: "pending",
        })),
      };
      writeFileSync(path.join(input.outDir, "recovery-summary.json"), `${JSON.stringify(recoverySummary, null, 2)}\n`);
    }
  }
  return summary;
}

export async function itemFactoryCognitiveTrap(authorization: string, outDir = ".data/analysis/_factory/cognitive-trap/openrouter-v1"): Promise<TrapRun> {
  const officialTexts = loadOfficialComparisonCorpus();
  if (!officialTexts?.length) return refused("corpus", "official comparison corpus is not loaded");
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  const models = { ...openrouterPrecheckModels };
  try {
    new SpendBudget({ maxCalls: trapCallGraph(trapItems().length).maxCalls, maxRegenerations: trapRetry, maxCostUsd: trapMaxCostUsd }, prices, [models.generator, models.judge]);
  } catch (error) {
    return refused("budget", error instanceof Error ? error.message : "budget refused");
  }
  const config = loadAIConfig();
  const missing = [parseModel(models.generator, config.provider).provider, parseModel(models.judge, config.provider).provider].find((name) => !config.keys[name]);
  if (missing) return refused("authorization", `missing ${missing} API key`);
  if (existsSync(path.join(outDir, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(outDir, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refused("output", "a completed comparison is already stored; it was not run again");
  }
  const cache = new Map<string, AIProvider>();
  const { createProvider } = await import("../ai/service");
  const limits = loadSpendLimits();
  return executeCognitiveTrap({
    authorization,
    prices,
    models,
    outDir,
    officialTexts,
    cacheSalt: "cognitive-trap-live-v1",
    limits: { maxCalls: limits.maxCalls, maxCostUsd: limits.maxCostUsd },
    providerFor: (setting) => {
      const parsed = parseModel(setting, config.provider);
      const existing = cache.get(parsed.provider);
      if (existing) return existing;
      const created = createProvider(config, parsed.provider);
      cache.set(parsed.provider, created);
      return created;
    },
  });
}

/** Prepared comparison on a new six-item sample. Calling it is a live run; this task does not call it. */
export async function itemFactoryCognitivePilot(authorization: string, outDir = pilotOutputDir): Promise<TrapRun> {
  if (authorization !== pilotAuthorization) return refused("authorization", "cognitive trap pilot authorization required");
  if (path.resolve(outDir) === path.resolve(".data/analysis/_factory/cognitive-trap/openrouter-v1")) return refused("output", "the first comparison records stay unchanged");
  const officialTexts = loadOfficialComparisonCorpus();
  if (!officialTexts?.length) return refused("corpus", "official comparison corpus is not loaded");
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refused("budget", "OpenRouter prices are not loaded");
  const estimate = trapCostEstimate(prices, pilotItems().length);
  if (estimate === null || estimate > trapMaxCostUsd) return refused("budget", "the pilot estimate does not fit under the cap");
  const models = { ...openrouterPrecheckModels };
  const config = loadAIConfig();
  const missing = [parseModel(models.generator, config.provider).provider, parseModel(models.judge, config.provider).provider].find((name) => !config.keys[name]);
  if (missing) return refused("authorization", `missing ${missing} API key`);
  const cache = new Map<string, AIProvider>();
  const { createProvider } = await import("../ai/service");
  return executeCognitiveTrap({
    authorization: trapAuthorization,
    prices,
    models,
    outDir,
    officialTexts,
    items: pilotItems(),
    cacheSalt: pilotAuthorization,
    limits: { maxCalls: trapCallGraph(pilotItems().length).maxCalls, maxCostUsd: trapMaxCostUsd },
    providerFor: (setting) => {
      const parsed = parseModel(setting, config.provider);
      const existing = cache.get(parsed.provider);
      if (existing) return existing;
      const created = createProvider(config, parsed.provider);
      cache.set(parsed.provider, created);
      return created;
    },
  });
}

/** Four-item quality profile. Calling it is a live run; this task does not call it. */
export async function itemFactoryQualityRepair(authorization: string, outDir = qualityOutputDir): Promise<TrapRun> {
  if (authorization !== qualityRepairAuthorization) return refused("authorization", "quality repair authorization required");
  const resolved = path.resolve(outDir);
  if (resolved === path.resolve(".data/analysis/_factory/cognitive-trap/openrouter-v1") || resolved === path.resolve(pilotOutputDir)) return refused("output", "earlier comparison records stay unchanged");
  const officialTexts = loadOfficialComparisonCorpus();
  if (!officialTexts?.length) return refused("corpus", "official comparison corpus is not loaded");
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refused("budget", "OpenRouter prices are not loaded");
  const items = qualityItems().map((entry) => entry.item);
  const estimate = qualityCostEstimate(prices, items.length);
  const graph = qualityCallGraph(items.length);
  if (estimate === null) return refused("budget", "the quality estimate could not be calculated");
  const models = { ...openrouterPrecheckModels };
  const config = loadAIConfig();
  const missing = [parseModel(models.generator, config.provider).provider, parseModel(models.judge, config.provider).provider].find((name) => !config.keys[name]);
  if (missing) return refused("authorization", `missing ${missing} API key`);
  if (existsSync(path.join(outDir, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(outDir, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refused("output", "a completed quality run is already stored; it was not run again");
  }
  const cache = new Map<string, AIProvider>();
  const { createProvider } = await import("../ai/service");
  return executeCognitiveTrap({
    authorization: trapAuthorization,
    prices,
    models,
    outDir,
    officialTexts,
    items,
    profile: "quality",
    cacheSalt: qualityRepairAuthorization,
    limits: { maxCalls: graph.maxCalls, maxCostUsd: estimate },
    providerFor: (setting) => {
      const parsed = parseModel(setting, config.provider);
      const existing = cache.get(parsed.provider);
      if (existing) return existing;
      const created = createProvider(config, parsed.provider);
      cache.set(parsed.provider, created);
      return created;
    },
  });
}

/**
 * Four new academic items on Cognitive Trap First.
 * Calling this with the live token starts provider calls. A missing token does not.
 */
export async function itemFactoryTaxonomyLive(authorization: string, outDir = taxonomyLiveOutputDir): Promise<TrapRun> {
  if (authorization !== taxonomyLiveAuthorization) return refused("authorization", "semantic taxonomy live authorization required");
  const resolved = path.resolve(outDir);
  if (taxonomyLiveForbiddenDirs.some((dir) => path.resolve(dir) === resolved)) return refused("output", "earlier experiment records stay unchanged");
  try {
    assertTrapOutput(outDir);
  } catch (error) {
    return refused("output", error instanceof Error ? error.message : "output refused");
  }
  const plan = assessTaxonomyLive();
  if (!plan.ready) return refused(null, plan.failures.join("; ") || "key_equivalence_uncertain");
  const officialTexts = loadOfficialComparisonCorpus();
  if (!officialTexts?.length) return refused("corpus", "official comparison corpus is not loaded");
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refused("budget", "OpenRouter prices are not loaded");
  const items = taxonomyLiveItems().map((entry) => entry.item);
  const estimate = qualityCostEstimate(prices, items.length);
  const graph = qualityCallGraph(items.length);
  if (estimate === null || estimate > trapMaxCostUsd) return refused("budget", "the taxonomy live estimate does not fit under the cap");
  const models = { ...openrouterPrecheckModels };
  const config = loadAIConfig();
  const missing = [parseModel(models.generator, config.provider).provider, parseModel(models.judge, config.provider).provider].find((name) => !config.keys[name]);
  if (missing) return refused("authorization", `missing ${missing} API key`);
  if (existsSync(path.join(outDir, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(outDir, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refused("output", "a completed taxonomy live run is already stored; it was not run again");
  }
  const cache = new Map<string, AIProvider>();
  const { createProvider } = await import("../ai/service");
  return executeCognitiveTrap({
    authorization: trapAuthorization,
    prices,
    models,
    outDir,
    officialTexts,
    items,
    profile: "quality",
    cacheSalt: taxonomyLiveAuthorization,
    limits: { maxCalls: graph.maxCalls, maxCostUsd: estimate },
    providerFor: (setting) => {
      const parsed = parseModel(setting, config.provider);
      const existing = cache.get(parsed.provider);
      if (existing) return existing;
      const created = createProvider(config, parsed.provider);
      cache.set(parsed.provider, created);
      return created;
    },
  });
}

/** Classifies stored quality evidence. It does not call a provider and does not start active recovery. */
export function qualityFirstPilotDryRun(record: TrapComparison, productionCostUsd: number | null = null): RecoveryAttachment {
  return attachRecovery(record, { mode: "dry_run", productionCostUsd });
}

/** Only option-level confirmed repairEligible defects, and only when recovery is not blocked. */
export function qualityFirstRepairCandidates(attachment: RecoveryAttachment): DiagnosticEvidence[] {
  if (attachment.blocked === "key_review" || attachment.blocked === "second_answer") return [];
  return attachment.diagnosticEvidence.filter((item) => item.scope === "option" && item.verificationStatus === "confirmed" && item.repairEligible);
}

export function qualityFirstPilotPlan(prices: Prices | null, officialTexts: readonly string[] = []) {
  const assessment = assessQualityFirstPilot(officialTexts);
  const items = qualityFirstItems();
  const graph = qualityCallGraph(items.length);
  const estimate = prices ? qualityCostEstimate(prices, items.length) : null;
  const productionCap = Math.min(estimate ?? qualityFirstPilotSpendCapUsd, qualityFirstPilotSpendCapUsd);
  const budgetFits = estimate !== null && estimate <= qualityFirstPilotSpendCapUsd;
  return {
    version: qualityFirstPilotAuthorization,
    liveAuthorized: qualityFirstPilotLiveAuthorized,
    livePilotDecision: "not_ready" as const,
    livePilotReason: "this round is preparation; live API calls are not authorized",
    preparationComplete: assessment.ready && budgetFits,
    callOrder: qualityFirstActualCallOrder,
    frozen: qualityFirstFrozenModels,
    contract: {
      writerCallsPerItem: qualityFirstPilotWriterCallsPerItem,
      judgeCallsPerItem: qualityFirstPilotJudgeCallsPerItem,
      retry: qualityFirstPilotRetry,
      maxWriterCalls: qualityFirstPilotMaxWriterCalls,
      maxJudgeCalls: qualityFirstPilotMaxJudgeCalls,
      maxProviderCalls: qualityFirstPilotMaxProviderCalls,
      sourceAndKeyFixed: true,
      fiveOptionTarget: true,
      recoveryDefault: "off" as const,
      recoveryAfterProduction: "dry_run" as const,
      recoveryActive: false,
    },
    graph,
    productionBudget: {
      estimatedUsd: estimate,
      spendCapUsd: qualityFirstPilotSpendCapUsd,
      maxCostUsd: productionCap,
      separateFromRecovery: true,
      liveAuthorized: qualityFirstPilotLiveAuthorized,
      historicalFourItemCostUsd: 0.066904,
      historicalNote: "previous pilot measurement only; not an estimate for this run",
    },
    recoveryBudget: {
      provider: "openrouter" as const,
      model: qualityFirstFrozenModels.writer,
      calls: 0,
      retry: 0 as const,
      estimatedUsd: 0,
      separateFromProduction: true as const,
      liveAuthorized: false as const,
      mode: "dry_run" as const,
      active: false,
    },
    metrics: qualityFirstMetricsPlaceholder,
    assessment,
    items: items.map((entry) => ({
      id: entry.item.id,
      questionType: entry.questionType,
      direction: entry.direction,
      designTarget: entry.designTarget,
      observedDifficulty: entry.observedDifficulty,
      source: sourceSentence(entry.item),
      key: entry.item.core.correctAnswer,
      cognitiveTraps: entry.cognitiveTraps,
      cognitiveDemand: entry.cognitiveDemand,
      meaningMap: entry.meaningMap,
      priorStructuralDifference: entry.priorStructuralDifference,
    })),
  };
}

/**
 * Four-item quality-first production pilot on Cognitive Trap First.
 * This round writes a plan and refuses the provider. A later token plus the live flag would start it.
 */
export async function itemFactoryQualityFirstPilot(authorization: string, outDir = qualityFirstPilotOutputDir): Promise<TrapRun> {
  if (authorization !== qualityFirstPilotAuthorization) return refused("authorization", "quality-first production authorization required");
  const resolved = path.resolve(outDir);
  if (qualityFirstPilotForbiddenDirs.some((dir) => path.resolve(dir) === resolved)) return refused("output", "earlier experiment records stay unchanged");
  try {
    assertTrapOutput(outDir);
  } catch (error) {
    return refused("output", error instanceof Error ? error.message : "output refused");
  }
  const officialTexts = loadOfficialComparisonCorpus();
  if (!officialTexts?.length) return refused("corpus", "official comparison corpus is not loaded");
  const assessment = assessQualityFirstPilot(officialTexts);
  if (!assessment.ready) return refused(null, assessment.failures.join("; ") || "key_equivalence_uncertain");
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return refused("budget", "OpenRouter prices are not loaded");
  const items = qualityFirstItems().map((entry) => entry.item);
  const estimate = qualityCostEstimate(prices, items.length);
  const graph = qualityCallGraph(items.length);
  if (estimate === null || estimate > qualityFirstPilotSpendCapUsd) return refused("budget", "the quality-first estimate does not fit under the $0.25 cap");
  if (graph.writerCalls > qualityFirstPilotMaxWriterCalls || graph.judgeCalls > qualityFirstPilotMaxJudgeCalls || graph.maxCalls > qualityFirstPilotMaxProviderCalls) {
    return refused("budget", "the quality-first call graph exceeds 8 writer, 4 judge, or 12 provider calls");
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "plan.json"), `${JSON.stringify(qualityFirstPilotPlan(prices, officialTexts), null, 2)}\n`);
  const base: TrapRun = {
    ...refused("authorization", "quality-first production live call is not authorized"),
    ready: true,
    estimatedUsd: estimate,
    maxCalls: graph.maxCalls,
    maxCostUsd: Math.min(estimate, qualityFirstPilotSpendCapUsd),
    costAssumption,
    recoveryMode: "off",
  };
  if (!qualityFirstPilotLiveAuthorized) return base;
  const models = { ...openrouterPrecheckModels };
  const config = loadAIConfig();
  const missing = [parseModel(models.generator, config.provider).provider, parseModel(models.judge, config.provider).provider].find((name) => !config.keys[name]);
  if (missing) return refused("authorization", `missing ${missing} API key`);
  if (existsSync(path.join(outDir, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(outDir, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return refused("output", "a completed quality-first run is already stored; it was not run again");
  }
  const cache = new Map<string, AIProvider>();
  const { createProvider } = await import("../ai/service");
  const produced = await executeCognitiveTrap({
    authorization: trapAuthorization,
    prices,
    models,
    outDir,
    officialTexts,
    items,
    profile: "quality",
    cacheSalt: qualityFirstPilotAuthorization,
    recovery: { mode: "off" },
    limits: { maxCalls: graph.maxCalls, maxCostUsd: Math.min(estimate, qualityFirstPilotSpendCapUsd), maxRegenerations: qualityFirstPilotRetry },
    providerFor: (setting) => {
      const parsed = parseModel(setting, config.provider);
      const existing = cache.get(parsed.provider);
      if (existing) return existing;
      const created = createProvider(config, parsed.provider);
      cache.set(parsed.provider, created);
      return created;
    },
  });
  produced.records = produced.records.map((record) => ({
    ...record,
    recovery: qualityFirstPilotDryRun(record, produced.costUsd),
  }));
  return produced;
}

export const qualityJudgeReplayAuthorization = "quality-judge-replay-v1";
export const qualityJudgeReplayDir = ".data/analysis/_factory/cognitive-trap/quality-judge-replay-v1";
export const qualityJudgeReplayIds = ["quality-restatement-medium", "quality-restatement-hard", "quality-translation-tr_en"] as const;

const replayJudgeAssumption = "Upper bound is three Sonnet judge calls at 4000 input, 4096 output and 1700 cache-write tokens. No writer call. It is not a measured bill.";

/** Three judge calls only. The writer estimate is not included. */
export function qualityJudgeReplayEstimate(prices: Prices): number | null {
  const judge = priceFor(prices.table, openrouterPrecheckModels.judge);
  if (!judge) return null;
  return (qualityJudgeReplayIds.length * (4000 * judge.in + 4096 * judge.out + 1700 * (judge.cacheWrite ?? 0))) / 1_000_000;
}

export type QualityJudgeReplayItem = {
  id: (typeof qualityJudgeReplayIds)[number];
  questionType: TrapItem["questionType"];
  direction: TrapItem["direction"];
  source: string;
  key: string;
  keyLetter: OptionLabel;
  options: Record<OptionLabel, string>;
  stem: string;
  designTarget: "medium" | "hard";
  judgeUser: string;
  gate: WholeSetGate;
};

/** Reads the three saved five-option items. Does not write and does not include the cut EN→TR item. */
export function qualityJudgeReplayPlan(dir = qualityOutputDir): { items: QualityJudgeReplayItem[]; failures: string[] } {
  const items: QualityJudgeReplayItem[] = [];
  const failures: string[] = [];
  for (const id of qualityJudgeReplayIds) {
    const file = path.join(dir, `${id}.json`);
    if (!existsSync(file)) {
      failures.push(`${id}:missing`);
      continue;
    }
    const saved = JSON.parse(readFileSync(file, "utf8")) as {
      source?: string;
      key?: string;
      arms?: { B?: { keyLetter?: OptionLabel; options?: Record<OptionLabel, string> | null } };
    };
    const designed = qualityItems().find((entry) => entry.item.id === id);
    const sentence = designed ? sourceSentence(designed.item) : "";
    const options = saved.arms?.B?.options;
    const keyLetter = saved.arms?.B?.keyLetter;
    const complete = Boolean(options && keyLetter && optionLabels.every((label) => typeof options[label] === "string" && options[label].trim().length > 0));
    if (!designed || saved.source !== sentence || saved.key !== designed.item.core.correctAnswer || !complete || !options || !keyLetter || options[keyLetter] !== saved.key) {
      failures.push(`${id}:saved_text`);
      continue;
    }
    const ordered = Object.fromEntries(optionLabels.map((label) => [label, options[label]])) as Record<OptionLabel, string>;
    const model = modelOf(designed.item);
    items.push({
      id,
      questionType: designed.item.questionType,
      direction: designed.item.direction,
      source: saved.source,
      key: saved.key,
      keyLetter,
      options: ordered,
      stem: designed.item.core.stem,
      designTarget: designed.designTarget,
      judgeUser: judgeUser(model, designed.item.core.stem, ordered, designed.item.source, designed.designTarget),
      gate: assessWholeSet({ source: sentence, key: saved.key, options: ordered, correct: keyLetter }),
    });
  }
  return { items, failures };
}

export type QualityJudgeReplayRecord = {
  id: string;
  questionType: TrapItem["questionType"];
  direction: TrapItem["direction"];
  source: string;
  key: string;
  keyLetter: OptionLabel;
  options: Record<OptionLabel, string>;
  gate: { decision: WholeSetGate["decision"]; failure: string | null; risks: WholeSetGate["risks"]; options: WholeSetGate["options"]; meaningProven: false; approvesTarget: false };
  judge: {
    blindAnswer: OptionLabel;
    blindConfidence: number;
    blindUncertain: boolean;
    blindAlternative: OptionLabel | null;
    secondDefensible: OptionLabel[];
    grammar: number;
    clueRisk: number;
    distractorQuality: number;
    difficultyFit: number;
    estimatedDifficulty: string;
    modelVerdict: string;
    reasons: string[];
  } | null;
  ruled: { verdict: JudgeDecision["verdict"]; failures: string[]; concerns: string[] } | null;
  factoryVerdict: "FAIL" | "REVIEW";
  factoryFailures: string[];
  editorApproved: false;
  mediumHardApproval: false;
  meaningProven: false;
  typeSemantic: { status: "not_run"; focus: string; reason: string };
  studentBankWrites: 0;
  editorialRemaining: boolean;
  usage: { inputTokens: number; outputTokens: number; reasoningTokens: number | null; cached: boolean };
};

export type QualityJudgeReplayRun = {
  started: boolean;
  executed: boolean;
  lock: "authorization" | "budget" | "output" | "records" | null;
  reason: string | null;
  providerCalls: number;
  costUsd: number | null;
  maxCalls: 3;
  maxCostUsd: number | null;
  estimatedUsd: number | null;
  costAssumption: string;
  retry: 0;
  writerCalls: 0;
  qualityProven: false;
  meaningProven: false;
  studentBankWrites: 0;
  benchmarkStarted: false;
  editorApproved: false;
  records: QualityJudgeReplayRecord[];
};

function replayRefused(lock: QualityJudgeReplayRun["lock"], reason: string | null, estimatedUsd: number | null = null): QualityJudgeReplayRun {
  return {
    started: false,
    executed: false,
    lock,
    reason,
    providerCalls: 0,
    costUsd: null,
    maxCalls: 3,
    maxCostUsd: estimatedUsd,
    estimatedUsd,
    costAssumption: replayJudgeAssumption,
    retry: 0,
    writerCalls: 0,
    qualityProven: false,
    meaningProven: false,
    studentBankWrites: 0,
    benchmarkStarted: false,
    editorApproved: false,
    records: [],
  };
}

function replayConcerns(item: QualityJudgeReplayItem): string[] {
  const unresolved = item.gate.options.filter((entry) => entry.label !== item.keyLetter && entry.relation === "unresolved").map((entry) => `unresolved_${entry.label}`);
  return [...item.gate.risks.key_semantic_risk, ...item.gate.risks.distractor_equivalence_risk, ...item.gate.risks.whole_set_clue_risk, ...unresolved].map((code) => `quality_${code}`);
}

/**
 * Replays the blind judge on the three saved five-option items.
 * The judge prompt is the existing one. It does not receive the key letter or the earlier gate.
 */
export async function itemFactoryQualityJudgeReplay(authorization: string, outDir = qualityJudgeReplayDir, providerFor?: (setting: string) => AIProvider, cacheSalt = qualityJudgeReplayAuthorization): Promise<QualityJudgeReplayRun> {
  if (authorization !== qualityJudgeReplayAuthorization) return replayRefused("authorization", "quality judge replay authorization required");
  const resolved = path.resolve(outDir);
  const frozen = [qualityOutputDir, ".data/analysis/_factory/cognitive-trap/openrouter-v1", pilotOutputDir];
  if (frozen.some((dir) => path.resolve(dir) === resolved)) return replayRefused("output", "earlier factory records stay unchanged");
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  if (!prices) return replayRefused("budget", "OpenRouter prices are not loaded");
  const estimate = qualityJudgeReplayEstimate(prices);
  if (estimate === null) return replayRefused("budget", "the judge estimate could not be calculated");
  const plan = qualityJudgeReplayPlan();
  if (plan.failures.length || plan.items.length !== qualityJudgeReplayIds.length) return replayRefused("records", plan.failures.join(", ") || "three saved items are required", estimate);
  if (existsSync(path.join(outDir, "summary.json"))) {
    const previous = JSON.parse(readFileSync(path.join(outDir, "summary.json"), "utf8")) as { executed?: boolean };
    if (previous.executed) return replayRefused("output", "a completed judge replay is already stored; it was not run again", estimate);
  }
  const models = { ...openrouterPrecheckModels };
  let resolveProvider = providerFor;
  if (!resolveProvider) {
    const config = loadAIConfig();
    const missing = parseModel(models.judge, config.provider).provider;
    if (!config.keys[missing]) return replayRefused("authorization", `missing ${missing} API key`, estimate);
    const { createProvider } = await import("../ai/service");
    const created = createProvider(config, missing);
    resolveProvider = () => created;
  }
  let budget: SpendBudget;
  try {
    budget = new SpendBudget({ maxCalls: qualityJudgeReplayIds.length, maxRegenerations: 0, maxCostUsd: estimate }, prices, [models.judge]);
  } catch (error) {
    return replayRefused("budget", error instanceof Error ? error.message : "budget refused", estimate);
  }
  const provider = budget.meter(resolveProvider(models.judge));
  const judge = parseModel(models.judge);
  const records: QualityJudgeReplayRecord[] = [];
  for (const item of plan.items) {
    const called = await oneCall(provider, itemJudgePromptVersion, itemJudgePacket, {
      model: judge.model,
      system: judgeSystem,
      user: item.judgeUser,
      jsonSchema: judgeResponseSchemaForItem(),
      maxOutputTokens: 1200,
      cacheSalt: `${cacheSalt}:${item.id}`,
    });
    const concerns = replayConcerns(item);
    const shared = {
      id: item.id,
      questionType: item.questionType,
      direction: item.direction,
      source: item.source,
      key: item.key,
      keyLetter: item.keyLetter,
      options: item.options,
      gate: { decision: item.gate.decision, failure: item.gate.failure, risks: item.gate.risks, options: item.gate.options, meaningProven: false as const, approvesTarget: false as const },
      editorApproved: false as const,
      mediumHardApproval: false as const,
      meaningProven: false as const,
      typeSemantic: { status: "not_run" as const, focus: typeSemanticFocus[item.questionType], reason: "No type-specific semantic instrument has run. The shared judge is not that proof." },
      studentBankWrites: 0 as const,
    };
    const packet = called.ran && !called.error ? itemJudgePacket.safeParse(called.value) : null;
    if (!called.ran || called.error || !packet?.success) {
      records.push({
        ...shared,
        judge: null,
        ruled: null,
        factoryVerdict: "FAIL",
        factoryFailures: [item.gate.failure ?? (!called.ran ? called.error : called.error ?? "judge_schema")],
        editorialRemaining: false,
        usage: { inputTokens: called.ran ? called.usage.inputTokens : 0, outputTokens: called.ran ? called.usage.outputTokens : 0, reasoningTokens: called.ran ? (called.usage.reasoningTokens ?? null) : null, cached: called.ran ? called.cached : false },
      });
      continue;
    }
    const ruled = judgeDecision({
      spec: { answerConstraints: { correctOption: item.keyLetter }, difficulty: { band: item.designTarget } },
      validation: { status: "pass", issues: [] },
      judge: { ...packet.data, planConcerns: concerns },
    });
    const second = packet.data.report.alternativeDefensibleOptions.filter((label) => label !== item.keyLetter);
    if (packet.data.blindAlternative && packet.data.blindAlternative !== item.keyLetter && !second.includes(packet.data.blindAlternative)) second.push(packet.data.blindAlternative);
    const factoryFailures = [item.gate.failure, ruled.verdict === "REJECT" ? "judge_rejected" : null].filter((entry): entry is string => Boolean(entry));
    const factoryVerdict = item.gate.decision === "fail" || ruled.verdict === "REJECT" ? "FAIL" : "REVIEW";
    records.push({
      ...shared,
      judge: {
        blindAnswer: packet.data.blindAnswer,
        blindConfidence: packet.data.blindConfidence,
        blindUncertain: packet.data.blindUncertain,
        blindAlternative: packet.data.blindAlternative,
        secondDefensible: second,
        grammar: packet.data.report.scores.grammar,
        clueRisk: packet.data.report.scores.clueRisk,
        distractorQuality: packet.data.report.scores.distractorQuality,
        difficultyFit: packet.data.report.scores.difficultyFit,
        estimatedDifficulty: packet.data.report.estimatedDifficulty,
        modelVerdict: packet.data.report.verdict,
        reasons: packet.data.report.reasons,
      },
      ruled: { verdict: ruled.verdict, failures: ruled.failures, concerns: ruled.concerns },
      factoryVerdict,
      factoryFailures,
      editorialRemaining: factoryVerdict === "REVIEW",
      usage: { inputTokens: called.usage.inputTokens, outputTokens: called.usage.outputTokens, reasoningTokens: called.usage.reasoningTokens ?? null, cached: called.cached },
    });
  }
  const cost = budget.cost();
  const summary: QualityJudgeReplayRun = {
    started: true,
    executed: true,
    lock: null,
    reason: null,
    providerCalls: budget.calls,
    costUsd: cost.usd,
    maxCalls: 3,
    maxCostUsd: estimate,
    estimatedUsd: estimate,
    costAssumption: replayJudgeAssumption,
    retry: 0,
    writerCalls: 0,
    qualityProven: false,
    meaningProven: false,
    studentBankWrites: 0,
    benchmarkStarted: false,
    editorApproved: false,
    records,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify({ ...summary, records: summary.records.length }, null, 2)}\n`);
  for (const record of records) writeFileSync(path.join(outDir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  return summary;
}
