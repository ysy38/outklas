import { createHash } from "node:crypto";
import type { OptionLabel } from "@/modules/analysis/contract";
import { surfaceEdit } from "./cognitive-trap";
import { contentVersion } from "./distractor-strategy";
import { assessWholeSet } from "./whole-set";

/** Immutable editorial copy. Creating it is not human approval and not a bank write. */
export const draftsCandidateVersion = "drafts-editorial-candidate.v1";

export const recordedDraftsSource = "Tüm taslaklar kurula dağıtıldı, ama onların çoğu sonradan ikinci okumaya alınmadı.";
export const recordedDraftsKey = "All of the drafts were distributed to the board, but most of them were not later taken up for the second reading.";

export const draftsCandidateOptions = {
  A: recordedDraftsKey,
  B: "All of the drafts were distributed to the board, but none of them was later taken up for the second reading.",
  C: "Most of the drafts were not taken up for the second reading, but all of them were distributed to the board afterwards.",
  D: "All drafts were approved by the board, but most were not later taken up for a second reading.",
  E: "Most of the drafts were not later taken up for the second reading, which is why all of them were distributed to the board.",
} as const;

const dominantDifference = {
  B: "most → none",
  C: "afterwards attaches to distribution",
  D: "distributed → approved",
  E: "contrast read as cause",
} as const;

export type DraftsCandidate = {
  version: typeof draftsCandidateVersion;
  candidateHash: string;
  sourceHash: string;
  keyHash: string;
  sourceId: string;
  source: string;
  key: string;
  correct: "A";
  options: { [Label in OptionLabel]: string };
  distractors: {
    optionId: Exclude<OptionLabel, "A">;
    dominantDifference: string;
    editorialRisks: string[];
  }[];
  recordedGate: {
    decision: "fail" | "review";
    failure: string | null;
    overlapLabels: string[];
  };
  meaningProven: false;
  qualityProven: false;
  observedDifficulty: null;
  editorial: "pending";
  studentBankWrite: false;
  humanApproval: false;
  benchmarkStarted: false;
};

function canonical(body: Omit<DraftsCandidate, "candidateHash">): string {
  return JSON.stringify(body);
}

/**
 * Builds the frozen copy from the recorded source and key.
 * A mismatch with the stored Drafts record throws and does not invent a replacement.
 */
export function buildDraftsEditorialCandidate(record: { id: string; source: string; key: string; optionB: string }): DraftsCandidate {
  const sourceHash = contentVersion(record.source);
  const keyHash = contentVersion(record.key);
  if (record.source !== recordedDraftsSource || sourceHash !== contentVersion(recordedDraftsSource)) throw new Error("drafts source does not match the recorded item");
  if (record.key !== recordedDraftsKey || keyHash !== contentVersion(recordedDraftsKey)) throw new Error("drafts key does not match the recorded item");
  if (record.optionB !== draftsCandidateOptions.B) throw new Error("drafts option B does not match the recorded item");
  const options = { ...draftsCandidateOptions };
  const gate = assessWholeSet({ source: record.source, key: record.key, options, correct: "A" });
  const distractors = (["B", "C", "D", "E"] as const).map((optionId) => {
    const editorialRisks: string[] = [];
    if (surfaceEdit(record.key, options[optionId])) editorialRisks.push("surface_edit_of_key");
    const relation = gate.options.find((row) => row.label === optionId);
    if (relation?.relation === "unresolved") editorialRisks.push("relation_unresolved");
    if (relation?.relation === "confirmed_equivalent") editorialRisks.push("confirmed_equivalent");
    return { optionId, dominantDifference: dominantDifference[optionId], editorialRisks };
  });
  const body: Omit<DraftsCandidate, "candidateHash"> = {
    version: draftsCandidateVersion,
    sourceHash,
    keyHash,
    sourceId: record.id,
    source: record.source,
    key: record.key,
    correct: "A" as const,
    options,
    distractors,
    recordedGate: { decision: gate.decision, failure: gate.failure, overlapLabels: gate.risks.distractor_equivalence_risk },
    meaningProven: false as const,
    qualityProven: false as const,
    observedDifficulty: null,
    editorial: "pending" as const,
    studentBankWrite: false as const,
    humanApproval: false as const,
    benchmarkStarted: false as const,
  };
  return { ...body, candidateHash: createHash("sha256").update(canonical(body)).digest("hex") };
}
