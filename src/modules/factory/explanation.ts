import { z } from "zod";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { generatedQuestionCandidate, type GeneratedQuestionCandidate } from "./candidate";
import type { AcceptedDistractor } from "./generation";
import type { QuestionSkeleton } from "./skeleton";
import { connectorSurface } from "./spec-engine";
import type { QuestionSpec } from "./spec";
import { leadingConnector } from "./validator";

/** Explanation stage output. Text only: types, misconceptions and concepts are copied from the spec, not from the model. */
export const itemExplanation = z.object({
  explanation: z.string().min(1).max(1200),
  distractorRationales: z.array(z.object({ option: z.enum(optionLabels), whyPlausible: z.string().min(1).max(400), whyWrong: z.string().min(1).max(400) })).length(4),
  transferNote: z.string().min(1).max(400),
  estimatedDifficulty: z.enum(["easy", "medium", "hard"]),
});
export type ItemExplanation = z.infer<typeof itemExplanation>;

export type ItemCore = { stem: string; options: Record<OptionLabel, string>; correctOption: OptionLabel };

/** Places the answer and the accepted distractors at the letters the spec fixed. */
export function assembleCore(spec: QuestionSpec, skeleton: QuestionSkeleton, distractors: AcceptedDistractor[]): ItemCore {
  const correct = spec.answerConstraints.correctOption;
  const byOption = new Map(distractors.map((entry) => [entry.option, entry.text.trim()]));
  const options = Object.fromEntries(
    optionLabels.map((label) => {
      const text = label === correct ? skeleton.correctAnswer.trim() : byOption.get(label);
      if (!text) throw new Error(`No accepted text for option ${label}`);
      return [label, text];
    }),
  ) as Record<OptionLabel, string>;
  return { stem: skeleton.stem.trim(), options, correctOption: correct };
}

const surfaceOf = (option: string) => {
  const found = leadingConnector(option);
  return found ? connectorSurface(found) : "";
};

/** The complete candidate the final validator and judge see. Every taxonomy field comes from the spec. */
export function assembleCandidate(spec: QuestionSpec, core: ItemCore, explanation: ItemExplanation): GeneratedQuestionCandidate {
  const plan = new Map(spec.distractorPlan.map((slot) => [slot.option, slot]));
  return generatedQuestionCandidate.parse({
    question: { stem: core.stem, options: core.options },
    correctOption: core.correctOption,
    explanation: explanation.explanation,
    transferNote: explanation.transferNote,
    distractorRationales: explanation.distractorRationales.map((entry) => {
      const slot = plan.get(entry.option);
      return { option: entry.option, distractorType: slot?.distractorType ?? "distractor_type:unknown", misconception: slot?.misconception ?? null, whyPlausible: entry.whyPlausible, whyWrong: entry.whyWrong };
    }),
    targetConcept: spec.primaryConcept,
    targetSkill: spec.targetSkill,
    metadata: {
      connectorByOption: Object.fromEntries(optionLabels.map((label) => [label, surfaceOf(core.options[label])])),
      selfRatedDifficulty: explanation.estimatedDifficulty,
    },
  });
}

/** Validator codes an explanation retry can fix; anything else is a problem with the question itself. */
export const isExplanationIssue = (code: string) => code.startsWith("explanation_") || code === "rationale_options";
