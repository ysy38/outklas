import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assessWholeSet } from "./whole-set";
import { incompleteOption } from "./misreading-mechanisms";
import { selectCognitiveDistractors } from "./distractor-strategy";
import { linkMisreadingCandidates, type LinkingRow, type OptionWriterCandidate } from "./candidate-lifecycle";
import { qualityFirstPilotOutputDir } from "./quality-first-pilot";
import { restatementModel, translationModel } from "./registry";
import { surfaceEdit } from "./cognitive-trap";

export const candidateRetentionAuthorization = "candidate-retention-writer-yield-v1";
export const candidateRetentionOutputDir = ".data/analysis/_factory/cognitive-trap/candidate-retention-v1";
export const candidateRetentionLiveSourceDir = qualityFirstPilotOutputDir;

/** Frozen OpenRouter replies from the Quality-First v1 live run. Reading them is not a new API call. */
export const candidateRetentionCache = {
  trEnRead: "761fe15fc885f18cb87c462c51a9fbdf73abf232e99980f4abdcf3cdd7ef642d",
  trEnOptions: "c13e321cf1ccd2ff847d9460543c0f20e4c346d9d1aeebe8bf577143e199f0f3",
  platesOptions: "0329e2dd200d34189f716bdb0e0cde46ff1d0fe0187a55499111598be8504893",
  facultyOptions: "7b8d198bf1e2414c6b8e981c2aca9729db1ca5807f2769cfde8bc4565b2198fd",
  censusOptions: "8420b3e05700beb9098527fcfbc678985b25603f5c4571f30f43558022581f7e",
} as const;

const cacheDir = ".data/analysis/cache/ai";

type LiveArm = {
  status: string;
  qualityDecision: string;
  options: Record<string, string> | null;
  keyLetter: string | null;
  droppedDistractors: { candidateText: string; reason: string; errorMechanism: string }[];
  decisionRisks: { whole_set_clue_risk: string[] } | null;
  readings: { studentMisreading: string; temptingEvidence: string; actualSemanticDifference: string; whyIncorrect: string; misreadingMechanism: string | null }[];
  linking?: LinkingRow[];
};

type LiveRecord = { id: string; source: string; key: string; arms: { B: LiveArm } };

function liveRecord(id: string): LiveRecord {
  return JSON.parse(readFileSync(path.join(candidateRetentionLiveSourceDir, `${id}.json`), "utf8")) as LiveRecord;
}

function cacheCandidates(hash: string): OptionWriterCandidate[] | null {
  const file = path.join(cacheDir, `${hash}.json`);
  if (!existsSync(file)) return null;
  const entry = JSON.parse(readFileSync(file, "utf8")) as { response?: { text?: string } };
  try {
    const parsed = JSON.parse(entry.response?.text ?? "") as { candidates?: OptionWriterCandidate[] };
    return Array.isArray(parsed.candidates) ? parsed.candidates : null;
  } catch {
    return null;
  }
}

function rate(part: number, whole: number): number | "unverified" {
  if (whole === 0) return "unverified";
  return part / whole;
}

