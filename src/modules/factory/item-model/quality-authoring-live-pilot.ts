import path from "node:path";
import { architectureV2WriterTokenCeiling, callCeilingUsd, type CatalogPrice, type PriceCatalog } from "./architecture-v2";
import { qualityAuthoringLiveAuthorized, qualityAuthoringModels, qualityAuthoringOutputDir } from "./quality-authoring";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";
import { assessWholeSet, classifyOption } from "./whole-set";

export const qualityAuthoringLivePilotAuthorization = "quality-authoring-live-pilot-v1";
export const qualityAuthoringLivePilotOutputDir = ".data/analysis/_factory/cognitive-trap/quality-authoring-live-pilot-v1";
export const qualityAuthoringLivePilotLiveAuthorized = true as const;
export const qualityAuthoringLivePilotSpendCapUsd = 0.02;
export const qualityAuthoringLivePilotRetry = 0;
export const qualityAuthoringLivePilotMaxCalls = 3;
export const qualityAuthoringLivePilotJudgeCalls = 0;
export const qualityAuthoringLivePilotWriter = qualityFirstFrozenModels.writer;
export const qualityAuthoringLivePilotOutputTokens = architectureV2WriterTokenCeiling.output;

export const qualityAuthoringLivePilotTasks = [
  {
    id: "joint-restatement-dredging",
    questionType: "restatement" as const,
    direction: "none" as const,
    seed: "The river commission delayed the dredging contract until the fisheries board had published the spawning calendar, even though the channel had already begun to silt.",
  },
  {
    id: "joint-translation-en_tr-icecore",
    questionType: "translation" as const,
    direction: "en_tr" as const,
    seed: "Because the ice-core laboratory could not date the dust band independently, it listed the eruption only as a candidate marker rather than a confirmed one.",
  },
  {
    id: "joint-translation-tr_en-arbitration",
    questionType: "translation" as const,
    direction: "tr_en" as const,
    seed: "Sendika, tahkim kurulunun gerekçeli kararını görmedikçe grevi bitirmeyeceğini bildirdi; fabrika yönetimi ise siparişlerin zaten iptal edildiğini savundu.",
  },
] as const;

const frozenPhrases = [
  "contested appendices",
  "citation check",
  "preprint server",
  "glass plates",
  "earliest negatives",
  "outside auditor",
  "kendi donanımını",
  "prosecutor's office",
  "savcılığa",
  "disputed tables",
  "vacancy rate",
  "coastal districts",
  "withdrawn samples",
  "had the editors completed",
];

export const qualityAuthoringEditorialQuestions = [
  "key_equivalent_to_source",
  "four_options_actually_wrong",
  "second_defensible_answer",
  "each_distractor_natural",
  "intended_misreading_realized",
  "off_target_meaning_shift",
  "four_options_distinct_and_plausible",
  "exam_level_appropriate",
] as const;

export function qualityAuthoringLivePilotCeiling(prices: PriceCatalog) {
  const row = prices[qualityAuthoringLivePilotWriter];
  const perCallUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling)
    : null;
  const threeCallUsd = perCallUsd != null ? perCallUsd * qualityAuthoringLivePilotMaxCalls : null;
  return {
    writer: qualityAuthoringLivePilotWriter,
    perCallUsd,
    threeCallUsd,
    capUsd: qualityAuthoringLivePilotSpendCapUsd,
    retry: qualityAuthoringLivePilotRetry,
    judgeCalls: qualityAuthoringLivePilotJudgeCalls,
    fitsCap: threeCallUsd != null && threeCallUsd <= qualityAuthoringLivePilotSpendCapUsd,
  };
}

export function qualityAuthoringLivePilotProtectedDirs() {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter((dir) => path.resolve(dir) !== path.resolve(qualityAuthoringLivePilotOutputDir));
}

export function seedsAvoidFrozenBenchmarks() {
  const hits = qualityAuthoringLivePilotTasks.flatMap((task) =>
    frozenPhrases.filter((phrase) => task.seed.toLocaleLowerCase("tr-TR").includes(phrase)).map((phrase) => ({ id: task.id, phrase })),
  );
  return { ok: hits.length === 0, hits };
}

export function refuseQualityAuthoringLivePilot(reason: string, code: string) {
  return {
    started: false,
    executed: false,
    providerCalls: 0,
    judgeCalls: 0,
    studentBankWrites: 0 as const,
    editorialAcceptance: "pending" as const,
    reason,
    code,
    liveAuthorized: qualityAuthoringLivePilotLiveAuthorized,
    qualityAuthoringStageLiveAuthorized: qualityAuthoringLiveAuthorized,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
  };
}

