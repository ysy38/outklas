import { z } from "zod";
import { responseSchema } from "./schema";

export const planToWordingPromptVersion = "plan-to-wording.v1";

export const planToWordingPlanIds = [
  "A1",
  "A2",
  "A3",
  "A4",
  "S1",
  "S2",
  "S3",
  "S4",
  "P1",
  "P2",
  "P3",
  "P4",
  "E1",
  "E2",
  "E3",
  "E4",
  "L1",
  "L2",
  "L3",
  "L4",
] as const;

export const planToWordingSystem = `You realize four supplied restatement distractor plans as natural English multiple-choice options.

This is Stage B only. Do not design traps. Do not drop, merge, reorder, or replace plans. Do not add a fifth option. Do not pad. Do not write grammar or lexical filler. Do not change the source sentence or the key.

Write one complete academic English sentence per plan. Each sentence must realize that plan's single dominant meaning shift and nothing else. Do not invent events, agents, quantities, or causes the plan does not require.

The key is already the only correct answer. Do not rewrite it. Quantity inversions use only → all, never only → at least.

Return JSON only. Echo source and key unchanged. status is worded. candidates has exactly four objects, planId in the supplied order.`;

export const planToWordingOutput = z.object({
  status: z.literal("worded"),
  source: z.string().min(20).max(500),
  key: z.string().min(20).max(500),
  candidates: z
    .array(
      z.object({
        planId: z.enum(planToWordingPlanIds),
        candidateText: z.string().min(1).max(400),
        mutationRealized: z.string().min(1).max(160),
      }),
    )
    .length(4),
});

export const planToWordingResponseSchema = responseSchema(planToWordingOutput);

export type PlanToWordingPlanInput = {
  id: string;
  trapType: string;
  sourceProposition: string;
  intendedMisreading: string;
  semanticMutation: string;
  whySourceDoesNotSupportIt: string;
};

export function planToWordingUser(input: { source: string; key: string; plans: readonly PlanToWordingPlanInput[] }) {
  return [
    "Question type: restatement. Language: English.",
    "Source (do not rewrite):",
    input.source,
    "Key (already the only correct answer; do not rewrite):",
    input.key,
    "Realize these four plans as distractors, one sentence each, in this order. Do not copy a plan field as the option. Do not add plans.",
    ...input.plans.flatMap((plan, index) => [
      `Plan ${index + 1} id=${plan.id} trapType=${plan.trapType}`,
      `sourceProposition: ${plan.sourceProposition}`,
      `intendedMisreading: ${plan.intendedMisreading}`,
      `semanticMutation: ${plan.semanticMutation}`,
      `whySourceDoesNotSupportIt: ${plan.whySourceDoesNotSupportIt}`,
    ]),
  ].join("\n");
}
