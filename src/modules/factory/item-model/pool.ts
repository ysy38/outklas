import { z } from "zod";
import { integrityProblems, normalized } from "../validator";
import { semanticRisks, shiftTargets, type DistractorCandidate, type SemanticRisk, type ShiftTarget } from "./contract";

export type PoolSelection = {
  status: "selected" | "insufficient";
  selected: DistractorCandidate[];
  rejected: { candidate: DistractorCandidate; reason: string }[];
  /** Inferiority text is kept for an editor. It is not a verified invalidity. */
  invalidity: "recorded_for_editorial_review";
};

const required = 4;

/** DNA labels such as syntactic_mismatch are not verified wrongness. Word order alone is not an error. */
const paraphraseMechanisms = new Set(["syntactic_mismatch", "word_order", "natural_paraphrase"]);

/**
 * Keeps four distinct texts. Mechanisms may repeat.
 * A paraphrase or a word-order change is not counted as a wrong answer.
 * A shortfall rejects the item. The pool is not padded.
 */
export function selectDistractors(input: { candidates: DistractorCandidate[]; keyText: string; allowedMechanisms: readonly string[] }): PoolSelection {
  const rejected: PoolSelection["rejected"] = [];
  const kept: DistractorCandidate[] = [];
  const seen = new Set<string>();
  const key = normalized(input.keyText);
  const allowed = new Set(input.allowedMechanisms);
  for (const candidate of input.candidates) {
    const text = normalized(candidate.candidateText);
    const reason =
      !text || !candidate.whyPlausible.trim() || !candidate.whyInferior.trim() || !candidate.sourceEvidence.trim()
        ? "incomplete"
        : !allowed.has(candidate.errorMechanism)
          ? "unknown_mechanism"
          : candidate.shiftTarget === "none" || paraphraseMechanisms.has(candidate.errorMechanism)
          ? "paraphrase_not_error"
          : candidate.semanticRisk !== "none"
            ? candidate.semanticRisk
            : integrityProblems(candidate.candidateText).length
              ? "malformed"
              : text === key
                ? "copies_key"
                : seen.has(text)
                  ? "duplicate"
                  : null;
    if (reason) rejected.push({ candidate, reason });
    else {
      seen.add(text);
      kept.push(candidate);
    }
  }
  const selected: DistractorCandidate[] = [];
  for (const candidate of kept) {
    if (selected.length < required) selected.push(candidate);
    else rejected.push({ candidate, reason: "pool_surplus" });
  }
  if (selected.length < required) {
    for (const candidate of selected) rejected.push({ candidate, reason: "insufficient_pool" });
    return { status: "insufficient", selected: [], rejected, invalidity: "recorded_for_editorial_review" };
  }
  return { status: "selected", selected, rejected, invalidity: "recorded_for_editorial_review" };
}

function candidateShape(mechanisms: readonly string[]) {
  const list = [...mechanisms] as [string, ...string[]];
  return z.object({
    candidateText: z.string().min(1).max(400),
    errorMechanism: z.enum(list),
    shiftTarget: z.enum(shiftTargets),
    whyPlausible: z.string().min(1).max(400),
    whyInferior: z.string().min(1).max(400),
    sourceEvidence: z.string().min(1).max(200),
    semanticRisk: z.enum(semanticRisks),
  });
}

function rawCandidate(value: unknown): DistractorCandidate {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const shift = shiftTargets.includes(record.shiftTarget as ShiftTarget) ? (record.shiftTarget as ShiftTarget) : "none";
  const risk = semanticRisks.includes(record.semanticRisk as SemanticRisk) ? (record.semanticRisk as SemanticRisk) : "none";
  return {
    candidateText: typeof record.candidateText === "string" ? record.candidateText : "",
    errorMechanism: typeof record.errorMechanism === "string" ? record.errorMechanism : "",
    shiftTarget: shift,
    whyPlausible: typeof record.whyPlausible === "string" ? record.whyPlausible : "",
    whyInferior: typeof record.whyInferior === "string" ? record.whyInferior : "",
    sourceEvidence: typeof record.sourceEvidence === "string" ? record.sourceEvidence : "",
    semanticRisk: risk,
  };
}

/**
 * One invalid candidate stays invalid. Its explanation is not trimmed into an enum token.
 * The other candidates remain available for selection.
 */
export function acceptDistractorPool(raw: unknown, allowedMechanisms: readonly string[]): { accepted: DistractorCandidate[]; rejected: PoolSelection["rejected"] } {
  const list = raw && typeof raw === "object" && "candidates" in raw ? (raw as { candidates?: unknown }).candidates : null;
  if (!Array.isArray(list)) return { accepted: [], rejected: [] };
  const schema = candidateShape(allowedMechanisms);
  const allowed = new Set(allowedMechanisms);
  const accepted: DistractorCandidate[] = [];
  const rejected: PoolSelection["rejected"] = [];
  for (const entry of list) {
    const parsed = schema.safeParse(entry);
    if (parsed.success) {
      accepted.push(parsed.data);
      continue;
    }
    const candidate = rawCandidate(entry);
    const reason = !allowed.has(candidate.errorMechanism) ? "invalid_mechanism" : "invalid_candidate";
    rejected.push({ candidate, reason });
  }
  return { accepted, rejected };
}
