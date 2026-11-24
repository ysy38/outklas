import { sourceSentence, trapItems, type TrapItem } from "./cognitive-trap";
import { pilotItems } from "./cognitive-trap-pilot";
import { assessKey } from "./core";
import { contentVersion } from "./distractor-strategy";
import { recordedDraftsKey, recordedDraftsSource } from "./drafts-candidate";
import { screenExamSurface } from "./gold";
import { mediumReproItems } from "./medium-repro";
import { selectMisreadingMechanisms } from "./misreading-mechanisms";
import { assessParaphraseKey, type ParaphraseDistance } from "./paraphrase-key";
import { qualityItems } from "./quality-profile";
import { restatementModel, translationModel } from "./registry";
import { taxonomyLiveItems } from "./taxonomy-live";

/** Separate from quality-repair-pilot-v1 and semantic-taxonomy-live-v1. Live stays closed until this token and the live flag are both set. */
export const qualityFirstPilotAuthorization = "quality-first-production-pilot-v1";
/** This live prompt authorizes one production run. A completed summary.json still blocks a second run. */
export const qualityFirstPilotLiveAuthorized = true;
export const qualityFirstPilotOutputDir = ".data/analysis/_factory/cognitive-trap/quality-first-pilot-v1";
export const qualityFirstPilotSpendCapUsd = 0.25;
export const qualityFirstPilotPreparedCeilingUsd = 0.233124;
export const qualityFirstPilotRetry = 0;
export const qualityFirstPilotWriterCallsPerItem = 2;
export const qualityFirstPilotJudgeCallsPerItem = 1;
export const qualityFirstPilotMaxWriterCalls = 8;
export const qualityFirstPilotMaxJudgeCalls = 4;
export const qualityFirstPilotMaxProviderCalls = 12;
export const qualityFirstPilotPreflightFile = "preflight.json";

const qualityFirstTrEnPreviousKeyText = "None of the complaints was forwarded to the prosecutor's office; only two minutes were read out at the hearing.";
const qualityFirstTrEnSource = "Hiçbir şikâyet savcılığa iletilmiş değil; yalnızca iki tutanak duruşmada okundu.";

/** Frozen prep-v1 TR→EN key. The current item uses a later wording; this text is not the live key. */
export const qualityFirstTrEnPreviousKey = {
  version: "prep-v1" as const,
  itemId: "quality-first-translation-tr_en" as const,
  source: qualityFirstTrEnSource,
  key: qualityFirstTrEnPreviousKeyText,
  keyHash: contentVersion(qualityFirstTrEnPreviousKeyText),
};

export const qualityFirstPilotForbiddenDirs = [
  ".data/analysis/_factory/cognitive-trap/openrouter-v1",
  ".data/analysis/_factory/cognitive-trap/pilot-v1",
  ".data/analysis/_factory/cognitive-trap/quality-v1",
  ".data/analysis/_factory/cognitive-trap/quality-judge-replay-v1",
  ".data/analysis/_factory/cognitive-trap/taxonomy-live-v1",
  ".data/analysis/_factory/cognitive-trap/medium-repro-v1",
  ".data/analysis/_factory/cognitive-trap/drafts-editorial-candidate-v1",
  ".data/analysis/_factory/cognitive-trap/active-recovery-live-smoke-v1",
  ".data/analysis/_factory/cognitive-trap/active-recovery-live-smoke-replay-v1",
  ".data/analysis/_factory/editorial-gold/v1",
  ".data/analysis/_factory/cognitive-trap/yield-optimization-v1",
  ".data/analysis/_factory/cognitive-trap/candidate-retention-v1",
  ".data/analysis/_factory/cognitive-trap/recovered-candidate-audit-v1",
  ".data/analysis/_factory/cognitive-trap/architecture-v2",
  ".data/analysis/_factory/cognitive-trap/writer-bakeoff-v1",
  ".data/analysis/_factory/cognitive-trap/writer-bakeoff-smoke-v1",
  ".data/analysis/_factory/cognitive-trap/writer-bakeoff-compare-v1",
  ".data/analysis/_factory/cognitive-trap/writer-bakeoff-editorial-v1",
  ".data/analysis/_factory/cognitive-trap/root-cause-audit-v1",
  ".data/analysis/_factory/cognitive-trap/root-cause-fix-acceptance-v1",
  ".data/analysis/_factory/cognitive-trap/factory-v6-controlled-live-pilot-v1",
  ".data/analysis/_factory/cognitive-trap/factory-v6-writer-challenge-v1",
  ".data/analysis/_factory/cognitive-trap/writer-reasoning-root-cause-v1",
  ".data/analysis/_factory/cognitive-trap/model-reasoning-config-v1",
  ".data/analysis/_factory/cognitive-trap/factory-v6-writer-comparison-v1",
  ".data/analysis/_factory/cognitive-trap/semantic-failure-editorial-v1",
  ".data/analysis/_factory/cognitive-trap/blind-editorial-handoff-v1",
  ".data/analysis/_factory/cognitive-trap/blind-editorial-findings-v1",
  ".data/analysis/_factory/cognitive-trap/independent-forensic-audit-v1",
  ".data/analysis/_factory/cognitive-trap/audit-rebuttal-v1",
  ".data/analysis/_factory/cognitive-trap/quality-authoring-v1",
  ".data/analysis/_factory/cognitive-trap/quality-authoring-live-pilot-v1",
  ".data/analysis/_factory/cognitive-trap/quality-authoring-codesign-restatement-v1",
  ".data/analysis/_factory/cognitive-trap/generation-quality-experiment-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-quality-editorial-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-c1-naturalness-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-blind-validation-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-benchmark-5-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-source-feasibility-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-to-wording-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-semantic-validity-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-semantic-acceptance-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1",
  ".data/analysis/_factory/cognitive-trap/restatement-hard-stage-0-source-key-v1",
] as const;

