import type { OptionLabel } from "@/modules/analysis/contract";
import { surfaceEdit } from "./cognitive-trap";
import { contentVersion } from "./distractor-strategy";
import { assessWholeSet } from "./whole-set";

/**
 * Optional layer after Factory quality evaluation.
 * executeCognitiveTrap does not call this. The default is off.
 * A caller opts in with enabled: true and a separate recovery budget.
 */
export const recoveryVersion = "recovery-orchestrator.v1";
export const recoveryDefaultEnabled = false;

export type RecoveryDecision = "accept" | "repair" | "replace" | "review";

const localRepairCodes = new Set(["target_language_mismatch", "unnatural_option", "incomplete_option", "only_complete_option", "key_length_clue", "unsupported_extension"]);
const reviewCodes = new Set(["key_equivalence_uncertain", "second_defensible", "second_answer_uncertain", "relation_unverified", "unresolved_defect"]);

export type RecoverySignal = {
  optionId: OptionLabel;
  code: string;
  evidence?: string;
  mechanismId?: string;
  mechanismSustainable?: boolean;
  targetMisreading?: string;
};

export type RecoveryCallResult = {
  outcome: "replacement" | "repair_not_possible" | "technical_failure";
  text?: string | null;
  mechanismId?: string;
  technicalCodes?: string[];
  introducesNewMeaningError?: boolean;
  modelOutput?: string | null;
  costUsd?: number;
};

export type RecoveryHandlers = {
  repair?: (input: { optionId: OptionLabel; before: string; signal: RecoverySignal }) => RecoveryCallResult;
  replace?: (input: { optionId: OptionLabel; before: string; signal: RecoverySignal; forbiddenMechanismIds: string[] }) => RecoveryCallResult;
};

export type RecoveryAudit = {
  optionId: OptionLabel;
  decision: RecoveryDecision;
  executed: boolean;
  before: string;
  after: string;
  defectCode: string | null;
  evidence: string | null;
  targetMisreading: string | null;
  modelOutput: string | null;
  costUsd: number;
  validation: string[];
  technicalFailure: string[] | null;
  semanticFailure: string | null;
};

export type RecoveryPerformance = {
  attempted: number;
  succeeded: number;
  notPossible: number;
  rejected: number;
  technicalFailures: number;
  originalsKept: number;
};

export type RecoveryResult = {
  version: typeof recoveryVersion;
  enabled: boolean;
  applied: boolean;
  blocked: null | "disabled" | "hash_mismatch" | "budget" | "key_review" | "second_answer";
  providerCalls: number;
  repairCalls: number;
  replaceCalls: number;
  retry: 0;
  options: Record<OptionLabel, string>;
  sourceHash: string;
  keyHash: string;
  rows: RecoveryAudit[];
  repair: RecoveryPerformance;
  replace: RecoveryPerformance;
  productionCostUsd: number;
  recoveryCostUsd: number;
  wholeSetRechecked: boolean;
  meaningProven: false;
  qualityProven: false;
  editorial: "pending";
  studentBankWrite: false;
  benchmarkStarted: false;
};

export type RecoveryInput = {
  enabled?: boolean;
  source: string;
  key: string;
  sourceHash: string;
  keyHash: string;
  options: Record<OptionLabel, string>;
  correct?: OptionLabel;
  signals?: readonly RecoverySignal[];
  budgetUsd?: number;
  estimatedUsd?: number | null;
  productionCostUsd?: number;
  handlers?: RecoveryHandlers;
};

function emptyPerformance(): RecoveryPerformance {
  return { attempted: 0, succeeded: 0, notPossible: 0, rejected: 0, technicalFailures: 0, originalsKept: 0 };
}

function copyOptions(options: Record<OptionLabel, string>): Record<OptionLabel, string> {
  return { A: options.A, B: options.B, C: options.C, D: options.D, E: options.E };
}

