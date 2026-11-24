import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  architectureV2WriterTokenCeiling,
  callCeilingUsd,
  type CatalogPrice,
  type PriceCatalog,
} from "./architecture-v2";
import {
  buildV6PilotTask,
  factoryV6LivePilotOutputDir,
  factoryV6LivePilotSourceIds,
  factoryV6LivePilotWriter,
  validateAllV6PilotPreFlight,
  type V6PilotTask,
} from "./factory-v6-live-pilot";
import {
  auditChallengeOption,
  challengePricesFromCatalog,
  conservativePrice,
  factoryV6WriterChallengeOutputDir,
  frozenHashesUnchanged,
  parseOpenRouterCatalog,
  type CatalogModelRow,
  type ChallengeCandidate,
  type OptionAudit,
} from "./factory-v6-writer-challenge";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";
import { scoringSourceAliases } from "./root-cause-audit";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { refereesSecondAnswerRisk } from "./root-cause-fix";
import { classifyOption } from "./whole-set";
import { allowBakeoffCall, writerBakeoffBlindSeed } from "./writer-bakeoff";
import { auditFrozenPlans, evaluateWriterOption, type PlanFeasibility } from "./writer-bakeoff-compare";
import { writerReasoningRootCauseOutputDir } from "./writer-reasoning-root-cause";
import { incompleteOption } from "./misreading-mechanisms";

export const factoryV6WriterComparisonAuthorization = "v6-writer-comparison-completion-v1";
export const factoryV6WriterComparisonOutputDir = ".data/analysis/_factory/cognitive-trap/factory-v6-writer-comparison-v1";
export const factoryV6WriterComparisonLiveAuthorized = true as const;
export const factoryV6WriterComparisonSpendCapUsd = 0.03;
export const factoryV6WriterComparisonMaxCalls = 4;
export const factoryV6WriterComparisonRetry = 0;
export const factoryV6WriterComparisonOutputTokens = architectureV2WriterTokenCeiling.output;

export const comparisonWriters = [
  factoryV6LivePilotWriter,
  "openrouter:tencent/hy4",
  "openrouter:deepseek/deepseek-v4.1-flash-1017",
] as const;

export const comparisonEffortNoneWriters = [
  "openrouter:tencent/hy4",
  "openrouter:deepseek/deepseek-v4.1-flash-1017",
] as const;

export const comparisonSourceIds = factoryV6LivePilotSourceIds;

export const comparisonLiveJobs = [
  { writer: "openrouter:tencent/hy4", sourceId: scoringSourceAliases.embargo },
  { writer: "openrouter:deepseek/deepseek-v4.1-flash-1017", sourceId: scoringSourceAliases.embargo },
  { writer: "openrouter:tencent/hy4", sourceId: scoringSourceAliases.board },
  { writer: "openrouter:deepseek/deepseek-v4.1-flash-1017", sourceId: scoringSourceAliases.board },
] as const;

const fallbackPrices: PriceCatalog = {
  "openrouter:tencent/hy4": { in: 0.417, out: 1.2505, cacheRead: 0.021 },
  "openrouter:deepseek/deepseek-v4.1-flash-1017": { in: 0.3, out: 1.2, cacheRead: 0.006 },
};

export const highReasoningChallengeArchive = {
  condition: "exclude_true_default_high_reasoning",
  outputDir: factoryV6WriterChallengeOutputDir,
  mergedIntoNoneComparison: false as const,
  note: "factory-v6-writer-challenge-v1 used exclude=true and default high reasoning. Those LENGTH cells stay in that directory and are not mixed with effort:none faculty/embargo/board cells.",
};

export type ComparisonCell = {
  writer: string;
  sourceId: string;
  reused: boolean;
  origin: "haiku-v6-pilot" | "reasoning-root-cause-effort-none" | "comparison-live-effort-none";
  reasoning: { exclude: true } | { effort: "none" };
  providerCallOk: boolean;
  jsonHonored: boolean;
  finishReason?: string | null;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number; reasoningTokens: number | null };
  visibleOutputTokens: number;
  costUsd: number | null;
  latencyMs: number | null;
  candidates: ChallengeCandidate[];
  error?: string;
};

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function visibleTokens(usage: { outputTokens: number; reasoningTokens: number | null }): number {
  if (usage.reasoningTokens == null) return usage.outputTokens;
  return Math.max(0, usage.outputTokens - usage.reasoningTokens);
}

