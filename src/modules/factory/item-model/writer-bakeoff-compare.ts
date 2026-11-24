import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  architectureV2WriterTokenCeiling,
  callCeilingUsd,
  type CatalogPrice,
  type PriceCatalog,
} from "./architecture-v2";
import { incompleteOption } from "./misreading-mechanisms";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { classifyOption } from "./whole-set";
import {
  bakeoffHardBlocks,
  freezeWriterBakeoffTasks,
  packBlindOptions,
  parseBakeoffWriterOutput,
  writerBakeoffBlindSeed,
  writerBakeoffOutputDir,
  writerBakeoffSmokeSourceId,
  type BakeoffPlan,
} from "./writer-bakeoff";
import { writerBakeoffSmokeOutputDir } from "./writer-bakeoff-smoke";

export const writerBakeoffCompareAuthorization = "writer-bakeoff-remaining-five-v1";
export const writerBakeoffCompareOutputDir = ".data/analysis/_factory/cognitive-trap/writer-bakeoff-compare-v1";
export const writerBakeoffCompareLiveAuthorized = true;
export const writerBakeoffCompareSpendCapUsd = 0.62;
export const writerBakeoffCompareRetry = 0;
export const writerBakeoffCompareMaxCalls = 20;
export const writerBakeoffCompareOutputTokens = architectureV2WriterTokenCeiling.output;

export const writerBakeoffRemainingSourceIds = [
  "taxonomy-restatement-hard",
  "taxonomy-restatement-medium",
  "quality-first-translation-en_tr",
  "taxonomy-translation-en_tr",
  "taxonomy-translation-tr_en",
] as const;

export type PlanFeasibility = "natural" | "strained" | "artificial";

export type PlanAuditRow = {
  sourceId: string;
  planId: string;
  mechanismId: string;
  family: string;
  changeRelation: string;
  expectedStudentMisreading: string;
  feasibility: PlanFeasibility;
  defectKind: "none" | "plan";
  notes: string;
  frozenUnchanged: true;
};

export function remainingScoringTasks() {
  const tasks = freezeWriterBakeoffTasks().filter((task) => task.role === "scoring");
  return writerBakeoffRemainingSourceIds.map((id) => {
    const task = tasks.find((row) => row.id === id);
    if (!task) throw new Error(`missing remaining scoring source ${id}`);
    return task;
  });
}

export function remainingCallCeilingUsd(prices: PriceCatalog, models: readonly string[]): {
  perModel: { setting: string; perCallUsd: number | null }[];
  perSourceUsd: number | null;
  twentyCallUsd: number | null;
} {
  const perModel = models.map((setting) => {
    const row = prices[setting];
    const usd = row ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling) : null;
    return { setting, perCallUsd: usd };
  });
  const perSourceUsd = perModel.every((row) => row.perCallUsd != null) ? perModel.reduce((sum, row) => sum + (row.perCallUsd ?? 0), 0) : null;
  return { perModel, perSourceUsd, twentyCallUsd: perSourceUsd == null ? null : writerBakeoffRemainingSourceIds.length * perSourceUsd };
}

export function unrecordedHaikuHit(prices: PriceCatalog): {
  setting: "openrouter:anthropic/claude-haiku-5.5";
  sourceId: typeof writerBakeoffSmokeSourceId;
  persisted: false;
  usage: null;
  conservativeCeilingUsd: number | null;
  note: string;
} {
  const row = prices["openrouter:anthropic/claude-haiku-5.5"];
  const conservativeCeilingUsd = row
    ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined }, architectureV2WriterTokenCeiling)
    : null;
  return {
    setting: "openrouter:anthropic/claude-haiku-5.5",
    sourceId: writerBakeoffSmokeSourceId,
    persisted: false,
    usage: null,
    conservativeCeilingUsd,
    note: "First technical-smoke generate returned, then the runner threw before persist (parseBakeoffWriterOutput was not in scope). The provider hit is billed; it is not a recorded plates cell and was not reused.",
  };
}

export function loadRecordedSmokeActualUsd(): number | null {
  const file = path.join(writerBakeoffSmokeOutputDir, "summary.json");
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { executed?: boolean; actualUsd?: number | null };
  return parsed.executed && typeof parsed.actualUsd === "number" ? parsed.actualUsd : null;
}

