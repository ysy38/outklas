/**
 * Restatement HARD — Source Feasibility Experiment v1.
 * Analysis only. Not a production gate. Not independent semantic validation.
 */

export const restatementHardSourceFeasibilityVersion = "restatement-hard-source-feasibility-v1";
export const restatementHardSourceFeasibilityAuthorization = "restatement-hard-source-feasibility-v1";
export const restatementHardSourceFeasibilityOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-hard-source-feasibility-v1";
export const restatementHardSourceFeasibilityLiveAuthorized = false as const;
/** Must stay false. Finding four plans is not a Writer/Judge/assemble filter. */
export const restatementHardSourceFeasibilityProductionGate = false as const;
export const restatementHardSourceFeasibilityBlindValidation = false as const;
export const restatementHardSourceFeasibilityMeaningProven = false as const;

export const restatementHardBenchmark5FrozenHashes = {
  summarySha256: "51db881dd691c06bd6348456a1c627196501fbe974171f311305badd8b79d3da",
  editorialEvaluationSha256: "e45fd3a06f2ef78fd6188161ea0a692a20a29df12a85776ae39c5b0660a2c1a3",
  reportSha256: "e98fd2bf791b0d715eb0ee863163afceb66dad46b36d8ba66e93740800e09bfa",
} as const;

/** Patterns that look like traps but fail the entailment-level distractor bar. */
export const restatementHardRejectedTrapPatterns = [
  "until_cessation_or_then_released_implicature",
  "until_on_concurrent_continuing_state_as_endpoint",
  "exclusive_only_to_at_least",
  "compatible_extra_or_weaker_information",
] as const;

export type RestatementHardSourceHypothesis = "H1" | "H2" | "undetermined";

export const restatementHardSourceFeasibilityTable = [
  { id: "rhb-archive-cataloguers", writerValid: 3, feasibleIndependentPlans: 4, hypothesis: "H2" as const },
  { id: "rhb-seed-convoy", writerValid: 2, feasibleIndependentPlans: 4, hypothesis: "H2" as const },
  { id: "rhb-port-wrecks", writerValid: 3, feasibleIndependentPlans: 4, hypothesis: "H2" as const },
  { id: "rhb-ethics-randomization", writerValid: 3, feasibleIndependentPlans: 4, hypothesis: "H2" as const },
  { id: "rhb-land-registry-housing", writerValid: 2, feasibleIndependentPlans: 4, hypothesis: "H2" as const },
] as const;

export const restatementHardSourceFeasibilityLocks = {
  qualityAccepted: false as const,
  meaningProven: false as const,
  hardCalibrationStatus: "not_run" as const,
  studentBankWrites: 0 as const,
  productionGate: false as const,
  liveAuthorized: false as const,
  independence: "same-agent editorial on Writer sources; not a withheld-key blind solve" as const,
  nextExperiment: "plan-locked-wording-on-existing-sources" as const,
} as const;
