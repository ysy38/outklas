/**
 * Restatement — Semantic Validity Contract v1.
 * Classification only. Not a production gate. Does not select Strict vs exam-oriented.
 * Same-agent editorial and shownDifference/classifyOption are not independent proof.
 */

export const restatementSemanticValidityVersion = "restatement-semantic-validity-v1";
export const restatementSemanticValidityOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-semantic-validity-v1";
export const restatementSemanticValidityLiveAuthorized = false as const;
export const restatementSemanticValidityProductionGate = false as const;
export const restatementSemanticValidityProductionPolicy = null;
export const restatementSemanticValidityMeaningProven = false as const;

export const restatementSemanticValidityFrozenHashes = {
  benchmarkSummarySha256: "51db881dd691c06bd6348456a1c627196501fbe974171f311305badd8b79d3da",
  feasibilityJsonSha256: "6f5adfe64f86fe350da505a5fdde98a0c6305863c94d10b4e4dc0421815fcbe0",
  planToWordingSummarySha256: "d0eb606bc5d20f0b26d4305a496d052398aba8eb7f0690112ba39baf51aad1c1",
  qualityAuthoringPromptSha256: "be5a6b975e1704cc44fc67703e651691a6afb8ffc187813a9f28c7ac0edf7ef8",
} as const;

/** Logical relation of an option to a source. Not a difficulty or quality label. */
export type SemanticRelationToSource = "ENTAILED" | "CONTRADICTED" | "NOT_ENTAILED_COMPATIBLE" | "UNDETERMINED";

export const restatementSemanticValidityContract = {
  version: restatementSemanticValidityVersion,
  productionGate: false as const,
  productionPolicySelected: null,
  meaningProven: false as const,
  qualityAccepted: false as const,
  hardCalibrationStatus: "not_run" as const,
  studentBankWrites: 0 as const,
  independence: "same-agent analysis is not independent proof; shownDifference and classifyOption are surface heuristics" as const,
  relations: {
    ENTAILED: "If the source is true, the option's claim must be true. Weaker or equivalent restatement. Not a valid distractor under either policy.",
    CONTRADICTED: "If the source is true, a claim in the option cannot be true on the relevant reading. Valid distractor under Strict.",
    NOT_ENTAILED_COMPATIBLE: "The source does not make the option true, and does not make it false. Both can hold. Strict: not a valid distractor. Exam-oriented: only if later policy allows, and never if it is a second answer.",
    UNDETERMINED: "The relation cannot be assigned without unresolved scope, source-vs-key mismatch, or independent review. Not forced to PASS or FAIL.",
  },
  notMixedWith: ["strong", "moderate", "HARD", "trapType", "studentMisreading", "qualityAccepted"],
  heuristicsAreNotProof: ["shownDifference", "classifyOption", "assessMeaningIntegrity", "writer trap labels"],
} as const;

export type DistractorPolicy = "strict" | "exam_oriented";

export const restatementDistractorPolicies = {
  strict: {
    id: "strict" as const,
    validDistractorIf: "CONTRADICTED",
    notValidIf: ["ENTAILED", "NOT_ENTAILED_COMPATIBLE", "UNDETERMINED"],
    note: "Only a source-excluded claim is a valid wrong option. Non-equivalence is not enough.",
  },
  examOriented: {
    id: "exam_oriented" as const,
    validDistractorIf: "CONTRADICTED, or a hosted misreading that is not ENTAILED, subject to separate risk checks",
    notValidIf: ["ENTAILED"],
    requiredSeparateRisks: ["secondAnswerRisk", "ambiguityRisk", "extraSourceInformationRisk", "studentChallengeRisk"],
    note: "A not-equivalent misreading may be accepted only after those four risks are scored. This file does not accept any exam-oriented case.",
  },
} as const;

export type SemanticValidityCase = {
  id: string;
  mutation: string;
  source: string;
  option: string;
  key?: string;
  entails: string[];
  excludes: string[];
  pragmaticOnly: string[];
  vsSource: SemanticRelationToSource;
  vsKey?: SemanticRelationToSource;
  proofStatus: "not_independently_proven";
  requiresIndependentReview: boolean;
  secondAnswerRisk: "high" | "medium" | "low" | "unreviewed";
  ambiguityRisk: "high" | "medium" | "low" | "unreviewed";
  extraSourceInformationRisk: "high" | "medium" | "low" | "unreviewed";
  studentChallengeRisk: "high" | "medium" | "low" | "unreviewed";
  strictDistractor: "no" | "not_forced";
  examOrientedDistractor: "not_forced";
};