export const qualityFirstFrozenModels = {
  writer: "openrouter:anthropic/claude-haiku-5.5",
  judge: "openrouter:anthropic/claude-sonnet-5.5",
  writerPromptRead: "cognitive-trap.misreading.v4",
  writerPromptOptions: "cognitive-trap.options.v5",
  judgePrompt: "item-model.judge.v3.1",
  restatementPrompt: "item-model.restatement.v3.4",
  translationPrompt: "item-model.translation.v3.4",
} as const;

/**
 * Real quality-profile order inside executeCognitiveTrap.
 * The slogan Source→Key→Writer→Distractors→Gate→Judge→Recovery is not the call graph.
 */
export const qualityFirstActualCallOrder = [
  "selectEligible.assessKey_and_assessMeaningIntegrity",
  "screenExamSurface",
  "budget_shrink_uses_trapCostEstimate_inside_executeCognitiveTrap",
  "skip_arm_A",
  "writer_B-read",
  "writer_B-options_candidates_min4_max6",
  "linkMisreadingCandidates_exact_studentMisreading_records_unmatched",
  "selectCognitiveDistractors_keeps_passing_options_stores_dropped_full_text",
  "finishArm_five_options",
  "holdLanguage",
  "assessWholeSet_fail_skips_judge",
  "recordPropositionGuard",
  "optional_one_blind_judge_if_five_options_and_not_fail_and_language_not_held",
  "attachRecovery_default_off",
  "executeActiveRecovery_only_if_mode_active",
  "editorial_queue_pending_no_student_bank",
] as const;

export type QualityFirstDesignTarget = "medium";
export type QualityFirstCriterion =
  | "source_key_meaning_equivalence"
  | "single_defensible_key"
  | "four_natural_distractors"
  | "each_distractor_meaning_difference"
  | "no_new_event_or_actor"
  | "no_completeness_or_length_clue"
  | "distinct_cognitive_traps"
  | "target_language_grammatical";

export type QualityFirstScore = "fail" | "unverified";

export type QualityFirstEntry = {
  designTarget: QualityFirstDesignTarget;
  questionType: "restatement" | "translation";
  direction: "en_tr" | "tr_en" | null;
  cognitiveTraps: string[];
  cognitiveDemand: string;
  meaningMap: { preserved: string[]; relations: string[] };
  priorStructuralDifference: string;
  observedDifficulty: null;
  item: TrapItem;
};

function core(promptVersion: string, stem: string, answer: string, reference: string): TrapItem["core"] {
  return {
    stem,
    correctAnswer: answer,
    constructEvidence: "Actors, quantity, modality, polarity and the link between clauses stay in place.",
    correctnessRationale: "Fixed before distractors. A clean checker result is unverified, not proof.",
    sourceReferences: [reference],
    modelVersion: "fixed-before-distractors",
    promptVersion,
    meaningDelta: "preserved",
  };
}

