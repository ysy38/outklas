/** Question-level acceptance: reliable items, not complete PDFs. */

export const sourceClasses = ["complete_exam", "partial_exam", "topic_slice", "unusable"] as const;
export type SourceClass = (typeof sourceClasses)[number];

export const extractionStatuses = ["ok", "needs_review", "failed"] as const;
export type ExtractionStatus = (typeof extractionStatuses)[number];

export const validationStatuses = ["accepted", "needs_review", "failed"] as const;
export type ValidationStatus = (typeof validationStatuses)[number];

export const humanReviewStatuses = ["unreviewed", "approved", "rejected"] as const;
export type HumanReviewStatus = (typeof humanReviewStatuses)[number];

export const topicSliceKeys = ["vocab", "tense", "conj", "prep", "sent", "trans", "dlg"] as const;
export type TopicSliceKey = (typeof topicSliceKeys)[number];

export const evidenceScopes = ["exam_distribution", "pattern_only"] as const;
export type EvidenceScope = (typeof evidenceScopes)[number];

/** Topic compilations may support pattern evidence; they must never feed YDS overall-distribution stats. */
export function usableForDistribution(sourceClass: SourceClass): boolean {
  return sourceClass === "complete_exam" || sourceClass === "partial_exam";
}

/** e-YDS topic slices are pattern evidence. They must not be quoted as YDS exam share. */
export function evidenceScope(sourceClass: SourceClass): EvidenceScope {
  return sourceClass === "topic_slice" ? "pattern_only" : "exam_distribution";
}

export function classifySource(input: { topic?: boolean; questionsFound: number; expected: number; trustworthy: boolean }): SourceClass {
  if (input.topic) return "topic_slice";
  if (!input.trustworthy || input.questionsFound === 0) return "unusable";
  if (input.questionsFound >= input.expected && input.expected >= 80) return "complete_exam";
  return "partial_exam";
}

export function extractionConfidence(input: { status: ExtractionStatus; blockingFlags: number; warningFlags: number }): number {
  if (input.status === "failed") return 0.12;
  if (input.status === "ok") return Math.max(0.85, 0.97 - 0.02 * input.warningFlags);
  return Math.max(0.2, 0.62 - 0.08 * input.blockingFlags - 0.02 * input.warningFlags);
}

export type SplitConfidence = {
  extractionConfidence: number;
  analysisConfidence: number;
  validationStatus: ValidationStatus;
  humanReviewStatus: HumanReviewStatus;
};
