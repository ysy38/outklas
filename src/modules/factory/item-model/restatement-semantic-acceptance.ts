/**
 * Restatement Semantic Acceptance Policy v1 — Conservative Exam-Oriented.
 * Experimental contract. Not applied to production. Same-agent editorial is not independent review.
 */

import type { SemanticRelationToSource } from "./restatement-semantic-validity";

export const restatementSemanticAcceptanceVersion = "restatement-semantic-acceptance-v1";
export const restatementSemanticAcceptanceOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-semantic-acceptance-v1";
export const restatementSemanticAcceptanceLiveAuthorized = false as const;
export const restatementSemanticAcceptanceProductionApplied = false as const;
export const restatementSemanticAcceptanceProductionGate = false as const;

export const restatementSemanticAcceptanceFrozenHashes = {
  benchmarkSummarySha256: "51db881dd691c06bd6348456a1c627196501fbe974171f311305badd8b79d3da",
  semanticValidityContractSha256: "d84f468c29f824d7842a42d97fcf84c41ad991d2c4053ed8f383ff195aea552e",
  qualityAuthoringPromptSha256: "be5a6b975e1704cc44fc67703e651691a6afb8ffc187813a9f28c7ac0edf7ef8",
} as const;

export const restatementConservativeExamOrientedPolicy = {
  id: "conservative_exam_oriented" as const,
  productionApplied: false as const,
  meaningProven: false as const,
  qualityAccepted: false as const,
  hardCalibrationStatus: "not_run" as const,
  independentReviewRan: false as const,
  sameAgentIsNotIndependentReview: true as const,
  relations: {
    CONTRADICTED: "distractor_candidate",
    NOT_ENTAILED_COMPATIBLE: "conditional_candidate_only_if_independent_review_and_low_student_challenge",
    ENTAILED: "invalid",
    UNDETERMINED: "not_accepted",
  },
  constructionTarget: {
    equivalentKeys: 1,
    naturalNonEquivalentDistractors: 4,
    minContradicted: 2,
    minStrong: 2,
    maxConditionalNotEntailedCompatible: 2,
    meetingCountsIsNotAcceptance: true,
  },
  hardRejects: [
    "only_to_at_least",
    "until_cessation_or_concurrent_endpoint_implicature",
    "invented_event_cause_or_result_not_auto_accept",
    "only_if_to_sufficient_without_independent_review",
    "although_to_because_without_independent_review",
    "key_adds_negation_source_does_not_entail",
    "distractor_accept_incomplete_until_source_key_verified",
  ],
} as const;

export type ConservativeOptionEval = {
  id: string;
  vsSource: SemanticRelationToSource;
  vsKey?: SemanticRelationToSource;
  strict: "accepted" | "rejected";
  conservative: "accepted" | "conditional_identified_not_accepted" | "rejected";
  studentChallengeRisk: "high" | "medium" | "low" | "unreviewed";
  requiresIndependentReview: boolean;
  reasons: string[];
};

export type ConservativeItemEval = {
  id: string;
  candidateCount: 3 | 4;
  keyVsSource: "equivalent_unproven" | "key_adds_unentailed_negation";
  options: ConservativeOptionEval[];
  strictAccepted: number;
  conservativeAccepted: number;
  conditionalIdentified: number;
  conditionalAccepted: number;
  contradictedCount: number;
  secondAnswerRisk: "high" | "medium" | "low" | "none";
  independentReviewRequired: boolean;
  strictConstruction: "FAIL";
  conservativeConstruction: "FAIL";
  rejectReasons: string[];
};

const archive: ConservativeItemEval = {
  id: "rhb-archive-cataloguers",
  candidateCount: 4,
  keyVsSource: "equivalent_unproven",
  options: [
    {
      id: "C1",
      vsSource: "NOT_ENTAILED_COMPATIBLE",
      strict: "rejected",
      conservative: "rejected",
      studentChallengeRisk: "high",
      requiresIndependentReview: true,
      reasons: ["invented_hours_ending", "invented_then_released", "until_concurrent_endpoint_implicature"],
    },
    {
      id: "C2",
      vsSource: "NOT_ENTAILED_COMPATIBLE",
      strict: "rejected",
      conservative: "conditional_identified_not_accepted",
      studentChallengeRisk: "high",
      requiresIndependentReview: true,
      reasons: ["although_to_because", "extra_cause", "no_independent_review", "challenge_not_low"],
    },
    {
      id: "C3",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["both_to_one_named_boundary"],
    },
    {
      id: "C4",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["evidential_refusal_inverted"],
    },
  ],
  strictAccepted: 2,
  conservativeAccepted: 2,
  conditionalIdentified: 1,
  conditionalAccepted: 0,
  contradictedCount: 2,
  secondAnswerRisk: "none",
  independentReviewRequired: true,
  strictConstruction: "FAIL",
  conservativeConstruction: "FAIL",
  rejectReasons: ["fewer_than_four_accepted_distractors", "conditional_C2_not_accepted", "C1_hard_reject"],
};

