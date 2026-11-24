import { z } from "zod";
import { responseSchema } from "./schema";

export const stageBWordingPromptVersion = "stage-b-wording.v1";

export const stageBWordingSystem = `You realize four supplied restatement distractor plans as natural English options.

Stage B only. Do not design traps. Do not drop, merge, reorder, or replace plans. Do not change the source or the key. Do not pad. Do not invent events the plan does not require.

Write one complete academic English sentence per plan. One dominant meaning shift each. Quantity inversions use only → all, never only → at least.

Return JSON only. Echo source and key unchanged. status is worded. candidates has exactly four objects, planId in the supplied order.`;

export const stageBWordingOutput = z.object({
  status: z.literal("worded"),
  source: z.string().min(20).max(500),
  key: z.string().min(20).max(500),
  candidates: z
    .array(
      z.object({
        planId: z.enum(["p1", "p2", "p3", "p4"]),
        candidateText: z.string().min(1).max(400),
        mutationRealized: z.string().min(1).max(160),
      }),
    )
    .length(4),
});

export const stageBWordingResponseSchema = responseSchema(stageBWordingOutput);

export function stageBWordingUser(input: {
  source: string;
  key: string;
  plans: readonly {
    planId: string;
    sourceProposition: string;
    semanticMutation: string;
    trapType: string;
    whyContradicted: string;
  }[];
}) {
  return [
    "Question type: restatement. Language: English.",
    "Source (do not rewrite):",
    input.source,
    "Key (do not rewrite):",
    input.key,
    "Realize these four plans as distractors, one sentence each, in this order.",
    ...input.plans.flatMap((plan, index) => [
      `Plan ${index + 1} id=${plan.planId} trapType=${plan.trapType}`,
      `sourceProposition: ${plan.sourceProposition}`,
      `semanticMutation: ${plan.semanticMutation}`,
      `whyContradicted: ${plan.whyContradicted}`,
    ]),
  ].join("\n");
}
