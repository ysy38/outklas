import type { OptionLabel } from "@/modules/analysis/contract";
import type { NodeRef } from "@/modules/knowledge/graph";
import type { JudgeDecision } from "../judge";
import { difficultyBands } from "../spec";
import { factoryVersions } from "../versions";

/** Question types the registry can name. Only the first three are implemented. */
export const itemQuestionTypes = [
  "restatement",
  "translation",
  "reading_comprehension",
  "vocabulary",
  "grammar",
  "cloze",
  "sentence_completion",
  "dialogue",
  "paragraph_completion",
  "irrelevant_sentence",
] as const;
export type ItemQuestionType = (typeof itemQuestionTypes)[number];

export const implementedItemTypes = ["restatement", "translation", "reading_comprehension"] as const;
export type ImplementedItemType = (typeof implementedItemTypes)[number];

/** Editorial lifecycle. None of these is a student-bank publish state. */
export const editorialStatuses = [
  "generated",
  "structurally_valid",
  "needs_editorial_review",
  "editor_approved",
  "rejected",
  "pretest_ready",
  "calibrated",
] as const;
export type EditorialStatus = (typeof editorialStatuses)[number];

export type TargetDifficulty = (typeof difficultyBands)[number];

/** Distractor writer. The default stays the v3.4 pool. Reading does not use the other strategy. */
export const distractorStrategies = ["baseline_v34", "cognitive_trap_first"] as const;
export type DistractorStrategy = (typeof distractorStrategies)[number];

/** A restatement tense label. Longer time-and-aspect prose belongs in argumentStructure. */
export const tenseLabelMax = 40;

export type MeaningFrame = {
  scope: string;
  modality: string;
  polarity: "affirmative" | "negative";
  tense: string;
  argumentStructure: string;
};

export type RestatementSource = {
  kind: "restatement";
  proposition: string;
  frame: MeaningFrame;
};

export type TranslationDirection = "en_tr" | "tr_en";

export type TranslationSource = {
  kind: "translation";
  sourceSentence: string;
  sourceLanguage: "tr" | "en";
  targetLanguage: "tr" | "en";
  roles: string[];
  scope: string;
};

/** Observed YDS reading stems. Four questions need not use four different functions. */
export const readingQuestionFunctions = ["detail", "inference", "purpose", "main_idea", "title", "author_view", "vocabulary_in_context", "negative_detail"] as const;
export type ReadingQuestionFunction = (typeof readingQuestionFunctions)[number];

/**
 * Word band measured on 19 accepted passages from four frozen booklets.
 * It is a pilot acceptance limit, not a permanent rule for every YDS paper.
 */
export const pilotPassageWordBand = { min: 154, max: 312, standing: "pilot_observed_on_four_exams" } as const;

export type UsageRights = "granted" | "unclear" | "refused";

/** A production note the model may write from. Official exam text is never this role. */
export type SourceRecord = {
  sourceId: string;
  locator: { kind: "url" | "doi" | "document"; value: string };
  topic: string;
  factNotes: string;
  usageRights: UsageRights;
  role: "production_notes" | "official_exam";
};

/** One slot in the shared reading plan. The proposition id is the identity; the wording is not a diversity proof. */
export type ReadingQuestionSlot = {
  propositionId: string;
  evidenceSpanId: string;
  testedProposition: string;
  cognitiveOperation: string;
  questionFunction: ReadingQuestionFunction;
};

export type ReadingSource = {
  kind: "reading";
  passageId: string;
  sourceId: string;
  passage: string;
  questionPlan: ReadingQuestionSlot[];
};

export type ItemSource = RestatementSource | TranslationSource | ReadingSource;

/** Stem and key, written before any distractor call. `meaningDelta` is the writer's claim, not a proof. */
export type ItemCore = {
  stem: string;
  correctAnswer: string;
  constructEvidence: string;
  correctnessRationale: string;
  sourceReferences: string[];
  modelVersion: string;
  promptVersion: string;
  meaningDelta: "preserved" | "shifted";
  /** Present only on a reading question. The quote locates a span; it does not prove the key. */
  reading?: {
    questionFunction: ReadingQuestionFunction;
    evidenceSpan: { id: string; quote: string };
    propositionId: string;
    testedProposition: string;
    cognitiveOperation: string;
  } | null;
};