export function emptyEditorialSheet(itemId: string) {
  return {
    itemId,
    editorialAcceptance: "pending" as const,
    humanEditorial: "pending" as const,
    writerClaimIsNotProof: true as const,
    questions: Object.fromEntries(qualityAuthoringEditorialQuestions.map((id) => [id, null])),
  };
}

export function technicalNotesFromAssemble(report: {
  complete: boolean;
  keyValid: boolean;
  uniquePlanIds: boolean;
  parseOk: boolean;
  meaningProven: boolean;
  paraphrase?: { distance: string; failures: string[]; meaningProven: boolean };
  examSurface?: { status: string };
  selection: {
    complete: boolean;
    padded: boolean;
    rows: { planId: string; decision: string; risks: string[]; classified: { relation: string; evidence: string | null; overlap: number }; studentMisreading: string; candidateText: string }[];
  } | null;
  pack: { forms: { options: Record<"A" | "B" | "C" | "D" | "E", string> | null; source: string; labeledKey: string }[] } | null;
  dropped: { planId: string; decision: string; reason: string; risks: string[] }[];
  risks: string[];
}) {
  const kept = report.selection?.rows.filter((row) => row.decision === "keep") ?? [];
  const whole =
    report.pack?.forms[0]?.options != null
      ? assessWholeSet({
          source: report.pack.forms[0].source,
          key: report.pack.forms[0].labeledKey,
          options: report.pack.forms[0].options,
          correct: "A",
        })
      : null;
  return {
    meaningProven: false as const,
    qualityProven: false as const,
    examSurface: report.examSurface?.status ?? "not_run",
    examSurfaceIsNotPass: (report.examSurface?.status ?? "not_run") !== "clear",
    keyStructuralValid: report.keyValid,
    paraphraseDistance: report.paraphrase?.distance ?? "unverified",
    paraphraseFailures: report.paraphrase?.failures ?? [],
    kept: kept.map((row) => ({
      planId: row.planId,
      decision: row.decision,
      risks: row.risks,
      classified: row.classified,
      writerMisreadingClaim: row.studentMisreading,
      writerClaimIsNotProof: true as const,
      gate: classifyOption(report.pack?.forms[0]?.source ?? "", report.pack?.forms[0]?.labeledKey ?? "", row.candidateText),
    })),
    dropped: report.dropped,
    wholeSet: whole
      ? {
          decision: whole.decision,
          failure: whole.failure,
          risks: whole.risks,
          meaningProven: whole.meaningProven,
          options: whole.options,
        }
      : null,
    complete: report.complete,
    padded: report.selection?.padded ?? false,
  };
}

export function classifyLivePilotDefects(input: {
  id: string;
  requestedType: string;
  requestedDirection: string;
  parsedType?: string;
  parsedDirection?: string;
  parseOk: boolean;
  uniquePlanIds: boolean;
  keyValid: boolean;
  complete: boolean;
  dropped: { planId: string; decision: string }[];
  keptRisks: string[];
}) {
  const plan: string[] = [];
  const writer: string[] = [];
  const selector: string[] = [];
  if (!input.parseOk) writer.push("schema_or_json");
  if (input.parseOk && !input.uniquePlanIds) writer.push("plan_id_not_unique_p1_p6");
  if (input.parseOk && input.parsedType && input.parsedType !== input.requestedType) writer.push("question_type_mismatch");
  if (input.parseOk && input.parsedDirection && input.parsedDirection !== input.requestedDirection) writer.push("direction_mismatch");
  if (input.parseOk && !input.keyValid) writer.push("key_structurally_invalid");
  for (const row of input.dropped) {
    if (row.decision === "drop_equivalent") writer.push(`${row.planId}:second_key_or_near_copy`);
    if (row.decision === "drop_duplicate") writer.push(`${row.planId}:duplicate_text`);
    if (row.decision === "drop_language") writer.push(`${row.planId}:wrong_language`);
    if (row.decision === "drop_incomplete") writer.push(`${row.planId}:incomplete`);
  }
  if (input.parseOk && input.uniquePlanIds && !input.complete) selector.push("fewer_than_four_kept_no_pad");
  if (input.keptRisks.includes("only_to_at_least")) selector.push("kept_only_to_at_least_as_risk");
  if (input.keptRisks.includes("high_overlap_unverified")) selector.push("kept_high_overlap_unverified");
  if (!plan.length && !writer.length && !selector.length) plan.push("no_technical_defect_recorded; human editorial still pending");
  return { id: input.id, plan, writer, selector, editorialAcceptance: "pending" as const };
}

