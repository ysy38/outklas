import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { architectureV2FrozenSourceIds } from "./architecture-v2";
import { architectureV2WriterTokenCeiling, callCeilingUsd, type CatalogPrice, type PriceCatalog } from "./architecture-v2";
import { sourceSentence } from "./cognitive-trap";
import { qualityFirstFrozenModels, qualityFirstItems, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { scoringSourceAliases } from "./root-cause-audit";
import {
  attachPreserveV1,
  factoryRootCauseFixEnabled,
  factoryRootCauseFixVersion,
  frameFromSource,
  frameSlotLabel,
  presentFrameSlots,
  selectIndependentPlansV1,
  semanticWriterUser,
  type IndependentPlanV1,
} from "./root-cause-fix";
import { semanticRelations, type SemanticFrame, type SemanticRelation } from "./semantic-preservation";
import { taxonomyLiveItems } from "./taxonomy-live";
import { assessWholeSet, classifyOption } from "./whole-set";
import { auditFrozenPlans, evaluateWriterOption, type PlanFeasibility, writerBakeoffCompareOutputDir } from "./writer-bakeoff-compare";
import { assessJsonSchemaHonor } from "./writer-bakeoff-smoke";
import { type BakeoffPlan } from "./writer-bakeoff";

export const factoryV6LivePilotAuthorization = "factory-v6-controlled-live-pilot-v1";
export const factoryV6LivePilotOutputDir = ".data/analysis/_factory/cognitive-trap/factory-v6-controlled-live-pilot-v1";
export const factoryV6LivePilotLiveAuthorized = true as const;
export const factoryV6LivePilotSpendCapUsd = 0.03;
export const factoryV6LivePilotMaxCalls = 3;
export const factoryV6LivePilotRetry = 0;
export const factoryV6LivePilotWriter = "openrouter:anthropic/claude-haiku-5.5" as const;
export const factoryV6LivePilotOutputTokens = architectureV2WriterTokenCeiling.output;

export const factoryV6LivePilotSourceIds = [
  scoringSourceAliases.embargo,
  scoringSourceAliases.faculty,
  scoringSourceAliases.board,
] as const;

const aliasById = Object.fromEntries(Object.entries(scoringSourceAliases).map(([alias, id]) => [id, alias]));

function itemsById() {
  return new Map(
    [...qualityFirstItems().map((entry) => entry.item), ...taxonomyLiveItems().map((entry) => entry.item)].map((item) => [item.id, item]),
  );
}

function liveDir(id: string): string {
  return architectureV2FrozenSourceIds.find((row) => row.id === id)?.liveDir ?? "";
}

function loadReadings(id: string) {
  const file = path.join(liveDir(id), `${id}.json`);
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    arms?: { B?: { readings?: { misreadingMechanism: string | null; studentMisreading: string }[] } };
  };
  return parsed.arms?.B?.readings ?? [];
}

export type V6PilotTask = {
  id: string;
  alias: string;
  source: string;
  key: string;
  questionType: "restatement" | "translation";
  direction: "en_tr" | "tr_en" | null;
  targetLanguage: "tr" | "en" | null;
  frame: SemanticFrame;
  plans: IndependentPlanV1[];
  planCount: number;
  writerUser: string;
};

export function buildV6PilotTask(sourceId: (typeof factoryV6LivePilotSourceIds)[number]): V6PilotTask {
  const item = itemsById().get(sourceId);
  if (!item) throw new Error(`missing item ${sourceId}`);
  const source = sourceSentence(item);
  const key = item.core.correctAnswer;
  const direction = item.direction ?? null;
  const questionType = item.questionType;
  const targetLanguage = direction === "en_tr" ? "tr" : direction === "tr_en" ? "en" : null;
  const frame = frameFromSource(source, key, questionType, direction);
  const selected = selectIndependentPlansV1(loadReadings(sourceId), source);
  if (selected.status !== "ok" || selected.plans.length !== 4) {
    throw new Error(`${sourceId} is not v6-ready: ${selected.status} proven=${selected.provenIndependentCount}`);
  }
  const present = presentFrameSlots(frame).map((row) => row.relation);
  const plans = attachPreserveV1(selected.plans, present);
  const writerUser = semanticWriterUser({ source, key, targetLanguage, frame, plans });
  return {
    id: sourceId,
    alias: aliasById[sourceId] ?? sourceId,
    source,
    key,
    questionType,
    direction,
    targetLanguage,
    frame,
    plans,
    planCount: plans.length,
    writerUser,
  };
}

