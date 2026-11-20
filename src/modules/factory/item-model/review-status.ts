import { factoryVersions } from "../versions";
import type { EditorialReview, EditorialStatus, ItemAssembly, StudentResponse } from "./contract";
import { observeResponses } from "./difficulty";

const nextStatus: Record<EditorialReview["decision"], EditorialStatus> = {
  approve: "editor_approved",
  reject: "rejected",
  send_to_pretest: "pretest_ready",
  record_calibration: "calibrated",
};

const allowed: Record<EditorialStatus, EditorialReview["decision"][]> = {
  generated: [],
  structurally_valid: [],
  needs_editorial_review: ["approve", "reject"],
  editor_approved: ["send_to_pretest", "reject"],
  rejected: [],
  pretest_ready: ["record_calibration", "reject"],
  calibrated: [],
};

/**
 * Records an editor action. Approval names the editor, the time, the text version and the rationale.
 * Calibration requires student responses. Nothing here publishes to the student bank.
 */
export function applyEditorialReview(
  item: ItemAssembly,
  review: { decision: EditorialReview["decision"]; reviewer: string; rationale: string; at: string; responses?: StudentResponse[] },
): ItemAssembly {
  if (!review.reviewer.trim()) throw new Error("reviewer is required");
  if (!review.rationale.trim()) throw new Error("rationale is required");
  if (!allowed[item.status].includes(review.decision)) throw new Error(`${item.status} cannot ${review.decision}`);
  const responses = review.responses ?? null;
  if (review.decision === "record_calibration" && !responses?.length) throw new Error("calibration requires student responses");
  const entry: EditorialReview = {
    reviewVersion: factoryVersions.itemReview,
    decision: review.decision,
    reviewer: review.reviewer,
    rationale: review.rationale,
    at: review.at,
    appliesToVersion: item.textVersion,
  };
  const status = nextStatus[review.decision];
  const observedDifficulty =
    review.decision === "record_calibration" && item.correctOption ? observeResponses(item.correctOption, responses) : item.observedDifficulty;
  return {
    ...item,
    status,
    statusHistory: [...item.statusHistory, status],
    reviews: [...item.reviews, entry],
    observedDifficulty,
    publishState: "unpublished",
  };
}

export function publishToStudentBank(): never {
  throw new Error("item-model factory does not write the student bank");
}