export const qualityAuthoringLivePilotLocks = {
  factoryRootCauseFixEnabled,
  recoveryDefault: recoveryDefaultEnabled,
  productionWriter: qualityAuthoringModels.author,
  productionJudge: qualityAuthoringModels.judge,
  qualityAuthoringStageLiveAuthorized: qualityAuthoringLiveAuthorized,
  offlineAuthoringDir: qualityAuthoringOutputDir,
  studentBankWrites: 0 as const,
  editorialAcceptance: "pending" as const,
  judgeCalls: 0 as const,
} as const;

export const qualityAuthoringCodesignAuthorization = "quality-authoring-codesign-restatement-v1";
export const qualityAuthoringCodesignOutputDir = ".data/analysis/_factory/cognitive-trap/quality-authoring-codesign-restatement-v1";
export const qualityAuthoringCodesignLiveAuthorized = true as const;
export const qualityAuthoringCodesignSpendCapUsd = 0.005;
export const qualityAuthoringCodesignRetry = 0;
export const qualityAuthoringCodesignMaxCalls = 1;
export const qualityAuthoringCodesignJudgeCalls = 0;
export const qualityAuthoringCodesignItemId = "codesign-restatement-north-shaft";

/** Recorded defects. This pilot does not add word rules or validators for them. */
export const qualityAuthoringKnownDefects = [
  {
    id: "en_tr_could_not_possibility_token",
    class: "false_positive_risk",
    gate: "assessKey/assessMeaningIntegrity modality_shift",
    note: "English could not (inability) vs Turkish -emediğinden can fire modality_shift. Do not add a could-not rule in this pilot.",
  },
  {
    id: "tr_en_already_not_yet_near_copy",
    class: "false_negative_risk",
    gate: "sequenceNearCopy",
    note: "already vs not yet can drop as near_copy_sequence. Quantity/exclusivity guard does not cover that pair. Do not add a new regex in this pilot.",
  },
] as const;

export const qualityAuthoringCodesignTask = {
  id: qualityAuthoringCodesignItemId,
  questionType: "restatement" as const,
  direction: "none" as const,
  situationBrief: [
    "Actors: mining inspectorate; north-shaft operator; two independent assay laboratories.",
    "Events: inspectorate withheld the reopening permit; both laboratories logged dust assays; operator restarted the ventilation fans while the permit was still withheld.",
    "Required facts: withholding continued until both independent dust assays had been logged; fan restart occurred during the withholding and was not its endpoint; inspectorate did not take fan restart as proof that dust levels were safe.",
    "Relations to host: until-boundary on both assays, not on fan restart; concession (fan restart does not cause or justify the withholding); quantity both assays, not one.",
    "Topic: occupational hygiene and mine ventilation, academic register.",
    "Question type: restatement. Language: English. Difficulty: hard YDS/YÖKDİL closest-meaning.",
  ].join("\n"),
};

export function qualityAuthoringCodesignCeiling(prices: PriceCatalog) {
  const row = prices[qualityAuthoringLivePilotWriter];
  const perCallUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling)
    : null;
  const oneCallUsd = perCallUsd;
  return {
    writer: qualityAuthoringLivePilotWriter,
    perCallUsd,
    oneCallUsd,
    capUsd: qualityAuthoringCodesignSpendCapUsd,
    retry: qualityAuthoringCodesignRetry,
    maxCalls: qualityAuthoringCodesignMaxCalls,
    judgeCalls: qualityAuthoringCodesignJudgeCalls,
    fitsCap: oneCallUsd != null && oneCallUsd <= qualityAuthoringCodesignSpendCapUsd,
  };
}

export function refuseQualityAuthoringCodesign(reason: string, code: string) {
  return {
    ...refuseQualityAuthoringLivePilot(reason, code),
    authorization: qualityAuthoringCodesignAuthorization,
  };
}

export const qualityAuthoringGenerationExperimentAuthorization = "quality-authoring-generation-quality-experiment-v1";
export const qualityAuthoringGenerationExperimentOutputDir = ".data/analysis/_factory/cognitive-trap/generation-quality-experiment-v1";
export const qualityAuthoringGenerationExperimentLiveAuthorized = true as const;
export const qualityAuthoringGenerationExperimentSpendCapUsd = 0.005;
export const qualityAuthoringGenerationExperimentRetry = 0;
export const qualityAuthoringGenerationExperimentMaxCalls = 1;
export const qualityAuthoringGenerationExperimentJudgeCalls = 0;
export const qualityAuthoringGenerationExperimentItemId = "generation-quality-restatement-delta-survey";