export function loadHaikuV6Cells(): ComparisonCell[] {
  const calls = readJson<
    {
      sourceId: string;
      providerCallOk: boolean;
      jsonHonor?: { honored?: boolean };
      usage: ComparisonCell["usage"];
      costUsd: number | null;
      latencyMs: number;
      candidates: ChallengeCandidate[];
    }[]
  >(path.join(factoryV6LivePilotOutputDir, "calls.json"));
  return comparisonSourceIds.map((sourceId) => {
    const row = calls.find((item) => item.sourceId === sourceId);
    if (!row?.candidates?.length) throw new Error(`haiku v6 cell missing for ${sourceId}`);
    return {
      writer: factoryV6LivePilotWriter,
      sourceId,
      reused: true,
      origin: "haiku-v6-pilot",
      reasoning: { exclude: true },
      providerCallOk: row.providerCallOk,
      jsonHonored: row.jsonHonor?.honored === true,
      usage: row.usage,
      visibleOutputTokens: visibleTokens(row.usage),
      costUsd: row.costUsd,
      latencyMs: row.latencyMs,
      candidates: row.candidates,
    };
  });
}

export function loadFacultyEffortNoneCells(): ComparisonCell[] {
  const summary = readJson<{
    executed?: boolean;
    rows?: {
      writer: string;
      providerCallOk: boolean;
      finishReason?: string | null;
      reasoningTokens: number | null;
      outputTokens: number;
      jsonSchemaHonor?: { honored?: boolean };
      costUsd: number | null;
      latencyMs: number;
      candidates: ChallengeCandidate[];
      usage?: ComparisonCell["usage"];
    }[];
  }>(path.join(writerReasoningRootCauseOutputDir, "summary.json"));
  if (!summary.executed) throw new Error("reasoning root-cause faculty cells are not executed");
  return comparisonEffortNoneWriters.map((writer) => {
    const row = summary.rows?.find((item) => item.writer === writer);
    if (!row?.candidates?.length) throw new Error(`effort-none faculty cell missing for ${writer}`);
    const usage = row.usage ?? {
      inputTokens: 0,
      outputTokens: row.outputTokens,
      totalTokens: row.outputTokens,
      reasoningTokens: row.reasoningTokens,
    };
    return {
      writer,
      sourceId: scoringSourceAliases.faculty,
      reused: true,
      origin: "reasoning-root-cause-effort-none",
      reasoning: { effort: "none" },
      providerCallOk: row.providerCallOk,
      jsonHonored: row.jsonSchemaHonor?.honored === true,
      finishReason: row.finishReason,
      usage,
      visibleOutputTokens: visibleTokens(usage),
      costUsd: row.costUsd,
      latencyMs: row.latencyMs,
      candidates: row.candidates,
    };
  });
}

export function reusedComparisonCells(): ComparisonCell[] {
  return [...loadHaikuV6Cells(), ...loadFacultyEffortNoneCells()];
}

export function missingComparisonJobs() {
  const have = new Set(reusedComparisonCells().map((cell) => `${cell.writer}::${cell.sourceId}`));
  return comparisonLiveJobs.filter((job) => !have.has(`${job.writer}::${job.sourceId}`));
}

export function conservativeComparisonPrice(setting: string, live: CatalogModelRow | undefined, local: CatalogPrice | undefined): CatalogPrice {
  const fallback = fallbackPrices[setting];
  if (live) {
    const priced = conservativePrice(live, local ?? fallback);
    if (priced) {
      return {
        in: Math.max(priced.in, fallback?.in ?? 0),
        out: Math.max(priced.out, fallback?.out ?? 0),
        ...(priced.cacheRead != null || fallback?.cacheRead != null
          ? { cacheRead: Math.max(priced.cacheRead ?? 0, fallback?.cacheRead ?? 0) }
          : {}),
      };
    }
  }
  return local ?? fallback ?? { in: 0.3, out: 1.2 };
}

export function comparisonCeilingUsd(input: { catalog: CatalogModelRow[]; localPrices: PriceCatalog }): {
  perCall: { writer: string; sourceId: string; perCallUsd: number }[];
  fourCallUsd: number;
  fitsCap: boolean;
} {
  const perCall = comparisonLiveJobs.map((job) => {
    const id = job.writer.slice("openrouter:".length);
    const live = input.catalog.find((row) => row.id === id);
    const price = conservativeComparisonPrice(job.writer, live, input.localPrices[job.writer]);
    return {
      writer: job.writer,
      sourceId: job.sourceId,
      perCallUsd: callCeilingUsd({ in: price.in, out: price.out, cacheWrite: price.cacheWrite ?? 0 }, architectureV2WriterTokenCeiling),
    };
  });
  const fourCallUsd = perCall.reduce((sum, row) => sum + row.perCallUsd, 0);
  return { perCall, fourCallUsd, fitsCap: fourCallUsd <= factoryV6WriterComparisonSpendCapUsd };
}