/**
 * Four original medium sources. None is a lexical rewrite of Kapı, Kar, Klinik, Registry, Drafts,
 * or the comparison / pilot / quality / taxonomy / medium-repro sentences.
 */
export function qualityFirstItems(): QualityFirstEntry[] {
  const census = "The census office showed that every household in the two coastal districts had been visited, yet it did not infer that the vacancy rate had fallen.";
  const censusKey = "The finding that every household in the two coastal districts had been visited did not lead the census office to conclude that the vacancy rate had fallen.";
  const plates = "If the conservators had sealed the glass plates before the humidity rose, the two earliest negatives would still have been printable.";
  const platesKey = "The two earliest negatives would have remained printable, provided the conservators had completed the sealing of the glass plates prior to the rise in humidity.";
  const faculty = "The faculty hired an outside auditor so that the department would not value its own equipment, because last year's figures had been prepared by the same staff.";
  const facultyKey = "Fakülte, geçen yılki rakamları aynı kadronun hazırlamış olması nedeniyle, bölümün kendi donanımını değerlememesi için dışarıdan bir denetçi tuttu.";
  const complaints = qualityFirstTrEnSource;
  const complaintsKey = "No complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.";
  return [
    {
      designTarget: "medium",
      questionType: "restatement",
      direction: null,
      cognitiveTraps: ["EVIDENCE_CERTAINTY", "QUANTITY_SCOPE", "NEGATION_SCOPE"],
      cognitiveDemand: "Keep the shown visits to every household in the two districts distinct from the inference that was not drawn about the vacancy rate.",
      meaningMap: {
        preserved: [
          "the census office showed that every household in the two coastal districts had been visited",
          "the census office did not infer that the vacancy rate had fallen",
          "the visits do not by themselves license the vacancy conclusion",
        ],
        relations: ["evidence", "inference", "universal quantity", "negation", "scope of the finding"],
      },
      priorStructuralDifference: "Not the reviewers' withheld claim about a second reading, and not an absence of a trace or a finding. This sentence reports a completed visitation finding and withholds a different inference about vacancy.",
      observedDifficulty: null,
      item: {
        id: "quality-first-restatement-epistemic",
        questionType: "restatement",
        direction: null,
        designTarget: "medium",
        preservedRelations: ["every household in the two coastal districts visited", "no inference that the vacancy rate had fallen", "shown visits are not the vacancy conclusion"],
        source: {
          kind: "restatement",
          proposition: census,
          frame: {
            scope: "every household in the two coastal districts, and the vacancy rate",
            modality: "evidential finding plus withheld inference",
            polarity: "negative",
            tense: "past",
            argumentStructure: "A visitation finding was shown; a vacancy decline was not inferred from it.",
          },
        },
        core: core(restatementModel.promptVersion, census, censusKey, "proposition"),
      },
    },
    {
      designTarget: "medium",
      questionType: "restatement",
      direction: null,
      cognitiveTraps: ["CONDITION_DIRECTION", "TEMPORAL_ORDER", "COUNTERFACTUAL_FACTUAL"],
      cognitiveDemand: "Keep the unreal sealing of the glass plates before the humidity rise as the condition for the two earliest negatives remaining printable.",
      meaningMap: {
        preserved: [
          "sealing the glass plates before the humidity rose is the unreal condition",
          "under that condition the two earliest negatives would still have been printable",
          "the sentence asserts the dependence, not that the sealing occurred",
        ],
        relations: ["condition", "time order", "counterfactual", "quantity of two negatives"],
      },
      priorStructuralDifference: "Shares an unreal past with the ferry, depot, freezer, and embargo sentences. The event is a protective sealing of glass plates before humidity, not an earlier departure, sailing, citation check, or a state held until noon, and there is no exclusive pair of recipients.",
      observedDifficulty: null,
      item: {
        id: "quality-first-restatement-counterfactual",
        questionType: "restatement",
        direction: null,
        designTarget: "medium",
        preservedRelations: ["if the conservators had sealed the glass plates before the humidity rose", "the two earliest negatives would still have been printable", "unreal past"],
        source: {
          kind: "restatement",
          proposition: plates,
          frame: {
            scope: "the two earliest negatives and the glass plates",
            modality: "counterfactual",
            polarity: "affirmative",
            tense: "unreal past",
            argumentStructure: "An earlier sealing, completed before humidity rose, would have kept the two earliest negatives printable.",
          },
        },
        core: core(restatementModel.promptVersion, plates, platesKey, "proposition"),
      },
    },
    {
      designTarget: "medium",
      questionType: "translation",
      direction: "en_tr",
      cognitiveTraps: ["PURPOSE_RESULT", "CAUSE_CONCESSION", "REFERENCE_SHIFT"],
      cognitiveDemand: "Keep the hiring as an action whose purpose is that the department not value its own equipment, and whose cause is that last year's figures had been prepared by the same staff.",
      meaningMap: {
        preserved: [
          "the faculty hired an outside auditor",
          "the purpose is that the department would not value its own equipment",
          "the cause is that last year's figures had been prepared by the same staff",
          "its own equipment refers to the department's equipment",
        ],
        relations: ["purpose", "cause", "reference", "negation on the intended valuation"],
      },
      priorStructuralDifference: "Not the clinic purpose of avoiding two moves, and not the editor's second scan because the first was faint so that readers would check dates. This one is an actual hiring, a because-cause about same-staff figures, and a negative purpose about self-valuation.",
      observedDifficulty: null,
      item: {
        id: "quality-first-translation-en_tr",
        questionType: "translation",
        direction: "en_tr",
        designTarget: "medium",
        preservedRelations: ["outside auditor hired so that the department would not value its own equipment", "because last year's figures had been prepared by the same staff", "its refers to the department"],
        source: {
          kind: "translation",
          sourceSentence: faculty,
          sourceLanguage: "en",
          targetLanguage: "tr",
          roles: ["faculty", "department", "auditor", "staff"],
          scope: "the department's own equipment and last year's figures",
        },
        core: core(translationModel.promptVersion, faculty, facultyKey, "source_sentence"),
      },
    },
    {
      designTarget: "medium",
      questionType: "translation",
      direction: "tr_en",
      cognitiveTraps: ["QUANTITY_SCOPE", "NEGATION_SCOPE", "FOCUS_SCOPE"],
      cognitiveDemand: "Keep the universal negative on complaints forwarded to the prosecutor, the exclusive two official records read at the hearing, and both events as passive.",
      meaningMap: {
        preserved: [
          "no complaints have been forwarded to the prosecutor's office",
          "only two official records were read aloud at the hearing",
          "both clauses are passive",
        ],
        relations: ["universal negative quantity", "exclusive quantity", "negation", "passive"],
      },
      priorStructuralDifference: "Not the drafts/board second-reading frame, and not every agent acting on their own item before an event with only two items moving. This one is a passive universal negative on complaints and a passive exclusive pair of official records, with no distributive kendi/own action.",
      observedDifficulty: null,
      item: {
        id: "quality-first-translation-tr_en",
        questionType: "translation",
        direction: "tr_en",
        designTarget: "medium",
        preservedRelations: ["no complaint was forwarded to the prosecutor", "only two official records were read at the hearing", "both events are passive"],
        source: {
          kind: "translation",
          sourceSentence: complaints,
          sourceLanguage: "tr",
          targetLanguage: "en",
          roles: ["complaints", "minutes"],
          scope: "no complaint forwarded, only two minutes read",
        },
        core: core(translationModel.promptVersion, complaints, complaintsKey, "source_sentence"),
      },
    },
  ];
}