export function projectedBakeoffSpendUsd(input: { recordedSmokeUsd: number | null; unrecordedHaikuUsd: number | null; remainingTwentyUsd: number | null }): {
  recordedSmokeUsd: number | null;
  unrecordedHaikuUsd: number | null;
  remainingTwentyUsd: number | null;
  projectedTotalUsd: number | null;
  fitsCap: boolean;
} {
  const parts = [input.recordedSmokeUsd, input.unrecordedHaikuUsd, input.remainingTwentyUsd];
  const projectedTotalUsd = parts.every((value) => value != null) ? (parts as number[]).reduce((sum, value) => sum + value, 0) : null;
  return {
    recordedSmokeUsd: input.recordedSmokeUsd,
    unrecordedHaikuUsd: input.unrecordedHaikuUsd,
    remainingTwentyUsd: input.remainingTwentyUsd,
    projectedTotalUsd,
    fitsCap: projectedTotalUsd != null && projectedTotalUsd <= writerBakeoffCompareSpendCapUsd,
  };
}

export function auditFrozenPlans(): PlanAuditRow[] {
  const tasks = freezeWriterBakeoffTasks().filter((task) => task.role === "scoring");
  const notes: Record<string, Partial<Record<string, { feasibility: PlanFeasibility; notes: string }>>> = {
    [writerBakeoffSmokeSourceId]: {
      "p1-COUNTERFACTUAL_FACTUAL": {
        feasibility: "natural",
        notes: "Students often read an unreal sealing as a completed event. The plan targets a real YDS trap. Writers who drop the counterfactual are execution failures, not a plan defect.",
      },
      "p2-TEMPORAL_ORDER": {
        feasibility: "natural",
        notes: "Before vs after is a natural wrong reading. It shares changeRelation time_order with p4, so two plans compete for the same relation slot.",
      },
      "p3-AGENT_ROLE": {
        feasibility: "artificial",
        notes: "Conservators and glass plates are not interchangeable agents of sealing. The only swap that keeps both NPs is plates sealing people, which is ontologically absurd and not a student misreading. The live studentMisreading is factual sealing plus a humidity need, not role inversion. Family 'participant roles' over-specifies the trap. Frozen plan is not changed.",
      },
      "p4-TEMPORAL_SCOPE": {
        feasibility: "strained",
        notes: "An interval shift (before vs during the rise) is usable, but the stored studentMisreading mentions humidity falling, an event the source does not contain, and the changeRelation duplicates p2.",
      },
    },
    "taxonomy-restatement-hard": {
      "p1-QUANTITY_SCOPE": { feasibility: "natural", notes: "Only two contested appendices vs all appendices is a natural quantity trap." },
      "p2-FOCUS_SCOPE": { feasibility: "strained", notes: "Shares changeRelation quantity_scope with p1. The misreading also adds that the check itself was withheld, a second mutation." },
      "p3-CONDITION_DIRECTION": { feasibility: "natural", notes: "Swapping the unreal condition and its result is a standard trap on this sentence." },
      "p4-COUNTERFACTUAL_FACTUAL": { feasibility: "natural", notes: "Reading the unreal check as completed is a natural wrong answer." },
    },
    "taxonomy-restatement-medium": {
      "p1-CONCESSION_CAUSE": { feasibility: "natural", notes: "Although vs because is a natural concession/cause swap." },
      "p2-QUANTITY_SCOPE": { feasibility: "natural", notes: "Every log vs some logs is a natural quantity trap." },
      "p3-EVIDENCE_CERTAINTY": { feasibility: "natural", notes: "Found no trace vs established never filed is an evidence-force shift." },
      "p4-NEGATION_SCOPE": { feasibility: "strained", notes: "The stored misreading is close to a second rendering of the key (a trace that they had not been filed)." },
    },
    "quality-first-translation-en_tr": {
      "p1-PURPOSE_RESULT": { feasibility: "natural", notes: "Purpose of the hire vs a result/value judgment is a usable trap." },
      "p2-CAUSE_CONCESSION": { feasibility: "natural", notes: "Because vs although on the same staff preparing figures is natural." },
      "p3-NEGATION_SCOPE": { feasibility: "strained", notes: "The misreading adds a split valuation (own equipment in part, others fully) that the source does not support as a single-relation change." },
      "p4-AGENT_ROLE": { feasibility: "natural", notes: "Faculty vs department are both institutional agents that can hire; this is a plausible role swap, unlike plates sealing conservators." },
    },
    "taxonomy-translation-en_tr": {
      "p1-CONCESSION_CAUSE": { feasibility: "natural", notes: "Leaving the decline open despite no primary effect vs because of that lack is a natural concession/cause trap." },
      "p2-QUANTITY_SCOPE": { feasibility: "natural", notes: "Two secondary measures vs any measure is a quantity widening." },
      "p3-EVIDENCE_CERTAINTY": { feasibility: "strained", notes: "Overlaps p2 by also collapsing secondary vs primary, and hardens 'no effect at all'." },
      "p4-ACTION_SUBSTITUTION": { feasibility: "natural", notes: "Left the decline open vs dismissed the possibility is a two-predicate swap." },
    },
    "taxonomy-translation-tr_en": {
      "p1-COUNTERFACTUAL_FACTUAL": { feasibility: "natural", notes: "Unreal board reading vs a completed reading is a natural trap." },
      "p2-CONDITION_DIRECTION": { feasibility: "natural", notes: "Condition and consequence trade places." },
      "p3-QUANTITY_SCOPE": { feasibility: "strained", notes: "Dropping 'two' is a quantity change, but 'no mention of how many' can become an incomplete option." },
      "p4-FOCUS_SCOPE": { feasibility: "strained", notes: "Shares quantity_scope with p3. The misreading also moves the exclusive focus from the tables to the reviewers." },
    },
  };
  return tasks.flatMap((task) =>
    task.plans.map((plan) => {
      const note = notes[task.id]?.[plan.planId] ?? { feasibility: "strained" as const, notes: "No extra audit row; frozen plan kept." };
      return {
        sourceId: task.id,
        planId: plan.planId,
        mechanismId: plan.mechanismId,
        family: plan.family,
        changeRelation: plan.changeRelation,
        expectedStudentMisreading: plan.expectedStudentMisreading,
        feasibility: note.feasibility,
        defectKind: note.feasibility === "artificial" ? ("plan" as const) : ("none" as const),
        notes: note.notes,
        frozenUnchanged: true as const,
      };
    }),
  );
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function activeToPassiveEquivalence(source: string, option: string): boolean {
  const src = source.toLocaleLowerCase("en-US");
  const opt = option.toLocaleLowerCase("en-US");
  const agentGone = /\bconservators\b/.test(src) && !/\bconservators\b/.test(opt);
  const passiveSeal = /\bhad been sealed\b/.test(opt) || /\bwere sealed\b/.test(opt) || /\bwas sealed\b/.test(opt);
  const sourceSeal = /\bsealed the glass plates\b/.test(src) || /\bhad sealed\b/.test(src);
  return agentGone && passiveSeal && sourceSeal;
}

export function artificialRoleSwap(option: string): boolean {
  const text = option.toLocaleLowerCase("en-US");
  return (
    /\bglass plates had sealed the conservators\b/.test(text) ||
    /\bplates had sealed the conservators\b/.test(text) ||
    /\bhumidity (had )?sealed\b/.test(text) ||
    /\brising humidity sealed\b/.test(text) ||
    (/\bsealed the two earliest negatives\b/.test(text) && /\bglass plates would (still )?have been printable\b/.test(text)) ||
    /\bconservators intervened\b/.test(text)
  );
}

export function evaluateWriterOption(input: {
  source: string;
  key: string;
  targetLanguage: "tr" | "en" | null;
  plan: BakeoffPlan;
  planFeasibility: PlanFeasibility;
  candidate: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string };
}): {
  planId: string;
  candidateText: string;
  writerSemanticRisk: string;
  writerClaimIsNotProof: true;
  planFeasibility: PlanFeasibility;
  writerExecutionQuality: {
    coverageRetention: "fail" | "unverified";
    singleDominantMutation: "fail" | "unverified";
    naturalness: "fail" | "unverified";
    wrongAnswerQuality: "fail" | "unverified";
  };
  flags: string[];
  hardBlocks: string[];
  semanticStatus: "confirmed_difference" | "confirmed_equivalent" | "unverified" | "unresolved";
} {
  const option = input.candidate.candidateText;
  const blocks = bakeoffHardBlocks({ source: input.source, key: input.key, option, targetLanguage: input.targetLanguage });
  const classified = classifyOption(input.source, input.key, option);
  const flags: string[] = [];
  const passive = activeToPassiveEquivalence(input.source, option);
  const roleSwap = input.plan.mechanismId === "AGENT_ROLE" && artificialRoleSwap(option);
  if (passive) {
    flags.push("critical_second_answer_risk");
    flags.push("active_to_passive_equivalence");
  }
  if (roleSwap) flags.push("artificial_role_swap");
  if (input.planFeasibility === "artificial" && roleSwap) flags.push("plan_defect_executed_as_impossible_event");
  const short = incompleteOption(option) || wordCount(option) < wordCount(input.source) * 0.7;
  const equivalent = blocks.includes("key_equivalence") || blocks.includes("second_defensible") || classified.relation === "confirmed_equivalent" || passive;
  return {
    planId: input.candidate.planId,
    candidateText: option,
    writerSemanticRisk: input.candidate.semanticRisk,
    writerClaimIsNotProof: true,
    planFeasibility: input.planFeasibility,
    writerExecutionQuality: {
      coverageRetention: short ? "fail" : "unverified",
      singleDominantMutation: equivalent || roleSwap ? "fail" : "unverified",
      naturalness: incompleteOption(option) || roleSwap ? "fail" : "unverified",
      wrongAnswerQuality: equivalent ? "fail" : "unverified",
    },
    flags,
    hardBlocks: blocks,
    semanticStatus: classified.relation,
  };
}

