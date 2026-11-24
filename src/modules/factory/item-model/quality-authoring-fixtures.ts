/** Offline instructional fixtures. They are not quality proof. */

export const qualityAuthoringFixtureSource =
  "Had the editors completed the citation check before the embargo, only the two contested appendices would have been released to the preprint server.";

export const qualityAuthoringFixtureKey =
  "Only the two contested appendices would have been released to the preprint server if the editors had finished checking the citations ahead of the embargo.";

const after =
  "Had the editors completed the citation check after the embargo, only the two contested appendices would have been released to the preprint server.";
const swapped =
  "Had only the two contested appendices been released to the preprint server, the editors would have completed the citation check before the embargo.";
const factual =
  "The editors completed the citation check before the embargo, and only the two contested appendices were released to the preprint server.";
const atLeast =
  "Had the editors completed the citation check before the embargo, at least the two contested appendices would have been released to the preprint server.";
const onlyToAll =
  "Had the editors completed the citation check before the embargo, all the contested appendices would have been released to the preprint server.";
const ifFront =
  "If the editors had completed the citation check before the embargo, only the two contested appendices would have been released to the preprint server.";
const priorTo =
  "Had the editors completed the citation check prior to the embargo, only the two contested appendices would have been released to the preprint server.";

function item(
  source: string,
  key: string,
  candidates: { planId: "p1" | "p2" | "p3" | "p4" | "p5" | "p6"; trap: string; candidateText: string; studentMisreading: string }[],
) {
  return {
    source,
    key,
    questionType: "restatement" as const,
    direction: "none" as const,
    candidates,
  };
}

/** Six candidates; four shown mutations remain after equivalent near-copies drop. at-least is a recorded risk, not a hard drop. */
export const fourOfSixFixture = item(qualityAuthoringFixtureSource, qualityAuthoringFixtureKey, [
  { planId: "p1", trap: "TEMPORAL_ORDER", candidateText: after, studentMisreading: "after instead of before" },
  { planId: "p2", trap: "CONDITION_DIRECTION", candidateText: swapped, studentMisreading: "condition direction reversed" },
  { planId: "p3", trap: "COUNTERFACTUAL_FACTUAL", candidateText: factual, studentMisreading: "counterfactual read as fact" },
  { planId: "p4", trap: "QUANTITY_SCOPE", candidateText: atLeast, studentMisreading: "only weakened to at least" },
  { planId: "p5", trap: "COUNTERFACTUAL_FACTUAL", candidateText: ifFront, studentMisreading: "if-fronting of the same event" },
  { planId: "p6", trap: "TEMPORAL_ORDER", candidateText: priorTo, studentMisreading: "prior to as a near-copy of before" },
]);

/** Same QUANTITY_SCOPE label on two different texts. Label variety is not a keep filter. */
export const sameTrapDifferentTextsFixture = item(qualityAuthoringFixtureSource, qualityAuthoringFixtureKey, [
  { planId: "p1", trap: "QUANTITY_SCOPE", candidateText: onlyToAll, studentMisreading: "only inverted to all" },
  { planId: "p2", trap: "QUANTITY_SCOPE", candidateText: atLeast, studentMisreading: "only weakened to at least" },
  { planId: "p3", trap: "TEMPORAL_ORDER", candidateText: after, studentMisreading: "after instead of before" },
  { planId: "p4", trap: "COUNTERFACTUAL_FACTUAL", candidateText: factual, studentMisreading: "counterfactual read as fact" },
  { planId: "p5", trap: "CAUSE_CONCESSION", candidateText: qualityAuthoringFixtureSource, studentMisreading: "same wording as the source" },
  { planId: "p6", trap: "AGENT_ROLE", candidateText: qualityAuthoringFixtureKey, studentMisreading: "same wording as the key" },
]);

/** Three keepable mutations plus a duplicate text and two same-wording copies. Must stop without padding. */
export const insufficientFixture = item(qualityAuthoringFixtureSource, qualityAuthoringFixtureKey, [
  { planId: "p1", trap: "TEMPORAL_ORDER", candidateText: after, studentMisreading: "after instead of before" },
  { planId: "p2", trap: "CONDITION_DIRECTION", candidateText: swapped, studentMisreading: "condition direction reversed" },
  { planId: "p3", trap: "COUNTERFACTUAL_FACTUAL", candidateText: factual, studentMisreading: "counterfactual read as fact" },
  { planId: "p4", trap: "QUANTITY_SCOPE", candidateText: after, studentMisreading: "same after wording under a new planId" },
  { planId: "p5", trap: "COUNTERFACTUAL_FACTUAL", candidateText: qualityAuthoringFixtureSource, studentMisreading: "same wording as the source" },
  { planId: "p6", trap: "TEMPORAL_ORDER", candidateText: qualityAuthoringFixtureSource, studentMisreading: "same wording as the source again" },
]);

/** Fewer than six authored candidates. Schema must accept this; selector must not pad. */
export const shortPoolFixture = item(qualityAuthoringFixtureSource, qualityAuthoringFixtureKey, [
  { planId: "p1", trap: "TEMPORAL_ORDER", candidateText: after, studentMisreading: "after instead of before" },
  { planId: "p2", trap: "CONDITION_DIRECTION", candidateText: swapped, studentMisreading: "condition direction reversed" },
  { planId: "p3", trap: "COUNTERFACTUAL_FACTUAL", candidateText: factual, studentMisreading: "counterfactual read as fact" },
]);

export const sourceInsufficientFixture = {
  ...item(qualityAuthoringFixtureSource, qualityAuthoringFixtureKey, []),
  status: "source_insufficient_quality_opportunities" as const,
};