export const qualityAuthoringGenerationExperimentTask = {
  id: qualityAuthoringGenerationExperimentItemId,
  questionType: "restatement" as const,
  direction: "none" as const,
  situationBrief: [
    "Actors: delta survey office; two sounding crews; ferry company.",
    "Events: survey office postponed issuance of the channel chart; both sounding crews delivered depth readings; ferry company kept its published timetable while the chart was still postponed.",
    "Required facts: chart issuance waited until both depth readings had been delivered; the timetable remained in force during the postponement and was not the event that ended it; the survey office did not treat the continuing timetable as proof that the recorded depths were current.",
    "Relations to host: until-boundary on both readings, not on the timetable; concession (timetable does not cause or justify postponement); quantity both readings, not one.",
    "Topic: inland navigation and hydrographic survey, academic register.",
    "Question type: restatement. Language: English. Difficulty: hard YDS/YÖKDİL closest-meaning.",
  ].join("\n"),
};

export function qualityAuthoringGenerationExperimentCeiling(prices: PriceCatalog) {
  const base = qualityAuthoringCodesignCeiling(prices);
  return {
    ...base,
    capUsd: qualityAuthoringGenerationExperimentSpendCapUsd,
    retry: qualityAuthoringGenerationExperimentRetry,
    maxCalls: qualityAuthoringGenerationExperimentMaxCalls,
    judgeCalls: qualityAuthoringGenerationExperimentJudgeCalls,
    fitsCap: base.oneCallUsd != null && base.oneCallUsd <= qualityAuthoringGenerationExperimentSpendCapUsd,
  };
}

export function refuseQualityAuthoringGenerationExperiment(reason: string, code: string) {
  return {
    ...refuseQualityAuthoringLivePilot(reason, code),
    authorization: qualityAuthoringGenerationExperimentAuthorization,
  };
}

export function generationExperimentBriefAvoidsFrozenPhrases() {
  const text = qualityAuthoringGenerationExperimentTask.situationBrief.toLocaleLowerCase("tr-TR");
  const hits = frozenPhrases.filter((phrase) => text.includes(phrase));
  const reusedSeeds = [
    "delayed the dredging contract",
    "ice-core laboratory",
    "north-shaft",
    "ventilation fans",
    "arbitration board",
  ].filter((phrase) => text.includes(phrase));
  return { ok: hits.length === 0 && reusedSeeds.length === 0, hits, reusedSeeds };
}

export const restatementHardBenchmark5Authorization = "restatement-hard-benchmark-5-v1";
export const restatementHardBenchmark5OutputDir = ".data/analysis/_factory/cognitive-trap/restatement-hard-benchmark-5-v1";
export const restatementHardBenchmark5LiveAuthorized = true as const;
export const restatementHardBenchmark5SpendCapUsd = 0.02;
export const restatementHardBenchmark5Retry = 0;
export const restatementHardBenchmark5MaxCalls = 5;
export const restatementHardBenchmark5JudgeCalls = 0;

