import { z } from "zod";
import { nodeRef, optionLabels } from "@/modules/analysis/contract";
import { difficultyBands } from "./spec";

const optionText = z.string().min(1).max(300);

/**
 * What the generator returns. It is a draft only: the spec, the answer position and the taxonomy are fixed upstream,
 * and nothing here reaches the study pool until it is published. The engine can admit it; that admission is an estimate, not a student measurement.
 */
export const generatedQuestionCandidate = z.object({
  question: z.object({
    stem: z.string().min(1).max(500),
    options: z.object(Object.fromEntries(optionLabels.map((label) => [label, optionText])) as Record<(typeof optionLabels)[number], typeof optionText>),
  }),
  correctOption: z.enum(optionLabels),
  explanation: z.string().min(1).max(1200),
  /** How to recognise the same relation in another item; written by the explanation stage. */
  transferNote: z.string().max(400).optional(),
  distractorRationales: z
    .array(
      z.object({
        option: z.enum(optionLabels),
        distractorType: nodeRef,
        misconception: nodeRef.nullable(),
        whyPlausible: z.string().min(1).max(400),
        whyWrong: z.string().min(1).max(400),
      }),
    )
    .length(4),
  targetConcept: nodeRef,
  targetSkill: nodeRef,
  metadata: z.object({
    connectorByOption: z.object(Object.fromEntries(optionLabels.map((label) => [label, z.string().max(40)])) as Record<(typeof optionLabels)[number], z.ZodString>),
    /** The explanation model's own estimate. It is not the judge's band and not the band a human approved. */
    selfRatedDifficulty: z.enum(["easy", "medium", "hard"]),
    /** Copied from the accepted skeleton-gate report. The writer and the explanation model do not fill it. */
    gate: z
      .object({
        embedding: z.string(),
        preciseTerm: z.string(),
        clauseCarriesClash: z.boolean(),
      })
      .optional(),
    /** Final judge's estimatedDifficulty. A mismatch with the request is not, by itself, a rejection. */
    judgeEstimatedBand: z.enum(difficultyBands).optional(),
    /**
     * Band stored with an admission. On engine admission it is the judge's estimate.
     * A later human review may replace it. It is not a psychometric difficulty.
     */
    approvedBand: z.enum(difficultyBands).optional(),
    /** Who assigned approvedBand. Engine means the judge's estimate. Human means a reviewer chose it. */
    difficultyBasis: z.enum(["engine", "human"]).optional(),
  }),
});
export type GeneratedQuestionCandidate = z.infer<typeof generatedQuestionCandidate>;

/** The stem with each option written into the blank: what a learner actually reads when trying an option. */
export function completedSentences(candidate: Pick<GeneratedQuestionCandidate, "question">): Record<(typeof optionLabels)[number], string> {
  return Object.fromEntries(optionLabels.map((label) => [label, candidate.question.stem.replace("----", candidate.question.options[label].trim())])) as Record<
    (typeof optionLabels)[number],
    string
  >;
}
