import { createHash } from "node:crypto";
import type { DistractorCandidate, DistractorStrategy } from "./contract";
import { assessMeaningIntegrity } from "./core";
import { discourseConnectorSwap, surfaceEdit } from "./cognitive-trap";
import { incompleteOption, sameProposition } from "./misreading-mechanisms";
import { selectDistractors, type PoolSelection } from "./pool";

export const defaultDistractorStrategy = "baseline_v34" satisfies DistractorStrategy;
/** Separate from the 11-question precheck and the 90-item benchmark. */
export const cognitiveTrapStrategyAuthorization = "cognitive-trap-strategy-v1";

/**
 * Reading stays on the v3.4 pool. Cognitive trap is refused without its own authorization.
 * An unauthorized request does not silently become the new default.
 */
export function resolveDistractorStrategy(input: { requested?: DistractorStrategy; authorization?: string; questionType: string }): { strategy: DistractorStrategy; failure: string | null } {
  const requested = input.requested ?? defaultDistractorStrategy;
  if (requested === "baseline_v34") return { strategy: "baseline_v34", failure: null };
  if (input.questionType === "reading_comprehension") return { strategy: "baseline_v34", failure: null };
  if (input.authorization !== cognitiveTrapStrategyAuthorization) return { strategy: "baseline_v34", failure: "strategy_unauthorized" };
  return { strategy: "cognitive_trap_first", failure: null };
}

export type CognitiveDistractor = DistractorCandidate & {
  studentMisreading: string;
  temptingEvidence: string;
  actualSemanticDifference: string;
  whyIncorrect: string;
  /** The model's explanation is stored for an editor. It is not proof the option is wrong. */
  explanationIsNotProof: true;
  misreadingMechanism?: string | null;
  additionalMechanisms?: string[];
};

export type CognitiveSelection = PoolSelection & {
  removed: { candidate: DistractorCandidate; reason: string }[];
  explanationIsNotProof: true;
};

/** Drops surface edits and second answers, then uses the existing pool rules. Fewer than four stops the item. */
export function selectCognitiveDistractors(input: { candidates: (DistractorCandidate & Partial<Pick<CognitiveDistractor, "studentMisreading" | "temptingEvidence" | "actualSemanticDifference" | "whyIncorrect" | "misreadingMechanism" | "additionalMechanisms">>)[]; keyText: string; sourceText?: string; allowedMechanisms: readonly string[] }): CognitiveSelection {
  const removed: CognitiveSelection["removed"] = [];
  const kept: CognitiveDistractor[] = [];
  for (const candidate of input.candidates) {
    const equivalent = input.sourceText ? sameProposition(input.sourceText, candidate.candidateText) || sameProposition(input.keyText, candidate.candidateText) : false;
    const reason = !candidate.studentMisreading?.trim() || !candidate.temptingEvidence?.trim() || !candidate.actualSemanticDifference?.trim() || !candidate.whyIncorrect?.trim()
      ? "misreading_fields_missing"
      : candidate.semanticRisk === "second_answer"
        ? "second_answer"
        : equivalent
          ? "equivalent_to_source"
          : incompleteOption(candidate.candidateText)
            ? "incomplete_option"
            : discourseConnectorSwap(input.keyText, candidate.candidateText)
              ? "discourse_unresolved"
              : surfaceEdit(input.keyText, candidate.candidateText) && !shownMeaningDifference(input.keyText, candidate.candidateText, input.sourceText)
                ? "surface_edit"
                : null;
    if (reason) removed.push({ candidate, reason });
    else kept.push({ ...candidate, studentMisreading: candidate.studentMisreading ?? "", temptingEvidence: candidate.temptingEvidence ?? "", actualSemanticDifference: candidate.actualSemanticDifference ?? "", whyIncorrect: candidate.whyIncorrect ?? "", explanationIsNotProof: true });
  }
  const distinct: CognitiveDistractor[] = [];
  for (const candidate of kept) {
    const repeat = distinct.some((earlier) => sameMisreading(earlier.studentMisreading, candidate.studentMisreading));
    if (repeat) removed.push({ candidate, reason: "repeated_misreading" });
    else distinct.push(candidate);
  }
  const pool = selectDistractors({ candidates: distinct, keyText: input.keyText, allowedMechanisms: input.allowedMechanisms });
  return { ...pool, removed, explanationIsNotProof: true };
}

export type DroppedDistractor = {
  candidateText: string;
  mechanismId: string;
  errorMechanism: string;
  reason: string;
  sourceVersion: string;
  keyVersion: string;
};

/** Twelve hex characters of the source or key text. A wording change produces a new version. */
export function contentVersion(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

/** Records a pool rejection. It does not put the candidate back, including a surface edit. */
export function describeDroppedDistractors(
  rows: readonly { candidate: { candidateText: string; errorMechanism: string; misreadingMechanism?: string | null }; reason: string }[],
  versions: { sourceVersion: string; keyVersion: string },
): DroppedDistractor[] {
  return rows.map((row) => ({
    candidateText: row.candidate.candidateText,
    mechanismId: row.candidate.misreadingMechanism || row.candidate.errorMechanism,
    errorMechanism: row.candidate.errorMechanism,
    reason: row.reason,
    sourceVersion: versions.sourceVersion,
    keyVersion: versions.keyVersion,
  }));
}

function sameMisreading(left: string, right: string): boolean {
  const normalize = (text: string) => text.toLocaleLowerCase("en-US").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return normalize(left).length > 0 && normalize(left) === normalize(right);
}

/**
 * Quantity, polarity, or another listed wording shift. Unverified near copies stay dropped.
 * A fail here is not a semantic pass and does not raise meaningProven.
 */
function shownMeaningDifference(keyText: string, candidateText: string, sourceText?: string): boolean {
  if (assessMeaningIntegrity(keyText, candidateText).status === "fail") return true;
  return Boolean(sourceText && assessMeaningIntegrity(sourceText, candidateText).status === "fail");
}