const seed: ConservativeItemEval = {
  id: "rhb-seed-convoy",
  candidateCount: 3,
  keyVsSource: "equivalent_unproven",
  options: [
    {
      id: "C1",
      vsSource: "NOT_ENTAILED_COMPATIBLE",
      strict: "rejected",
      conservative: "conditional_identified_not_accepted",
      studentChallengeRisk: "medium",
      requiresIndependentReview: true,
      reasons: ["counterfactual_to_factual", "extra_because", "invented_cause_not_auto_accept", "no_independent_review"],
    },
    {
      id: "C2",
      vsSource: "ENTAILED",
      strict: "rejected",
      conservative: "rejected",
      studentChallengeRisk: "high",
      requiresIndependentReview: false,
      reasons: ["only_to_at_least"],
    },
    {
      id: "C3",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["before_reversed"],
    },
  ],
  strictAccepted: 1,
  conservativeAccepted: 1,
  conditionalIdentified: 1,
  conditionalAccepted: 0,
  contradictedCount: 1,
  secondAnswerRisk: "high",
  independentReviewRequired: true,
  strictConstruction: "FAIL",
  conservativeConstruction: "FAIL",
  rejectReasons: ["n_lt_4", "fewer_than_two_contradicted", "C2_entailed", "C1_not_accepted_conditional"],
};

const port: ConservativeItemEval = {
  id: "rhb-port-wrecks",
  candidateCount: 3,
  keyVsSource: "key_adds_unentailed_negation",
  options: [
    {
      id: "C1",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["inspected_complete_vs_begun"],
    },
    {
      id: "C2",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["both_to_either"],
    },
    {
      id: "C3",
      vsSource: "NOT_ENTAILED_COMPATIBLE",
      vsKey: "CONTRADICTED",
      strict: "rejected",
      conservative: "conditional_identified_not_accepted",
      studentChallengeRisk: "high",
      requiresIndependentReview: true,
      reasons: ["accepts_vs_source_not_excluded", "although_not_rejection", "challenge_not_low", "no_independent_review"],
    },
  ],
  strictAccepted: 2,
  conservativeAccepted: 2,
  conditionalIdentified: 1,
  conditionalAccepted: 0,
  contradictedCount: 2,
  secondAnswerRisk: "medium",
  independentReviewRequired: true,
  strictConstruction: "FAIL",
  conservativeConstruction: "FAIL",
  rejectReasons: ["n_lt_4", "key_adds_unentailed_negation", "source_key_not_verified", "C3_not_accepted_conditional"],
};

const ethics: ConservativeItemEval = {
  id: "rhb-ethics-randomization",
  candidateCount: 3,
  keyVsSource: "equivalent_unproven",
  options: [
    {
      id: "C1",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["before_reversed"],
    },
    {
      id: "C2",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["both_to_either"],
    },
    {
      id: "C3",
      vsSource: "NOT_ENTAILED_COMPATIBLE",
      strict: "rejected",
      conservative: "conditional_identified_not_accepted",
      studentChallengeRisk: "high",
      requiresIndependentReview: true,
      reasons: ["only_if_to_sufficient", "converse_not_excluded", "no_independent_review", "challenge_not_low"],
    },
  ],
  strictAccepted: 2,
  conservativeAccepted: 2,
  conditionalIdentified: 1,
  conditionalAccepted: 0,
  contradictedCount: 2,
  secondAnswerRisk: "medium",
  independentReviewRequired: true,
  strictConstruction: "FAIL",
  conservativeConstruction: "FAIL",
  rejectReasons: ["n_lt_4", "C3_not_accepted_conditional"],
};

const land: ConservativeItemEval = {
  id: "rhb-land-registry-housing",
  candidateCount: 3,
  keyVsSource: "equivalent_unproven",
  options: [
    {
      id: "C1",
      vsSource: "NOT_ENTAILED_COMPATIBLE",
      strict: "rejected",
      conservative: "rejected",
      studentChallengeRisk: "high",
      requiresIndependentReview: true,
      reasons: ["until_on_continuing_circulation", "invented_endpoint_implicature"],
    },
    {
      id: "C2",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["both_to_one"],
    },
    {
      id: "C3",
      vsSource: "CONTRADICTED",
      strict: "accepted",
      conservative: "accepted",
      studentChallengeRisk: "low",
      requiresIndependentReview: false,
      reasons: ["evidential_refusal_inverted"],
    },
  ],
  strictAccepted: 2,
  conservativeAccepted: 2,
  conditionalIdentified: 0,
  conditionalAccepted: 0,
  contradictedCount: 2,
  secondAnswerRisk: "none",
  independentReviewRequired: false,
  strictConstruction: "FAIL",
  conservativeConstruction: "FAIL",
  rejectReasons: ["n_lt_4", "C1_until_implicature_hard_reject"],
};

export const restatementConservativeOfflineItems: ConservativeItemEval[] = [archive, seed, port, ethics, land];

export function restatementConservativeOfflineTotals() {
  return {
    items: 5,
    fourthPadded: false,
    independentReviewRan: false,
    sameAgentIsNotIndependentReview: true,
    strictConstructionPass: 0,
    conservativeConstructionPass: 0,
    itemsWhereConservativeAddsUsableQuestion: 0,
    strictAcceptedDistractors: restatementConservativeOfflineItems.reduce((sum, row) => sum + row.strictAccepted, 0),
    conservativeAcceptedDistractors: restatementConservativeOfflineItems.reduce((sum, row) => sum + row.conservativeAccepted, 0),
    conditionalIdentified: restatementConservativeOfflineItems.reduce((sum, row) => sum + row.conditionalIdentified, 0),
    conditionalAccepted: restatementConservativeOfflineItems.reduce((sum, row) => sum + row.conditionalAccepted, 0),
    finding: "relabel_not_yield",
  };
}
