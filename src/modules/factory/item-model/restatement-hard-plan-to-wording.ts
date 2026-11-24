import path from "node:path";
import { architectureV2WriterTokenCeiling, callCeilingUsd, type CatalogPrice, type PriceCatalog } from "./architecture-v2";
import { qualityAuthoringLiveAuthorized, qualityAuthoringModels } from "./quality-authoring";
import { qualityAuthoringLivePilotWriter } from "./quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";

export const restatementHardPlanToWordingVersion = "restatement-hard-plan-to-wording-v1";
export const restatementHardPlanToWordingAuthorization = "restatement-hard-plan-to-wording-v1";
export const restatementHardPlanToWordingOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-to-wording-v1";
export const restatementHardPlanToWordingLiveAuthorized = true as const;
export const restatementHardPlanToWordingSpendCapUsd = 0.02;
export const restatementHardPlanToWordingRetry = 0;
export const restatementHardPlanToWordingMaxCalls = 5;
export const restatementHardPlanToWordingJudgeCalls = 0;
export const restatementHardPlanToWordingProductionGate = false as const;

export const restatementHardPlanToWordingFrozenHashes = {
  benchmarkSummarySha256: "51db881dd691c06bd6348456a1c627196501fbe974171f311305badd8b79d3da",
  feasibilityJsonSha256: "6f5adfe64f86fe350da505a5fdde98a0c6305863c94d10b4e4dc0421815fcbe0",
  qualityAuthoringPromptSha256: "be5a6b975e1704cc44fc67703e651691a6afb8ffc187813a9f28c7ac0edf7ef8",
} as const;

export type PlanVsSource = "contradicted" | "not_entailed" | "equivalent";

export type PlanToWordingPlan = {
  id: string;
  trapType: string;
  sourceProposition: string;
  intendedMisreading: string;
  semanticMutation: string;
  whySourceDoesNotSupportIt: string;
  planValid: boolean;
  vsSource: PlanVsSource;
  invalidReason: string | null;
};

function plan(
  row: Omit<PlanToWordingPlan, "planValid" | "vsSource" | "invalidReason"> & {
    planValid: boolean;
    vsSource: PlanVsSource;
    invalidReason?: string;
  },
): PlanToWordingPlan {
  return {
    ...row,
    invalidReason: row.planValid ? null : (row.invalidReason ?? "not_contradicted_or_compatible_extra"),
  };
}