export const restatementHardBenchmark5Tasks = [
  {
    id: "rhb-archive-cataloguers",
    questionType: "restatement" as const,
    direction: "none" as const,
    situationBrief: [
      "Actors: municipal archive; two cataloguers; lending gallery.",
      "Events: archive postponed the loan of the parish registers; both cataloguers finished condition reports; lending gallery kept its opening hours posted while the loan was still postponed.",
      "Required facts: the loan waited until both condition reports had been finished; posted hours remained in force during the postponement and were not its endpoint; the archive did not treat the continuing hours as proof that the bindings were stable.",
      "Relations to host: until-boundary on both reports, not on posted hours; concession (hours do not cause or justify postponement); quantity both reports, not one.",
      "Topic: collections care and municipal records, academic register.",
      "Question type: restatement. Language: English. Difficulty: hard YDS/YÖKDİL closest-meaning.",
    ].join("\n"),
  },
  {
    id: "rhb-seed-convoy",
    questionType: "restatement" as const,
    direction: "none" as const,
    situationBrief: [
      "Actors: national seed bank; two highland stations; mountain pass.",
      "Events: none of the winter seed reached the highlands; the convoy did not clear the pass before the frost.",
      "Required facts: had the convoy cleared the pass before the frost, only the two highland stations would have received the winter seed; the sentence is counterfactual, not a report that the seed arrived; exclusivity is only those two stations, not all stations.",
      "Relations to host: counterfactual dependence of delivery on an earlier clearing; temporal before the frost; quantity only two stations.",
      "Topic: agricultural logistics and gene-bank distribution, academic register.",
      "Question type: restatement. Language: English. Difficulty: hard YDS/YÖKDİL closest-meaning.",
    ].join("\n"),
  },
  {
    id: "rhb-port-wrecks",
    questionType: "restatement" as const,
    direction: "none" as const,
    situationBrief: [
      "Actors: port authority; salvage contractor; two wrecks in the fairway.",
      "Events: authority announced it would not lift the navigation ban until it had inspected both wrecks; salvage contractor argued that the fairway had already been cleared.",
      "Required facts: the ban continues unless and until both wrecks have been inspected; the contractor's claim is that clearance has already occurred, which the authority does not adopt; already vs not yet is the second clause, not a restatement of the until-ban.",
      "Relations to host: until-boundary on both inspections; polarity of the contractor's already-cleared claim; quantity both wrecks.",
      "Topic: maritime safety and harbour administration, academic register.",
      "Question type: restatement. Language: English. Difficulty: hard YDS/YÖKDİL closest-meaning.",
    ].join("\n"),
  },
  {
    id: "rhb-ethics-randomization",
    questionType: "restatement" as const,
    direction: "none" as const,
    situationBrief: [
      "Actors: medical ethics board; two trial sites; trial sponsor.",
      "Events: board would release the interim tables only if both trial sites had locked their randomization logs before the sponsor saw the draft.",
      "Required facts: release is conditional on both locks; the locks must precede the sponsor's seeing the draft; the condition is not reversed (seeing the draft does not trigger the locks); exclusivity only if both sites, not if either site.",
      "Relations to host: condition direction (locks before sponsor access, not the reverse); temporal before; quantity both sites.",
      "Topic: clinical-trial governance, academic register.",
      "Question type: restatement. Language: English. Difficulty: hard YDS/YÖKDİL closest-meaning.",
    ].join("\n"),
  },
  {
    id: "rhb-land-registry-housing",
    questionType: "restatement" as const,
    direction: "none" as const,
    situationBrief: [
      "Actors: district land registry; two boundary surveyors; housing trust.",
      "Events: registry withheld the title endorsement; both surveyors filed closure measurements; the trust continued to circulate its allocation list while the endorsement was still withheld.",
      "Required facts: endorsement waited until both closure measurements had been filed; the circulating list was not the event that ended withholding; the registry did not treat that list as proof that the parcel boundaries were settled.",
      "Relations to host: until-boundary on both measurements, not on the list; evidential refusal (list is not proof); quantity both measurements, not one.",
      "Topic: cadastral survey and housing administration, academic register.",
      "Question type: restatement. Language: English. Difficulty: hard YDS/YÖKDİL closest-meaning.",
    ].join("\n"),
  },
] as const;

export function restatementHardBenchmark5Ceiling(prices: PriceCatalog) {
  const row = prices[qualityAuthoringLivePilotWriter];
  const perCallUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling)
    : null;
  const fiveCallUsd = perCallUsd != null ? perCallUsd * restatementHardBenchmark5MaxCalls : null;
  return {
    writer: qualityAuthoringLivePilotWriter,
    perCallUsd,
    fiveCallUsd,
    capUsd: restatementHardBenchmark5SpendCapUsd,
    retry: restatementHardBenchmark5Retry,
    maxCalls: restatementHardBenchmark5MaxCalls,
    judgeCalls: restatementHardBenchmark5JudgeCalls,
    fitsCap: fiveCallUsd != null && fiveCallUsd <= restatementHardBenchmark5SpendCapUsd,
  };
}

export function restatementHardBenchmark5BriefsAvoidFrozen() {
  const reused = [
    "delayed the dredging contract",
    "ice-core laboratory",
    "north-shaft",
    "ventilation fans",
    "arbitration board",
    "channel chart",
    "sounding crews",
    "contested appendices",
  ];
  const hits = restatementHardBenchmark5Tasks.flatMap((task) => {
    const text = task.situationBrief.toLocaleLowerCase("tr-TR");
    return [...frozenPhrases.filter((phrase) => text.includes(phrase)), ...reused.filter((phrase) => text.includes(phrase))].map((phrase) => ({
      id: task.id,
      phrase,
    }));
  });
  return { ok: hits.length === 0, hits };
}

export function refuseRestatementHardBenchmark5(reason: string, code: string) {
  return {
    ...refuseQualityAuthoringLivePilot(reason, code),
    authorization: restatementHardBenchmark5Authorization,
  };
}