const priorLexicalClusters: readonly string[][] = [
  ["clerk", "side door", "late drivers", "yard", "truck"],
  ["shepherd", "flock", "valley", "çoban", "sürü", "vadi"],
  ["ferry", "serum", "island clinic", "fog"],
  ["font", "evening edition", "yazı tipi"],
  ["registry", "archivist", "withdrawn samples", "laboratory log"],
  ["drafts", "second reading", "taslak", "kurula"],
  ["coastal survey", "harbor would not"],
  ["depot before dawn", "morning delivery"],
  ["torn maps", "curator"],
  ["cracked", "sculptures", "heykel"],
  ["evening trains", "new schedule"],
  ["fisher", "balıkçı", "fırtına"],
  ["tonic", "memory", "attention"],
  ["goalkeeper", "match footage"],
  ["embargo", "preprint", "appendices"],
  ["primary outcome", "secondary measures"],
  ["itirazlı tablo", "hakem kurulu"],
  ["clearer result", "second reading"],
  ["freezer", "afternoon test"],
  ["second scan", "too faint"],
];

export function priorQualityFirstSources(): Set<string> {
  const fromItems = [...trapItems(), ...pilotItems(), ...qualityItems().map((entry) => entry.item), ...taxonomyLiveItems().map((entry) => entry.item), ...mediumReproItems().map((entry) => entry.item)].map((item) => sourceSentence(item));
  return new Set([...fromItems, recordedDraftsSource, recordedDraftsKey]);
}