export const restatementHardPlanToWordingTasks = [
  {
    id: "rhb-archive-cataloguers",
    source:
      "The archive held back the loan of the parish registers until both cataloguers had finished their condition reports, although the gallery's posted opening hours stayed in force throughout the delay, a fact the archive did not read as proof that the bindings were sound.",
    key: "The archive delayed lending the parish registers until both cataloguers had completed their condition reports; the gallery's posted hours continued during the delay, but the archive did not take them as evidence that the bindings were sound.",
    plans: [
      plan({
        id: "A1",
        trapType: "QUANTITY_SCOPE",
        sourceProposition: "The until-boundary is both cataloguers finishing their condition reports.",
        intendedMisreading: "One of the two reports is a sufficient boundary.",
        semanticMutation: "both → one",
        whySourceDoesNotSupportIt: "The named terminal condition is the joint finishing of both reports.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "A2",
        trapType: "CAUSE_CONCESSION",
        sourceProposition: "Posted hours stayed in force throughout the delay (although), not as the reason the loan was held back.",
        intendedMisreading: "Hours caused or justified the postponement.",
        semanticMutation: "although concurrent hours → because hours, postponed",
        whySourceDoesNotSupportIt: "Although marks a concessive concurrent fact. It does not license a causal reading.",
        planValid: false,
        vsSource: "not_entailed",
        invalidReason: "although_does_not_contradict_because; extra_causal_claim",
      }),
      plan({
        id: "A3",
        trapType: "EVIDENCE_CERTAINTY",
        sourceProposition: "The archive did not read continuing hours as proof that the bindings were sound.",
        intendedMisreading: "Hours confirmed that the bindings were sound.",
        semanticMutation: "did not read as proof → took as confirmation",
        whySourceDoesNotSupportIt: "The source asserts evidential refusal.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "A4",
        trapType: "NEGATION_SCOPE",
        sourceProposition: "Posted opening hours stayed in force throughout the delay.",
        intendedMisreading: "Hours were withdrawn or suspended during the postponement.",
        semanticMutation: "stayed in force throughout → were withdrawn during",
        whySourceDoesNotSupportIt: "The source asserts the hours remained in force for the whole delay.",
        planValid: true,
        vsSource: "contradicted",
      }),
    ],
  },
  {
    id: "rhb-seed-convoy",
    source:
      "Had the convoy cleared the pass before the frost, only the two highland stations would have received the winter seed from the national seed bank.",
    key: "The winter seed would have reached only the two highland stations had the convoy cleared the pass before the frost.",
    plans: [
      plan({
        id: "S1",
        trapType: "COUNTERFACTUAL_FACTUAL",
        sourceProposition: "The sentence is a counterfactual conditional, not a report that delivery occurred.",
        intendedMisreading: "Seed reached the two stations after an actual clearing.",
        semanticMutation: "had/would have → simple past factual",
        whySourceDoesNotSupportIt: "A factual past is not equivalent to the subjunctive conditional.",
        planValid: false,
        vsSource: "not_entailed",
        invalidReason: "counterfactual_does_not_contradict_factual_past; mood_implicature",
      }),
      plan({
        id: "S2",
        trapType: "QUANTITY_SCOPE",
        sourceProposition: "Only the two highland stations would have received the seed.",
        intendedMisreading: "Other stations would also have received it.",
        semanticMutation: "only two → all / others as well",
        whySourceDoesNotSupportIt: "only excludes other recipients.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "S3",
        trapType: "TEMPORAL_ORDER",
        sourceProposition: "The antecedent requires clearing before the frost.",
        intendedMisreading: "The frost precedes clearing.",
        semanticMutation: "cleared before frost → frost before clearing",
        whySourceDoesNotSupportIt: "The named before-relation cannot hold in both directions of the same two events.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "S4",
        trapType: "AGENT_ROLE",
        sourceProposition: "The convoy is the agent that would have cleared the pass.",
        intendedMisreading: "The highland stations are the ones that would have cleared the pass.",
        semanticMutation: "convoy cleared → stations cleared",
        whySourceDoesNotSupportIt: "The source names the convoy as the agent of that clearing.",
        planValid: true,
        vsSource: "contradicted",
      }),
    ],
  },
  {
    id: "rhb-port-wrecks",
    source:
      "The port authority will not lift the navigation ban until both wrecks in the fairway have been inspected, although the salvage contractor maintains that the channel has already been cleared.",
    key: "The navigation ban stays in force until inspections of both fairway wrecks are complete, and the authority does not accept the contractor's claim that clearance has already occurred.",
    plans: [
      plan({
        id: "P1",
        trapType: "QUANTITY_SCOPE",
        sourceProposition: "Both wrecks must have been inspected.",
        intendedMisreading: "Inspection of either wreck is enough.",
        semanticMutation: "both → either",
        whySourceDoesNotSupportIt: "The boundary is both inspections.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "P2",
        trapType: "TEMPORAL_ORDER",
        sourceProposition: "Inspected means completion of the inspections, not their onset.",
        intendedMisreading: "The ban lifts when inspections have begun.",
        semanticMutation: "have been inspected → have begun",
        whySourceDoesNotSupportIt: "Lift-at-onset can precede completion and so violates not-until-inspected.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "P3",
        trapType: "EVIDENCE_CERTAINTY",
        sourceProposition: "Already-cleared is the contractor's claim, not the authority's.",
        intendedMisreading: "The authority accepts that the channel has already been cleared.",
        semanticMutation: "contractor maintains → authority accepts",
        whySourceDoesNotSupportIt: "The source attributes the claim to the contractor.",
        planValid: false,
        vsSource: "not_entailed",
        invalidReason: "although_does_not_entail_authority_rejection; extra_endorsement",
      }),
      plan({
        id: "P4",
        trapType: "CONDITION_DIRECTION",
        sourceProposition: "The authority will not lift the ban until both wrecks have been inspected.",
        intendedMisreading: "The ban is lifted if the inspections have not occurred.",
        semanticMutation: "not-until P → unless P",
        whySourceDoesNotSupportIt: "When inspections have not occurred, the source forbids lifting and unless requires it.",
        planValid: true,
        vsSource: "contradicted",
      }),
    ],
  },
  {
    id: "rhb-ethics-randomization",
    source:
      "The ethics board will release the interim tables only if both trial sites have locked their randomization logs before the sponsor reviews the draft.",
    key: "The interim tables will be released solely if both sites lock their randomization logs before the sponsor has seen the draft.",
    plans: [
      plan({
        id: "E1",
        trapType: "TEMPORAL_ORDER",
        sourceProposition: "Locks occur before the sponsor reviews the draft.",
        intendedMisreading: "Sponsor review must precede the locks.",
        semanticMutation: "locks before review → review before locks",
        whySourceDoesNotSupportIt: "The before-clause attaches to the locks. The same two events cannot have both orders.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "E2",
        trapType: "QUANTITY_SCOPE",
        sourceProposition: "Both trial sites must have locked.",
        intendedMisreading: "Either site locking satisfies the condition.",
        semanticMutation: "both → either",
        whySourceDoesNotSupportIt: "The necessary lock-set is both sites.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "E3",
        trapType: "CONDITION_DIRECTION",
        sourceProposition: "only if: locking is necessary for release, not sufficient.",
        intendedMisreading: "Locking guarantees release.",
        semanticMutation: "only-if / necessary → sufficient / guarantees",
        whySourceDoesNotSupportIt: "Q only if P is Q→P. P guarantees Q is P→Q.",
        planValid: false,
        vsSource: "not_entailed",
        invalidReason: "necessary_does_not_contradict_sufficient; extra_converse",
      }),
      plan({
        id: "E4",
        trapType: "NEGATION_SCOPE",
        sourceProposition: "The necessary condition is that both sites have locked (positive).",
        intendedMisreading: "Release is only if the sites have not locked.",
        semanticMutation: "have locked → have not locked",
        whySourceDoesNotSupportIt: "Polarity of the lock condition is inverted.",
        planValid: true,
        vsSource: "contradicted",
      }),
    ],
  },
  {
    id: "rhb-land-registry-housing",
    source:
      "The district land registry withheld the title endorsement until both boundary surveyors had filed their closure measurements, and it did not regard the housing trust's continuing circulation of its allocation list as proof that the parcel boundaries were settled.",
    key: "The registry kept the title endorsement on hold until both surveyors had submitted their closure measurements, and it did not accept the trust's ongoing circulation of its allocation list as evidence that the boundaries were settled.",
    plans: [
      plan({
        id: "L1",
        trapType: "QUANTITY_SCOPE",
        sourceProposition: "The until-boundary is both surveyors filing closure measurements.",
        intendedMisreading: "One surveyor's filing is enough.",
        semanticMutation: "both → one",
        whySourceDoesNotSupportIt: "The named boundary is both filings.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "L2",
        trapType: "EVIDENCE_CERTAINTY",
        sourceProposition: "The registry did not regard the circulating list as proof that boundaries were settled.",
        intendedMisreading: "The list was accepted as proof.",
        semanticMutation: "did not regard as proof → accepted as evidence",
        whySourceDoesNotSupportIt: "Evidential refusal is asserted.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "L3",
        trapType: "NEGATION_SCOPE",
        sourceProposition: "The housing trust's allocation list continued to circulate while the endorsement was withheld.",
        intendedMisreading: "The list was not in circulation during withholding.",
        semanticMutation: "continuing circulation → had stopped circulating",
        whySourceDoesNotSupportIt: "The source asserts continuing circulation.",
        planValid: true,
        vsSource: "contradicted",
      }),
      plan({
        id: "L4",
        trapType: "AGENT_ROLE",
        sourceProposition: "The district land registry is the agent that withheld the title endorsement.",
        intendedMisreading: "The housing trust withheld the endorsement.",
        semanticMutation: "registry withheld → trust withheld",
        whySourceDoesNotSupportIt: "The source names the registry as the withholding agent of that endorsement.",
        planValid: true,
        vsSource: "contradicted",
      }),
    ],
  },
] as const;