export const restatementSemanticValidityCases: SemanticValidityCase[] = [
  {
    id: "until-to-after",
    mutation: "until → after",
    source:
      "The survey office held back the channel chart until both sounding crews had delivered their depth readings; although the ferry company kept its published timetable in force throughout the delay, the office did not treat that timetable as confirmation that the recorded depths were current.",
    option: "The survey office remained withheld after both sounding crews had delivered their depth readings.",
    entails: [
      "Withholding held through the interval up to both deliveries.",
      "The until-boundary event is both crews delivering, not the timetable.",
    ],
    excludes: [
      "Nothing that requires withholding to have stopped at the boundary.",
      "Nothing that requires the chart to have been issued at the boundary.",
    ],
    pragmaticOnly: [
      "Administrative until often implicates that the wait ends at the boundary. That implicature is cancellable and is not entailment.",
    ],
    vsSource: "NOT_ENTAILED_COMPATIBLE",
    proofStatus: "not_independently_proven",
    requiresIndependentReview: true,
    secondAnswerRisk: "high",
    ambiguityRisk: "medium",
    extraSourceInformationRisk: "medium",
    studentChallengeRisk: "high",
    strictDistractor: "no",
    examOrientedDistractor: "not_forced",
  },
  {
    id: "although-to-because",
    mutation: "although → because",
    source:
      "The archive held back the loan of the parish registers until both cataloguers had finished their condition reports, although the gallery's posted opening hours stayed in force throughout the delay, a fact the archive did not read as proof that the bindings were sound.",
    option: "Because the gallery kept its opening hours posted, the archive postponed the loan of the parish registers.",
    entails: [
      "The loan was held back until both reports were finished.",
      "Hours stayed in force throughout that delay (concessive concurrent fact).",
    ],
    excludes: [
      "The source does not exclude hours as a possible real-world cause. although P, Q does not entail ¬(Q because P).",
    ],
    pragmaticOnly: [
      "Concession often implicates that P is not the explanation of Q. Discourse incompatibility is not the same as logical exclusion.",
    ],
    vsSource: "NOT_ENTAILED_COMPATIBLE",
    proofStatus: "not_independently_proven",
    requiresIndependentReview: true,
    secondAnswerRisk: "medium",
    ambiguityRisk: "medium",
    extraSourceInformationRisk: "high",
    studentChallengeRisk: "high",
    strictDistractor: "no",
    examOrientedDistractor: "not_forced",
  },
  {
    id: "only-to-at-least",
    mutation: "only → at least",
    source: "Had the convoy cleared the pass before the frost, only the two highland stations would have received the winter seed from the national seed bank.",
    option: "Had the convoy cleared the pass before the frost, at least the two highland stations would have received the winter seed from the national seed bank.",
    entails: [
      "Recipients are those two stations and not others (only).",
      "If only those two received, then at least those two received. The weaker lower bound is true.",
    ],
    excludes: [
      "Other stations as recipients (this is what only→all would assert, not only→at least).",
    ],
    pragmaticOnly: [
      "Readers may hear at least as 'and maybe more', but the weaker claim remains true when exactly those two received.",
    ],
    vsSource: "ENTAILED",
    proofStatus: "not_independently_proven",
    requiresIndependentReview: false,
    secondAnswerRisk: "high",
    ambiguityRisk: "low",
    extraSourceInformationRisk: "low",
    studentChallengeRisk: "high",
    strictDistractor: "no",
    examOrientedDistractor: "not_forced",
  },
  {
    id: "only-if-to-sufficient",
    mutation: "only if → sufficient",
    source: "The ethics board will release the interim tables only if both trial sites have locked their randomization logs before the sponsor reviews the draft.",
    option: "Both trial sites locking their randomization logs before the sponsor sees the draft guarantees the release of the interim tables.",
    entails: [
      "Release → both locked before review. only if encodes necessity, Q → P.",
    ],
    excludes: [
      "The source does not exclude P → Q. only if is not if and only if.",
    ],
    pragmaticOnly: [
      "Policy English sometimes uses only if as if it were iff. That is a reading, not the connective.",
      "if and only if would be Q ↔ P (necessary and sufficient). only if is only Q → P. A guarantee is P → Q, the converse.",
    ],
    vsSource: "NOT_ENTAILED_COMPATIBLE",
    proofStatus: "not_independently_proven",
    requiresIndependentReview: true,
    secondAnswerRisk: "medium",
    ambiguityRisk: "medium",
    extraSourceInformationRisk: "high",
    studentChallengeRisk: "high",
    strictDistractor: "no",
    examOrientedDistractor: "not_forced",
  },
  {
    id: "counterfactual-to-factual",
    mutation: "counterfactual → factual",
    source: "Had the convoy cleared the pass before the frost, only the two highland stations would have received the winter seed from the national seed bank.",
    option: "The convoy cleared the pass before the frost, so only the two highland stations received the winter seed from the national seed bank.",
    entails: [
      "A counterfactual conditional: if clearing-before-frost had held, exclusive receipt would have held.",
    ],
    excludes: [
      "The sentence does not exclude that clearing actually occurred, or that seed actually arrived. Subjunctive ¬P is not entailment.",
    ],
    pragmaticOnly: [
      "Had/would have often signals that the antecedent is not actual. Cancellable.",
      "The extra so in the realized wording is a second, causal, claim.",
    ],
    vsSource: "NOT_ENTAILED_COMPATIBLE",
    proofStatus: "not_independently_proven",
    requiresIndependentReview: true,
    secondAnswerRisk: "medium",
    ambiguityRisk: "medium",
    extraSourceInformationRisk: "high",
    studentChallengeRisk: "medium",
    strictDistractor: "no",
    examOrientedDistractor: "not_forced",
  },
  {
    id: "authority-accepts",
    mutation: "authority does not accept → authority accepts",
    source:
      "The port authority will not lift the navigation ban until both wrecks in the fairway have been inspected, although the salvage contractor maintains that the channel has already been cleared.",
    key: "The navigation ban stays in force until inspections of both fairway wrecks are complete, and the authority does not accept the contractor's claim that clearance has already occurred.",
    option:
      "The navigation ban stays in force until inspections of both fairway wrecks are complete, and the authority accepts the contractor's claim that clearance has already occurred.",
    entails: [
      "Ban is not lifted until both wrecks have been inspected.",
      "The already-cleared claim is the contractor's.",
    ],
    excludes: [
      "The source does not exclude authority acceptance. although does not entail rejection.",
      "The key sentence, if taken as the comparison object, does exclude acceptance.",
    ],
    pragmaticOnly: [
      "Juxtaposing a policy with a contractor claim often implicates non-endorsement. That is not source entailment.",
      "The Writer key already strengthened although into does not accept. Option vs key is polarity; option vs source is extra endorsement.",
    ],
    vsSource: "NOT_ENTAILED_COMPATIBLE",
    vsKey: "CONTRADICTED",
    proofStatus: "not_independently_proven",
    requiresIndependentReview: true,
    secondAnswerRisk: "medium",
    ambiguityRisk: "high",
    extraSourceInformationRisk: "high",
    studentChallengeRisk: "high",
    strictDistractor: "not_forced",
    examOrientedDistractor: "not_forced",
  },
];

export const restatementSemanticValidityUnresolvedBeforePolicy = [
  "Is a restatement distractor required to be CONTRADICTED, or may a hosted non-equivalent misreading count?",
  "Does although exclude because as entailment, or only as discourse implicature?",
  "Is the canonical only-if → sufficient trap allowed when the converse is compatible with the source?",
  "Does mood mismatch (had/would → simple past) count without ¬P being entailed?",
  "When the key strengthens the source (does not accept), is the comparison object the source, the key, or both?",
  "May until-cessation implicature ever found a distractor, or is until→after always NOT_ENTAILED_COMPATIBLE?",
  "Who performs independent review, blinded how, and what counts as proof if shownDifference is silent?",
] as const;
