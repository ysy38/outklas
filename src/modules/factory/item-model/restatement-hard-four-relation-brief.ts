import path from "node:path";
import { architectureV2WriterTokenCeiling, callCeilingUsd, type CatalogPrice, type PriceCatalog } from "./architecture-v2";
import { qualityAuthoringLiveAuthorized, qualityAuthoringModels } from "./quality-authoring";
import {
  qualityAuthoringLivePilotWriter,
  restatementHardBenchmark5Tasks,
} from "./quality-authoring-live-pilot";
import { qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";

export const restatementHardFourRelationBriefVersion = "restatement-hard-four-relation-brief-v1";
export const restatementHardFourRelationBriefAuthorization = "restatement-hard-four-relation-brief-v1";
export const restatementHardFourRelationBriefOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1";
export const restatementHardFourRelationBriefLiveAuthorized = true as const;
export const restatementHardFourRelationBriefSpendCapUsd = 0.02;
export const restatementHardFourRelationBriefRetry = 0;
export const restatementHardFourRelationBriefMaxCalls = 5;
export const restatementHardFourRelationBriefJudgeCalls = 0;
export const restatementHardFourRelationBriefProductionGate = false as const;

export const restatementHardFourRelationBriefFrozenHashes = {
  benchmarkSummarySha256: "51db881dd691c06bd6348456a1c627196501fbe974171f311305badd8b79d3da",
  qualityAuthoringPromptSha256: "be5a6b975e1704cc44fc67703e651691a6afb8ffc187813a9f28c7ac0edf7ef8",
} as const;

export type FourRelationPack = {
  sourceProposition: string;
  relationToHost: string;
  allowedSemanticMutation: string;
  whyContradicted: string;
  independentOfOtherRelations: true;
};

function replaceRelations(brief: string, relationsLine: string) {
  return brief.replace(/^Relations to host:.*$/m, `Relations to host: ${relationsLine}`);
}

const archivePacks: FourRelationPack[] = [
  {
    sourceProposition: "The loan waited until both condition reports had been finished.",
    relationToHost: "quantity both reports, not one",
    allowedSemanticMutation: "both → one",
    whyContradicted: "The named until-boundary is both reports. One report as the boundary is excluded.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The archive did not treat continuing hours as proof that the bindings were stable.",
    relationToHost: "evidential refusal: hours are not proof of stable bindings",
    allowedSemanticMutation: "not-proof → took as proof",
    whyContradicted: "The source asserts evidential refusal. The invert is its negation.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "Posted hours remained in force throughout the postponement.",
    relationToHost: "polarity of continuing posted hours",
    allowedSemanticMutation: "stayed in force → withdrawn during the delay",
    whyContradicted: "Hours remaining in force throughout excludes their having been withdrawn during that interval.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The archive postponed the loan until both reports were finished.",
    relationToHost: "postponement excludes lending before both reports were finished",
    allowedSemanticMutation: "loan went ahead before both reports were finished",
    whyContradicted: "Postponed-until-both excludes the loan occurring before both reports were finished.",
    independentOfOtherRelations: true,
  },
];

const seedPacks: FourRelationPack[] = [
  {
    sourceProposition: "Only the two highland stations would have received the winter seed.",
    relationToHost: "exclusivity only those two stations, not all stations",
    allowedSemanticMutation: "only two → all / others as well",
    whyContradicted: "only excludes other recipients. at least is entailed and is not this mutation.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "Clearing the pass before the frost is the antecedent temporal order.",
    relationToHost: "temporal before the frost, not frost before clearing",
    allowedSemanticMutation: "cleared before frost → frost before clearing",
    whyContradicted: "The named before-relation between those two events cannot hold in both directions.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The convoy is the agent that would have cleared the pass.",
    relationToHost: "agent of clearing is the convoy, not the highland stations",
    allowedSemanticMutation: "convoy cleared → stations cleared",
    whyContradicted: "The source names the convoy as the agent of that clearing.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The two highland stations would have received the seed (positive consequent).",
    relationToHost: "polarity of the counterfactual consequent",
    allowedSemanticMutation: "would have received → would not have received",
    whyContradicted: "The consequent asserts exclusive receipt. Denying receipt contradicts it.",
    independentOfOtherRelations: true,
  },
];

const portPacks: FourRelationPack[] = [
  {
    sourceProposition: "Both wrecks must have been inspected.",
    relationToHost: "quantity both wrecks, not either",
    allowedSemanticMutation: "both → either",
    whyContradicted: "The named inspection boundary is both wrecks.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "Inspected means completion, not onset.",
    relationToHost: "inspection completion, not inspection onset",
    allowedSemanticMutation: "have been inspected → have begun",
    whyContradicted: "Lift at onset can precede completion and violates not-until-inspected.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The authority will not lift the ban until both wrecks have been inspected.",
    relationToHost: "not-until P, not unless P",
    allowedSemanticMutation: "not-until P → unless P",
    whyContradicted: "When inspections have not occurred, not-until forbids lifting and unless requires it.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The contractor maintains that the channel has already been cleared.",
    relationToHost: "polarity of the contractor's already-cleared claim",
    allowedSemanticMutation: "already cleared → not yet cleared",
    whyContradicted: "The source attributes already-cleared to the contractor. The opposite complement is excluded. Authority-accepts is not this mutation.",
    independentOfOtherRelations: true,
  },
];

const ethicsPacks: FourRelationPack[] = [
  {
    sourceProposition: "Locks occur before the sponsor reviews the draft.",
    relationToHost: "temporal before: locks precede sponsor review, not the reverse",
    allowedSemanticMutation: "locks before review → review before locks",
    whyContradicted: "The same two events cannot have both orders as the named condition.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "Both trial sites must have locked.",
    relationToHost: "quantity both sites, not either",
    allowedSemanticMutation: "both → either",
    whyContradicted: "The necessary lock-set is both sites.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The necessary condition is that both sites have locked.",
    relationToHost: "polarity of the lock condition",
    allowedSemanticMutation: "have locked → have not locked",
    whyContradicted: "Polarity of the only-if clause is inverted. only-if → sufficient is not this mutation.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The ethics board is the agent that will release the tables.",
    relationToHost: "agent of release is the board, not the sponsor",
    allowedSemanticMutation: "board releases → sponsor releases",
    whyContradicted: "The source names the board as the releasing agent.",
    independentOfOtherRelations: true,
  },
];

const landPacks: FourRelationPack[] = [
  {
    sourceProposition: "The until-boundary is both surveyors filing closure measurements.",
    relationToHost: "quantity both measurements, not one",
    allowedSemanticMutation: "both → one",
    whyContradicted: "The named boundary is both filings.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The registry did not regard the list as proof that boundaries were settled.",
    relationToHost: "evidential refusal: list is not proof",
    allowedSemanticMutation: "not-proof → accepted as proof",
    whyContradicted: "Evidential refusal is asserted.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The allocation list continued to circulate while the endorsement was withheld.",
    relationToHost: "polarity of continuing circulation",
    allowedSemanticMutation: "continuing circulation → had stopped circulating",
    whyContradicted: "Continuing circulation excludes that the list had stopped. until-on-list as endpoint is not this mutation.",
    independentOfOtherRelations: true,
  },
  {
    sourceProposition: "The district land registry withheld the title endorsement.",
    relationToHost: "agent of withholding is the registry, not the housing trust",
    allowedSemanticMutation: "registry withheld → trust withheld",
    whyContradicted: "The source names the registry as the withholding agent of that endorsement.",
    independentOfOtherRelations: true,
  },
];

const relationLines = {
  "rhb-archive-cataloguers":
    "quantity both reports, not one; evidential refusal (hours are not proof of stable bindings); polarity of continuing posted hours; postponement excludes lending before both reports were finished.",
  "rhb-seed-convoy":
    "exclusivity only those two stations, not all stations; temporal before the frost, not frost before clearing; agent of clearing is the convoy, not the highland stations; polarity of the counterfactual consequent (would have received, not would not).",
  "rhb-port-wrecks":
    "quantity both wrecks, not either; inspection completion, not inspection onset; not-until P, not unless P; polarity of the contractor's already-cleared claim (already, not not-yet).",
  "rhb-ethics-randomization":
    "temporal before: locks precede sponsor review, not the reverse; quantity both sites, not either; polarity of the lock condition (have locked, not have not locked); agent of release is the board, not the sponsor.",
  "rhb-land-registry-housing":
    "quantity both measurements, not one; evidential refusal (list is not proof); polarity of continuing circulation; agent of withholding is the registry, not the housing trust.",
} as const;

const packsById: Record<string, FourRelationPack[]> = {
  "rhb-archive-cataloguers": archivePacks,
  "rhb-seed-convoy": seedPacks,
  "rhb-port-wrecks": portPacks,
  "rhb-ethics-randomization": ethicsPacks,
  "rhb-land-registry-housing": landPacks,
};

export const restatementHardFourRelationBriefPacks = packsById;

export const restatementHardFourRelationBriefExcludedAsNotContradicted = [
  "until_on_concurrent_hours_or_list",
  "although_to_because",
  "only_to_at_least",
  "only_if_to_sufficient",
  "counterfactual_to_factual",
  "authority_accepts_without_source_refusal",
] as const;

export const restatementHardFourRelationBriefTasks = restatementHardBenchmark5Tasks.map((task) => ({
  ...task,
  prepared: true as const,
  situationBrief: replaceRelations(task.situationBrief, relationLines[task.id]),
  packs: packsById[task.id],
}));

export function restatementHardFourRelationBriefOnlyRelationsLineChanged() {
  return restatementHardFourRelationBriefTasks.map((task, index) => {
    const original = restatementHardBenchmark5Tasks[index].situationBrief;
    const originalWithout = original.replace(/^Relations to host:.*$/m, "");
    const nextWithout = task.situationBrief.replace(/^Relations to host:.*$/m, "");
    const originalRelations = original.match(/^Relations to host:.*$/m)?.[0] ?? "";
    const nextRelations = task.situationBrief.match(/^Relations to host:.*$/m)?.[0] ?? "";
    return {
      id: task.id,
      otherLinesUnchanged: originalWithout === nextWithout,
      originalRelationCount: originalRelations.split(";").length,
      nextRelationCount: nextRelations.split(";").length,
    };
  });
}

export function restatementHardFourRelationBriefCeiling(prices: PriceCatalog) {
  const row = prices[qualityAuthoringLivePilotWriter];
  const perCallUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling)
    : null;
  const preparedCount = restatementHardFourRelationBriefTasks.filter((task) => task.prepared).length;
  const preparedUsd = perCallUsd != null ? perCallUsd * preparedCount : null;
  return {
    writer: qualityAuthoringLivePilotWriter,
    perCallUsd,
    preparedCount,
    preparedUsd,
    capUsd: restatementHardFourRelationBriefSpendCapUsd,
    retry: restatementHardFourRelationBriefRetry,
    maxCalls: restatementHardFourRelationBriefMaxCalls,
    judgeCalls: restatementHardFourRelationBriefJudgeCalls,
    fitsCap: preparedUsd != null && preparedUsd <= restatementHardFourRelationBriefSpendCapUsd,
  };
}

export function refuseRestatementHardFourRelationBrief(reason: string, code: string) {
  return {
    started: false,
    executed: false,
    providerCalls: 0,
    judgeCalls: 0,
    studentBankWrites: 0 as const,
    qualityAccepted: false as const,
    meaningProven: false as const,
    hardCalibrationStatus: "not_run" as const,
    productionGate: restatementHardFourRelationBriefProductionGate,
    reason,
    code,
    liveAuthorized: restatementHardFourRelationBriefLiveAuthorized,
    qualityAuthoringStageLiveAuthorized: qualityAuthoringLiveAuthorized,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
    authorization: restatementHardFourRelationBriefAuthorization,
  };
}

export function restatementHardFourRelationBriefProtectedDirs() {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter(
    (dir) => path.resolve(dir) !== path.resolve(restatementHardFourRelationBriefOutputDir),
  );
}