export function comparisonProtectedDirs(): string[] {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter(
    (dir) => path.resolve(dir) !== path.resolve(factoryV6WriterComparisonOutputDir),
  );
}

export function refuseFactoryV6WriterComparison(reason: string, code: string) {
  return {
    started: false,
    executed: false,
    providerCalls: 0,
    reason,
    code,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
  };
}

function planFor(task: V6PilotTask, candidate: ChallengeCandidate, index: number) {
  return task.plans.find((plan) => plan.planId === candidate.planId) ?? task.plans[index]!;
}

function feasibilityFor(sourceId: string, planId: string): PlanFeasibility {
  return auditFrozenPlans().find((row) => row.sourceId === sourceId && row.planId === planId)?.feasibility ?? "strained";
}

export type OptionComparison = OptionAudit & {
  planFeasibility: PlanFeasibility;
  defectKind: "none" | "plan" | "writer";
  singleDominantMisreading: OptionAudit["targetedChange"];
  othersPreserved: OptionAudit["othersPreserved"];
  wrongAnswerDistinct: OptionAudit["keyEquivalent"];
  naturalAcademic: OptionAudit["naturalAcademic"];
  extraMeaningChange: OptionAudit["extraClaim"];
  duplicateTrap: "yes" | "no" | "unverified";
  mutationStatus: "applied" | "not_applied" | "key_equivalent_risk" | "unverified";
  highOverlapUnverified: boolean;
  writerClaimIsNotProof: true;
  automaticFlagIsNotHumanApproval: true;
};

export function compareOption(input: { cell: ComparisonCell; task: V6PilotTask; candidate: ChallengeCandidate; index: number }): OptionComparison {
  const plan = planFor(input.task, input.candidate, input.index);
  const planFeasibility = feasibilityFor(input.task.id, plan.planId);
  const audit = auditChallengeOption({
    writer: input.cell.writer,
    task: input.task,
    plan,
    candidate: input.candidate,
  });
  const evalRow = evaluateWriterOption({
    source: input.task.source,
    key: input.task.key,
    targetLanguage: input.task.targetLanguage,
    plan,
    planFeasibility,
    candidate: input.candidate,
  });
  const classified = classifyOption(input.task.source, input.task.key, input.candidate.candidateText);
  const sameText = input.cell.candidates.filter((row) => row.candidateText.trim() === input.candidate.candidateText.trim()).length > 1;
  const samePlan = input.cell.candidates.filter((row) => row.planId === input.candidate.planId).length > 1;
  const sameIndependence =
    input.cell.candidates.filter((row, index) => planFor(input.task, row, index).independenceKey === plan.independenceKey).length > 1;
  const duplicateTrap: OptionComparison["duplicateTrap"] = sameText || samePlan || sameIndependence ? "yes" : "unverified";
  const writerFail =
    audit.targetedChange === "fail" ||
    evalRow.writerExecutionQuality.coverageRetention === "fail" ||
    evalRow.writerExecutionQuality.wrongAnswerQuality === "fail" ||
    classified.relation === "confirmed_equivalent";
  const defectKind: OptionComparison["defectKind"] =
    planFeasibility === "artificial" ? "plan" : writerFail && planFeasibility === "natural" ? "writer" : planFeasibility === "strained" && writerFail ? "writer" : "none";
  const highOverlapUnverified = refereesSecondAnswerRisk(input.task.source, input.task.key, input.candidate.candidateText) && classified.relation !== "confirmed_equivalent";
  const mutationStatus: OptionComparison["mutationStatus"] =
    classified.relation === "confirmed_equivalent" || audit.keyEquivalent === "yes"
      ? "key_equivalent_risk"
      : audit.targetedChange === "shown"
        ? "applied"
        : audit.targetedChange === "fail"
          ? "not_applied"
          : "unverified";
  return {
    ...audit,
    planFeasibility,
    defectKind,
    singleDominantMisreading: audit.targetedChange,
    othersPreserved: audit.othersPreserved,
    wrongAnswerDistinct: audit.keyEquivalent,
    naturalAcademic: audit.naturalAcademic,
    extraMeaningChange: audit.extraClaim,
    duplicateTrap,
    mutationStatus,
    highOverlapUnverified,
    writerClaimIsNotProof: true,
    automaticFlagIsNotHumanApproval: true,
  };
}