function lexicalCopyOfPrior(sentence: string): string | null {
  const folded = sentence.toLocaleLowerCase("tr-TR");
  for (const cluster of priorLexicalClusters) {
    const hits = cluster.filter((anchor) => folded.includes(anchor.toLocaleLowerCase("tr-TR")));
    if (hits.length >= 2) return hits.join(",");
  }
  return null;
}

export type QualityFirstKeyGate = {
  id: string;
  proceed: boolean;
  failure: string | null;
  keyFailures: string[];
  distance: ParaphraseDistance;
  meaning: "fail" | "unverified" | "not_run";
  mechanisms: number;
  sourceHash: string;
  keyHash: string;
  meaningProven: false;
  approvesTarget: false;
  observedDifficulty: null;
};

/** A shown meaning failure, a near copy, or too few grounded misreadings blocks distractors. Unverified is not approval. */
export function qualityFirstKeyGate(item: TrapItem): QualityFirstKeyGate {
  const sentence = sourceSentence(item);
  const model = item.questionType === "restatement" ? restatementModel : translationModel;
  const key = assessKey(model, item.source, item.core);
  const paraphrase = assessParaphraseKey(sentence, item.core.correctAnswer);
  const support = selectMisreadingMechanisms(sentence, item.questionType);
  const meaning = key.meaning.status;
  const blocked = !key.valid || meaning === "fail" || paraphrase.failures.includes("key_near_copy") || paraphrase.failures.includes("scope_not_carried") || support.status !== "selected";
  const failure = !key.valid || meaning === "fail"
    ? key.failures[0] ?? "key_meaning_failed"
    : paraphrase.failures[0] ?? (support.status !== "selected" ? support.failure ?? "mechanisms" : null);
  return {
    id: item.id,
    proceed: !blocked,
    failure: blocked ? failure : null,
    keyFailures: key.failures,
    distance: paraphrase.distance,
    meaning,
    mechanisms: support.supportableMisreadings,
    sourceHash: contentVersion(sentence),
    keyHash: contentVersion(item.core.correctAnswer),
    meaningProven: false,
    approvesTarget: false,
    observedDifficulty: null,
  };
}

export type QualityFirstPreflightSnapshot = {
  assessment?: { gates?: { id: string; sourceHash: string; keyHash: string }[] };
  items?: { id: string; source: string; key: string }[];
};

/** Stops live if the stored preflight hashes or texts no longer match the four frozen items. */
export function verifyQualityFirstPreflight(preflight: QualityFirstPreflightSnapshot): { ok: boolean; reason: string | null } {
  const entries = qualityFirstItems();
  if (!preflight.assessment?.gates?.length || !preflight.items?.length) return { ok: false, reason: "preflight_missing_hashes" };
  for (const entry of entries) {
    const sentence = sourceSentence(entry.item);
    const key = entry.item.core.correctAnswer;
    const gate = preflight.assessment.gates.find((item) => item.id === entry.item.id);
    if (!gate) return { ok: false, reason: `preflight_missing_gate:${entry.item.id}` };
    if (gate.sourceHash !== contentVersion(sentence) || gate.keyHash !== contentVersion(key)) return { ok: false, reason: `hash_mismatch:${entry.item.id}` };
    const stored = preflight.items.find((item) => item.id === entry.item.id);
    if (!stored) return { ok: false, reason: `preflight_missing_item:${entry.item.id}` };
    if (stored.source !== sentence || stored.key !== key) return { ok: false, reason: `text_mismatch:${entry.item.id}` };
  }
  return { ok: true, reason: null };
}

export const qualityFirstCriteria: QualityFirstCriterion[] = [
  "source_key_meaning_equivalence",
  "single_defensible_key",
  "four_natural_distractors",
  "each_distractor_meaning_difference",
  "no_new_event_or_actor",
  "no_completeness_or_length_clue",
  "distinct_cognitive_traps",
  "target_language_grammatical",
];

