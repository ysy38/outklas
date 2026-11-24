import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { surfaceEdit } from "./cognitive-trap";
import { assessMeaningIntegrity } from "./core";
import { draftsCandidateOptions, recordedDraftsKey, recordedDraftsSource } from "./drafts-candidate";
import { selectCognitiveDistractors, type CognitiveDistractor } from "./distractor-strategy";
import { incompleteOption } from "./misreading-mechanisms";
import { qualityFirstPilotOutputDir } from "./quality-first-pilot";
import { restatementModel, translationModel } from "./registry";
import { classifyOption } from "./whole-set";

export const yieldOptimizationAuthorization = "factory-yield-optimization-v1";
export const yieldOptimizationOutputDir = ".data/analysis/_factory/cognitive-trap/yield-optimization-v1";
export const yieldOptimizationLiveSourceDir = qualityFirstPilotOutputDir;

const complaintsSource = "Hiçbir şikâyet savcılığa iletilmiş değil; yalnızca iki tutanak duruşmada okundu.";
const complaintsKey = "No complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.";
const complaintsSome = "Some complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.";

const registrySource = "Although the registry held every laboratory log from the trial, the archivist found no trace that the two withdrawn samples had been filed with them.";
const registryKey = "Although the registry kept every laboratory log from the trial, its archivist discovered no trace that the two withdrawn samples had been filed with those logs.";

type LiveArm = {
  status: string;
  qualityDecision: "pending" | "fail" | "needs_revision";
  modelVerdict: string | null;
  judgeAgreesWithKey: boolean | null;
  editorial: string;
  options: Record<string, string> | null;
  keyLetter: string | null;
  droppedDistractors: { candidateText: string; errorMechanism: string; reason: string; mechanismId: string }[];
  decisionRisks: { whole_set_clue_risk: string[]; distractor_equivalence_risk: string[]; key_semantic_risk: string[] } | null;
  secondAnswerOptions: string[];
  readings: { studentMisreading: string; temptingEvidence: string; actualSemanticDifference: string; whyIncorrect: string; misreadingMechanism: string }[];
};

type LiveRecord = {
  id: string;
  source: string;
  key: string;
  observedDifficulty: null;
  arms: { B: LiveArm };
};

function liveRecord(id: string): LiveRecord {
  return JSON.parse(readFileSync(path.join(yieldOptimizationLiveSourceDir, `${id}.json`), "utf8")) as LiveRecord;
}

function liveSummary(): { metrics: Record<string, unknown>; costUsd: number; providerCalls: number } {
  return JSON.parse(readFileSync(path.join(yieldOptimizationLiveSourceDir, "summary.json"), "utf8")) as { metrics: Record<string, unknown>; costUsd: number; providerCalls: number };
}

function cognitive(text: string, mechanism: string, reading: string, extra: Partial<CognitiveDistractor> = {}) {
  return {
    candidateText: text,
    errorMechanism: mechanism,
    shiftTarget: "quantity" as const,
    whyPlausible: extra.whyPlausible ?? "A reader can attach the nearby wording to the wrong relation.",
    whyInferior: extra.whyInferior ?? "The source keeps the original relation.",
    sourceEvidence: extra.sourceEvidence ?? "source",
    semanticRisk: extra.semanticRisk ?? ("none" as const),
    studentMisreading: extra.studentMisreading ?? reading,
    temptingEvidence: extra.temptingEvidence ?? "Both parts of the sentence are visible.",
    actualSemanticDifference: extra.actualSemanticDifference ?? "The relation between the parts changes.",
    whyIncorrect: extra.whyIncorrect ?? "The source does not say that.",
    explanationIsNotProof: true as const,
    misreadingMechanism: extra.misreadingMechanism,
  };
}

function replay(input: { candidates: ReturnType<typeof cognitive>[]; keyText: string; sourceText: string; allowedMechanisms: readonly string[] }) {
  const oldKept = input.candidates.filter((candidate) => !surfaceEdit(input.keyText, candidate.candidateText));
  const next = selectCognitiveDistractors(input);
  const cognitivelyDropped = new Set(next.removed.map((row) => row.candidate.candidateText));
  const newKept = input.candidates.filter((candidate) => !cognitivelyDropped.has(candidate.candidateText));
  const rescued = input.candidates.filter((candidate) => surfaceEdit(input.keyText, candidate.candidateText) && !cognitivelyDropped.has(candidate.candidateText));
  return {
    oldKept: oldKept.length,
    newKept: newKept.length,
    rescued: rescued.length,
    status: next.status,
    selected: next.selected.map((row) => row.candidateText),
    cognitivelyKept: newKept.map((row) => row.candidateText),
    removed: next.removed.map((row) => ({ text: row.candidate.candidateText, reason: row.reason })),
    secondAnswerRisk: newKept.filter((row) => row.semanticRisk === "second_answer" || classifyOption(input.sourceText, input.keyText, row.candidateText).relation === "confirmed_equivalent").map((row) => row.candidateText),
  };
}

