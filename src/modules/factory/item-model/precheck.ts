import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import type { JudgeInput } from "../judge";
import { factoryVersions } from "../versions";
import { assembleItem } from "./assemble";
import type { BudgetLimits } from "./benchmark";
import { assessKey, assessOperationFit, assessReadingDiversity, meaningNotRun, type OperationFit, type ReadingDiversity } from "./core";
import type { DistractorCandidate, EditorialStatus, ImplementedItemType, ItemAssembly, ItemCore, ItemModelDefinition, ItemSource, ReadingQuestionFunction, SourceRecord, TranslationDirection, UsageRights } from "./contract";
import { pilotPassageWordBand } from "./contract";
import { deterministicReport, evaluateSemantics } from "./evaluate";
import { officialCorpusLoaded, refuseStudentBankWrite, screenExamSurface } from "./gold";
import { selectDistractors, type PoolSelection } from "./pool";
import { itemModel } from "./registry";
import { assessSource, passageLength, productionSourceFailures } from "./source";

/** Eleven-question profile. The 90-item ceilings stay where they are. */
export const precheckAuthorization = "item-model-precheck-v1";

/** Previous profile spent at most $1.80 across 36 calls. This profile keeps that per-call allowance. */
const usdPerCall = 1.8 / 36;

export const precheckCallGraph = {
  restatementItems: 3,
  restatementCallsEach: 4,
  translationItems: 4,
  translationCallsEach: 4,
  readingPassages: 1,
  readingSourceCalls: 1,
  readingQuestions: 4,
  readingCallsPerQuestion: 3,
} as const;

export const precheckMaxCalls =
  precheckCallGraph.restatementItems * precheckCallGraph.restatementCallsEach +
  precheckCallGraph.translationItems * precheckCallGraph.translationCallsEach +
  precheckCallGraph.readingSourceCalls +
  precheckCallGraph.readingQuestions * precheckCallGraph.readingCallsPerQuestion;

export const precheckCeilings = {
  restatement: precheckCallGraph.restatementItems,
  translation: { en_tr: 2, tr_en: 2 },
  reading: { passages: precheckCallGraph.readingPassages, questionsPerPassage: precheckCallGraph.readingQuestions },
  totalQuestions: 11,
  maxCalls: precheckMaxCalls,
  maxRegenerations: 0,
  usdPerCall,
  totalUsdCap: Math.round(precheckMaxCalls * usdPerCall * 100) / 100,
  publishToStudentBank: false,
  autoStart: false,
  passageWords: pilotPassageWordBand,
} as const;

export const typeSemanticFocus = {
  restatement: "meaning_equivalence",
  translation: "cross_lingual_preservation",
  reading_comprehension: "textual_evidence",
} as const;

export const stageStates = ["pass", "fail", "not_run"] as const;
export type StageState = (typeof stageStates)[number];

export type StageCall<T> = { called: false } | { called: true; value: T | null; error: string | null };

