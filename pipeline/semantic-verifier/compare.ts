import { classifyMisreading } from "@/modules/factory/item-model/misreading-mechanisms";
import { assessProposition } from "@/modules/factory/item-model/proposition-guard";
import { classifyOption } from "@/modules/factory/item-model/whole-set";
import type { SemanticVerification } from "./contract";
import type { HumanClass } from "./expectations";
import type { PilotPair } from "./fixture";

export type DeterministicBaseline = {
  propositionStatus: "clear" | "unverified" | "unsupported_clause";
  signals: string[];
  shownMechanisms: string[];
  shownStatus: "shown" | "unresolved" | "equivalent";
  optionRelation: "confirmed_equivalent" | "confirmed_difference" | "unresolved";
  optionEvidence: string | null;
  meaningProven: false;
  /** Identity with the stored key. It is not a paraphrase proof. */
  sameAsStoredKey: boolean;
};

export function deterministicBaseline(pair: Pick<PilotPair, "source" | "key" | "option">): DeterministicBaseline {
  const proposition = assessProposition({ source: pair.source, key: pair.key, option: pair.option, mechanismId: null, semanticRisk: null });
  const shown = classifyMisreading(pair.source, pair.option);
  const classified = classifyOption(pair.source, pair.key, pair.option);
  return {
    propositionStatus: proposition.status,
    signals: proposition.signals,
    shownMechanisms: shown.mechanisms,
    shownStatus: shown.status,
    optionRelation: classified.relation,
    optionEvidence: classified.evidence,
    meaningProven: false,
    sameAsStoredKey: pair.option === pair.key,
  };
}

export type ClaimOutcome = "not_run" | "uncertain" | "caught_unsupported" | "missed_unsupported" | "false_reject_plausible" | "accepted_plausible" | "false_accept_equivalent" | "accepted_equivalent";

/** Confidence is ignored. Uncertain is its own outcome, not a correct or incorrect decision. */
export function scoreClaim(pair: Pick<PilotPair, "humanClass">, claim: SemanticVerification | null): ClaimOutcome {
  if (!claim) return "not_run";
  if (claim.relation === "uncertain" || claim.relationMutation === "uncertain" || claim.unsupportedExtension === "uncertain") return "uncertain";
  if (pair.humanClass === "unsupported_event") {
    return claim.relation === "non_equivalent" && claim.unsupportedExtension === "yes" ? "caught_unsupported" : "missed_unsupported";
  }
  if (pair.humanClass === "plausible_misreading") {
    return claim.relation === "non_equivalent" && claim.relationMutation === "yes" && claim.unsupportedExtension === "no" ? "accepted_plausible" : "false_reject_plausible";
  }
  return claim.relation === "equivalent" && claim.relationMutation === "no" && claim.unsupportedExtension === "no" ? "accepted_equivalent" : "false_accept_equivalent";
}

export type PilotRates = {
  status: "not_run" | "scored";
  candidates: number;
  unsupportedCapture: number | null;
  plausibleFalseReject: number | null;
  equivalentFalseAccept: number | null;
  uncertainty: number | null;
  confidenceUsed: false;
};

function rate(hits: number, total: number): number | null {
  if (total === 0) return null;
  return hits / total;
}

export function pilotRates(pairs: readonly Pick<PilotPair, "id" | "humanClass">[], claims: ReadonlyMap<string, SemanticVerification | null>): PilotRates {
  const scored = pairs.map((pair) => scoreClaim(pair, claims.get(pair.id) ?? null));
  if (scored.every((outcome) => outcome === "not_run")) {
    return { status: "not_run", candidates: pairs.length, unsupportedCapture: null, plausibleFalseReject: null, equivalentFalseAccept: null, uncertainty: null, confidenceUsed: false };
  }
  const decided = (humanClass: HumanClass, outcome: ClaimOutcome) =>
    pairs.filter((pair, index) => pair.humanClass === humanClass && scored[index] === outcome).length;
  const open = (humanClass: HumanClass) => pairs.filter((pair, index) => pair.humanClass === humanClass && scored[index] !== "uncertain" && scored[index] !== "not_run").length;
  return {
    status: "scored",
    candidates: pairs.length,
    unsupportedCapture: rate(decided("unsupported_event", "caught_unsupported"), open("unsupported_event")),
    plausibleFalseReject: rate(decided("plausible_misreading", "false_reject_plausible"), open("plausible_misreading")),
    equivalentFalseAccept: rate(decided("equivalent_paraphrase", "false_accept_equivalent"), open("equivalent_paraphrase")),
    uncertainty: rate(scored.filter((outcome) => outcome === "uncertain").length, scored.filter((outcome) => outcome !== "not_run").length),
    confidenceUsed: false,
  };
}
