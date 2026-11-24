import { z } from "zod";
import { qualityAuthoringTrapKinds } from "./quality-authoring.v1";
import { responseSchema } from "./schema";

export const stageAPlanningPromptVersion = "stage-a-planning.v1";

export const stageAPlanningSystem = `You plan one English restatement item. Stage A only. Do not write multiple-choice option sentences.

Write a natural source sentence that keeps every required fact in the situation brief. Write a key that is equivalent only to that source. Do not add a negation, cause, or event the source does not entail.

Then list at most four distractor plans. Each plan must mutate one proposition that actually occurs in the source you wrote. The mutated claim must be CONTRADICTED by the source: if the source is true, that claim cannot be true. A plan that is merely not entailed, or that can still be true with the source, is not allowed.

Do not use conversational implicature as the contradiction. until does not entail that the wait ended, that a later event occurred, or that an after-continuation is false. only N entails at least N; only → at least is forbidden. only if is not if and only if. although does not entail that the concessive clause is not a cause.

Plans must be independent: one dominant mutation each, not the same mutation twice. Do not pad. If you cannot find four contradicted plans, return fewer. status is insufficient_contradicted_plans when there are fewer than four.

Return JSON only. planId values p1, p2, p3, p4 in order for the plans you return.`;

export const stageAPlanningOutput = z.object({
  status: z.enum(["planned", "insufficient_contradicted_plans"]),
  source: z.string().min(20).max(500),
  key: z.string().min(20).max(500),
  plans: z
    .array(
      z.object({
        planId: z.enum(["p1", "p2", "p3", "p4"]),
        sourceProposition: z.string().min(1).max(280),
        semanticMutation: z.string().min(1).max(160),
        trapType: z.enum(qualityAuthoringTrapKinds),
        whyContradicted: z.string().min(1).max(280),
        independentOfOtherPlans: z.boolean(),
      }),
    )
    .min(0)
    .max(4),
});

export const stageAPlanningResponseSchema = responseSchema(stageAPlanningOutput);

export function stageAPlanningUser(input: { situationBrief: string }) {
  return [
    "Question type: restatement. Language: English.",
    "Situation brief — actors, events, required facts. This is not a source sentence. Do not copy it as the stem. Do not add facts.",
    input.situationBrief,
    "Write source, equivalent key, and only CONTRADICTED distractor plans hosted by that source. Fewer than four is allowed. Do not pad.",
  ].join("\n");
}
