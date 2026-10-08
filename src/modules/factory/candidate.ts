import { z } from "zod";
import { nodeRef, optionLabels } from "@/modules/analysis/contract";

const optionText = z.string().min(1).max(300);

/**
 * What the generator returns. It is a draft only: the spec, the answer position and the taxonomy are fixed upstream,
 * and nothing here reaches the question bank without validation, judging and human review.
 */
export const generatedQuestionCandidate = z.object({
  question: z.object({
    stem: z.string().min(1).max(500),
    options: z.object(Object.fromEntries(optionLabels.map((label) => [label, optionText])) as Record<(typeof optionLabels)[number], typeof optionText>),
  }),
  correctOption: z.enum(optionLabels),
  explanation: z.string().min(1).max(1200),
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
    selfRatedDifficulty: z.enum(["easy", "medium", "hard"]),
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
