import { classifyMisreading } from "./misreading-mechanisms";
import { shownDifference } from "./whole-set";

/**
 * A new verb or a new noun is not a new event. Synonym paraphrase stays clear.
 * An added coordinate clause, with-absolute, or contrast frame is only unresolved:
 * the same frame can restate an existing proposition. This module does not prove
 * unsupported_clause. That proof would need a lexical account it does not have.
 */
export type PropositionStatus = "clear" | "unverified" | "unsupported_clause";
export type MechanismAlignment = "not_labeled" | "supported" | "mechanism_unverified";

export type PropositionGuard = {
  status: PropositionStatus;
  mechanismStatus: MechanismAlignment;
  /** Structural frames that are not in the source or the key. Empty when the option stays inside the existing clauses. */
  signals: string[];
  reason: string;
  /** A writer label of none does not remove a signal or a mechanism gap. */
  semanticRiskClearsGuard: false;
};

const shownByDifference: Record<string, string> = {
  concession_to_cause: "CONCESSION_CAUSE",
  before_to_during: "TEMPORAL_SCOPE",
  counterfactual_to_factual: "COUNTERFACTUAL_FACTUAL",
  recipient_to_sender: "AGENT_ROLE",
  all_to_only: "QUANTITY_SCOPE",
  only_to_all: "QUANTITY_SCOPE",
};

function hasCoordinateClause(text: string): boolean {
  return /,\s+and\b|;\s+and\b/i.test(text);
}

function hasWithAbsolute(text: string): boolean {
  return /\bwith\b(?:\s+\p{L}+){1,6}\s+\p{L}+ing\b/iu.test(text);
}

function hasContrastFrame(text: string): boolean {
  return /\brather than\b|\binstead of\b|\bas opposed to\b|\bunlike\b/i.test(text);
}

/** Frames present in the option and absent from both the source and the key. */
export function addedFrames(source: string, key: string, option: string): string[] {
  const frames = [
    ["coordinate_clause", hasCoordinateClause],
    ["with_absolute", hasWithAbsolute],
    ["contrast_frame", hasContrastFrame],
  ] as const;
  return frames.filter(([, test]) => test(option) && !test(source) && !test(key)).map(([name]) => name);
}

function relationsShown(source: string, key: string, option: string): Set<string> {
  const shown = new Set<string>();
  for (const reference of [source, key]) {
    for (const id of classifyMisreading(reference, option).mechanisms) shown.add(id);
    const difference = shownDifference(reference, option);
    const mapped = difference ? shownByDifference[difference] : undefined;
    if (mapped) shown.add(mapped);
  }
  return shown;
}

export function assessProposition(input: {
  source: string;
  key: string;
  option: string;
  mechanismId?: string | null;
  semanticRisk?: string | null;
}): PropositionGuard {
  void input.semanticRisk;
  const signals = addedFrames(input.source, input.key, input.option);
  const status: PropositionStatus = signals.length ? "unverified" : "clear";
  const mechanismId = input.mechanismId?.trim() || null;
  const mechanismStatus: MechanismAlignment = !mechanismId
    ? "not_labeled"
    : relationsShown(input.source, input.key, input.option).has(mechanismId)
      ? "supported"
      : "mechanism_unverified";
  const reason = signals.length
    ? `added_${signals.join("_")}_not_proven`
    : mechanismStatus === "mechanism_unverified"
      ? "mechanism_not_shown"
      : "no_added_frame";
  return { status, mechanismStatus, signals, reason, semanticRiskClearsGuard: false };
}

export function propositionHoldsQuality(guard: PropositionGuard): boolean {
  return guard.status === "unsupported_clause" || guard.status === "unverified" || guard.mechanismStatus === "mechanism_unverified";
}

const sticky = ["unsupported_clause", "proposition_unverified", "mechanism_unverified"] as const;

/** Judge APPROVE cannot erase a proposition hold. A language or gate fail stays a fail. */
export function qualityAfterJudge(input: {
  prior: "pending" | "fail" | "needs_revision";
  priorReasons: readonly string[];
  judgeReasons: readonly string[];
}): { decision: "pending" | "fail" | "needs_revision"; reasons: string[] } {
  const held = input.priorReasons.filter((reason) => sticky.includes(reason as (typeof sticky)[number]));
  const reasons = [...held];
  for (const reason of input.judgeReasons) if (!reasons.includes(reason)) reasons.push(reason);
  if (input.prior === "fail") return { decision: "fail", reasons };
  if (held.length || input.judgeReasons.length) return { decision: "needs_revision", reasons };
  return { decision: "pending", reasons };
}
