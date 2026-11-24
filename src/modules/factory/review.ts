import type { Lesson } from "@/modules/content/lesson";
import type { GeneratedQuestionCandidate } from "./candidate";
import type { DistractorDiagnosis } from "./diagnosis";
import { advance, type GenerationTrace } from "./generation";
import type { JudgeDecision } from "./judge";
import type { Provenance } from "./provenance";
import { difficultyBands, type QuestionSpec } from "./spec";
import type { CandidateValidation } from "./validator";
import { factoryVersions } from "./versions";

export const reviewDecisions = ["APPROVE", "REVISE", "EDIT", "REJECT"] as const;
export type ReviewDecision = (typeof reviewDecisions)[number];

const unverifiedReviewerLabels = new Set([
  "inspector",
  "generator",
  "judge",
  "validator",
  "system",
  "bot",
  "auto",
  "engine",
  "ai",
  "llm",
]);

/**
 * Only identifiable human/admin reviewers count as independent human approval.
 * Automated/agent labels such as "inspector" are explicitly rejected.
 */
export function isVerifiedHumanReviewer(reviewer: string): boolean {
  const trimmed = reviewer.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();
  if (unverifiedReviewerLabels.has(normalized)) return false;
  if (normalized.startsWith("admin:") || normalized.startsWith("human:")) {
    return trimmed.slice(trimmed.indexOf(":") + 1).trim().length > 0;
  }
  return true;
}

export function editorialRiskFlags(record: CandidateRecord): string[] {
  const flags: string[] = [];
  if (record.judge?.verdict === "REJECT") flags.push("judge_reject");
  if (record.judge?.blindAgrees === false) flags.push("blind_disagree");
  for (const failure of record.judge?.failures ?? []) {
    flags.push(`judge_failure:${failure}`);
  }
  return flags;
}

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
  /** Each wrong option's misconception label, assigned by construction from its DistractorSpec; absent on older records. */
  diagnoses?: OptionDiagnosis[];
  /** Sentence x-ray built from verified spans. Absent when the item never became a candidate. */
  lesson?: Lesson;
};

export type OptionDiagnosis = { option: GeneratedQuestionCandidate["correctOption"]; role: string; diagnosis: DistractorDiagnosis };

/**
 * Engine admission. A clean pass is approved at the judge's estimated band.
 * A review whose only open point is the band estimate is approved at that estimate.
 * Any other review, a second answer, or a failed check is not banked. No extra model call.
 * The estimate is not a psychometric difficulty.
 */
export function engineAdmission(input: { validation: CandidateValidation; judge: JudgeDecision | null }): { status: CandidateStatus; state: "APPROVED" | "REJECTED"; failure: string | null } {
  const { validation, judge } = input;
  if (validation.status !== "pass") return { status: "validator_rejected", state: "REJECTED", failure: "final_validator" };
  if (!judge || judge.verdict === "REJECT") return { status: "judge_rejected", state: "REJECTED", failure: "final_judge" };
  const lingering = judge.concerns.filter((concern) => !concern.startsWith("difficulty_"));
  if (lingering.length === 0) return { status: "approved", state: "APPROVED", failure: null };
  return { status: "judge_rejected", state: "REJECTED", failure: "unresolved_review" };
}

export function initialStatus(validation: CandidateValidation, judge: JudgeDecision | null): CandidateStatus {
  return engineAdmission({ validation, judge }).status;
}

export const inReviewQueue = (record: CandidateRecord) => record.status === "pending_review" || record.status === "needs_revalidation";

export const currentVersion = (record: CandidateRecord) => record.versions[record.versions.length - 1];

/**
 * The return type keeps `difficultyBasis` on `"engine" | "human"`.
 * A spread written inside `map` is not contextually typed, and TypeScript then widens the fresh `"human"` literal to `string`.
 */
function approveAtBand(version: CandidateVersion, band: (typeof difficultyBands)[number]): CandidateVersion {
  return {
    ...version,
    candidate: {
      ...version.candidate,
      metadata: { ...version.candidate.metadata, approvedBand: band, difficultyBasis: "human" },
    },
  };
}

/**
 * Applies a human decision without losing history. EDIT appends a new version that must pass the validator again
 * (the caller validates it); APPROVE requires the latest version to pass; REJECT keeps every version for the record.
 */
export function applyReview(
  record: CandidateRecord,
  review: { decision: ReviewDecision; reviewer: string; notes?: string; at: string; band?: (typeof difficultyBands)[number]; edit?: { candidate: GeneratedQuestionCandidate; validation: CandidateValidation } },
): CandidateRecord {
  if (!review.reviewer.trim()) throw new Error("reviewer is required");
  const latest = currentVersion(record);
  if (review.decision === "EDIT") {
    if (!review.edit) throw new Error("EDIT needs the edited candidate and its validation");
    if (review.edit.candidate.correctOption !== record.spec.answerConstraints.correctOption) throw new Error("an edit cannot move the answer away from the spec");
  } else if (review.edit) throw new Error(`${review.decision} does not take an edit`);
  if (review.decision === "APPROVE") {
    if (!isVerifiedHumanReviewer(review.reviewer)) {
      throw new Error("verified human reviewer is required for APPROVE");
    }
    if (latest.validation.status !== "pass") {
      throw new Error("the latest version does not pass the validator");
    }
    const risks = editorialRiskFlags(record);
    if (risks.length > 0 && !(review.notes ?? "").trim()) {
      throw new Error(`explicit human justification is required for risky candidate (${risks.join(", ")})`);
    }
  }

  const drafted = review.edit
    ? [...record.versions, { version: latest.version + 1, author: `human:${review.reviewer}` as const, candidate: review.edit.candidate, validation: review.edit.validation, createdAt: review.at }]
    : record.versions;
  const band = review.band;
  const versions = review.decision === "APPROVE" && band ? drafted.map((version, index) => (index === drafted.length - 1 ? approveAtBand(version, band) : version)) : drafted;
  const entry: ReviewEntry = { reviewVersion: factoryVersions.review, decision: review.decision, reviewer: review.reviewer, appliesToVersion: versions[versions.length - 1].version, notes: review.notes ?? "", at: review.at };
  const status: CandidateStatus =
    review.decision === "REJECT"
      ? "rejected"
      : review.decision === "APPROVE"
        ? "approved"
        : review.decision === "REVISE"
          ? "needs_revalidation"
          : review.edit!.validation.status === "pass"
            ? "pending_review"
            : "needs_revalidation";
  const generation = record.generation?.state === "HUMAN_REVIEW" && advance(record.generation, review.decision === "APPROVE" ? "APPROVED" : review.decision === "REJECT" ? "REJECTED" : "HUMAN_REVIEW", review.at, `human:${review.reviewer}`);
  return { ...record, versions, reviews: [...record.reviews, entry], status, ...(generation ? { generation } : {}) };
}