function base(input: RecoveryInput, blocked: RecoveryResult["blocked"], options = copyOptions(input.options)): RecoveryResult {
  return {
    version: recoveryVersion,
    enabled: input.enabled === true,
    applied: false,
    blocked,
    providerCalls: 0,
    repairCalls: 0,
    replaceCalls: 0,
    retry: 0,
    options,
    sourceHash: input.sourceHash,
    keyHash: input.keyHash,
    rows: [],
    repair: emptyPerformance(),
    replace: emptyPerformance(),
    productionCostUsd: input.productionCostUsd ?? 0,
    recoveryCostUsd: 0,
    wholeSetRechecked: false,
    meaningProven: false,
    qualityProven: false,
    editorial: "pending",
    studentBankWrite: false,
    benchmarkStarted: false,
  };
}

function callsAllowed(input: RecoveryInput): boolean {
  return input.estimatedUsd !== null && input.estimatedUsd !== undefined && input.budgetUsd !== undefined && input.estimatedUsd <= input.budgetUsd;
}

function actionableEvidence(signal: RecoverySignal): boolean {
  const evidence = signal.evidence?.trim() ?? "";
  if (!evidence || evidence === signal.code) return false;
  if (signal.code === "unsupported_extension" && evidence.split(/\s+/).length < 2) return false;
  return true;
}

/**
 * Classifies one post-quality five. It does not call a provider unless enabled, in budget, and a handler is present.
 * Accept is not a meaning proof. Local success does not approve the five.
 */
