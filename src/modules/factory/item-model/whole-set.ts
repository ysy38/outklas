import type { OptionLabel } from "@/modules/analysis/contract";
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

/** Differences the pilot wording itself shows. Anything else stays unresolved. */
export function shownDifference(reference: string, option: string): string | null {
  const concession = /\b(even though|although|though)\b/i;
  const cause = /\b(so|because|since)\b/i;
  if (concession.test(reference) && cause.test(option) && !concession.test(option)) return "concession_to_cause";
  if (/\bbefore\b/i.test(reference) && /\bduring\b/i.test(option) && !/\bbefore\b/i.test(option)) return "before_to_during";
  if (/önce/i.test(reference) && /\bduring\b/i.test(option) && !/önce/i.test(option)) return "before_to_during";
  const counterfactual = /\bhad\b[\s\S]{0,80}\bwould\b/i.test(reference) || /\bwould have\b/i.test(reference);
  if (counterfactual && /\bbecause\b/i.test(option) && /\breceived\b/i.test(option) && !/\bwould\b/i.test(option)) return "counterfactual_to_factual";
  if (/\breceived\b/i.test(reference) && /\bsent\b/i.test(option) && !/\breceived\b/i.test(option)) return "recipient_to_sender";
  const all = /\b(all|every|each)\b/i;
  const only = /\bonly\b/i;
  if (all.test(reference) && only.test(option) && !all.test(option) && !only.test(reference)) return "all_to_only";
  if (only.test(reference) && all.test(option) && !only.test(option) && !all.test(reference)) return "only_to_all";
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
  if ((wording(option) === wording(key) || wording(option) === wording(source)) && wording(option).length > 0) return { relation: "confirmed_equivalent", evidence: "same_wording", overlap: shared };
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
