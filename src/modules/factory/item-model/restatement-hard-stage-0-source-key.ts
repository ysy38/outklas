import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { qualityAuthoringLiveAuthorized, qualityAuthoringModels } from "./quality-authoring";
import { recoveryDefaultEnabled } from "./recovery";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";
import { qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";

export const restatementHardStage0SourceKeyVersion = "restatement-hard-stage-0-source-key-v1";
export const restatementHardStage0SourceKeyOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-0-source-key-v1";
export const restatementHardStage0SourceKeyLiveAuthorized = false as const;
export const restatementHardStage0SourceKeyProductionGate = false as const;
export const restatementHardStage0PaidLlmCalls = 0 as const;

export const restatementHardStage0SourceKeyFrozenHashes = {
  benchmarkSummarySha256: "51db881dd691c06bd6348456a1c627196501fbe974171f311305badd8b79d3da",
  qualityAuthoringPromptSha256: "be5a6b975e1704cc44fc67703e651691a6afb8ffc187813a9f28c7ac0edf7ef8",
  fourRelationSummarySha256: "30cd5a145c36f0d57f422e4e9b8f5f37b88659dc1e43640736c8831a30e01503",
  planPoolStageASummarySha256: "e1569a228258d39d59145f579533839b0429fabf33668634ffd57f0f34c503a9",
  stageAPlanningSummarySha256: "b637372f4e77c419f168fe2f2498652740284f7bff98da643468f4d5ea7d250c",
} as const;

export type Stage0PairStatus = "EQUIVALENT_CANDIDATE" | "NON_EQUIVALENT" | "UNDETERMINED";
export type Stage0Entailment = boolean | "undetermined";
export type Stage0DifferenceKind =
  | "extra_negation"
  | "extra_certainty"
  | "quantity_scope"
  | "added_causation"
  | "condition_direction"
  | "temporal_boundary"
  | "actor_attribution"
  | "dropped_conjunct"
  | "added_conjunct";

export type Stage0PreviousJudgment = {
  experiment: string;
  label: string;
  consistentWithThisReview: boolean;
};

type WriterPayload = { parsed?: { source?: unknown; key?: unknown } };

function sha256Text(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function loadWriterPair(recordPath: string) {
  const payload = JSON.parse(readFileSync(recordPath, "utf8")) as WriterPayload;
  const source = payload.parsed?.source;
  const key = payload.parsed?.key;
  if (typeof source !== "string" || typeof key !== "string") {
    throw new Error(`missing source/key in ${recordPath}`);
  }
  return {
    source,
    key,
    sourceHash: sha256Text(source),
    keyHash: sha256Text(key),
    pairHash: sha256Text(`${source}\n---\n${key}`),
  };
}

export const restatementHardStage0PairRecords = [
  { variantId: "archive.benchmark-5", briefId: "rhb-archive-cataloguers", experimentIds: ["restatement-hard-benchmark-5-v1", "restatement-hard-plan-to-wording-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-benchmark-5-v1/rhb-archive-cataloguers.writer.json" },
  { variantId: "archive.four-relation", briefId: "rhb-archive-cataloguers", experimentIds: ["restatement-hard-four-relation-brief-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1/rhb-archive-cataloguers.writer.json" },
  { variantId: "archive.stage-a-planning", briefId: "rhb-archive-cataloguers", experimentIds: ["restatement-hard-stage-a-planning-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1/rhb-archive-cataloguers.stage-a.writer.json" },
  { variantId: "archive.plan-pool", briefId: "rhb-archive-cataloguers", experimentIds: ["restatement-hard-plan-pool-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1/rhb-archive-cataloguers.stage-a.writer.json" },
  { variantId: "seed.benchmark-5", briefId: "rhb-seed-convoy", experimentIds: ["restatement-hard-benchmark-5-v1", "restatement-hard-plan-to-wording-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-benchmark-5-v1/rhb-seed-convoy.writer.json" },
  { variantId: "seed.four-relation", briefId: "rhb-seed-convoy", experimentIds: ["restatement-hard-four-relation-brief-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1/rhb-seed-convoy.writer.json" },
  { variantId: "seed.stage-a-planning", briefId: "rhb-seed-convoy", experimentIds: ["restatement-hard-stage-a-planning-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1/rhb-seed-convoy.stage-a.writer.json" },
  { variantId: "seed.plan-pool", briefId: "rhb-seed-convoy", experimentIds: ["restatement-hard-plan-pool-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1/rhb-seed-convoy.stage-a.writer.json" },
  { variantId: "port.benchmark-5", briefId: "rhb-port-wrecks", experimentIds: ["restatement-hard-benchmark-5-v1", "restatement-hard-plan-to-wording-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-benchmark-5-v1/rhb-port-wrecks.writer.json" },
  { variantId: "port.four-relation", briefId: "rhb-port-wrecks", experimentIds: ["restatement-hard-four-relation-brief-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1/rhb-port-wrecks.writer.json" },
  { variantId: "port.stage-a-planning", briefId: "rhb-port-wrecks", experimentIds: ["restatement-hard-stage-a-planning-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1/rhb-port-wrecks.stage-a.writer.json" },
  { variantId: "port.plan-pool", briefId: "rhb-port-wrecks", experimentIds: ["restatement-hard-plan-pool-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1/rhb-port-wrecks.stage-a.writer.json" },
  { variantId: "ethics.benchmark-5", briefId: "rhb-ethics-randomization", experimentIds: ["restatement-hard-benchmark-5-v1", "restatement-hard-plan-to-wording-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-benchmark-5-v1/rhb-ethics-randomization.writer.json" },
  { variantId: "ethics.four-relation", briefId: "rhb-ethics-randomization", experimentIds: ["restatement-hard-four-relation-brief-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1/rhb-ethics-randomization.writer.json" },
  { variantId: "ethics.stage-a-planning", briefId: "rhb-ethics-randomization", experimentIds: ["restatement-hard-stage-a-planning-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1/rhb-ethics-randomization.stage-a.writer.json" },
  { variantId: "ethics.plan-pool", briefId: "rhb-ethics-randomization", experimentIds: ["restatement-hard-plan-pool-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1/rhb-ethics-randomization.stage-a.writer.json" },
  { variantId: "land.benchmark-5", briefId: "rhb-land-registry-housing", experimentIds: ["restatement-hard-benchmark-5-v1", "restatement-hard-plan-to-wording-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-benchmark-5-v1/rhb-land-registry-housing.writer.json" },
  { variantId: "land.four-relation", briefId: "rhb-land-registry-housing", experimentIds: ["restatement-hard-four-relation-brief-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1/rhb-land-registry-housing.writer.json" },
  { variantId: "land.stage-a-planning", briefId: "rhb-land-registry-housing", experimentIds: ["restatement-hard-stage-a-planning-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1/rhb-land-registry-housing.stage-a.writer.json" },
  { variantId: "land.plan-pool", briefId: "rhb-land-registry-housing", experimentIds: ["restatement-hard-plan-pool-v1"], recordPath: ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1/rhb-land-registry-housing.stage-a.writer.json" },
] as const;

export const restatementHardStage0Evaluations: Record<
  string,
  {
    sourceEntailsKey: Stage0Entailment;
    keyEntailsSource: Stage0Entailment;
    status: Stage0PairStatus;
    differences: { kind: Stage0DifferenceKind; sourceQuote: string; keyQuote: string; note: string }[];
    previousJudgments: Stage0PreviousJudgment[];
    provisionalStageA: boolean;
  }
> = {
  "archive.benchmark-5": {
    sourceEntailsKey: true,
    keyEntailsSource: true,
    status: "EQUIVALENT_CANDIDATE",
    differences: [],
    previousJudgments: [
      { experiment: "restatement-hard-benchmark-5-v1", label: "keyEquivalent true", consistentWithThisReview: true },
      { experiment: "restatement-hard-plan-pool-v1/stage-0-original", label: "both directions true", consistentWithThisReview: true },
    ],
    provisionalStageA: true,
  },
  "archive.four-relation": {
    sourceEntailsKey: true,
    keyEntailsSource: true,
    status: "EQUIVALENT_CANDIDATE",
    differences: [
      {
        kind: "actor_attribution",
        sourceQuote: "The municipal archive deferred lending",
        keyQuote: "The loan was held back",
        note: "Municipal agent is dropped. Same-agent reading treats the loan as still the archive's act.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-four-relation-brief-v1", label: "keyEquivalent true", consistentWithThisReview: true }],
    provisionalStageA: true,
  },
  "archive.stage-a-planning": {
    sourceEntailsKey: true,
    keyEntailsSource: false,
    status: "NON_EQUIVALENT",
    differences: [
      {
        kind: "extra_certainty",
        sourceQuote: "did not take those continuing hours as evidence that the bindings were stable",
        keyQuote: "did not regard them as confirmation that the bindings were sound",
        note: "Not-evidence is stronger than not-confirmation. The key's weaker denial does not entail the source.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-stage-a-planning-v1", label: "keyAddsUnentailedClaim false / equivalent_unproven", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
  "archive.plan-pool": {
    sourceEntailsKey: "undetermined",
    keyEntailsSource: "undetermined",
    status: "UNDETERMINED",
    differences: [
      {
        kind: "extra_certainty",
        sourceQuote: "did not treat those continuing hours as proof that the bindings were stable",
        keyQuote: "did not regard the gallery's posted hours … as evidence that the bindings were stable",
        note: "Proof and evidence are not shown to be equivalent. Independent review required.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-plan-pool-v1", label: "sourceKeyStatus equivalent", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
  "seed.benchmark-5": {
    sourceEntailsKey: true,
    keyEntailsSource: true,
    status: "EQUIVALENT_CANDIDATE",
    differences: [
      {
        kind: "actor_attribution",
        sourceQuote: "from the national seed bank",
        keyQuote: "The winter seed would have reached only the two highland stations",
        note: "Supplier phrase is dropped. 'The winter seed' can still be that same seed. Not treated as a new actor.",
      },
    ],
    previousJudgments: [
      { experiment: "restatement-hard-benchmark-5-v1", label: "keyEquivalent true; drops seed-bank as source", consistentWithThisReview: true },
      { experiment: "restatement-hard-plan-pool-v1/stage-0-original", label: "both directions true", consistentWithThisReview: true },
    ],
    provisionalStageA: true,
  },
  "seed.four-relation": {
    sourceEntailsKey: true,
    keyEntailsSource: true,
    status: "EQUIVALENT_CANDIDATE",
    differences: [],
    previousJudgments: [{ experiment: "restatement-hard-four-relation-brief-v1", label: "keyEquivalent true / construction PASS", consistentWithThisReview: true }],
    provisionalStageA: true,
  },
  "seed.stage-a-planning": {
    sourceEntailsKey: "undetermined",
    keyEntailsSource: "undetermined",
    status: "UNDETERMINED",
    differences: [
      {
        kind: "added_causation",
        sourceQuote: "The convoy did not clear the pass before the frost, so none of the winter seed reached the highlands",
        keyQuote: "Because the convoy failed to get through the pass before the frost, no winter seed reached the highlands",
        note: "Source uses 'so' (result/inference). Key uses 'because' (cause). This pair is not the CF-only seed pair.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-stage-a-planning-v1", label: "keyAddsUnentailedClaim false", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
  "seed.plan-pool": {
    sourceEntailsKey: true,
    keyEntailsSource: false,
    status: "NON_EQUIVALENT",
    differences: [
      {
        kind: "dropped_conjunct",
        sourceQuote: "None of the winter seed reached the highlands because the convoy failed to clear the mountain pass before the frost",
        keyQuote: "If the convoy had got through the pass before the frost, just the two highland stations would have been supplied",
        note: "Key restates only the counterfactual half. It does not entail the factual because-clause.",
      },
      {
        kind: "added_causation",
        sourceQuote: "because the convoy failed to clear",
        keyQuote: "If the convoy had got through",
        note: "Causation is in the source, not the key. Distinct from seed.four-relation (CF-only on both sides).",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-plan-pool-v1", label: "keyBlocked true / key_not_equivalent", consistentWithThisReview: true }],
    provisionalStageA: false,
  },
  "port.benchmark-5": {
    sourceEntailsKey: false,
    keyEntailsSource: false,
    status: "NON_EQUIVALENT",
    differences: [
      {
        kind: "extra_negation",
        sourceQuote: "although the salvage contractor maintains that the channel has already been cleared",
        keyQuote: "the authority does not accept the contractor's claim that clearance has already occurred",
        note: "although does not entail rejection. The extra negation is in the key, not the source.",
      },
    ],
    previousJudgments: [
      { experiment: "restatement-hard-benchmark-5-v1", label: "keyEquivalent true AND key_strengthens_although_to_authority_does_not_accept", consistentWithThisReview: false },
      { experiment: "restatement-semantic-acceptance-v1", label: "key extra negation; source-key incomplete", consistentWithThisReview: true },
      { experiment: "restatement-hard-plan-pool-v1/stage-0-original", label: "keyBlocked true", consistentWithThisReview: true },
    ],
    provisionalStageA: false,
  },
  "port.four-relation": {
    sourceEntailsKey: false,
    keyEntailsSource: false,
    status: "NON_EQUIVALENT",
    differences: [
      {
        kind: "extra_negation",
        sourceQuote: "although the salvage contractor maintained that the channel had already been cleared",
        keyQuote: "a claim the authority did not accept",
        note: "Same extra-negation pattern as port.benchmark-5 on a different wording. Not the rejection-in-source pair.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-four-relation-brief-v1", label: "keyEquivalent false", consistentWithThisReview: true }],
    provisionalStageA: false,
  },
  "port.stage-a-planning": {
    sourceEntailsKey: true,
    keyEntailsSource: true,
    status: "EQUIVALENT_CANDIDATE",
    differences: [
      {
        kind: "extra_negation",
        sourceQuote: "a claim the authority did not adopt",
        keyQuote: "the authority did not accept the contractor's view",
        note: "Rejection is already in this source. Not the same pair as port.benchmark-5.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-stage-a-planning-v1", label: "keyAddsUnentailedClaim false because source includes did not adopt", consistentWithThisReview: true }],
    provisionalStageA: true,
  },
  "port.plan-pool": {
    sourceEntailsKey: true,
    keyEntailsSource: true,
    status: "EQUIVALENT_CANDIDATE",
    differences: [
      {
        kind: "extra_negation",
        sourceQuote: "rejecting the salvage contractor's argument that the fairway had already been cleared",
        keyQuote: "it does not accept the contractor's claim that clearance has already occurred",
        note: "Rejecting is in the source. Mixing this with although-only port pairs collapses two Stage 0 types.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-plan-pool-v1", label: "equivalent_on_generated_pair; originalPairKeyBlocked true", consistentWithThisReview: true }],
    provisionalStageA: true,
  },
  "ethics.benchmark-5": {
    sourceEntailsKey: true,
    keyEntailsSource: true,
    status: "EQUIVALENT_CANDIDATE",
    differences: [
      {
        kind: "actor_attribution",
        sourceQuote: "The ethics board will release the interim tables",
        keyQuote: "The interim tables will be released",
        note: "Board as releasing agent is compressed to a passive.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-benchmark-5-v1", label: "keyEquivalent true", consistentWithThisReview: true }],
    provisionalStageA: true,
  },
  "ethics.four-relation": {
    sourceEntailsKey: "undetermined",
    keyEntailsSource: true,
    status: "UNDETERMINED",
    differences: [
      {
        kind: "actor_attribution",
        sourceQuote: "before the sponsor saw the draft",
        keyQuote: "before the sponsor reviewed the draft",
        note: "Seeing does not clearly entail reviewing. Same source hash later appears with a different key in ethics.plan-pool.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-four-relation-brief-v1", label: "keyEquivalent true / construction PASS", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
  "ethics.stage-a-planning": {
    sourceEntailsKey: "undetermined",
    keyEntailsSource: false,
    status: "NON_EQUIVALENT",
    differences: [
      {
        kind: "condition_direction",
        sourceQuote: "only if both trial sites have locked their randomization logs",
        keyQuote: "Release of the interim tables depends on both trial sites locking",
        note: "only if states necessity. depends on does not entail only-if and may be one factor among others.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-stage-a-planning-v1", label: "equivalent_unproven", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
  "ethics.plan-pool": {
    sourceEntailsKey: "undetermined",
    keyEntailsSource: false,
    status: "NON_EQUIVALENT",
    differences: [
      {
        kind: "condition_direction",
        sourceQuote: "only if both trial sites had locked their randomization logs before the sponsor saw the draft",
        keyQuote: "Release of the interim tables depends on both trial sites locking their randomization logs before the sponsor sees the draft",
        note: "Same only-if → depends-on mismatch. Source text matches ethics.four-relation; the key does not.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-plan-pool-v1", label: "sourceKeyStatus equivalent", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
  "land.benchmark-5": {
    sourceEntailsKey: "undetermined",
    keyEntailsSource: "undetermined",
    status: "UNDETERMINED",
    differences: [
      {
        kind: "extra_certainty",
        sourceQuote: "did not regard the housing trust's continuing circulation of its allocation list as proof",
        keyQuote: "did not accept the trust's ongoing circulation of its allocation list as evidence",
        note: "Regard-as-proof vs accept-as-evidence is not shown equivalent. Not the port extra-negation class.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-benchmark-5-v1", label: "keyEquivalent true", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
  "land.four-relation": {
    sourceEntailsKey: true,
    keyEntailsSource: true,
    status: "EQUIVALENT_CANDIDATE",
    differences: [
      {
        kind: "extra_certainty",
        sourceQuote: "neither ended that withholding nor served the registry as proof",
        keyQuote: "did not lift the hold, and the registry did not treat it as evidence",
        note: "Not-endpoint is already in this source. Proof vs evidence remains unproven synonymy, treated here as restatement of the same evidential refusal.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-four-relation-brief-v1", label: "keyEquivalent true", consistentWithThisReview: true }],
    provisionalStageA: true,
  },
  "land.stage-a-planning": {
    sourceEntailsKey: true,
    keyEntailsSource: false,
    status: "NON_EQUIVALENT",
    differences: [
      {
        kind: "dropped_conjunct",
        sourceQuote: "that list did not end the withholding, and the registry never treated it as proof",
        keyQuote: "the registry did not accept the circulating allocation list as proof that the boundaries were settled",
        note: "Key drops the not-endpoint conjunct that the source asserts.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-stage-a-planning-v1", label: "equivalent_unproven", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
  "land.plan-pool": {
    sourceEntailsKey: false,
    keyEntailsSource: false,
    status: "NON_EQUIVALENT",
    differences: [
      {
        kind: "added_conjunct",
        sourceQuote: "it did not treat the housing trust's continuing circulation of its allocation list as proof",
        keyQuote: "the trust's ongoing circulation of its list was neither what ended the withholding nor evidence",
        note: "Key adds that the list was not the ending event. until-both-measurements does not entail that, on the same until doctrine used for distractors.",
      },
    ],
    previousJudgments: [{ experiment: "restatement-hard-plan-pool-v1", label: "sourceKeyStatus equivalent", consistentWithThisReview: false }],
    provisionalStageA: false,
  },
};

export const restatementHardStage0MixingFindings = [
  {
    id: "same_brief_name_is_not_same_pair",
    answer: "yes_in_part",
    detail:
      "Each brief name covers four distinct source/key pairs (benchmark-5/plan-to-wording share one). Cross-experiment construction scores were compared under one brief id. That is a same-situation-brief comparison, not a same-pair comparison.",
  },
  {
    id: "port_two_pair_types",
    detail:
      "port.benchmark-5 and port.four-relation: although in source, does-not-accept only in key (NON_EQUIVALENT). port.stage-a-planning and port.plan-pool: rejection is already in the source (EQUIVALENT_CANDIDATE). Collapsing these as 'the port key defect' is a false identity.",
  },
  {
    id: "seed_cf_only_vs_factual_because",
    detail:
      "seed.benchmark-5 and seed.four-relation are CF-only on both sides. seed.stage-a-planning and seed.plan-pool add a factual because/so clause. seed.four-relation construction PASS cannot be read as a Stage 0 success for seed.plan-pool, which is NON_EQUIVALENT.",
  },
  {
    id: "benchmark_5_port_internal_contradiction",
    detail:
      "The original benchmark editorial set keyEquivalent true and also recorded key_strengthens_although_to_authority_does_not_accept on the same pair.",
  },
  {
    id: "ethics_only_if_vs_depends_on",
    detail:
      "ethics.four-relation key is solely-on-condition (near only-if) and was scored construction PASS. ethics.plan-pool uses the same source text with a depends-on key, previously scored equivalent. Those keys are not the same pair.",
  },
  {
    id: "because_standard_shifted",
    detail:
      "seed.stage-a-planning so→because was treated as no extra claim. seed.plan-pool because-in-source / CF-only key was keyBlocked. The because-clause was not judged on one standard.",
  },
] as const;

export function restatementHardStage0Catalog() {
  return restatementHardStage0PairRecords.map((record) => {
    const pair = loadWriterPair(record.recordPath);
    const evaluation = restatementHardStage0Evaluations[record.variantId];
    return {
      ...record,
      ...pair,
      ...evaluation,
      independence: "same-agent editorial; not independent proof" as const,
      autoFixed: false as const,
      requiresIndependentReview: true as const,
      equivalentCandidateIsNotProvenEquivalence: true as const,
      heuristicsAreNotProof: true as const,
    };
  });
}

export function restatementHardStage0BriefPairCounts() {
  const counts = new Map<string, Set<string>>();
  for (const row of restatementHardStage0Catalog()) {
    const set = counts.get(row.briefId) ?? new Set<string>();
    set.add(row.pairHash);
    counts.set(row.briefId, set);
  }
  return [...counts.entries()].map(([briefId, hashes]) => ({ briefId, uniquePairs: hashes.size }));
}

export function restatementHardStage0Locks() {
  return {
    paidLlmCalls: restatementHardStage0PaidLlmCalls,
    qualityAccepted: false as const,
    meaningProven: false as const,
    hardCalibrationStatus: "not_run" as const,
    productionGate: restatementHardStage0SourceKeyProductionGate,
    studentBankWrites: 0 as const,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    qualityAuthoringStageLiveAuthorized: qualityAuthoringLiveAuthorized,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
    autoFixed: false as const,
  };
}

export function restatementHardStage0ProtectedDirs() {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter(
    (dir) => path.resolve(dir) !== path.resolve(restatementHardStage0SourceKeyOutputDir),
  );
}

export function writeRestatementHardStage0SourceKeyReport(outDir = restatementHardStage0SourceKeyOutputDir) {
  const resolved = path.resolve(outDir);
  if (restatementHardStage0ProtectedDirs().some((dir) => path.resolve(dir) === resolved)) {
    throw new Error("refuses to overwrite earlier experiment records");
  }
  const catalog = restatementHardStage0Catalog();
  const statusCounts = {
    EQUIVALENT_CANDIDATE: catalog.filter((row) => row.status === "EQUIVALENT_CANDIDATE").length,
    NON_EQUIVALENT: catalog.filter((row) => row.status === "NON_EQUIVALENT").length,
    UNDETERMINED: catalog.filter((row) => row.status === "UNDETERMINED").length,
  };
  const report = {
    version: restatementHardStage0SourceKeyVersion,
    ...restatementHardStage0Locks(),
    uniquePairs: catalog.length,
    uniquePairsByBrief: restatementHardStage0BriefPairCounts(),
    statusCounts,
    mixingFindings: restatementHardStage0MixingFindings,
    mainQuestion: {
      text: "Did past experiments compare different source/key pairs under the same brief name and draw the wrong conclusion?",
      answer: "yes_in_part",
      independentlyVerified: false,
    },
    items: catalog,
  };
  mkdirSync(resolved, { recursive: true });
  writeFileSync(path.join(resolved, "canonical-pairs.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(resolved, "summary.json"), `${JSON.stringify({ executed: true, started: true, ...restatementHardStage0Locks(), uniquePairs: catalog.length, statusCounts, mainQuestion: report.mainQuestion }, null, 2)}\n`);
  return report;
}