export type StageUsage = {
  stage: "source" | "core" | "distractors" | "judge";
  model: string;
  promptVersion: string;
  cached: boolean;
  inputTokens: number;
  outputTokens: number;
  requestHash: string | null;
  error: string | null;
  reasoningTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

export type ItemRunRecord = {
  version: typeof factoryVersions.itemExecution;
  id: string;
  itemModelId: string;
  promptVersion: string;
  validatorVersion: typeof factoryVersions.validator;
  judgeVersion: typeof factoryVersions.judge;
  generatorModel: string;
  judgeModel: string;
  stem: string | null;
  options: Record<OptionLabel, string> | null;
  direction: TranslationDirection | null;
  passageId: string | null;
  questionFunction: ReadingQuestionFunction | null;
  evidenceSpan: { id: string; quote: string } | null;
  propositionId: string | null;
  testedProposition: string | null;
  cognitiveOperation: string | null;
  /** Set-level reading result. Distinct ids are not cognitive proof. Surface word overlap is not the evidence. */
  setDiversity: ReadingDiversity;
  /** Deterministic meaning shifts. A clean result stays unverified and is never a pass. */
  meaningIntegrity: ReturnType<typeof meaningNotRun>;
  /** Whether the reading label matches a direct passage lookup. Not a semantic pass. */
  operationFit: OperationFit;
  /** A quote that occurs in the passage. This is not a semantic pass. */
  quoteMatch: "structural_only" | "fail" | "not_run";
  wordCount: number | null;
  lengthStanding: typeof pilotPassageWordBand.standing | "not_applicable";
  sourceFidelity: "not_run";
  usageRights: UsageRights | "not_applicable" | "missing";
  surfaceScreen: "clear" | "overlap" | "not_run";
  similarityIsNotLicense: true;
  readingSet: "complete" | "partial" | "stopped" | "not_reading";
  source: { status: StageState; failures: string[] };
  key: { status: StageState; failures: string[]; validity: "structural_only" | "not_run" };
  pool: { status: StageState; generated: DistractorCandidate[]; rejected: PoolSelection["rejected"]; selected: DistractorCandidate[] };
  structure: { status: StageState; failures: string[] };
  blind: { status: StageState; answer: OptionLabel | null; agrees: boolean | null };
  secondAnswer: { status: StageState; options: OptionLabel[] };
  decision: { status: StageState; verdict: "APPROVE" | "REVIEW" | "REJECT" | null; failure: string | null };
  /** Type-specific semantic proof is not this judge. An unrun control stays not_run. */
  typeSemantic: { status: "not_run"; focus: (typeof typeSemanticFocus)[ImplementedItemType]; reason: string };
  editorialStatus: EditorialStatus | "not_run";
  /** A completed gate is not a quality certificate. */
  qualityProven: false;
  editorApproved: false;
  publishState: "unpublished";
  /** The 11-question profile stays on the v3.4 pool. */
  distractorStrategy: "baseline_v34";
  calls: StageUsage[];
  providerCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  stop: "budget" | null;
  stopReason: string | null;
};

const notCalled = { called: false } as const;

function calledValue<T>(call: StageCall<T>): T | null {
  return call.called ? call.value : null;
}

function calledError<T>(call: StageCall<T>): string | null {
  return call.called ? call.error : null;
}

export type PrecheckSlot = {
  id: string;
  questionType: ImplementedItemType;
  correctOption: OptionLabel;
  direction: TranslationDirection | null;
  passageId: string | null;
  questionSlot: number | null;
};

export function precheckSlots(): PrecheckSlot[] {
  const slots: PrecheckSlot[] = [];
  for (let number = 1; number <= precheckCeilings.restatement; number += 1) {
    slots.push({ id: `restatement-${number}`, questionType: "restatement", correctOption: optionLabels[(number - 1) % optionLabels.length], direction: null, passageId: null, questionSlot: null });
  }
  for (const direction of ["en_tr", "tr_en"] as const) {
    for (let number = 1; number <= precheckCeilings.translation[direction]; number += 1) {
      slots.push({ id: `translation-${direction}-${number}`, questionType: "translation", correctOption: optionLabels[(number - 1) % optionLabels.length], direction, passageId: null, questionSlot: null });
    }
  }
  for (let number = 1; number <= precheckCeilings.reading.questionsPerPassage; number += 1) {
    slots.push({ id: `reading-1-q${number}`, questionType: "reading_comprehension", correctOption: optionLabels[(number - 1) % optionLabels.length], direction: null, passageId: "reading-1", questionSlot: number });
  }
  return slots;
}

/** Source plus key only. The 11-question and 90-item runs stay closed. */
export const smokeAuthorization = "item-model-core-smoke-v1";

/** One source and one key for each non-reading item, one shared reading source, and four reading keys. */
export const smokeCallGraph = {
  restatementItems: 1,
  translationItems: 2,
  callsPerItem: 2,
  readingSourceCalls: 1,
  readingQuestions: 4,
} as const;

export const smokeGraphCalls =
  smokeCallGraph.restatementItems * smokeCallGraph.callsPerItem +
  smokeCallGraph.translationItems * smokeCallGraph.callsPerItem +
  smokeCallGraph.readingSourceCalls +
  smokeCallGraph.readingQuestions;

/** The authorized ceiling is below the graph, so the eleventh call cannot run. */
export const smokeCeilings = {
  restatement: smokeCallGraph.restatementItems,
  translation: { en_tr: 1, tr_en: 1 },
  reading: { passages: 1, questionsPerPassage: smokeCallGraph.readingQuestions },
  totalQuestions: 7,
  graphCalls: smokeGraphCalls,
  maxCalls: 10,
  maxRegenerations: 0,
  totalUsdCap: 0.5,
  publishToStudentBank: false,
  distractors: false,
  judge: false,
} as const;

export function smokeSlots(): PrecheckSlot[] {
  const slots: PrecheckSlot[] = [
    { id: "restatement-1", questionType: "restatement", correctOption: "A", direction: null, passageId: null, questionSlot: null },
    { id: "translation-en_tr-1", questionType: "translation", correctOption: "B", direction: "en_tr", passageId: null, questionSlot: null },
    { id: "translation-tr_en-1", questionType: "translation", correctOption: "C", direction: "tr_en", passageId: null, questionSlot: null },
  ];
  for (let number = 1; number <= smokeCeilings.reading.questionsPerPassage; number += 1) {
    slots.push({ id: `reading-1-q${number}`, questionType: "reading_comprehension", correctOption: optionLabels[(number - 1) % optionLabels.length], direction: null, passageId: "reading-1", questionSlot: number });
  }
  return slots;
}

/** A looser env budget cannot raise this ceiling. A stricter env budget is kept. */
export function smokeLimits(env: BudgetLimits = {}): { maxCalls: number; maxRegenerations: 0; maxCostUsd: number } {
  const calls = env.maxCalls === undefined ? smokeCeilings.maxCalls : Math.min(env.maxCalls, smokeCeilings.maxCalls);
  const cost = env.maxCostUsd === undefined ? smokeCeilings.totalUsdCap : Math.min(env.maxCostUsd, smokeCeilings.totalUsdCap);
  return { maxCalls: calls, maxRegenerations: 0, maxCostUsd: cost };
}

export function assertSmokeStart(input: { authorization: string; outDir?: string; overrides?: unknown }): void {
  if (input.authorization !== smokeAuthorization) throw new Error("core smoke authorization required");
  if (input.overrides !== undefined) throw new Error("core smoke refuses prompt, model, or threshold overrides");
  if (input.outDir) refuseStudentBankWrite(input.outDir);
}

/** A looser env budget cannot raise this profile. A stricter env budget is kept. Regeneration is forced to zero. */
export function precheckLimits(env: BudgetLimits = {}): { maxCalls: number; maxRegenerations: 0; maxCostUsd: number } {
  const calls = env.maxCalls === undefined ? precheckCeilings.maxCalls : Math.min(env.maxCalls, precheckCeilings.maxCalls);
  const cost = env.maxCostUsd === undefined ? precheckCeilings.totalUsdCap : Math.min(env.maxCostUsd, precheckCeilings.totalUsdCap);
  return { maxCalls: calls, maxRegenerations: 0, maxCostUsd: cost };
}

export function productionPath(questionType: ImplementedItemType) {
  const model = itemModel(questionType);
  return {
    questionType,
    itemModelId: model.itemModelId,
    stages: ["source", "core", "distractors", "judge"] as const,
    promptVersion: model.promptVersion,
    judgePromptVersion: factoryVersions.itemJudgePrompt,
    schemaVersion: factoryVersions.itemSchema,
    validatorVersion: factoryVersions.validator,
    stopsWhen: ["source_insufficient", "key_invalid", "pool_insufficient", "structure_fail"] as const,
    typeSemantic: { status: "not_run" as const, focus: typeSemanticFocus[questionType] },
    calls: questionType === "reading_comprehension" ? (["source-shared", "core", "distractors", "judge"] as const) : (["source", "core", "distractors", "judge"] as const),
  };
}

function stamp(model: ItemModelDefinition, generatorModel: string, core: ItemCore): { core: ItemCore; failures: string[] } {
  if (core.promptVersion && core.promptVersion !== model.promptVersion) return { core, failures: ["prompt_version_mismatch"] };
  return { core: { ...core, modelVersion: core.modelVersion || generatorModel, promptVersion: model.promptVersion }, failures: [] };
}

function unrun(questionType: ImplementedItemType): ItemRunRecord["typeSemantic"] {
  return { status: "not_run", focus: typeSemanticFocus[questionType], reason: "No type-specific semantic instrument has run. The shared judge is not that proof." };
}

/** Ledger for one candidate. Stages that were not called stay not_run and are never marked pass. */
export function buildRunRecord(input: {
  id: string;
  model: ItemModelDefinition;
  generatorModel: string;
  judgeModel: string;
  correctOption: OptionLabel;
  officialTexts: string[];
  source: StageCall<ItemSource>;
  core: StageCall<ItemCore>;
  distractors: StageCall<DistractorCandidate[]>;
  judge: StageCall<JudgeInput>;
  calls: StageUsage[];
  costUsd: number | null;
  passageId?: string | null;
  expectedDirection?: TranslationDirection | null;
  sources?: SourceRecord[];
  stop?: "budget" | null;
  stopReason?: string | null;
}): ItemRunRecord {
  const model = input.model;
  const questionType = model.questionType as ImplementedItemType;
  const sourceValue = calledValue(input.source);
  const sourceError = calledError(input.source);
  const sourceAssessment = sourceValue ? assessSource(model, sourceValue, { sources: input.sources, expectedDirection: input.expectedDirection ?? undefined }) : null;
  const sourceFailures = input.source.called ? [...(sourceError ? [sourceError] : []), ...(sourceValue ? [] : ["source_missing"]), ...(sourceAssessment?.failures ?? [])] : [];
  const sourceStatus: StageState = !input.source.called ? "not_run" : sourceFailures.length ? "fail" : "pass";

  const coreValue = calledValue(input.core);
  const coreError = calledError(input.core);
  const stamped = coreValue ? stamp(model, input.generatorModel, coreValue) : null;
  const keyAssessment = stamped && stamped.failures.length === 0 && sourceValue ? assessKey(model, sourceValue, stamped.core) : null;
  const keyFailures = input.core.called ? [...(coreError ? [coreError] : []), ...(coreValue ? [] : ["core_missing"]), ...(stamped?.failures ?? []), ...(keyAssessment?.failures ?? [])] : [];
  const keyStatus: StageState = !input.core.called ? "not_run" : keyFailures.length ? "fail" : "pass";

  const distractorValue = calledValue(input.distractors);
  const distractorError = calledError(input.distractors);
  const pool = keyStatus === "pass" && distractorValue && stamped
    ? selectDistractors({ candidates: distractorValue, keyText: stamped.core.correctAnswer, allowedMechanisms: model.errorMechanisms })
    : null;
  const poolFailures =
    input.distractors.called && keyStatus === "pass"
      ? [...(distractorError ? [distractorError] : []), ...(distractorValue ? [] : ["pool_missing"]), ...(pool && pool.status !== "selected" ? ["distractor_pool_insufficient"] : [])]
      : [];
  const poolStatus: StageState = !input.distractors.called || keyStatus !== "pass" ? "not_run" : poolFailures.length ? "fail" : "pass";

  const optionsReady = poolStatus === "pass" && pool && stamped && sourceValue;
  const structure = optionsReady
    ? deterministicReport({
        source: sourceValue!,
        core: stamped!.core,
        options: place(input.correctOption, stamped!.core.correctAnswer, pool!.selected),
        correctOption: input.correctOption,
        officialTexts: input.officialTexts,
      })
    : null;
  const structureStatus: StageState = !structure ? "not_run" : structure.status === "pass" ? "pass" : "fail";

  const judgeValue = calledValue(input.judge);
  const judgeError = calledError(input.judge);
  const judgeCalled = input.judge.called && structureStatus === "pass";
  const unsure = judgeValue ? judgeValue.blindConfidence < 0.6 || judgeValue.blindUncertain === true : false;
  const semantic = judgeCalled && judgeValue && !judgeError
    ? evaluateSemantics({
        correctOption: input.correctOption,
        targetBand: model.targetDifficulty,
        validation: structure!,
        generatorModel: input.generatorModel,
        judgeModel: input.judgeModel,
        judge: judgeValue,
        selfScoreClaim: stamped?.core.correctnessRationale ?? null,
      })
    : null;
  const blindStatus: StageState = !judgeCalled ? "not_run" : judgeError || !semantic?.judge ? "fail" : semantic.judge.blindAgrees && !unsure ? "pass" : "fail";
  const rivals = semantic?.judge ? semantic.judge.failures.filter((failure) => failure.startsWith("second_defensible")).length > 0 : false;
  const rivalLetters = judgeCalled && judgeValue
    ? [...new Set([...(judgeValue.report.alternativeDefensibleOptions ?? []), ...(judgeValue.blindAlternative ? [judgeValue.blindAlternative] : [])])].filter((label) => label !== input.correctOption)
    : [];
  const secondStatus: StageState = !judgeCalled ? "not_run" : rivalLetters.length || rivals ? "fail" : "pass";

  const gateFailure = sourceStatus === "fail" ? sourceFailures[0] : keyStatus === "fail" ? keyFailures[0] : poolStatus === "fail" ? poolFailures[0] : structureStatus === "fail" ? (structure?.issues[0]?.code ?? "structure") : null;
  const doubtful = semantic?.judge?.verdict === "REVIEW" || secondStatus === "fail";
  let decisionStatus: StageState = semantic?.judge ? (semantic.judge.verdict !== "APPROVE" || semantic.failure || doubtful ? "fail" : "pass") : gateFailure ? "fail" : "not_run";
  let decisionFailure = secondStatus === "fail" ? "second_answer" : semantic?.judge?.verdict === "REVIEW" ? "equivalence_unresolved" : (semantic?.failure ?? gateFailure);
  const operationFit: OperationFit = sourceValue?.kind === "reading" && stamped?.core
    ? assessOperationFit(sourceValue.passage, stamped.core.correctAnswer, stamped.core.reading?.questionFunction ?? null)
    : { status: "not_run", labeled: null, observed: "unverified", labelAgrees: null, hardCandidate: "unverified" };
  if (decisionStatus === "pass" && operationFit.labelAgrees === false) {
    decisionStatus = "fail";
    decisionFailure = "function_mismatch";
  } else if (decisionStatus === "pass" && operationFit.hardCandidate === false) {
    decisionStatus = "fail";
    decisionFailure = "direct_lookup";
  }
  const screen = sourceValue && stamped?.core
    ? screenExamSurface({ instructions: stamped.core.stem, content: [stamped.core.correctAnswer, sourceValue.kind === "reading" ? sourceValue.passage : ""].join("\n") }, input.officialTexts)
    : { status: "not_run" as const, sharedRun: null, similarityIsNotLicense: true as const };
  const length = sourceValue?.kind === "reading" ? passageLength(sourceValue.passage) : null;
  const quote = sourceValue?.kind === "reading" && stamped?.core.reading ? (sourceValue.passage.includes(stamped.core.reading.evidenceSpan.quote) ? "structural_only" : "fail") : "not_run";
  const rights = sourceValue?.kind === "reading" ? (input.sources?.find((record) => record.sourceId === sourceValue.sourceId)?.usageRights ?? "missing") : "not_applicable";

  const assembly =
    sourceStatus === "fail" || (input.core.called && (keyStatus === "fail" || input.distractors.called))
      ? assemblyFor({ ...input, sources: input.sources }, stamped?.core ?? null, keyStatus === "pass" ? distractorValue : null, judgeCalled ? judgeValue : null)
      : null;

  const providerCalls = input.calls.filter((call) => !call.cached && call.requestHash).length;
  return {
    version: factoryVersions.itemExecution,
    id: input.id,
    itemModelId: model.itemModelId,
    promptVersion: model.promptVersion,
    validatorVersion: factoryVersions.validator,
    judgeVersion: factoryVersions.judge,
    generatorModel: input.generatorModel,
    judgeModel: input.judgeModel,
    stem: assembly?.stem ?? stamped?.core.stem ?? null,
    options: assembly?.options ?? null,
    direction: translationDirection(sourceValue),
    passageId: input.passageId ?? (sourceValue?.kind === "reading" ? sourceValue.passageId : null),
    questionFunction: stamped?.core.reading?.questionFunction ?? null,
    evidenceSpan: stamped?.core.reading?.evidenceSpan ?? null,
    propositionId: stamped?.core.reading?.propositionId ?? null,
    testedProposition: stamped?.core.reading?.testedProposition ?? null,
    cognitiveOperation: stamped?.core.reading?.cognitiveOperation ?? null,
    setDiversity: { status: "not_run", failures: [], surfaceOverlapIsNotDiversityProof: true, propositionIdentityIsNotCognitiveProof: true },
    meaningIntegrity: keyAssessment?.meaning ?? meaningNotRun(),
    operationFit,
    quoteMatch: quote,
    wordCount: length?.wordCount ?? null,
    lengthStanding: length ? pilotPassageWordBand.standing : "not_applicable",
    sourceFidelity: "not_run",
    usageRights: rights,
    surfaceScreen: officialCorpusLoaded(input.officialTexts) ? screen.status : "not_run",
    similarityIsNotLicense: true,
    readingSet: questionType === "reading_comprehension" ? "partial" : "not_reading",
    source: { status: sourceStatus, failures: sourceFailures },
    key: { status: keyStatus, failures: keyFailures, validity: keyStatus === "not_run" ? "not_run" : "structural_only" },
    pool: {
      status: poolStatus,
      generated: input.distractors.called && keyStatus === "pass" ? (distractorValue ?? []) : [],
      rejected: pool?.rejected ?? [],
      selected: pool?.status === "selected" ? pool.selected : [],
    },
    structure: { status: structureStatus, failures: structure?.issues.map((issue) => issue.code) ?? [] },
    blind: { status: blindStatus, answer: semantic?.judge?.blindAnswer ?? null, agrees: semantic?.judge ? semantic.judge.blindAgrees : null },
    secondAnswer: { status: secondStatus, options: rivalLetters },
    decision: { status: decisionStatus, verdict: semantic?.judge?.verdict ?? null, failure: decisionFailure },
    typeSemantic: unrun(questionType),
    editorialStatus: assembly?.status ?? "not_run",
    qualityProven: false,
    editorApproved: false,
    publishState: "unpublished",
    distractorStrategy: "baseline_v34",
    calls: input.calls,
    providerCalls,
    inputTokens: input.calls.reduce((sum, call) => sum + call.inputTokens, 0),
    outputTokens: input.calls.reduce((sum, call) => sum + call.outputTokens, 0),
    costUsd: input.costUsd,
    stop: input.stop ?? null,
    stopReason: input.stopReason ?? null,
  };
}

function place(correct: OptionLabel, answer: string, distractors: DistractorCandidate[]): Record<OptionLabel, string> {
  const options = {} as Record<OptionLabel, string>;
  options[correct] = answer;
  optionLabels.filter((label) => label !== correct).forEach((label, index) => {
    options[label] = distractors[index]?.candidateText ?? "";
  });
  return options;
}

function translationDirection(source: ItemSource | null): TranslationDirection | null {
  if (source?.kind !== "translation") return null;
  const value = `${source.sourceLanguage}_${source.targetLanguage}`;
  return value === "en_tr" || value === "tr_en" ? value : null;
}

export function finalizeReadingSet(records: ItemRunRecord[]): ItemRunRecord[] {
  const ids = [...new Set(records.map((record) => record.passageId).filter((id): id is string => Boolean(id)))];
  const statusFor = new Map<string, ItemRunRecord["readingSet"]>();
  const diversityFor = new Map<string, ReadingDiversity>();
  for (const id of ids) {
    const group = records.filter((record) => record.passageId === id);
    const stopped = group.every((record) => record.source.status !== "pass");
    const diversity: ReadingDiversity = stopped
      ? { status: "not_run", failures: [], surfaceOverlapIsNotDiversityProof: true, propositionIdentityIsNotCognitiveProof: true }
      : assessReadingDiversity(group.map((record) => ({ propositionId: record.propositionId, testedProposition: record.testedProposition, questionFunction: record.questionFunction })));
    diversityFor.set(id, diversity);
    statusFor.set(id, stopped ? "stopped" : "partial");
  }
  return records.map((record) => {
    if (!record.passageId || !statusFor.has(record.passageId)) return record;
    const diversity = diversityFor.get(record.passageId)!;
    const decision = diversity.status === "fail" && record.decision.status === "pass" ? { status: "fail" as const, verdict: record.decision.verdict, failure: "repeated_proposition" } : record.decision;
    return { ...record, readingSet: statusFor.get(record.passageId)!, setDiversity: diversity, decision };
  });
}

function assemblyFor(input: { id: string; model: ItemModelDefinition; generatorModel: string; judgeModel: string; correctOption: OptionLabel; officialTexts: string[]; sources?: SourceRecord[]; source: StageCall<ItemSource>; judge: StageCall<JudgeInput> }, core: ItemCore | null, distractors: DistractorCandidate[] | null, judge: JudgeInput | null): ItemAssembly | null {
  const sourceValue = calledValue(input.source);
  if (!sourceValue) return null;
  return assembleItem({
    id: input.id,
    modelId: input.model.itemModelId,
    source: sourceValue,
    core,
    distractors: distractors ?? [],
    correctOption: input.correctOption,
    generatorModel: input.generatorModel,
    judgeModel: judge ? input.judgeModel : null,
    judge,
    officialTexts: input.officialTexts,
    sources: input.sources,
    selfScoreClaim: core?.correctnessRationale ?? null,
    attempt: 1,
  });
}

export function assertPrecheckStart(input: { authorization: string; outDir?: string; overrides?: unknown; distractorStrategy?: "baseline_v34" | "cognitive_trap_first" }): void {
  if (input.authorization !== precheckAuthorization) throw new Error("precheck authorization required");
  if (input.overrides !== undefined) throw new Error("precheck refuses prompt, model, or threshold overrides");
  if (input.distractorStrategy !== undefined && input.distractorStrategy !== "baseline_v34") throw new Error("the 11-question precheck stays on baseline_v34");
  if (input.outDir) refuseStudentBankWrite(input.outDir);
}

/** Missing corpus or an empty granted-source list stops the run before any provider call. */
export function assertPrecheckInputs(input: { officialTexts?: readonly string[]; sources?: SourceRecord[] }): "corpus" | "sources" | null {
  if (!officialCorpusLoaded(input.officialTexts)) return "corpus";
  const granted = input.sources?.some((record) => record.role === "production_notes" && productionSourceFailures([record], record.sourceId).length === 0);
  if (!granted) return "sources";
  return null;
}

export { notCalled };
