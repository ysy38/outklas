import { z } from "zod";
import { qualityAuthoringTrapKinds } from "./quality-authoring.v1";
import { responseSchema } from "./schema";

export const stageAPlanPoolPromptVersion = "stage-a-plan-pool.v1";

export const stageAPlanPoolNecFamilies = [
  "necessary_to_sufficient",
  "upward_quantifier_strengthening",
  "modality_escalation",
  "correlation_to_causation",
  "factor_to_sole_factor",
  "evidence_to_certainty",
  "none",
] as const;

export const stageAPlanPoolStandings = ["CONTRADICTED", "NOT_ENTAILED_COMPATIBLE", "ENTAILED", "UNDETERMINED"] as const;

export const stageAPlanPoolSystem = `You plan one English restatement item. Stage A only. Do not write multiple-choice option sentences.

Write a natural source sentence that keeps every required fact in the situation brief. Write a key that is equivalent only to that source. Do not add a negation, cause, actor, or event the source does not entail.

Then list at most six distractor plans. Search every meaning relation the source actually hosts. Do not treat any relations named in the brief as a closed list.

Each plan mutates one proposition that occurs in the source. One dominant mutation. Do not repeat the same misreading. Do not invent events, actors, or outcomes. Do not pad. If you cannot find six genuine plans, return fewer.

Label standing honestly:
- CONTRADICTED: if the source is true, the mutated claim cannot be true.
- NOT_ENTAILED_COMPATIBLE: the source neither forces nor rules out the mutated claim.
- ENTAILED: if the source is true, the mutated claim must be true.
- UNDETERMINED: standing cannot be assigned.

until does not entail that the wait ended or that a later event occurred. only N entails at least N; only → at least is ENTAILED. only if is not if and only if.

These NEC families may appear as NOT_ENTAILED_COMPATIBLE. They are not automatically valid distractors:
necessary → sufficient; upward quantifier strengthening; modality escalation; correlation → causation; factor → sole factor; evidence → certainty.
although → because is correlation → causation and has high review risk.

Return JSON only. planId values p1…p6 in order for the plans you return.`;

export const stageAPlanPoolOutput = z.object({
  status: z.literal("pooled"),
  source: z.string().min(20).max(500),
  key: z.string().min(20).max(500),
  plans: z
    .array(
      z.object({
        planId: z.enum(["p1", "p2", "p3", "p4", "p5", "p6"]),
        sourceProposition: z.string().min(1).max(280),
        semanticMutation: z.string().min(1).max(160),
        trapType: z.enum(qualityAuthoringTrapKinds),
        standing: z.enum(stageAPlanPoolStandings),
        necFamily: z.enum(stageAPlanPoolNecFamilies),
        althoughToBecause: z.boolean(),
        whyStanding: z.string().min(1).max(280),
        independentOfOtherPlans: z.boolean(),
      }),
    )
    .min(0)
    .max(6),
});

export const stageAPlanPoolResponseSchema = responseSchema(stageAPlanPoolOutput);

export function stageAPlanPoolUser(input: { situationBrief: string }) {
  return [
    "Question type: restatement. Language: English.",
    "Situation brief — actors, events, required facts. This is not a source sentence. Do not copy it as the stem. Do not add facts.",
    input.situationBrief,
    "Write source, equivalent key, and at most six different hosted plans. Listed relations are not exhaustive. Do not pad. Label standing. NEC families are allowed only as NOT_ENTAILED_COMPATIBLE.",
  ].join("\n");
}
