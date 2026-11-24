import type { OptionLabel } from "@/modules/analysis/contract";
import { looksTurkish } from "@/modules/analysis/surface";
import { assessMeaningIntegrity } from "./core";
import { discourseConnectorSwap } from "./cognitive-trap";
import { assessParaphraseKey, type ParaphraseDistance } from "./paraphrase-key";

/** A label is written only when the wording itself shows it. Overlap is never one of these. */
export type RelationVerdict = "confirmed_equivalent" | "confirmed_difference" | "unresolved";

export type WholeSetRisks = {
  key_semantic_risk: string[];
  distractor_equivalence_risk: string[];
  whole_set_clue_risk: string[];
};

export type WholeSetGate = {
  /** fail is a shown defect. review can still reach the existing judge. */
  decision: "fail" | "review";
  failure: string | null;
  risks: WholeSetRisks;
  paraphrase: ParaphraseDistance;
  options: { label: OptionLabel; relation: RelationVerdict; evidence: string | null; overlap: number }[];
  /** Always false. No relation here is a semantic pass, and none is measured difficulty. */
  meaningProven: false;
  approvesTarget: false;
};

function tokens(text: string): string[] {
  return text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((token) => token.length > 2);
}

function overlap(left: string, right: string): number {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

function wording(text: string): string {
  return text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function sentences(text: string): number {
  return text.split(/[.!?](?:\s|$)/).map((part) => part.trim()).filter(Boolean).length;
}

function foldTemporalTokens(text: string): string[] {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/\bprior to\b/g, "before")
    .replace(/\bahead of\b/g, "before")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function tokenSequenceDistance(a: string[], b: string[]): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dp[i]![0] = i;
  for (let j = 0; j < cols; j += 1) dp[0]![j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}

function quantityOrExclusivityMarkers(text: string): string {
  const folded = text
    .toLocaleLowerCase("tr-TR")
    .replace(/\bprior to\b/g, "before")
    .replace(/\bahead of\b/g, "before");
  const marks: string[] = [];
  if (/\bonly\b|\byalnızca\b|\byalnizca\b|\bsadece\b/i.test(folded)) marks.push("only");
  if (/\bat least\b|\ben az\b/i.test(folded)) marks.push("at_least");
  if (/\b(all|every|each)\b/i.test(folded) || /tüm|hepsi|bütün/.test(folded)) marks.push("all");
  if (/\b(two|iki|2)\b/i.test(folded)) marks.push("2");
  return marks.join(",");
}

/** Order-sensitive near copy after folding prior to/ahead of → before. Bag-of-words overlap is not this. Quantity/exclusivity marker changes are not copies. Turkish morphology is not a 2-edit copy. */
export function sequenceNearCopy(left: string, right: string): boolean {
  if (looksTurkish(left) || looksTurkish(right)) return false;
  const a = foldTemporalTokens(left);
  const b = foldTemporalTokens(right);
  if (!a.length || !b.length) return false;
  if (Math.abs(a.length - b.length) > 2) return false;
  if (tokenSequenceDistance(a, b) > 2) return false;
  if (quantityOrExclusivityMarkers(left) !== quantityOrExclusivityMarkers(right)) return false;
  return true;
}

function counterfactualWording(text: string): boolean {
  return /\bhad\b[\s\S]{0,80}\bwould\b/i.test(text) || /\bwould have\b/i.test(text);
}

/** Differences the pilot wording itself shows. Anything else stays unresolved. */
export function shownDifference(reference: string, option: string): string | null {
  const concession = /\b(even though|although|though)\b/i;
  const cause = /\b(so|because|since)\b/i;
  if (concession.test(reference) && cause.test(option) && !concession.test(option)) return "concession_to_cause";
  if (/\bbefore\b/i.test(reference) && /\bduring\b/i.test(option) && !/\bbefore\b/i.test(option)) return "before_to_during";
  if (/önce/i.test(reference) && /\bduring\b/i.test(option) && !/önce/i.test(option)) return "before_to_during";
  if (/\bbefore\b/i.test(reference) && /\bafter\b/i.test(option) && !/\bbefore\b/i.test(option) && !/\bprior to\b/i.test(option)) {
    return "before_to_after";
  }
  if (/\bafter\b/i.test(reference) && /\bbefore\b/i.test(option) && !/\bafter\b/i.test(option)) return "after_to_before";
  if (counterfactualWording(reference) && !counterfactualWording(option) && !/\bwould\b/i.test(option)) return "counterfactual_to_factual";
  if (/\breceived\b/i.test(reference) && /\bsent\b/i.test(option) && !/\breceived\b/i.test(option)) return "recipient_to_sender";
  const all = /\b(all|every|each)\b/i;
  const only = /\bonly\b/i;
  if (all.test(reference) && only.test(option) && !all.test(option) && !only.test(reference)) return "all_to_only";
  if (only.test(reference) && all.test(option) && !only.test(option) && !all.test(reference)) return "only_to_all";
  if (only.test(reference) && /\bat least\b/i.test(option) && !only.test(option)) return "only_to_at_least";
  return null;
}

export function classifyOption(source: string, key: string, option: string): { relation: RelationVerdict; evidence: string | null; overlap: number } {
  const shared = Math.max(overlap(option, source), overlap(option, key));
  if (discourseConnectorSwap(key, option) || discourseConnectorSwap(source, option)) return { relation: "unresolved", evidence: null, overlap: shared };
  const difference = shownDifference(source, option) ?? shownDifference(key, option);
  if (difference) return { relation: "confirmed_difference", evidence: difference, overlap: shared };
  const againstSource = assessMeaningIntegrity(source, option);
  const againstKey = assessMeaningIntegrity(key, option);
  if (againstSource.status === "fail") return { relation: "confirmed_difference", evidence: againstSource.failures[0] ?? "meaning_shift", overlap: shared };
  if (againstKey.status === "fail") return { relation: "confirmed_difference", evidence: againstKey.failures[0] ?? "meaning_shift", overlap: shared };
  if ((wording(option) === wording(key) || wording(option) === wording(source)) && wording(option).length > 0) {
    return { relation: "confirmed_equivalent", evidence: "same_wording", overlap: shared };
  }
  if (sequenceNearCopy(option, key) || sequenceNearCopy(option, source)) {
    return { relation: "confirmed_equivalent", evidence: "near_copy_sequence", overlap: shared };
  }
  return { relation: "unresolved", evidence: null, overlap: shared };
}

/**
 * Five options together. Overlap is recorded and is not an equivalence verdict.
 * The sentences are not rewritten. approvesTarget stays false.
 */
export function assessWholeSet(input: { source: string; key: string; options: Record<OptionLabel, string>; correct: OptionLabel }): WholeSetGate {
  const paraphrase = assessParaphraseKey(input.source, input.key);
  const risks: WholeSetRisks = { key_semantic_risk: [], distractor_equivalence_risk: [], whole_set_clue_risk: [] };
  if (paraphrase.failures.includes("key_near_copy")) risks.key_semantic_risk.push("key_near_copy");
  if (/\bstood to\b/i.test(input.key)) risks.key_semantic_risk.push("stood_to_prospective");
  if (/\bonce\b/i.test(input.key) && (/\bhad\b/i.test(input.source) || /\bwould have\b/i.test(input.source))) risks.key_semantic_risk.push("once_may_be_temporal");
  const wrongs = (Object.entries(input.options) as [OptionLabel, string][]).filter(([label]) => label !== input.correct);
  const keyWords = words(input.key);
  const wrongWords = wrongs.map(([, text]) => words(text));
  if (wrongWords.length > 0 && wrongWords.every((count) => keyWords >= count + 3)) risks.whole_set_clue_risk.push("key_length_clue");
  if (wrongWords.length > 0 && keyWords > Math.max(...wrongWords) && Math.min(...wrongWords) <= keyWords * 0.7) risks.whole_set_clue_risk.push("only_complete_option");
  if (sentences(input.key) >= 2 && wrongs.every(([, text]) => sentences(text) < 2)) risks.whole_set_clue_risk.push("two_sentence_key");
  const options = (Object.entries(input.options) as [OptionLabel, string][]).map(([label, text]) => {
    if (label === input.correct) return { label, relation: "unresolved" as const, evidence: null, overlap: 0 };
    const classified = classifyOption(input.source, input.key, text);
    if (classified.relation === "unresolved" && classified.overlap >= 0.72) risks.distractor_equivalence_risk.push(`${label}:overlap`);
    if (classified.relation === "unresolved" && classified.evidence === null && (discourseConnectorSwap(input.key, text) || discourseConnectorSwap(input.source, text))) risks.distractor_equivalence_risk.push(`${label}:discourse`);
    return { label, ...classified };
  });
  const equivalent = options.some((entry) => entry.relation === "confirmed_equivalent");
  const scope = paraphrase.failures.includes("scope_not_carried");
  const failure = equivalent ? "confirmed_equivalent" : scope ? "scope_not_carried" : null;
  return {
    decision: failure ? "fail" : "review",
    failure,
    risks,
    paraphrase: paraphrase.distance,
    options,
    meaningProven: false,
    approvesTarget: false,
  };
}