export function modelScorecard(input: {
  writer: string;
  cells: ComparisonCell[];
  options: OptionComparison[];
}) {
  const cells = input.cells.filter((cell) => cell.writer === input.writer);
  const options = input.options.filter((row) => row.writer === input.writer);
  const complete = cells.filter((cell) => cell.providerCallOk && cell.jsonHonored && cell.candidates.length === 4);
  const secondConfirmed = options.filter((row) => row.wrongAnswerDistinct === "yes" || row.keyEquivalent === "yes");
  const secondUnverifiedOverlap = options.filter((row) => row.highOverlapUnverified);
  const mutationNotApplied = options.filter((row) => row.mutationStatus === "not_applied");
  const coverageFail = options.filter((row) => row.othersPreserved === "fail");
  const naturalFail = options.filter((row) => row.naturalAcademic === "fail" || incompleteOption(row.candidateText));
  const duplicate = options.filter((row) => row.duplicateTrap === "yes");
  const reasoningTokens = cells.reduce((sum, cell) => sum + (cell.usage.reasoningTokens ?? 0), 0);
  const visibleOutputTokens = cells.reduce((sum, cell) => sum + cell.visibleOutputTokens, 0);
  const actualUsd = cells.reduce((sum, cell) => sum + (cell.costUsd ?? 0), 0);
  return {
    writer: input.writer,
    reasoningCondition: input.writer === factoryV6LivePilotWriter ? ("existing_exclude_true" as const) : ("effort_none" as const),
    technicalCompletion: `${complete.length}/3`,
    completedCells: complete.length,
    scoringCells: 3,
    optionCount: options.length,
    potentialSecondAnswerConfirmed: secondConfirmed.length,
    unverifiedHighOverlapRisk: secondUnverifiedOverlap.length,
    mutationNotApplied: mutationNotApplied.length,
    potentialSecondAnswerRisk: secondConfirmed.length,
    semanticCoverageFails: coverageFail.length,
    naturalnessFails: naturalFail.length,
    duplicateTraps: duplicate.length,
    reasoningTokens,
    visibleOutputTokens,
    actualUsd: Math.round(actualUsd * 1_000_000) / 1_000_000,
    editorialAcceptance: "pending" as const,
    humanEditorial: "pending" as const,
    automaticFlagsAreNotHumanApproval: true as const,
    winnerDeclared: false as const,
  };
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const next = [...items];
  const random = mulberry32(seed);
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function buildBlindModelPacks(input: { tasks: V6PilotTask[]; cells: ComparisonCell[] }) {
  const letters = ["B", "C", "D", "E"] as const;
  const writers = shuffle([...comparisonWriters], writerBakeoffBlindSeed);
  const packLabels = ["P1", "P2", "P3"] as const;
  const assignment = packLabels.map((packId, index) => ({ packId, writer: writers[index]! }));
  const packs = assignment.map(({ packId, writer }) => {
    const items = comparisonSourceIds.map((sourceId, itemIndex) => {
      const task = input.tasks.find((row) => row.id === sourceId)!;
      const cell = input.cells.find((row) => row.writer === writer && row.sourceId === sourceId);
      if (!cell || cell.candidates.length !== 4) {
        return { itemId: `${packId}-${itemIndex + 1}`, source: task.source, incomplete: true as const, options: null };
      }
      const shuffled = shuffle(cell.candidates, writerBakeoffBlindSeed + itemIndex * 17 + packId.charCodeAt(1));
      const options = {
        A: task.key,
        B: shuffled[0]!.candidateText,
        C: shuffled[1]!.candidateText,
        D: shuffled[2]!.candidateText,
        E: shuffled[3]!.candidateText,
      };
      return {
        itemId: `${packId}-${itemIndex + 1}`,
        source: task.source,
        incomplete: false as const,
        options,
        ratings: {
          targetedMisreading: null,
          othersPreserved: null,
          wrongAnswerDistinct: null,
          naturalAcademic: null,
          extraMeaningChange: null,
          duplicateTrap: null,
          humanEditorial: "pending",
        },
      };
    });
    return { packId, items };
  });
  const leaked = /claude-haiku|deepseek|tencent\/hy4|openrouter:|claude-sonnet/i.test(JSON.stringify(packs));
  const key = {
    packs: Object.fromEntries(assignment.map((row) => [row.packId, row.writer])),
    items: assignment.flatMap(({ packId, writer }) =>
      comparisonSourceIds.map((sourceId, itemIndex) => {
        const task = input.tasks.find((row) => row.id === sourceId)!;
        const cell = input.cells.find((row) => row.writer === writer && row.sourceId === sourceId);
        const shuffled = cell?.candidates.length === 4 ? shuffle(cell.candidates, writerBakeoffBlindSeed + itemIndex * 17 + packId.charCodeAt(1)) : [];
        return {
          itemId: `${packId}-${itemIndex + 1}`,
          packId,
          writer,
          sourceId,
          correctLetter: "A" as const,
          plans: Object.fromEntries(letters.map((letter, index) => [letter, shuffled[index]?.planId ?? null])),
        };
      }),
    ),
  };
  return { seed: writerBakeoffBlindSeed, modelNameHidden: !leaked, packs, key };
}

export function assessFactoryV6WriterComparison(input: {
  catalog: CatalogModelRow[];
  ceiling: ReturnType<typeof comparisonCeilingUsd>;
  reused: ComparisonCell[];
  live: ComparisonCell[];
  spentUsd: number;
  recordsImmutable: { writerBakeoffV1Unchanged: boolean; qualityFirstUnchanged: boolean; compareUnchanged: boolean };
}) {
  const tasks = comparisonSourceIds.map((id) => buildV6PilotTask(id));
  const cells = [...input.reused, ...input.live];
  const options = cells.flatMap((cell) => {
    const task = tasks.find((row) => row.id === cell.sourceId)!;
    return cell.candidates.map((candidate, index) => compareOption({ cell, task, candidate, index }));
  });
  const scorecards = comparisonWriters.map((writer) => modelScorecard({ writer, cells, options }));
  const packed = buildBlindModelPacks({ tasks, cells });
  return {
    version: factoryV6WriterComparisonAuthorization,
    liveGenerate: input.live.length,
    reusedCells: input.reused.length,
    factoryRootCauseFixEnabled,
    productionWriter: qualityFirstFrozenModels.writer,
    productionJudge: qualityFirstFrozenModels.judge,
    judgeCalls: 0,
    recoveryDefault: recoveryDefaultEnabled ? "off" : "off",
    studentBankWrites: 0,
    meaningProven: false as const,
    qualityProven: false as const,
    editorialAcceptance: "pending" as const,
    humanEditorial: "pending" as const,
    winnerDeclared: false as const,
    automaticFlagsAreNotHumanApproval: true as const,
    highReasoningChallengeArchive,
    spendCapUsd: factoryV6WriterComparisonSpendCapUsd,
    spentUsd: input.spentUsd,
    ceiling: input.ceiling,
    catalog: input.catalog,
    hashes: frozenHashesUnchanged(),
    recordsImmutable: input.recordsImmutable,
    cells,
    optionComparisons: options,
    scorecards,
    blind: { modelNameHidden: packed.modelNameHidden, packCount: packed.packs.length },
  };
}

export function writeFactoryV6WriterComparisonPreFlight(catalog: CatalogModelRow[], localPrices: PriceCatalog) {
  const prompt = validateAllV6PilotPreFlight();
  const hashes = frozenHashesUnchanged();
  const reused = reusedComparisonCells();
  const missing = missingComparisonJobs();
  const ceiling = comparisonCeilingUsd({ catalog, localPrices });
  const ok =
    prompt.ok &&
    hashes.ok &&
    missing.length === factoryV6WriterComparisonMaxCalls &&
    reused.length === 5 &&
    ceiling.fitsCap &&
    !factoryRootCauseFixEnabled &&
    !recoveryDefaultEnabled;
  mkdirSync(factoryV6WriterComparisonOutputDir, { recursive: true });
  writeFileSync(
    path.join(factoryV6WriterComparisonOutputDir, "pre-flight.json"),
    `${JSON.stringify(
      {
        ok,
        factoryRootCauseFixEnabled,
        recoveryDefault: recoveryDefaultEnabled,
        promptOk: prompt.ok,
        hashes,
        reused: reused.map((cell) => ({ writer: cell.writer, sourceId: cell.sourceId, origin: cell.origin, n: cell.candidates.length })),
        missing,
        ceiling,
        highReasoningChallengeArchive,
        liveGenerateAuthorizedOnlyIfOk: true,
      },
      null,
      2,
    )}\n`,
  );
  return {
    ok,
    prompt,
    hashes,
    reused,
    missing,
    ceiling,
    errors: [
      ...(prompt.ok ? [] : ["v6 prompt pre-flight failed"]),
      ...(hashes.ok ? [] : ["freeze hashes drifted"]),
      ...(missing.length === 4 ? [] : [`expected 4 missing cells, found ${missing.length}`]),
      ...(reused.length === 5 ? [] : [`expected 5 reused cells, found ${reused.length}`]),
      ...(ceiling.fitsCap ? [] : ["four-call ceiling over $0.03"]),
    ],
  };
}

export { allowBakeoffCall, parseOpenRouterCatalog, challengePricesFromCatalog };