function replayItem(input: {
  id: string;
  source: string;
  key: string;
  readings: LiveArm["readings"];
  cacheHash: string;
  allowedMechanisms: readonly string[];
  liveDropped: LiveArm["droppedDistractors"];
  liveStatus: string;
  liveClue: string[];
}) {
  const generated = cacheCandidates(input.cacheHash);
  const optionTextsGenerated = generated ? generated.length : "unverified";
  const linking = generated
    ? linkMisreadingCandidates({ readings: input.readings, candidates: generated })
    : null;
  const selected = linking
    ? selectCognitiveDistractors({
        candidates: linking.linked,
        keyText: input.key,
        sourceText: input.source,
        allowedMechanisms: input.allowedMechanisms,
      })
    : null;
  const linkedCount = linking ? linking.rows.filter((row) => row.status === "linked").length : "unverified";
  const selectorReached = linking ? linking.linked.length : "unverified";
  const selectorKept = selected ? selected.selected.length : "unverified";
  const four = selected?.status === "selected";
  return {
    id: input.id,
    cacheHash: input.cacheHash,
    misreadingsGenerated: input.readings.length,
    optionTextsGenerated,
    liveRecordedDroppedTexts: input.liveDropped.length,
    liveStatus: input.liveStatus,
    linking: linking?.rows ?? "unverified",
    linkingSuccessRate: typeof linkedCount === "number" && generated ? rate(linkedCount, Math.max(input.readings.length, generated.length)) : "unverified",
    linkedCount,
    selectorReached,
    selectorKept,
    selectorRetentionRate: typeof selectorKept === "number" && typeof selectorReached === "number" ? rate(selectorKept, selectorReached) : "unverified",
    selectedTexts: selected?.selected.map((row) => row.candidateText) ?? "unverified",
    newlyRecordedDrops: selected
      ? [...(linking?.dropped ?? []).map((row) => ({ text: row.candidate.candidateText, reason: row.reason })), ...selected.removed.map((row) => ({ text: row.candidate.candidateText, reason: row.reason })), ...selected.rejected.map((row) => ({ text: row.candidate.candidateText, reason: row.reason }))]
      : "unverified",
    structuralCompletion: four ? 1 : 0,
    fourOptionsAfterReplay: four,
    countedAsQuality: false,
    liveClue: input.liveClue,
    secondAnswerRisk: selected ? selected.selected.filter((row) => row.semanticRisk === "second_answer").map((row) => row.candidateText) : [],
  };
}

function completeness(source: string, key: string, label: string, text: string, intended: string, notes: { kept: string[]; dropped: string[]; singleIntendedDifference: boolean }) {
  return {
    label,
    text,
    wordCount: text.trim().split(/\s+/).filter(Boolean).length,
    incompleteOption: incompleteOption(text),
    surfaceEditOfKey: surfaceEdit(key, text),
    intendedMisreading: intended,
    keptComponents: notes.kept,
    droppedComponents: notes.dropped,
    singleIntendedDifference: notes.singleIntendedDifference,
    qualityIssue: notes.singleIntendedDifference ? null : "writer_dropped_source_components",
  };
}