export type SmokeCell = {
  setting: string;
  sourceId: string;
  candidates: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string }[];
  usage: { inputTokens: number; outputTokens: number; reasoningTokens: number | null; totalTokens: number };
  costUsd: number | null;
  latencyMs: number;
  reused: true;
};

export function loadPlatesSmokeCells(): SmokeCell[] {
  const summaryPath = path.join(writerBakeoffSmokeOutputDir, "summary.json");
  if (!existsSync(summaryPath)) throw new Error("plates smoke summary is missing");
  const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as { executed?: boolean; rows?: { setting: string }[] };
  if (!summary.executed) throw new Error("plates smoke did not execute");
  return (summary.rows ?? []).map((row) => {
    const file = path.join(writerBakeoffSmokeOutputDir, `${row.setting.replaceAll("/", "_")}.json`);
    const record = JSON.parse(readFileSync(file, "utf8")) as {
      setting: string;
      sourceId: string;
      candidates: SmokeCell["candidates"];
      usage: SmokeCell["usage"];
      costUsd: number | null;
      latencyMs: number;
    };
    return { ...record, reused: true as const };
  });
}

export function compareProtectedDirs(): string[] {
  return qualityFirstPilotForbiddenDirs.filter((dir) => dir !== writerBakeoffCompareOutputDir);
}