export function restatementHardPlanToWordingPrecheck() {
  return restatementHardPlanToWordingTasks.map((task) => {
    const valid = task.plans.filter((row) => row.planValid);
    const invalid = task.plans.filter((row) => !row.planValid);
    return {
      id: task.id,
      validSuppliedPlans: valid.length,
      invalidPlans: invalid.map((row) => ({ id: row.id, reason: row.invalidReason, vsSource: row.vsSource })),
      canMeetFourValidBar: valid.length === 4,
    };
  });
}

export function restatementHardPlanToWordingCeiling(prices: PriceCatalog) {
  const row = prices[qualityAuthoringLivePilotWriter];
  const perCallUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling)
    : null;
  const fiveCallUsd = perCallUsd != null ? perCallUsd * restatementHardPlanToWordingMaxCalls : null;
  return {
    writer: qualityAuthoringLivePilotWriter,
    perCallUsd,
    fiveCallUsd,
    capUsd: restatementHardPlanToWordingSpendCapUsd,
    retry: restatementHardPlanToWordingRetry,
    maxCalls: restatementHardPlanToWordingMaxCalls,
    judgeCalls: restatementHardPlanToWordingJudgeCalls,
    fitsCap: fiveCallUsd != null && fiveCallUsd <= restatementHardPlanToWordingSpendCapUsd,
  };
}

export function refuseRestatementHardPlanToWording(reason: string, code: string) {
  return {
    started: false,
    executed: false,
    providerCalls: 0,
    judgeCalls: 0,
    studentBankWrites: 0 as const,
    qualityAccepted: false as const,
    meaningProven: false as const,
    hardCalibrationStatus: "not_run" as const,
    productionGate: restatementHardPlanToWordingProductionGate,
    reason,
    code,
    liveAuthorized: restatementHardPlanToWordingLiveAuthorized,
    qualityAuthoringStageLiveAuthorized: qualityAuthoringLiveAuthorized,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
    authorization: restatementHardPlanToWordingAuthorization,
  };
}

export function restatementHardPlanToWordingProtectedDirs() {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter(
    (dir) => path.resolve(dir) !== path.resolve(restatementHardPlanToWordingOutputDir),
  );
}
