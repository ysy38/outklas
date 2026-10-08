import type { GeneratedQuestionCandidate } from "./candidate";
import { advance, type GenerationTrace } from "./generation";
import type { JudgeDecision } from "./judge";
import type { Provenance } from "./provenance";
import type { QuestionSpec } from "./spec";
import type { CandidateValidation } from "./validator";
import { factoryVersions } from "./versions";

export const reviewDecisions = ["APPROVE", "EDIT", "REJECT"] as const;
export type ReviewDecision = (typeof reviewDecisions)[number];

export const candidateStatuses = ["validator_rejected", "judge_rejected", "pending_review", "approved", "rejected", "needs_revalidation"] as const;
export type CandidateStatus = (typeof candidateStatuses)[number];

/** One version of the item text. Version 1 is the generator's output and is never modified or removed. */
export type CandidateVersion = {
  version: number;
  author: "generator" | `human:${string}`;
  candidate: GeneratedQuestionCandidate;
  validation: CandidateValidation;
  createdAt: string;
};

export type ReviewEntry = {
  reviewVersion: typeof factoryVersions.review;
  decision: ReviewDecision;
  reviewer: string;
  appliesToVersion: number;
  notes: string;
  at: string;
};

/** Everything a reviewer sees for one candidate: the spec it was built from, every version, both checks, and provenance. */
export type CandidateRecord = {
  id: string;
  spec: QuestionSpec;
  versions: CandidateVersion[];
  judge: JudgeDecision | null;
  provenance: Provenance;
  reviews: ReviewEntry[];
  status: CandidateStatus;
  /** How the atomic pipeline built the item; absent on records from the single-call generator. */
  generation?: GenerationTrace;
};

export function initialStatus(validation: CandidateValidation, judge: JudgeDecision | null): CandidateStatus {
  if (validation.status !== "pass") return "validator_rejected";
  if (!judge || judge.verdict === "REJECT") return "judge_rejected";
  return "pending_review";
}

export const inReviewQueue = (record: CandidateRecord) => record.status === "pending_review" || record.status === "needs_revalidation";

export const currentVersion = (record: CandidateRecord) => record.versions[record.versions.length - 1];

/**
 * Applies a human decision without losing history. EDIT appends a new version that must pass the validator again
 * (the caller validates it); APPROVE requires the latest version to pass; REJECT keeps every version for the record.
 */
export function applyReview(
  record: CandidateRecord,
  review: { decision: ReviewDecision; reviewer: string; notes?: string; at: string; edit?: { candidate: GeneratedQuestionCandidate; validation: CandidateValidation } },
): CandidateRecord {
  if (!review.reviewer.trim()) throw new Error("reviewer is required");
  const latest = currentVersion(record);
  if (review.decision === "EDIT") {
    if (!review.edit) throw new Error("EDIT needs the edited candidate and its validation");
    if (review.edit.candidate.correctOption !== record.spec.answerConstraints.correctOption) throw new Error("an edit cannot move the answer away from the spec");
  } else if (review.edit) throw new Error(`${review.decision} does not take an edit`);
  if (review.decision === "APPROVE" && latest.validation.status !== "pass") throw new Error("the latest version does not pass the validator");

  const versions = review.edit
    ? [...record.versions, { version: latest.version + 1, author: `human:${review.reviewer}` as const, candidate: review.edit.candidate, validation: review.edit.validation, createdAt: review.at }]
    : record.versions;
  const entry: ReviewEntry = { reviewVersion: factoryVersions.review, decision: review.decision, reviewer: review.reviewer, appliesToVersion: versions[versions.length - 1].version, notes: review.notes ?? "", at: review.at };
  const status: CandidateStatus =
    review.decision === "REJECT" ? "rejected" : review.decision === "APPROVE" ? "approved" : review.edit!.validation.status === "pass" ? "pending_review" : "needs_revalidation";
  const generation = record.generation?.state === "HUMAN_REVIEW" && advance(record.generation, review.decision === "APPROVE" ? "APPROVED" : review.decision === "REJECT" ? "REJECTED" : "HUMAN_REVIEW", review.at, `human:${review.reviewer}`);
  return { ...record, versions, reviews: [...record.reviews, entry], status, ...(generation ? { generation } : {}) };
}