export function qualityFirstYieldMetrics(records: LiveRecord[]) {
  const denominator = 4;
  const structural = records.filter((record) => record.arms.B.status === "five_options").length;
  const gateEligible = records.filter((record) => record.arms.B.status === "five_options" && record.arms.B.qualityDecision !== "fail").length;
  const judgeApproved = records.filter((record) => record.arms.B.modelVerdict === "APPROVE" && record.arms.B.judgeAgreesWithKey === true).length;
  const reviewCandidate = records.filter((record) => record.arms.B.status === "five_options" && record.arms.B.qualityDecision === "pending").length;
  const editoriallyAccepted = records.filter((record) => record.arms.B.editorial === "editorially_accepted").length;
  return {
    structuralCompletion: structural / denominator,
    gateEligible: gateEligible / denominator,
    judgeApproved: judgeApproved / denominator,
    reviewCandidate: reviewCandidate / denominator,
    editoriallyAccepted: editoriallyAccepted / denominator,
    meaningProven: false as const,
    observedDifficulty: null,
    structuralCount: structural,
    gateEligibleCount: gateEligible,
    judgeApprovedCount: judgeApproved,
    reviewCandidateCount: reviewCandidate,
    editoriallyAcceptedCount: editoriallyAccepted,
    firstPassReviewable: "retired" as const,
  };
}

function optionComponents(source: string, key: string, text: string) {
  const againstSource = assessMeaningIntegrity(source, text);
  const againstKey = assessMeaningIntegrity(key, text);
  return {
    text,
    wordCount: text.trim().split(/\s+/).filter(Boolean).length,
    incompleteOption: incompleteOption(text),
    surfaceEditOfKey: surfaceEdit(key, text),
    againstSource: { status: againstSource.status, failures: againstSource.failures },
    againstKey: { status: againstKey.status, failures: againstKey.failures },
    classification: classifyOption(source, key, text),
  };
}

