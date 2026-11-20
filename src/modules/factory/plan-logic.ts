/**
 * Labels for a claim relative to the stem. The planner pipeline does not assign them.
 * A reason may rest on what the stem says or on what that text entails.
 * An outside assumption, or a step the stem does not entail, cannot prove that a plan fails.
 * That license is not a distractor verdict. A wrong option may target a step the stem does not entail.
 */
export const claimGrounds = ["root_supported", "root_entailable", "external_assumption", "not_entailed"] as const;
export type ClaimGround = (typeof claimGrounds)[number];

export function reasonLicensed(ground: ClaimGround): boolean {
  return ground === "root_supported" || ground === "root_entailable";
}

/**
 * What a planned proposition is relative to the stem. The label does not say the distractor is good or bad.
 * `undetermined` is the honest value when the relation cannot be settled without a semantic reading.
 */
export const propositionStatuses = ["entailed", "contradicted", "not_entailed", "external_assumption", "restatement", "undetermined"] as const;
export type PropositionStatus = (typeof propositionStatuses)[number];

/** Whether the plan offers the proposition as an invalid inference. `none` makes no such offer. */
export const inferenceClaims = ["invalid_inference", "none"] as const;
export type InferenceClaim = (typeof inferenceClaims)[number];

/**
 * A declared `not_entailed` rationale is not thrown out only because it lacks a clash word.
 * Any other status, including a missing one, keeps the clash-word check. The declaration is not proof of the logic.
 */
export function undemonstratedExempt(status: PropositionStatus | null | undefined): boolean {
  return status === "not_entailed";
}

/**
 * `withheld`: the plan calls a restatement or an entailment an invalid inference. That offer is not rewarded.
 * `eligible`: a not-entailed step may be the target of an invalid inference. Eligible is not a quality pass.
 * `undetermined`: the status does not decide. Contradiction, outside knowledge, and an unset label stay here.
 */
export function inferenceReward(status: PropositionStatus | null | undefined, claim: InferenceClaim | null | undefined): "withheld" | "eligible" | "undetermined" {
  if (claim !== "invalid_inference") return "undetermined";
  if (status === "restatement" || status === "entailed") return "withheld";
  if (status === "not_entailed") return "eligible";
  return "undetermined";
}

/** Stopping is justified only when no licensed belief is left unused. A demand for an outside event is not enough. */
export function declineJustified(unusedLicensedBeliefs: number): boolean {
  return unusedLicensedBeliefs === 0;
}

/**
 * A concession treats the obstacle as a reason to expect the opposite outcome.
 * When the obstacle supports the outcome, that treatment reverses the relation.
 */
export function concessionAlignment(input: { obstacleSupportsOutcome: boolean; planTreatsObstacleAsConcession: boolean }): "aligned" | "reversed" {
  return input.obstacleSupportsOutcome && input.planTreatsObstacleAsConcession ? "reversed" : "aligned";
}
