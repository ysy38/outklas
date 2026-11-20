import { z } from "zod";

/**
 * One discourse contract for sentence completion. It tells the writer which job the blank does.
 * It does not require the key to be entailed, and the four moves are not a fixed relation quota.
 */
export const contrastiveArchetypes = ["concession_in_stem"] as const;
export type ContrastiveArchetype = (typeof contrastiveArchetypes)[number];

export const distractorMoveTypes = ["restate_appearance", "same_change_result", "related_undeveloped", "scope_overreach"] as const;
export type DistractorMoveType = (typeof distractorMoveTypes)[number];

export const distractorMove = z.object({
  type: z.enum(distractorMoveTypes),
  expectedRelationToStem: z.string().min(1).max(300),
  whyPlausible: z.string().min(1).max(300),
  whyInferiorToKey: z.string().min(1).max(300),
});
export type DistractorMove = z.infer<typeof distractorMove>;

export const discourseContract = z.object({
  archetype: z.enum(contrastiveArchetypes),
  blankPosition: z.enum(["start", "end", "middle"]),
  discourseRelation: z.string().min(1).max(80),
  stemFrame: z.string().min(1).max(300),
  scopeCue: z.string().min(1).max(80),
  expectedDiscourseMove: z.string().min(1).max(300),
  keyDiscourseMove: z.string().min(1).max(300),
  distractorMoves: z.array(distractorMove).length(4),
});
export type DiscourseContract = z.infer<typeof discourseContract>;

/** Fields the stem call may fill. The archetype itself stays on the code side. */
export const discourseDraft = discourseContract.omit({ archetype: true, blankPosition: true, discourseRelation: true });
export type DiscourseDraft = z.infer<typeof discourseDraft>;

export const concessionInStem = {
  archetype: "concession_in_stem",
  blankPosition: "end",
  discourseRelation: "discourse_relation:concession",
} as const;

/** Stamps the only archetype this path writes. A later archetype adds a member; it does not overload this one. */
export function stampConcessionContract(draft: DiscourseDraft): DiscourseContract {
  return discourseContract.parse({ ...concessionInStem, ...draft });
}