/** What a distractor changes. `none` is a paraphrase or a word-order change, not proof that the option is wrong. */
export const shiftTargets = ["modality", "scope", "quantity", "cause", "contrast", "purpose", "role", "tense", "polarity", "predicate", "none"] as const;
export type ShiftTarget = (typeof shiftTargets)[number];

export const semanticRisks = ["none", "second_answer", "off_construct", "ungrammatical"] as const;
export type SemanticRisk = (typeof semanticRisks)[number];

export type DistractorCandidate = {
  candidateText: string;
  errorMechanism: string;
  shiftTarget: ShiftTarget;
  whyPlausible: string;
  whyInferior: string;
  sourceEvidence: string;
  semanticRisk: SemanticRisk;
};

export type ItemModelDefinition = {
  questionType: ItemQuestionType;
  graphRefs: NodeRef[];
  itemModelId: string;
  measuredConstruct: string;
  /** Requested band. It is not an observed or verified difficulty. */
  targetDifficulty: TargetDifficulty;
  sourcePolicy: string;
  stemStructure: string;
  answerStructure: string;
  distractorStrategy: string;
  verificationStrategy: string;
  reviewStatus: "specified" | "unimplemented";
  errorMechanisms: readonly string[];
  promptVersion: string;
  implemented: boolean;
};

export type EditorialReview = {
  reviewVersion: typeof factoryVersions.itemReview;
  decision: "approve" | "reject" | "send_to_pretest" | "record_calibration";
  reviewer: string;
  rationale: string;
  at: string;
  appliesToVersion: number;
};

/** Counts a later pretest may fill. Empty counts are not a psychometric result. */
export type ObservedDifficulty = {
  correctRate: number | null;
  optionShares: Partial<Record<OptionLabel, number>> | null;
  discrimination: number | null;
  errorPatternByLevel: Record<string, number> | null;
  basis: "unobserved" | "observed_counts";
};

export type StudentResponse = { option: OptionLabel; abilityBand?: string };

export type SemanticClaim = {
  source: "model_rationale" | "judge_report";
  claim: string;
  treatedAsProof: false;
};

export type ItemAssembly = {
  version: typeof factoryVersions.itemModel;
  id: string;
  model: ItemModelDefinition;
  source: ItemSource;
  core: ItemCore | null;
  stem: string | null;
  options: Record<OptionLabel, string> | null;
  correctOption: OptionLabel | null;
  selectedDistractors: DistractorCandidate[];
  status: EditorialStatus;
  statusHistory: EditorialStatus[];
  targetDifficulty: TargetDifficulty;
  observedDifficulty: ObservedDifficulty;
  /** Always false. A judge report does not certify the key. */
  keyCertifiedByJudge: false;
  judge: JudgeDecision | null;
  semanticClaims: SemanticClaim[];
  reviews: EditorialReview[];
  textVersion: number;
  /** This factory has no publish transition. */
  publishState: "unpublished";
  /** baseline_v34 is the factory default. cognitive_trap_first is an authorized experiment only. */
  production: { proceededToDistractors: boolean; retries: 0; distractorsDiscarded: boolean; distractorStrategy: DistractorStrategy };
  /** Null on the baseline path. A gate never certifies meaning or difficulty. */
  qualityGate: {
    approvesTarget: false;
    meaningProven: false;
    failure: string | null;
    risks: { key_semantic_risk: string[]; distractor_equivalence_risk: string[]; whole_set_clue_risk: string[] };
  } | null;
  contentRights: {
    officialSurfaceRewrite: boolean;
    studentBankWrite: false;
    exemplarKind: "abstract_structure" | "none";
    usageRights: UsageRights | "not_applicable" | "missing";
    /** Clear means no shared shingle. It is not a copyright license. */
    surfaceScreen: "clear" | "overlap" | "not_run";
    similarityIsNotLicense: true;
    /** Writer output is never source-fidelity approval. */
    sourceFidelity: "not_run";
  };
  failure: string | null;
};