export function assessYieldOptimization() {
  const summary = liveSummary();
  const records = [
    liveRecord("quality-first-restatement-epistemic"),
    liveRecord("quality-first-restatement-counterfactual"),
    liveRecord("quality-first-translation-en_tr"),
    liveRecord("quality-first-translation-tr_en"),
  ];
  const trEn = records[3]!;
  const plates = records[1]!;
  const faculty = records[2]!;
  const someReading = trEn.arms.B.readings[0]!;
  const someCandidate = cognitive(complaintsSome, "quantity_shift", someReading.studentMisreading, {
    temptingEvidence: someReading.temptingEvidence,
    actualSemanticDifference: someReading.actualSemanticDifference,
    whyIncorrect: someReading.whyIncorrect,
    misreadingMechanism: someReading.misreadingMechanism,
    sourceEvidence: someReading.temptingEvidence.slice(0, 200),
  });
  const synonym = cognitive(
    "No complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the session.",
    "scope_shift",
    "The hearing is retold as a session.",
  );
  const trEnReplay = replay({
    candidates: [someCandidate, synonym],
    keyText: complaintsKey,
    sourceText: complaintsSource,
    allowedMechanisms: translationModel.errorMechanisms,
  });
  const draftsReplay = replay({
    candidates: [
      cognitive(draftsCandidateOptions.B, "quantity_scope", "most is read as none"),
      cognitive(draftsCandidateOptions.C, "tense_shift", "afterwards attaches to distribution"),
      cognitive(draftsCandidateOptions.D, "predicate_meaning", "distributed is read as approved"),
      cognitive(draftsCandidateOptions.E, "causal_direction", "contrast is read as cause"),
    ],
    keyText: recordedDraftsKey,
    sourceText: recordedDraftsSource,
    allowedMechanisms: restatementModel.errorMechanisms,
  });
  const registryNear = registryKey.replace("kept", "held");
  const registryReplay = replay({
    candidates: [
      cognitive(registryNear, "scope_widening", "kept is retold as held"),
      cognitive("Because the registry held every laboratory log, the archivist filed the two withdrawn samples with them.", "causal_direction", "concession is read as cause"),
      cognitive("Although the registry kept only some laboratory logs, the archivist discovered no trace of the two withdrawn samples.", "quantity_scope", "every is read as some"),
      cognitive("Although the registry kept every laboratory log, the archivist established that the two withdrawn samples had never been filed.", "polarity_reversal", "absence of a trace is read as a finding"),
      cognitive("Although the registry kept every laboratory log, the archivist discovered a trace that the samples were absent.", "predicate_meaning", "no trace is read as a trace"),
    ],
    keyText: registryKey,
    sourceText: registrySource,
    allowedMechanisms: restatementModel.errorMechanisms,
  });
  const sourceMeaning = assessMeaningIntegrity(complaintsSource, complaintsSome);
  const keyMeaning = assessMeaningIntegrity(complaintsKey, complaintsSome);
  const keyVsOfficial = assessMeaningIntegrity(complaintsSource, complaintsKey);
  const metrics = qualityFirstYieldMetrics(records);
  return {
    version: yieldOptimizationAuthorization,
    liveSourceDir: yieldOptimizationLiveSourceDir,
    liveSummaryHash: createHash("sha256").update(readFileSync(path.join(yieldOptimizationLiveSourceDir, "summary.json"))).digest("hex").slice(0, 12),
    livePilotImmutable: true,
    liveFirstPassYieldUnchanged: summary.metrics.firstPassYield,
    modelsFrozen: true,
    recoveryDefault: "off" as const,
    providerCalls: 0,
    meaningProven: false as const,
    surfaceEdit: {
      key: complaintsKey,
      dropped: complaintsSome,
      surfaceEditTrue: surfaceEdit(complaintsKey, complaintsSome),
      sourceMeaning: { status: sourceMeaning.status, failures: sourceMeaning.failures, areas: sourceMeaning.areas },
      keyMeaning: { status: keyMeaning.status, failures: keyMeaning.failures, areas: keyMeaning.areas },
      officialKeyStillUnverified: keyVsOfficial.status !== "fail",
      rootCause: "selectCognitiveDistractors dropped a bag-of-words delta of 2 (No→Some) as surface_edit. quantityClasses did not treat English no as none, negated() lacked \\bno\\b, and setsDiffer ignores an empty class set, so assessMeaningIntegrity(key, Some) was unverified. Source hiçbir vs some already shows quantity_shift.",
      fix: "Keep a surface-similar candidate only when assessMeaningIntegrity fails against the key or the source. English no is a none-class token and a polarity marker. Equivalent and unverified near copies still drop.",
    },
    onlyCompleteOption: {
      selectorChanged: false,
      plates: {
        stage: "writer_B-options then assessWholeSet length clue",
        notSelector: true,
        droppedReasons: plates.arms.B.droppedDistractors.map((row) => row.reason),
        clue: plates.arms.B.decisionRisks?.whole_set_clue_risk ?? [],
        options: Object.entries(plates.arms.B.options ?? {}).map(([label, text]) => ({ label, ...optionComponents(plates.source, plates.key, text) })),
        note: "Option A is a factual report of an unreal sealing. B–E keep counterfactual form. A is the short option that trips only_complete_option. The selector kept A; incompleteOption is false. One writer candidate was off_construct before selection.",
      },
      faculty: {
        stage: "writer_B-options then assessWholeSet length clue; selector pool_surplus of a fifth candidate",
        notSelector: true,
        droppedReasons: faculty.arms.B.droppedDistractors.map((row) => row.reason),
        clue: faculty.arms.B.decisionRisks?.whole_set_clue_risk ?? [],
        options: Object.entries(faculty.arms.B.options ?? {}).map(([label, text]) => ({ label, ...optionComponents(faculty.source, faculty.key, text) })),
        surplus: faculty.arms.B.droppedDistractors.find((row) => row.reason === "pool_surplus")?.candidateText ?? null,
        note: "A omits the because-clause and turns purpose into a completed result. D swaps actors. C adds other equipment. The fifth writer option was pool_surplus, not a completeness filter. The length gate fired after layout.",
      },
    },
    selectorComparison: {
      complaints: { ...trEnReplay, recordedDropped: trEn.arms.B.droppedDistractors, recordedSelected: 0, fourOptionsOffline: trEnReplay.status === "selected", countedAsQuality: false },
      drafts: draftsReplay,
      registry: registryReplay,
    },
    metrics,
    nextLiveRun: {
      requiredNow: false,
      laterIf: "A later live run is only to remeasure TR→EN structuralCompletion after this selector keep. It is not required to prove the surface_edit false rejection. only_complete_option is writer wording plus the existing length gate; a live rerun would not fix it without a prompt or model change, which this round forbids.",
    },
  };
}

export function writeYieldOptimizationReport() {
  const report = assessYieldOptimization();
  mkdirSync(yieldOptimizationOutputDir, { recursive: true });
  writeFileSync(path.join(yieldOptimizationOutputDir, "summary.json"), `${JSON.stringify({
    version: report.version,
    liveSourceDir: report.liveSourceDir,
    liveSummaryHash: report.liveSummaryHash,
    livePilotImmutable: true,
    providerCalls: 0,
    meaningProven: false,
    qualityProven: false,
    nextLiveRunRequiredNow: false,
  }, null, 2)}\n`);
  writeFileSync(path.join(yieldOptimizationOutputDir, "metrics.json"), `${JSON.stringify(report.metrics, null, 2)}\n`);
  writeFileSync(path.join(yieldOptimizationOutputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
