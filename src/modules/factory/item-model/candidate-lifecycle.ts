import type { DistractorCandidate } from "./contract";
import type { CognitiveDistractor } from "./distractor-strategy";

export const linkingStatuses = [
  "linked",
  "missing_option",
  "unmatched_misreading",
  "duplicate_mapping",
  "ambiguous_mapping",
  "invalid_output",
] as const;
export type LinkingStatus = (typeof linkingStatuses)[number];

export type OptionWriterCandidate = {
  candidateText: string;
  errorMechanism: string;
  shiftTarget: string;
  semanticRisk: "none" | "second_answer" | "off_construct" | "ungrammatical";
  studentMisreading: string;
};

export type MisreadingReading = {
  studentMisreading: string;
  temptingEvidence?: string;
  actualSemanticDifference?: string;
  whyIncorrect?: string;
  misreadingMechanism?: string | null;
  additionalMechanisms?: string[];
};

export type LinkingRow = {
  misreadingIndex: number | null;
  misreadingMechanism: string | null;
  studentMisreading: string;
  optionIndex: number | null;
  optionText: string | null;
  status: LinkingStatus;
};

export type LinkedCandidate = Omit<OptionWriterCandidate, "shiftTarget"> & {
  shiftTarget: DistractorCandidate["shiftTarget"];
} & Pick<CognitiveDistractor, "studentMisreading" | "temptingEvidence" | "actualSemanticDifference" | "whyIncorrect" | "explanationIsNotProof" | "misreadingMechanism" | "additionalMechanisms"> & {
    whyPlausible: string;
    whyInferior: string;
    sourceEvidence: string;
  };

export type LinkingResult = {
  rows: LinkingRow[];
  linked: LinkedCandidate[];
  dropped: { candidate: DistractorCandidate & { misreadingMechanism?: string | null }; reason: LinkingStatus }[];
  parseInvalid: boolean;
};

/**
 * Exact studentMisreading join. The options schema has no stable id; the prompt copies that field unchanged.
 * Case, whitespace, and paraphrase are not guessed. A linking miss is not a semantic reject.
 */
export function linkMisreadingCandidates(input: {
  readings: readonly MisreadingReading[];
  candidates: readonly OptionWriterCandidate[] | null;
  parseError?: string | null;
}): LinkingResult {
  const rows: LinkingRow[] = [];
  const linked: LinkedCandidate[] = [];
  const dropped: LinkingResult["dropped"] = [];
  const parseInvalid = Boolean(input.parseError) || !Array.isArray(input.candidates);
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];
  const bound = new Set<number>();

  for (const [optionIndex, candidate] of candidates.entries()) {
    const text = candidate.candidateText?.trim() ?? "";
    const copied = candidate.studentMisreading?.trim() ?? "";
    if (!text || !copied) {
      rows.push({
        misreadingIndex: null,
        misreadingMechanism: null,
        studentMisreading: copied,
        optionIndex,
        optionText: text || null,
        status: "invalid_output",
      });
      dropped.push({ candidate: asDropped(candidate), reason: "invalid_output" });
      continue;
    }
    const matches = input.readings.map((reading, index) => (reading.studentMisreading === candidate.studentMisreading ? index : -1)).filter((index) => index >= 0);
    if (matches.length === 0) {
      rows.push({
        misreadingIndex: null,
        misreadingMechanism: null,
        studentMisreading: candidate.studentMisreading,
        optionIndex,
        optionText: candidate.candidateText,
        status: "unmatched_misreading",
      });
      dropped.push({ candidate: asDropped(candidate), reason: "unmatched_misreading" });
      continue;
    }
    if (matches.length > 1) {
      rows.push({
        misreadingIndex: null,
        misreadingMechanism: null,
        studentMisreading: candidate.studentMisreading,
        optionIndex,
        optionText: candidate.candidateText,
        status: "ambiguous_mapping",
      });
      dropped.push({ candidate: asDropped(candidate), reason: "ambiguous_mapping" });
      continue;
    }
    const misreadingIndex = matches[0]!;
    if (bound.has(misreadingIndex)) {
      rows.push({
        misreadingIndex,
        misreadingMechanism: input.readings[misreadingIndex]?.misreadingMechanism ?? null,
        studentMisreading: candidate.studentMisreading,
        optionIndex,
        optionText: candidate.candidateText,
        status: "duplicate_mapping",
      });
      dropped.push({ candidate: asDropped(candidate, input.readings[misreadingIndex]?.misreadingMechanism), reason: "duplicate_mapping" });
      continue;
    }
    bound.add(misreadingIndex);
    const reading = input.readings[misreadingIndex]!;
    rows.push({
      misreadingIndex,
      misreadingMechanism: reading.misreadingMechanism ?? null,
      studentMisreading: reading.studentMisreading,
      optionIndex,
      optionText: candidate.candidateText,
      status: "linked",
    });
    const temptingEvidence = reading.temptingEvidence ?? "";
    const actualSemanticDifference = reading.actualSemanticDifference ?? "";
    const whyIncorrect = reading.whyIncorrect ?? "";
    linked.push({
      ...candidate,
      shiftTarget: candidate.shiftTarget as DistractorCandidate["shiftTarget"],
      whyPlausible: temptingEvidence,
      whyInferior: whyIncorrect,
      sourceEvidence: temptingEvidence.slice(0, 200),
      temptingEvidence,
      actualSemanticDifference,
      whyIncorrect,
      explanationIsNotProof: true,
      misreadingMechanism: reading.misreadingMechanism ?? null,
      additionalMechanisms: reading.additionalMechanisms ?? [],
    });
  }

  for (const [misreadingIndex, reading] of input.readings.entries()) {
    if (bound.has(misreadingIndex)) continue;
    rows.push({
      misreadingIndex,
      misreadingMechanism: reading.misreadingMechanism ?? null,
      studentMisreading: reading.studentMisreading,
      optionIndex: null,
      optionText: null,
      status: parseInvalid && candidates.length === 0 ? "invalid_output" : "missing_option",
    });
  }

  return { rows, linked, dropped, parseInvalid };
}

function asDropped(candidate: OptionWriterCandidate, misreadingMechanism?: string | null): DistractorCandidate & { misreadingMechanism?: string | null } {
  return {
    candidateText: candidate.candidateText ?? "",
    errorMechanism: candidate.errorMechanism ?? "",
    shiftTarget: "none",
    whyPlausible: "",
    whyInferior: "",
    sourceEvidence: "",
    semanticRisk: candidate.semanticRisk ?? "none",
    misreadingMechanism: misreadingMechanism ?? null,
  };
}