export function assessCandidateRetention() {
  const trEn = liveRecord("quality-first-translation-tr_en");
  const plates = liveRecord("quality-first-restatement-counterfactual");
  const faculty = liveRecord("quality-first-translation-en_tr");
  const census = liveRecord("quality-first-restatement-epistemic");
  const trEnReplay = replayItem({
    id: trEn.id,
    source: trEn.source,
    key: trEn.key,
    readings: trEn.arms.B.readings,
    cacheHash: candidateRetentionCache.trEnOptions,
    allowedMechanisms: translationModel.errorMechanisms,
    liveDropped: trEn.arms.B.droppedDistractors,
    liveStatus: trEn.arms.B.status,
    liveClue: trEn.arms.B.decisionRisks?.whole_set_clue_risk ?? [],
  });
  const platesReplay = replayItem({
    id: plates.id,
    source: plates.source,
    key: plates.key,
    readings: plates.arms.B.readings,
    cacheHash: candidateRetentionCache.platesOptions,
    allowedMechanisms: restatementModel.errorMechanisms,
    liveDropped: plates.arms.B.droppedDistractors,
    liveStatus: plates.arms.B.status,
    liveClue: plates.arms.B.decisionRisks?.whole_set_clue_risk ?? [],
  });
  const facultyReplay = replayItem({
    id: faculty.id,
    source: faculty.source,
    key: faculty.key,
    readings: faculty.arms.B.readings,
    cacheHash: candidateRetentionCache.facultyOptions,
    allowedMechanisms: translationModel.errorMechanisms,
    liveDropped: faculty.arms.B.droppedDistractors,
    liveStatus: faculty.arms.B.status,
    liveClue: faculty.arms.B.decisionRisks?.whole_set_clue_risk ?? [],
  });
  const censusReplay = replayItem({
    id: census.id,
    source: census.source,
    key: census.key,
    readings: census.arms.B.readings,
    cacheHash: candidateRetentionCache.censusOptions,
    allowedMechanisms: restatementModel.errorMechanisms,
    liveDropped: census.arms.B.droppedDistractors,
    liveStatus: census.arms.B.status,
    liveClue: census.arms.B.decisionRisks?.whole_set_clue_risk ?? [],
  });
  const gate = trEnReplay.fourOptionsAfterReplay && Array.isArray(trEnReplay.selectedTexts)
    ? assessWholeSet({
        source: trEn.source,
        key: trEn.key,
        options: {
          A: trEn.key,
          B: trEnReplay.selectedTexts[0] ?? "",
          C: trEnReplay.selectedTexts[1] ?? "",
          D: trEnReplay.selectedTexts[2] ?? "",
          E: trEnReplay.selectedTexts[3] ?? "",
        },
        correct: "A",
      })
    : null;
  const items = [trEnReplay, platesReplay, facultyReplay, censusReplay];
  const metrics = {
    byItem: Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          misreadingsGenerated: item.misreadingsGenerated,
          optionTextsGenerated: item.optionTextsGenerated,
          linkingSuccessRate: item.linkingSuccessRate,
          selectorRetentionRate: item.selectorRetentionRate,
          structuralCompletion: item.structuralCompletion,
          onlyCompleteOptionRate: item.liveStatus === "five_options" ? (item.liveClue.includes("only_complete_option") ? 1 : 0) : "unverified",
        },
      ]),
    ),
    structuralCompletion: items.filter((item) => item.fourOptionsAfterReplay).length / 4,
    meaningProven: false as const,
    qualityProven: false as const,
    observedDifficulty: null,
    firstPassReviewable: "retired" as const,
  };
  return {
    version: candidateRetentionAuthorization,
    liveSourceDir: candidateRetentionLiveSourceDir,
    liveSummaryHash: createHash("sha256").update(readFileSync(path.join(candidateRetentionLiveSourceDir, "summary.json"))).digest("hex").slice(0, 12),
    livePilotImmutable: true,
    providerCalls: 0,
    modelsFrozen: true,
    recoveryDefault: "off" as const,
    rootCause: {
      item: "quality-first-translation-tr_en",
      writerOptionTexts: 4,
      linking: "exact studentMisreading; all four matched; linking was not the loss",
      silentLoss: "selectDistractors wipes passing candidates when fewer than four remain. Live recorded only the surface_edit drop. The other three writer texts never entered droppedDistractors.",
      afterFix: "Linking rows are stored. Unmatched candidates are unmatched_misreading, not surface_edit. insufficient_pool records a shortfall instead of deleting the texts. The prior surface_edit meaning exception keeps No→Some. Replay of the frozen options yields four distractors. That is structuralCompletion only.",
    },
    before: {
      trEn: {
        optionTextsInItemJson: trEn.arms.B.droppedDistractors.length,
        selected: 0,
        recordedDropReasons: trEn.arms.B.droppedDistractors.map((row) => row.reason),
        silentUnrecorded: 3,
      },
    },
    after: {
      trEn: trEnReplay,
      wholeSetAfterReplay: gate
        ? { decision: gate.decision, failure: gate.failure, clue: gate.risks.whole_set_clue_risk, meaningProven: gate.meaningProven, approvesTarget: gate.approvesTarget }
        : null,
    },
    platesCompleteness: {
      productionLossVsQuality: "quality",
      selectorChanged: false,
      options: [
        completeness(plates.source, plates.key, "A", plates.arms.B.options!.A, "COUNTERFACTUAL_FACTUAL", {
          kept: ["sealing-before-humidity as an event", "printability as an outcome"],
          dropped: ["counterfactual would-have", "conservators as agents", "quantity two earliest negatives", "provided-condition"],
          singleIntendedDifference: false,
        }),
        completeness(plates.source, plates.key, "B", plates.arms.B.options!.B, "TEMPORAL_ORDER", {
          kept: ["two earliest negatives", "would have remained printable", "conservators", "glass plates", "provided-condition"],
          dropped: ["sealing before humidity; humidity now prompts sealing"],
          singleIntendedDifference: true,
        }),
        completeness(plates.source, plates.key, "C", plates.arms.B.options!.C, "TEMPORAL_SCOPE", {
          kept: ["two earliest negatives", "would have remained printable", "conservators sealing glass plates", "provided-condition"],
          dropped: ["before the humidity rose → after the humidity fell"],
          singleIntendedDifference: true,
        }),
        completeness(plates.source, plates.key, "E", plates.arms.B.options!.E, "CONDITION_DIRECTION", {
          kept: ["humidity", "glass plates sealed", "two earliest negatives printable", "unreal past"],
          dropped: ["sealing as the condition for printability; humidity-first reverses condition"],
          singleIntendedDifference: true,
        }),
      ],
      note: "A is a factual report that also drops actor and quantity. only_complete_option is the length of that writer sentence, not a selector cull.",
    },
    facultyCompleteness: {
      productionLossVsQuality: "quality",
      selectorChanged: false,
      options: [
        completeness(faculty.source, faculty.key, "A", faculty.arms.B.options!.A, "PURPOSE_RESULT", {
          kept: ["faculty hires outside auditor", "department / own equipment"],
          dropped: ["purpose would-not-value", "because last year's figures / same staff"],
          singleIntendedDifference: false,
        }),
        completeness(faculty.source, faculty.key, "B", faculty.arms.B.options!.B, "CAUSE_CONCESSION", {
          kept: ["faculty hires outside auditor", "same staff prepared last year's figures"],
          dropped: ["purpose that the department would not value its equipment; because → olsa da"],
          singleIntendedDifference: false,
        }),
        completeness(faculty.source, faculty.key, "C", faculty.arms.B.options!.C, "NEGATION_SCOPE", {
          kept: ["faculty hires auditor", "department / own equipment", "purpose böylece"],
          dropped: ["because-clause", "full negation of valuing; adds others' equipment and only-in-part"],
          singleIntendedDifference: false,
        }),
        completeness(faculty.source, faculty.key, "D", faculty.arms.B.options!.D, "AGENT_ROLE", {
          kept: ["outside auditor", "equipment not valued"],
          dropped: ["faculty as hirer", "because-clause", "department as non-valuer"],
          singleIntendedDifference: false,
        }),
      ],
      surplus: faculty.arms.B.droppedDistractors.find((row) => row.reason === "pool_surplus")?.candidateText ?? null,
      note: "Five writer texts linked. The fifth was pool_surplus. Short A/D omit the cause clause; that is writer quality, not silent retention loss.",
    },
    platesReplay,
    facultyReplay,
    censusReplay,
    metrics,
    nextLiveSingleVariable: "Keep writer, prompts, gate, and judge frozen. The one live change is this retention path: exact studentMisreading linking with recorded misses, and insufficient_pool instead of deleting passing texts. Re-measure TR→EN structuralCompletion. Do not change the writer prompt to chase only_complete_option in the same run.",
  };
}

export function writeCandidateRetentionReport() {
  const report = assessCandidateRetention();
  mkdirSync(candidateRetentionOutputDir, { recursive: true });
  writeFileSync(path.join(candidateRetentionOutputDir, "summary.json"), `${JSON.stringify({
    version: report.version,
    liveSourceDir: report.liveSourceDir,
    liveSummaryHash: report.liveSummaryHash,
    livePilotImmutable: true,
    providerCalls: 0,
    meaningProven: false,
    qualityProven: false,
    nextLiveSingleVariable: report.nextLiveSingleVariable,
  }, null, 2)}\n`);
  writeFileSync(path.join(candidateRetentionOutputDir, "metrics.json"), `${JSON.stringify(report.metrics, null, 2)}\n`);
  writeFileSync(path.join(candidateRetentionOutputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