export function refuseWriterBakeoffCompare(reason: string, lock: "authorization" | "budget" | "output" | "credentials" | "runner" | "completed" | "smoke" = "authorization") {
  return {
    started: false as const,
    executed: false as const,
    liveAuthorized: writerBakeoffCompareLiveAuthorized,
    lock,
    reason,
    providerCalls: 0 as const,
    studentBankWrites: 0 as const,
    judgeCalls: 0 as const,
    recoveryCalls: 0 as const,
    retry: writerBakeoffCompareRetry,
    platesRegenerated: false as const,
    bakeoffFromScratch: false as const,
    productionWriterUnchanged: qualityFirstFrozenModels.writer,
    productionJudgeUnchanged: qualityFirstFrozenModels.judge,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
    meaningProven: false as const,
    qualityProven: false as const,
    editorialAcceptance: false as const,
  };
}

export function buildBlindPack(input: {
  items: {
    sourceId: string;
    source: string;
    key: string;
    model: string;
    plans: BakeoffPlan[];
    options: { planId: string; text: string }[];
  }[];
}) {
  const packed = packBlindOptions({
    seed: writerBakeoffBlindSeed,
    items: input.items.map((item) => ({
      sourceId: item.sourceId,
      source: item.source,
      key: item.key,
      model: item.model,
      options: item.options.map((option) => {
        const plan = item.plans.find((row) => row.planId === option.planId);
        return {
          planId: option.planId,
          change: plan?.family ?? "",
          preserve: plan?.preserveRelations ?? [],
          forbidden: plan?.forbiddenAdditions ?? [],
          expectedStudentMisreading: plan?.expectedStudentMisreading ?? "",
          text: option.text,
        };
      }),
    })),
  });
  const humanPack = packed.pack.map((unit) => ({
    code: unit.code,
    source: unit.source,
    key: unit.key,
    planId: unit.planId,
    change: unit.change,
    preserve: unit.preserve,
    forbidden: unit.forbidden,
    expectedStudentMisreading: unit.expectedStudentMisreading,
    option: unit.option,
    planFeasibility: null,
    writerExecutionQuality: {
      coverageRetention: null,
      singleDominantMutation: null,
      naturalness: null,
      wrongAnswerQuality: null,
    },
    judgeApproveIsNotEditorialAcceptance: true as const,
    automaticGateIsNotEditorialAcceptance: true as const,
  }));
  const hidden = !/claude-haiku|claude-sonnet|deepseek|openrouter:|gemini-4/i.test(JSON.stringify(humanPack));
  return { packed, humanPack, modelNameHidden: hidden, seed: packed.seed };
}

export { writerBakeoffOutputDir, writerBakeoffSmokeOutputDir };