export type WriterPromptPreFlightError = { code: string; message: string };

export function validateV6WriterPromptPreFlight(task: V6PilotTask): { ok: boolean; errors: WriterPromptPreFlightError[] } {
  const errors: WriterPromptPreFlightError[] = [];
  const present = presentFrameSlots(task.frame);

  if (present.length < 2) {
    errors.push({ code: "frame_sparse", message: `${task.id}: fewer than two present frame slots` });
  }

  for (const relation of semanticRelations) {
    const slot = task.frame.slots[relation];
    if (slot.status === "present" && slot.statement && !task.source.toLocaleLowerCase("en-US").includes(slot.statement.toLocaleLowerCase("en-US"))) {
      errors.push({ code: "frame_span_not_in_source", message: `${task.id}: ${relation} span not in source` });
    }
  }

  if (task.id === scoringSourceAliases.registry || task.alias === "registry") {
    const actors = task.frame.slots.actors.statement ?? "";
    if (!/registry/i.test(actors) || !/archivist/i.test(actors)) {
      errors.push({ code: "registry_actors_incomplete", message: "registry frame must name both registry and archivist in actors" });
    }
  }

  if (!task.writerUser.includes("change:") || !/change: \w+ →/.test(task.writerUser)) {
    errors.push({ code: "change_values_missing", message: `${task.id}: change line lacks relation → value` });
  }
  if (!task.writerUser.includes("preserve:\n  -")) {
    errors.push({ code: "preserve_values_missing", message: `${task.id}: preserve lacks per-relation values` });
  }

  for (const plan of task.plans) {
    const changeLine = frameSlotLabel(task.frame, plan.changeRelation);
    if (changeLine === "unknown" && task.frame.slots[plan.changeRelation].status === "present") {
      errors.push({ code: "change_unknown", message: `${plan.planId}: targeted change has unknown value` });
    }
    if (plan.preserveRelations.includes(plan.changeRelation)) {
      errors.push({ code: "preserve_includes_change", message: `${plan.planId}: preserve lists the change relation` });
    }
    for (const relation of plan.preserveRelations) {
      const label = frameSlotLabel(task.frame, relation);
      if (!task.writerUser.includes(`${relation}: ${label}`) && label !== "not_applicable") {
        errors.push({ code: "preserve_value_not_in_prompt", message: `${plan.planId}: preserve value for ${relation} missing from prompt` });
      }
    }
  }

  const mandatory: Partial<Record<string, SemanticRelation[]>> = {
    [scoringSourceAliases.embargo]: ["condition_counterfactual", "quantity_scope", "time_order"],
    [scoringSourceAliases.faculty]: ["cause", "purpose", "actors"],
    [scoringSourceAliases.board]: ["condition_counterfactual", "quantity_scope"],
  };
  for (const relation of mandatory[task.id] ?? []) {
    if (task.frame.slots[relation].status !== "present") {
      errors.push({ code: "mandatory_slot_absent", message: `${task.id}: required slot ${relation} is not present` });
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateAllV6PilotPreFlight(): {
  ok: boolean;
  tasks: V6PilotTask[];
  bySource: Record<string, { ok: boolean; errors: WriterPromptPreFlightError[] }>;
} {
  const tasks = factoryV6LivePilotSourceIds.map((id) => buildV6PilotTask(id));
  const bySource = Object.fromEntries(tasks.map((task) => [task.id, validateV6WriterPromptPreFlight(task)]));
  const ok = Object.values(bySource).every((row) => row.ok);
  return { ok, tasks, bySource };
}

export function pilotCeilingUsd(prices: PriceCatalog): { perCallUsd: number | null; threeCallUsd: number | null; fitsCap: boolean } {
  const row = prices[factoryV6LivePilotWriter];
  const perCallUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling)
    : null;
  const threeCallUsd = perCallUsd != null ? perCallUsd * factoryV6LivePilotMaxCalls : null;
  return {
    perCallUsd,
    threeCallUsd,
    fitsCap: threeCallUsd != null && threeCallUsd <= factoryV6LivePilotSpendCapUsd,
  };
}

export function v6PilotProtectedDirs(): string[] {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter((dir) => path.resolve(dir) !== path.resolve(factoryV6LivePilotOutputDir));
}

export type HaikuBenchmarkCell = {
  sourceId: string;
  candidates: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string }[];
};

export function loadHaikuBenchmarkCell(sourceId: string): HaikuBenchmarkCell | null {
  const file = path.join(writerBakeoffCompareOutputDir, `${sourceId}__openrouter:anthropic_claude-haiku-5.5.json`);
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as HaikuBenchmarkCell & { candidates?: HaikuBenchmarkCell["candidates"] };
  if (!parsed.candidates?.length) return null;
  return { sourceId, candidates: parsed.candidates };
}

function planFeasibilityMap(): Map<string, PlanFeasibility> {
  const rows = auditFrozenPlans();
  return new Map(rows.map((row) => [`${row.sourceId}::${row.planId}`, row.feasibility]));
}

export type FacultyRoleCarry = {
  sourceId: string;
  notes: string[];
  facultyPresent: boolean;
  departmentPresent: boolean;
  sameStaffPresent: boolean;
  agentRoleSwapsHirer: boolean | null;
  preserveKeepsFacultyAsHirer: boolean;
  preserveKeepsDepartmentAsValuer: boolean;
};

function mentions(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

/** Machine check only. Faculty / department / same-staff role carry is not editorial acceptance. */
export function auditFacultyRoleCarry(input: {
  sourceId: string;
  plans: { planId: string; mechanismId: string }[];
  candidates: { candidateText: string; planId: string }[];
}): FacultyRoleCarry {
  const texts = input.candidates.map((row) => row.candidateText);
  const joined = texts.join("\n");
  const facultyPresent = mentions(joined, /fakülte|faculty/i);
  const departmentPresent = mentions(joined, /bölüm|department/i);
  const sameStaffPresent = mentions(joined, /aynı kadro|same staff|same personnel/i);
  const notes: string[] = [];
  const agent = input.candidates.find((_, index) => input.plans[index]?.mechanismId === "AGENT_ROLE");
  const nonAgent = input.candidates.filter((_, index) => input.plans[index]?.mechanismId !== "AGENT_ROLE");
  const agentRoleSwapsHirer = agent
    ? mentions(agent.candidateText, /\bbölüm\b/i) && mentions(agent.candidateText, /tuttu|tutmuş|hired/i)
    : null;
  const preserveKeepsFacultyAsHirer = nonAgent.every((row) =>
    mentions(row.candidateText, /fakülte.{0,40}(tuttu|tutmuş)|faculty hired/i) ||
    mentions(row.candidateText, /the faculty|fakülte/i),
  );
  const preserveKeepsDepartmentAsValuer = nonAgent.every((row) =>
    mentions(row.candidateText, /bölüm.{0,80}(değerleme|değerlememesi|value)|department.{0,80}value/i) ||
    mentions(row.candidateText, /bölüm|department/i),
  );
  if (!facultyPresent) notes.push("faculty NP missing from the four options");
  if (!departmentPresent) notes.push("department NP missing from the four options");
  if (!sameStaffPresent) notes.push("same-staff cause missing from the four options");
  if (agent && agentRoleSwapsHirer === false) notes.push("AGENT_ROLE option does not make the department the hirer");
  if (!preserveKeepsFacultyAsHirer) notes.push("a non-AGENT_ROLE option drops faculty as institutional hirer");
  if (!preserveKeepsDepartmentAsValuer) notes.push("a non-AGENT_ROLE option drops the department as valuer");
  return {
    sourceId: input.sourceId,
    notes,
    facultyPresent,
    departmentPresent,
    sameStaffPresent,
    agentRoleSwapsHirer,
    preserveKeepsFacultyAsHirer,
    preserveKeepsDepartmentAsValuer,
  };
}

export type PilotQualityCompareRow = {
  sourceId: string;
  alias: string;
  dimension: string;
  benchmark: "unverified" | "fail" | "pass";
  v6Pilot: "unverified" | "fail" | "pass";
  humanEditorial: "pending";
  notes: string[];
};

export function compareV6PilotToHaikuBenchmark(input: {
  task: V6PilotTask;
  v6Candidates: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string }[];
  benchmark: HaikuBenchmarkCell;
}): {
  optionRows: ReturnType<typeof evaluateWriterOption>[];
  setFormalCues: string[];
  duplicateTrapRisk: boolean;
  secondAnswerRisk: boolean;
  compareRows: PilotQualityCompareRow[];
  writerClaimIsNotProof: true;
  editorialAcceptance: "pending";
  humanEditorial: "pending";
  facultyRoleCarry: FacultyRoleCarry | null;
} {
  const feasibility = planFeasibilityMap();
  const benchmarkPlans: BakeoffPlan[] = input.benchmark.candidates.map((row) => ({
    planId: row.planId,
    mechanismId: row.planId.split("-").slice(1).join("-"),
    family: "",
    source: "live_reading",
    dominantMisreading: "",
    changeRelation: "quantity_scope" as SemanticRelation,
    preserveRelations: [],
    forbiddenAdditions: [],
    expectedStudentMisreading: row.studentMisreading,
  }));

  const v6OptionRows = input.v6Candidates.map((candidate, index) => {
    const plan = input.task.plans[index]!;
    const feasibilityKey = `${input.task.id}::${plan.planId}`;
    const planFeasibility = feasibility.get(feasibilityKey) ?? "strained";
    return evaluateWriterOption({
      source: input.task.source,
      key: input.task.key,
      targetLanguage: input.task.targetLanguage,
      plan: { ...plan, family: plan.family, preserveRelations: plan.preserveRelations },
      planFeasibility,
      candidate,
    });
  });

  const benchOptionRows = input.benchmark.candidates.map((candidate, index) => {
    const plan = benchmarkPlans[index] ?? benchmarkPlans[0]!;
    const feasibilityKey = `${input.task.id}::${candidate.planId}`;
    const planFeasibility = feasibility.get(feasibilityKey) ?? "strained";
    return evaluateWriterOption({
      source: input.task.source,
      key: input.task.key,
      targetLanguage: input.task.targetLanguage,
      plan,
      planFeasibility,
      candidate,
    });
  });

  const letters = ["B", "C", "D", "E"] as const;
  const benchPacked = Object.fromEntries([["A", input.task.key], ...input.benchmark.candidates.map((row, index) => [letters[index], row.candidateText])]) as Record<
    "A" | "B" | "C" | "D" | "E",
    string
  >;
  const v6Packed = Object.fromEntries([["A", input.task.key], ...input.v6Candidates.map((row, index) => [letters[index], row.candidateText])]) as Record<
    "A" | "B" | "C" | "D" | "E",
    string
  >;
  const benchSet = assessWholeSet({ source: input.task.source, key: input.task.key, options: benchPacked, correct: "A" });
  const v6Set = assessWholeSet({ source: input.task.source, key: input.task.key, options: v6Packed, correct: "A" });

  const benchSecond = benchOptionRows.some((row) => row.writerExecutionQuality.wrongAnswerQuality === "fail" || row.semanticStatus === "confirmed_equivalent");
  const v6Second = v6OptionRows.some((row) => row.writerExecutionQuality.wrongAnswerQuality === "fail" || row.semanticStatus === "confirmed_equivalent");

  const benchCoverageFail = benchOptionRows.some((row) => row.writerExecutionQuality.coverageRetention === "fail");
  const v6CoverageFail = v6OptionRows.some((row) => row.writerExecutionQuality.coverageRetention === "fail");

  const benchMutationFail = benchOptionRows.some((row) => row.writerExecutionQuality.singleDominantMutation === "fail");
  const v6MutationFail = v6OptionRows.some((row) => row.writerExecutionQuality.singleDominantMutation === "fail");

  const benchNaturalFail = benchOptionRows.some((row) => row.writerExecutionQuality.naturalness === "fail");
  const v6NaturalFail = v6OptionRows.some((row) => row.writerExecutionQuality.naturalness === "fail");

  const status = (fail: boolean): "fail" | "unverified" => (fail ? "fail" : "unverified");

  const facultyRoleCarry =
    input.task.alias === "faculty"
      ? auditFacultyRoleCarry({
          sourceId: input.task.id,
          plans: input.task.plans,
          candidates: input.v6Candidates,
        })
      : null;

  const compareRows: PilotQualityCompareRow[] = [
    {
      sourceId: input.task.id,
      alias: input.task.alias,
      dimension: "coverage_retention",
      benchmark: status(benchCoverageFail),
      v6Pilot: status(v6CoverageFail),
      humanEditorial: "pending",
      notes: [],
    },
    {
      sourceId: input.task.id,
      alias: input.task.alias,
      dimension: "single_dominant_mutation",
      benchmark: status(benchMutationFail),
      v6Pilot: status(v6MutationFail),
      humanEditorial: "pending",
      notes: [],
    },
    {
      sourceId: input.task.id,
      alias: input.task.alias,
      dimension: "naturalness",
      benchmark: status(benchNaturalFail),
      v6Pilot: status(v6NaturalFail),
      humanEditorial: "pending",
      notes: [],
    },
    {
      sourceId: input.task.id,
      alias: input.task.alias,
      dimension: "second_answer_risk",
      benchmark: status(benchSecond),
      v6Pilot: status(v6Second),
      humanEditorial: "pending",
      notes: benchSecond ? ["benchmark has machine second-answer signal"] : [],
    },
    {
      sourceId: input.task.id,
      alias: input.task.alias,
      dimension: "four_independent_distractors",
      benchmark: "unverified",
      v6Pilot:
        new Set(input.task.plans.map((plan) => plan.independenceKey)).size === 4 &&
        input.v6Candidates.length === 4 &&
        input.benchmark.candidates.length === 4
          ? "unverified"
          : "fail",
      humanEditorial: "pending",
      notes: ["four planner keys and four candidates; trap independence is not machine-proven"],
    },
    {
      sourceId: input.task.id,
      alias: input.task.alias,
      dimension: "formal_cue",
      benchmark: benchSet.risks.whole_set_clue_risk.length > 0 ? "fail" : "unverified",
      v6Pilot: v6Set.risks.whole_set_clue_risk.length > 0 ? "fail" : "unverified",
      humanEditorial: "pending",
      notes: [...new Set([...benchSet.risks.whole_set_clue_risk, ...v6Set.risks.whole_set_clue_risk])],
    },
  ];
  if (facultyRoleCarry) {
    compareRows.push({
      sourceId: input.task.id,
      alias: input.task.alias,
      dimension: "faculty_role_carry",
      benchmark: "unverified",
      v6Pilot: facultyRoleCarry.notes.length > 0 ? "fail" : "unverified",
      humanEditorial: "pending",
      notes: facultyRoleCarry.notes,
    });
  }

  return {
    optionRows: v6OptionRows,
    setFormalCues: v6Set.risks.whole_set_clue_risk,
    duplicateTrapRisk: new Set(input.task.plans.map((plan) => plan.independenceKey)).size < input.v6Candidates.length,
    secondAnswerRisk: v6Second,
    compareRows,
    writerClaimIsNotProof: true,
    editorialAcceptance: "pending",
    humanEditorial: "pending",
    facultyRoleCarry,
  };
}

export function refuseFactoryV6LivePilot(reason: string, code: string) {
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

export function assessFactoryV6LivePilotReport(input: {
  preFlight: ReturnType<typeof validateAllV6PilotPreFlight>;
  ceiling: ReturnType<typeof pilotCeilingUsd>;
  calls: {
    sourceId: string;
    providerCallOk: boolean;
    jsonHonor: ReturnType<typeof assessJsonSchemaHonor>;
    usage: { inputTokens: number; outputTokens: number; reasoningTokens: number | null; totalTokens: number };
    costUsd: number | null;
    latencyMs: number;
    candidates: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string }[];
    compare: ReturnType<typeof compareV6PilotToHaikuBenchmark> | null;
  }[];
  spentUsd: number;
  recordsImmutable: {
    writerBakeoffV1Unchanged: boolean;
    qualityFirstUnchanged: boolean;
    compareUnchanged: boolean;
  };
}) {
  const compareRows = input.calls.flatMap((row) => row.compare?.compareRows ?? []);
  const v6FailCount = compareRows.filter((row) => row.v6Pilot === "fail").length;
  const benchFailCount = compareRows.filter((row) => row.benchmark === "fail").length;
  const v6Better = compareRows.filter((row) => row.benchmark === "fail" && row.v6Pilot === "unverified").length;
  const v6Worse = compareRows.filter((row) => row.benchmark === "unverified" && row.v6Pilot === "fail").length;
  const facultyRoleCarry = input.calls.find((row) => row.compare?.facultyRoleCarry)?.compare?.facultyRoleCarry ?? null;

  return {
    version: factoryV6LivePilotAuthorization,
    factoryRootCauseFixEnabled,
    factoryRootCauseFixVersion,
    livePath: "isolated_runner_only",
    productionWriter: qualityFirstFrozenModels.writer,
    productionJudge: qualityFirstFrozenModels.judge,
    judgeCalls: 0,
    recoveryDefault: recoveryDefaultEnabled ? "off" : "off",
    studentBankWrites: 0,
    meaningProven: false as const,
    qualityProven: false as const,
    editorialAcceptance: "pending" as const,
    humanEditorial: "pending" as const,
    writerClaimIsNotProof: true as const,
    preFlightOk: input.preFlight.ok,
    spendCapUsd: factoryV6LivePilotSpendCapUsd,
    spentUsd: input.spentUsd,
    ceiling: input.ceiling,
    calls: input.calls,
    qualityComparison: {
      compareRows,
      machineOnly: true,
      v6FailCount,
      benchFailCount,
      v6MachineSignalsBetterThanBenchmark: v6Better,
      v6MachineSignalsWorseThanBenchmark: v6Worse,
      facultyRoleCarry,
      evidenceSummary:
        v6Worse > v6Better
          ? "v6_contract_shows_more_machine_fail_signals_than_legacy_haiku_benchmark"
          : v6Better > v6Worse
            ? "v6_contract_shows_fewer_machine_fail_signals_than_legacy_haiku_benchmark_on_some_dimensions"
            : "inconclusive_machine_only_pending_human_editorial",
    },
    recordsImmutable: input.recordsImmutable,
  };
}

export function writeFactoryV6LivePilotOfflinePreFlight() {
  const preFlight = validateAllV6PilotPreFlight();
  mkdirSync(factoryV6LivePilotOutputDir, { recursive: true });
  writeFileSync(
    path.join(factoryV6LivePilotOutputDir, "pre-flight.json"),
    `${JSON.stringify(
      {
        ok: preFlight.ok,
        factoryRootCauseFixEnabled,
        bySource: preFlight.bySource,
        prompts: preFlight.tasks.map((task) => ({ sourceId: task.id, alias: task.alias, writerUser: task.writerUser })),
      },
      null,
      2,
    )}\n`,
  );
  return preFlight;
}