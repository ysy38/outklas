import type { OptionLabel } from "@/modules/analysis/contract";
import { assessTargetLanguage } from "@/modules/factory/item-model/option-language";
import { assessWholeSet } from "@/modules/factory/item-model/whole-set";
import type { RepairTask } from "./contract";
import { hashText } from "./contract";

export type RepairOutcome = "option_repair_success" | "repair_not_possible" | "needs_revision";

export type RepairVerdict = {
  outcome: RepairOutcome;
  /** True only for this option. It does not clear the five. */
  option_repair_success: boolean;
  kept: "candidate" | "original";
  keptText: string;
  sourceHash: string;
  keyHash: string;
  qualityDecision: "pending" | "needs_revision";
  editorial: "pending";
  meaningProven: false;
  reasons: string[];
  /** Overlap and a writer semanticRisk value are recorded here and do not decide the verdict. */
  ignored: string[];
};

const personTakenUp = /\b(board members|members|people|persons|readers|students)\b(?:\s+\S+){0,8}\s+taken up\b/i;

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const newOwnership = /\b(?:its|their) own\b|\bit's own\b|\b(?:its|the board's|the board’s) drafts\b/i;

function repairTokens(text: string): string[] {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function tokenDistance(left: string[], right: string[]): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dp[i]![0] = i;
  for (let j = 0; j < cols; j += 1) dp[0]![j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[left.length]![right.length]!;
}

/**
 * One sequential insert, delete, or substitution against the key.
 * A clause-order swap of the same events is not a near copy and is not a second key.
 * This is the repair-path reading of surfaceEdit's documented "one word" rule.
 */
export function repairNearCopyOfKey(key: string, candidate: string): boolean {
  if (candidate.trim() === key.trim()) return true;
  const left = repairTokens(key);
  const right = repairTokens(candidate);
  if (!left.length || !right.length) return false;
  if (left.join(" ") === right.join(" ")) return true;
  return tokenDistance(left, right) <= 2;
}

const laterMarker = /\b(?:afterward|afterwards|later)\b/i;

/** Both the exclusive "only afterward" and the missing "not taken up" are required checks. */
export function exclusivityAndNegation(candidate: string): string[] {
  const reasons: string[] = [];
  if (/\bonly afterward\b/i.test(candidate) || /\bonly\b/i.test(candidate)) reasons.push("exclusivity_remains");
  if (/\bwere taken up\b/i.test(candidate) || !/\bnot taken up\b/i.test(candidate)) reasons.push("negation_missing");
  if (!/\bdistributed\b/i.test(candidate)) reasons.push("distribution_missing");
  const uptake = candidate.search(/not taken up/i);
  const later = candidate.search(laterMarker);
  if (/\bnot taken up\b/i.test(candidate) && (uptake < 0 || later < 0 || later < uptake)) reasons.push("time_order_not_repaired");
  return reasons;
}

function localOutcome(task: RepairTask, candidate: string): { outcome: RepairOutcome; reasons: string[] } {
  if (task.issueCode === "unsupported_extension") {
    const reasons = exclusivityAndNegation(candidate);
    return reasons.length ? { outcome: "needs_revision", reasons } : { outcome: "option_repair_success", reasons: [] };
  }
  if (task.issueCode === "unnatural_option") {
    if (personTakenUp.test(candidate)) return { outcome: "needs_revision", reasons: ["unnatural_option"] };
    if (newOwnership.test(candidate)) return { outcome: "repair_not_possible", reasons: ["new_ownership_claim"] };
    return { outcome: "repair_not_possible", reasons: ["repair_not_possible"] };
  }
  return { outcome: "needs_revision", reasons: ["repair_not_possible"] };
}

/**
 * Keeps the original when the candidate is not an improvement.
 * semanticRisk never counts. meaningProven stays false. Editorial stays pending.
 */
export function revalidateRepair(input: {
  task: RepairTask;
  candidate: string;
  source: string;
  key: string;
  options: Record<OptionLabel, string>;
  targetLanguage: "tr" | "en";
  questionType: "restatement" | "translation";
  correct: OptionLabel;
  semanticRisk?: string | null;
}): RepairVerdict {
  const reasons: string[] = [];
  const ignored: string[] = [];
  if (input.semanticRisk) ignored.push("semanticRisk");
  const locked = {
    editorial: "pending" as const,
    meaningProven: false as const,
    ignored,
    sourceHash: input.task.sourceHash,
    keyHash: input.task.keyHash,
    keptText: input.task.originalOption,
    kept: "original" as const,
    option_repair_success: false as const,
  };
  if (hashText(input.source) !== input.task.sourceHash || hashText(input.key) !== input.task.keyHash) {
    return { ...locked, outcome: "needs_revision", qualityDecision: "needs_revision", reasons: ["source_or_key_changed"] };
  }
  const candidate = input.candidate.trim();
  if (!candidate || candidate === input.task.originalOption) {
    return { ...locked, outcome: "needs_revision", qualityDecision: "needs_revision", reasons: ["no_change"] };
  }
  const next = { ...input.options, [input.task.optionId]: candidate };
  const language = assessTargetLanguage({ questionType: input.questionType, targetLanguage: input.targetLanguage, options: next });
  if (language.status === "fail") reasons.push("target_language_mismatch");
  if (personTakenUp.test(candidate)) reasons.push("unnatural_option");
  if (words(candidate) < Math.ceil(words(input.task.originalOption) * 0.7) || !/\bbut\b/i.test(candidate)) reasons.push("incomplete_option");
  const local = localOutcome(input.task, candidate);
  reasons.push(...local.reasons);
  if (candidate === input.key || repairNearCopyOfKey(input.key, candidate)) reasons.push("second_defensible");
  for (const [label, text] of Object.entries(input.options)) {
    if (label !== input.task.optionId && text === candidate) reasons.push("duplicate_option");
  }
  const before = assessWholeSet({ source: input.source, key: input.key, options: input.options, correct: input.correct });
  const after = assessWholeSet({ source: input.source, key: input.key, options: next, correct: input.correct });
  const newClues = after.risks.whole_set_clue_risk.filter((clue) => !before.risks.whole_set_clue_risk.includes(clue));
  if (newClues.length) reasons.push(...newClues);
  const row = after.options.find((option) => option.label === input.task.optionId);
  if (row?.relation === "confirmed_equivalent") reasons.push("second_defensible");
  if (row?.relation === "unresolved" && row.overlap >= 0.72) ignored.push("high_overlap");
  if (local.outcome === "repair_not_possible" && reasons.every((reason) => reason === "new_ownership_claim" || reason === "repair_not_possible")) {
    return { ...locked, outcome: "repair_not_possible", qualityDecision: "needs_revision", reasons: [...new Set(reasons)] };
  }
  if (reasons.length) return { ...locked, outcome: "needs_revision", qualityDecision: "needs_revision", reasons: [...new Set(reasons)] };
  return {
    ...locked,
    outcome: "option_repair_success",
    option_repair_success: true,
    kept: "candidate",
    keptText: candidate,
    qualityDecision: "pending",
    reasons: [],
  };
}