/**
 * Structural completion is not quality. A clean deterministic key check is unverified, never pass.
 * Criteria that need a produced five stay unverified until a live record exists.
 */
export function scoreQualityFirstItem(item: TrapItem): Record<QualityFirstCriterion, QualityFirstScore> {
  const gate = qualityFirstKeyGate(item);
  const sourceKey = gate.meaning === "fail" || !gate.proceed ? "fail" : "unverified";
  return {
    source_key_meaning_equivalence: sourceKey,
    single_defensible_key: "unverified",
    four_natural_distractors: "unverified",
    each_distractor_meaning_difference: "unverified",
    no_new_event_or_actor: "unverified",
    no_completeness_or_length_clue: "unverified",
    distinct_cognitive_traps: "unverified",
    target_language_grammatical: "unverified",
  };
}

export type QualityFirstMetrics = {
  firstPassYield: "not_measured";
  structuralCompletion: "not_measured";
  diagnosticCoverage: "not_measured";
  recoveryEligibility: "not_measured";
  recoveryYield: "not_measured";
  costPerReviewableItem: null;
};

export const qualityFirstMetricsPlaceholder: QualityFirstMetrics = {
  firstPassYield: "not_measured",
  structuralCompletion: "not_measured",
  diagnosticCoverage: "not_measured",
  recoveryEligibility: "not_measured",
  recoveryYield: "not_measured",
  costPerReviewableItem: null,
};

export function assessQualityFirstPilot(officialTexts: readonly string[] = []): {
  ready: boolean;
  failures: string[];
  gates: QualityFirstKeyGate[];
  providerCalls: 0;
  studentBankWrites: 0;
  goldApproved: false;
  humanApproval: "closed";
  liveAuthorized: false;
  recoveryDefault: "off";
  observedDifficulty: null;
} {
  const used = priorQualityFirstSources();
  const failures: string[] = [];
  const entries = qualityFirstItems();
  if (entries.length !== 4) failures.push("item_count");
  if (entries.some((entry) => entry.designTarget !== "medium" || entry.item.designTarget !== "medium" || entry.observedDifficulty !== null)) failures.push("design_targets");
  const types = entries.map((entry) => `${entry.item.questionType}:${entry.item.direction ?? "restatement"}`);
  if (types.filter((type) => type === "restatement:restatement").length !== 2) failures.push("restatement_count");
  if (types.filter((type) => type === "translation:en_tr").length !== 1 || types.filter((type) => type === "translation:tr_en").length !== 1) failures.push("translation_directions");
  const gates = entries.map((entry) => qualityFirstKeyGate(entry.item));
  for (const entry of entries) {
    const sentence = sourceSentence(entry.item);
    if (used.has(sentence) || used.has(entry.item.core.correctAnswer)) failures.push(`${entry.item.id}:reused_source`);
    const copy = lexicalCopyOfPrior(sentence) ?? lexicalCopyOfPrior(entry.item.core.correctAnswer);
    if (copy) failures.push(`${entry.item.id}:lexical_copy:${copy}`);
    const gate = gates.find((item) => item.id === entry.item.id)!;
    if (!gate.proceed) failures.push(`${entry.item.id}:${gate.failure}`);
    if (entry.item.questionType === "restatement" && gate.distance !== "independent") failures.push(`${entry.item.id}:${gate.distance}`);
    if (gate.meaningProven || gate.approvesTarget || gate.observedDifficulty !== null) failures.push(`${entry.item.id}:false_pass`);
    const score = scoreQualityFirstItem(entry.item);
    if (Object.values(score).some((value) => value === ("pass" as string))) failures.push(`${entry.item.id}:false_quality_pass`);
    if (officialTexts.length) {
      const screen = screenExamSurface({ instructions: "", content: `${sentence}\n${entry.item.core.correctAnswer}` }, officialTexts);
      if (screen.status === "overlap") failures.push(`${entry.item.id}:official_surface_overlap`);
    }
  }
  return {
    ready: failures.length === 0,
    failures,
    gates,
    providerCalls: 0,
    studentBankWrites: 0,
    goldApproved: false,
    humanApproval: "closed",
    liveAuthorized: false,
    recoveryDefault: "off",
    observedDifficulty: null,
  };
}