export function recoverAfterQuality(input: RecoveryInput): RecoveryResult {
  if (input.enabled !== true) return base(input, "disabled");
  const correct = input.correct ?? "A";
  if (contentVersion(input.source) !== input.sourceHash || contentVersion(input.key) !== input.keyHash || input.options[correct] !== input.key) return base(input, "hash_mismatch");
  const signals = input.signals ?? [];
  if (signals.some((signal) => signal.code === "key_equivalence_uncertain")) return base(input, "key_review");
  if (signals.some((signal) => signal.code === "second_defensible" || signal.code === "second_answer_uncertain")) return base(input, "second_answer");
  if (!callsAllowed(input)) return base(input, "budget");

  const result = base(input, null);
  result.applied = true;
  const options = result.options;
  const rounds = new Map<OptionLabel, { repair: number; replace: number }>();
  const seenMechanism = new Map<OptionLabel, string[]>();

  const commit = (optionId: OptionLabel, text: string): string[] => {
    const validation: string[] = [];
    if (!text.trim() || text.trim() === options[optionId]) validation.push("no_change");
    if (text.trim() === input.key || surfaceEdit(input.key, text)) validation.push("second_defensible");
    for (const [label, existing] of Object.entries(options) as [OptionLabel, string][]) {
      if (label !== optionId && existing === text.trim()) validation.push("duplicate_option");
    }
    if (validation.length) return validation;
    const next = { ...options, [optionId]: text.trim() };
    result.wholeSetRechecked = true;
    const gate = assessWholeSet({ source: input.source, key: input.key, options: next, correct });
    if (gate.failure) return [gate.failure];
    if (contentVersion(input.source) !== input.sourceHash || contentVersion(input.key) !== input.keyHash) return ["source_or_key_changed"];
    options[optionId] = text.trim();
    return [];
  };

  for (const optionId of ["B", "C", "D", "E"] as const) {
    const own = signals.filter((signal) => signal.optionId === optionId);
    const ignored = own.filter((signal) => signal.code === "mechanism_unverified").map((signal) => signal.code);
    const review = own.find((signal) => reviewCodes.has(signal.code));
    const priorImpossible = own.find((signal) => signal.code === "repair_not_possible");
    const local = own.find((signal) => localRepairCodes.has(signal.code) && signal.mechanismSustainable !== false && actionableEvidence(signal));
    const unsustainable = own.find((signal) => signal.mechanismSustainable === false && signal.code !== "mechanism_unverified");
    let decision: RecoveryDecision = "accept";
    let signal: RecoverySignal | null = null;
    if (review) {
      decision = "review";
      signal = review;
    } else if (priorImpossible || unsustainable) {
      decision = "replace";
      signal = priorImpossible ?? unsustainable ?? null;
    } else if (local) {
      decision = "repair";
      signal = local;
    }
    const before = options[optionId];
    const forbid = signal?.mechanismId ? [signal.mechanismId] : [];
    seenMechanism.set(optionId, forbid);
    const used = rounds.get(optionId) ?? { repair: 0, replace: 0 };

    const openRow = (kind: RecoveryDecision, current: RecoverySignal | null): RecoveryAudit => ({
      optionId,
      decision: kind,
      executed: false,
      before,
      after: options[optionId],
      defectCode: current?.code ?? null,
      evidence: current?.evidence ?? null,
      targetMisreading: current?.targetMisreading ?? null,
      modelOutput: null,
      costUsd: 0,
      validation: ignored.length && kind === "accept" ? ["mechanism_unverified_ignored"] : [],
      technicalFailure: null,
      semanticFailure: null,
    });

    const applyCall = (kind: "repair" | "replace", current: RecoverySignal, call: RecoveryCallResult) => {
      const row = openRow(kind, current);
      row.executed = true;
      row.modelOutput = call.modelOutput ?? call.text ?? null;
      row.costUsd = call.costUsd ?? 0;
      result.recoveryCostUsd += row.costUsd;
      result.providerCalls += 1;
      if (kind === "repair") result.repairCalls += 1;
      else result.replaceCalls += 1;
      if (call.outcome === "technical_failure") {
        row.technicalFailure = call.technicalCodes?.length ? call.technicalCodes : ["technical_failure"];
        result[kind].attempted += 1;
        result[kind].technicalFailures += 1;
        result[kind].originalsKept += 1;
        result.rows.push(row);
        return call.outcome;
      }
      if (call.outcome === "repair_not_possible") {
        row.semanticFailure = "repair_not_possible";
        result.repair.attempted += 1;
        result.repair.notPossible += 1;
        result.repair.originalsKept += 1;
        result.rows.push(row);
        return call.outcome;
      }
      if (kind === "replace" && call.mechanismId && forbid.includes(call.mechanismId)) {
        row.semanticFailure = "mechanism_repeated";
        row.validation = ["mechanism_repeated"];
        result.replace.attempted += 1;
        result.replace.rejected += 1;
        result.replace.originalsKept += 1;
        result.rows.push(row);
        return "rejected" as const;
      }
      if (call.introducesNewMeaningError) {
        row.semanticFailure = "new_meaning_error";
        row.validation = ["new_meaning_error"];
        row.decision = "review";
        result[kind].attempted += 1;
        result[kind].rejected += 1;
        result[kind].originalsKept += 1;
        result.rows.push(row);
        return "rejected" as const;
      }
      const validation = commit(optionId, call.text ?? "");
      row.validation = validation;
      row.after = options[optionId];
      if (validation.length) {
        row.semanticFailure = validation[0] ?? "rejected";
        if (validation.includes("second_defensible") || validation.includes("confirmed_equivalent")) row.decision = "review";
        result[kind].attempted += 1;
        result[kind].rejected += 1;
        result[kind].originalsKept += 1;
        result.rows.push(row);
        return "rejected" as const;
      }
      if (call.mechanismId) seenMechanism.set(optionId, [...forbid, call.mechanismId]);
      result[kind].attempted += 1;
      result[kind].succeeded += 1;
      result.rows.push(row);
      return "accepted" as const;
    };

    if (decision === "repair" && signal && used.repair < 1 && input.handlers?.repair) {
      used.repair += 1;
      const call = input.handlers.repair({ optionId, before, signal });
      const outcome = applyCall("repair", signal, call);
      if (outcome === "repair_not_possible" && used.replace < 1 && input.handlers.replace) {
        used.replace += 1;
        const replaced = input.handlers.replace({ optionId, before: options[optionId], signal, forbiddenMechanismIds: [...(seenMechanism.get(optionId) ?? forbid)] });
        applyCall("replace", signal, replaced);
      }
    } else if (decision === "replace" && signal && used.replace < 1 && input.handlers?.replace) {
      used.replace += 1;
      const call = input.handlers.replace({ optionId, before, signal, forbiddenMechanismIds: [...forbid] });
      applyCall("replace", signal, call);
    } else result.rows.push(openRow(decision, signal));
    rounds.set(optionId, used);
    if (used.repair > 1 || used.replace > 1) throw new Error("recovery round limit exceeded");
  }
  result.options = options;
  return result;
}
