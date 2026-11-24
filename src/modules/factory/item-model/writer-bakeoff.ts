import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  architectureV2FrozenSourceIds,
  architectureV2RoleDefaults,
  architectureV2WriterTokenCeiling,
  callCeilingUsd,
  frameForFrozenItem,
  probeAdapter,
  type CatalogPrice,
  type PriceCatalog,
} from "./architecture-v2";
import { sourceSentence } from "./cognitive-trap";
import { contentVersion } from "./distractor-strategy";
import { incompleteOption, misreadingMechanisms, sameProposition } from "./misreading-mechanisms";
import { assessTargetLanguage } from "./option-language";
import { qualityFirstFrozenModels, qualityFirstItems, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { publishToStudentBank } from "./review-status";
import { reportTrapPlans, type DistractorPlan, type SemanticRelation } from "./semantic-preservation";
import { taxonomyLiveItems } from "./taxonomy-live";
import { classifyOption } from "./whole-set";

export const writerBakeoffAuthorization = "writer-bakeoff-execution-readiness-v1";
export const writerBakeoffOutputDir = ".data/analysis/_factory/cognitive-trap/writer-bakeoff-v1";
export const writerBakeoffLiveAuthorized = false;
export const writerBakeoffTargetCapUsd = 0.5;
export const writerBakeoffBlindSeed = 20261120;
export const writerBakeoffJudgeUnchanged = architectureV2RoleDefaults.blindJudgeModel;
/** First scoring source. One smoke call per model; reuse the cell if the full writer contract holds. */
export const writerBakeoffSmokeSourceId = "quality-first-restatement-counterfactual";

export class BakeoffBudgetExceeded extends Error {}

const familyAlias: Record<string, string> = {
  quantity_shift: "quantity",
  quantity_scope: "quantity",
  QUANTITY_SCOPE: "quantity",
  PURPOSE_RESULT: "purpose",
  PURPOSE_TIME: "purpose",
  polarity_reversal: "negation",
};

const familyToChange: Record<string, SemanticRelation> = {
  quantity: "quantity_scope",
  "exclusive focus": "quantity_scope",
  "universal_negative_quantity": "quantity_scope",
  "order between events": "time_order",
  "time interval": "time_order",
  cause: "cause",
  concession: "cause",
  purpose: "purpose",
  condition: "condition_counterfactual",
  "counterfactual or unrealized alternative": "condition_counterfactual",
  negation: "negation",
  "modal force": "modality_epistemic",
  evidence: "modality_epistemic",
  reference: "referents",
  "participant roles": "actors",
  "two predicates": "main_actions",
};

type LiveReading = {
  misreadingMechanism: string | null;
  studentMisreading: string;
  actualSemanticDifference: string;
  whyIncorrect: string;
  temptingEvidence?: string;
};

export type BakeoffPlan = DistractorPlan & {
  planId: string;
  mechanismId: string;
  family: string;
  source: "live_reading";
};

export type IndependentPlanReport = {
  status: "ok" | "source_insufficient_traps";
  plans: BakeoffPlan[];
  droppedVariants: { mechanismId: string; family: string; studentMisreading: string }[];
  independentRelationCount: number;
  mechanismLabelCount: number;
  paddedToFour: false;
};

function byId() {
  return new Map([...qualityFirstItems().map((entry) => entry.item), ...taxonomyLiveItems().map((entry) => entry.item)].map((item) => [item.id, item]));
}

function liveReadings(id: string, dir: string): LiveReading[] {
  const file = path.join(dir, `${id}.json`);
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { arms?: { B?: { readings?: LiveReading[] } } };
  return parsed.arms?.B?.readings ?? [];
}

export function trapFamily(label: string): string {
  if (familyAlias[label]) return familyAlias[label];
  const mechanism = misreadingMechanisms.find((item) => item.id === label);
  return mechanism?.requiredSemanticRelation ?? label;
}

export function existentialQuantityVariant(text: string): boolean {
  return /\b(some|not every|not all|not each)\b/i.test(text) || /not every|bazı/i.test(text);
}

export function independentFamily(reading: { misreadingMechanism: string | null; studentMisreading: string }): string | null {
  const id = reading.misreadingMechanism?.trim();
  if (!id) return null;
  if (existentialQuantityVariant(reading.studentMisreading)) return "universal_negative_quantity";
  return trapFamily(id);
}

/**
 * Benchmark-only planner gate. Same-family labels and existential weakenings of the
 * same universal negative are one trap. This does not change production min-4 schemas.
 */
export function selectIndependentPlans(
  readings: readonly Pick<LiveReading, "misreadingMechanism" | "studentMisreading">[],
): IndependentPlanReport {
  const seen = new Set<string>();
  const plans: BakeoffPlan[] = [];
  const droppedVariants: IndependentPlanReport["droppedVariants"] = [];
  const labels = new Set(readings.map((reading) => reading.misreadingMechanism).filter(Boolean));
  for (const [index, reading] of readings.entries()) {
    const family = independentFamily(reading);
    const mechanismId = reading.misreadingMechanism?.trim() ?? "";
    if (!family || !mechanismId) continue;
    if (seen.has(family)) {
      droppedVariants.push({ mechanismId, family, studentMisreading: reading.studentMisreading });
      continue;
    }
    seen.add(family);
    const changeRelation = familyToChange[family] ?? "quantity_scope";
    plans.push({
      planId: `p${index + 1}-${mechanismId}`,
      mechanismId,
      family,
      source: "live_reading",
      dominantMisreading: mechanismId,
      changeRelation,
      preserveRelations: [],
      forbiddenAdditions: ["new actor", "new event", "new purpose", "new cause", "unsupported assumption"],
      expectedStudentMisreading: reading.studentMisreading,
    });
  }
  const independentRelationCount = plans.length;
  if (plans.length < 4) {
    return { status: "source_insufficient_traps", plans, droppedVariants, independentRelationCount, mechanismLabelCount: labels.size, paddedToFour: false };
  }
  return { status: "ok", plans: plans.slice(0, 4), droppedVariants, independentRelationCount, mechanismLabelCount: labels.size, paddedToFour: false };
}

export function attachPreserve(plans: BakeoffPlan[], present: SemanticRelation[]): BakeoffPlan[] {
  return plans.map((plan) => ({
    ...plan,
    preserveRelations: present.filter((relation) => relation !== plan.changeRelation),
  }));
}

export const bakeoffWriterRules = [
  "Change only the one targeted meaning relation.",
  "Keep every other source event and relation on the preserve list.",
  "Do not add an actor, event, purpose, or cause that the source does not have.",
  "Write a natural academic sentence in the required language.",
  "The option must not be equivalent to the key or the source.",
  "Do not drop a whole clause to make the key the only complete sentence.",
] as const;

export function bakeoffWriterUser(input: {
  source: string;
  key: string;
  targetLanguage: "tr" | "en" | null;
  framePresent: { relation: SemanticRelation; statement: string | null }[];
  plans: BakeoffPlan[];
}): string {
  const language = input.targetLanguage ? `TARGET LANGUAGE: ${input.targetLanguage}` : "TARGET LANGUAGE: en";
  const frame = input.framePresent.map((slot) => `- ${slot.relation}: ${slot.statement ?? "present"}`).join("\n");
  const plans = input.plans.map((plan) =>
    [
      `PLAN ${plan.planId}`,
      `change: ${plan.family} (${plan.changeRelation})`,
      `preserve: ${plan.preserveRelations.join(", ")}`,
      `forbidden: ${plan.forbiddenAdditions.join(", ")}`,
      `studentMisreading: ${plan.expectedStudentMisreading}`,
    ].join("\n"),
  );
  return [
    language,
    ``,
    `SOURCE`,
    input.source,
    ``,
    `KEY`,
    input.key,
    ``,
    `SEMANTIC FRAME (preserve unless the plan names it as the change)`,
    frame,
    ``,
    `PLANS`,
    plans.join("\n\n"),
    ``,
    bakeoffWriterRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n"),
    `Writer self-report of preserved meaning is not proof.`,
    `Write one option per plan, in this order. Return ${input.plans.length} candidates. Do not pad.`,
  ].join("\n");
}

export type BakeoffParseResult = {
  status: "ok" | "parse_failure";
  candidates: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string }[];
  reason: string | null;
};

export function smokeReusable(input: {
  raw: unknown;
  planCount: number;
  source: string;
  key: string;
  targetLanguage: "tr" | "en" | null;
  expectedPlanIds?: string[];
}): { reusable: boolean; parse: BakeoffParseResult; blocks: string[] } {
  const parse = parseBakeoffWriterOutput(input.raw, input.planCount);
  if (parse.status !== "ok") return { reusable: false, parse, blocks: [] };
  const blocks = parse.candidates.flatMap((row) =>
    bakeoffHardBlocks({ source: input.source, key: input.key, option: row.candidateText, targetLanguage: input.targetLanguage }),
  );
  if (input.expectedPlanIds && parse.candidates.some((row, index) => row.planId !== input.expectedPlanIds![index])) {
    blocks.push("plan_id_order");
  }
  return { reusable: blocks.length === 0, parse, blocks: [...new Set(blocks)] };
}

export function parseBakeoffWriterOutput(raw: unknown, planCount: number): BakeoffParseResult {
  if (typeof raw === "string") {
    try {
      return parseBakeoffWriterOutput(JSON.parse(raw) as unknown, planCount);
    } catch {
      return { status: "parse_failure", candidates: [], reason: "json_parse" };
    }
  }
  if (!raw || typeof raw !== "object" || !("candidates" in raw) || !Array.isArray((raw as { candidates: unknown }).candidates)) {
    return { status: "parse_failure", candidates: [], reason: "missing_candidates" };
  }
  const candidates = (raw as { candidates: BakeoffParseResult["candidates"] }).candidates;
  if (candidates.length !== planCount) return { status: "parse_failure", candidates: [], reason: "count_mismatch" };
  if (candidates.some((row) => !row?.candidateText?.trim() || !row.planId?.trim() || !row.studentMisreading?.trim())) {
    return { status: "parse_failure", candidates: [], reason: "shape" };
  }
  return { status: "ok", candidates, reason: null };
}

export function bakeoffHardBlocks(input: { source: string; key: string; option: string; targetLanguage: "tr" | "en" | null }): string[] {
  const blocks: string[] = [];
  if (sameProposition(input.source, input.option) || sameProposition(input.key, input.option)) blocks.push("key_equivalence");
  if (classifyOption(input.source, input.key, input.option).relation === "confirmed_equivalent") blocks.push("second_defensible");
  if (incompleteOption(input.option)) blocks.push("truncated_proposition");
  if (input.targetLanguage) {
    const language = assessTargetLanguage({
      questionType: "translation",
      targetLanguage: input.targetLanguage,
      options: { A: input.key, B: input.option, C: input.option, D: input.option, E: input.option },
    });
    if (language.status === "fail") blocks.push("target_language");
  }
  return [...new Set(blocks)];
}

export function allowBakeoffCall(spentUsd: number, nextCallCeilingUsd: number, capUsd: number): boolean {
  return spentUsd + nextCallCeilingUsd <= capUsd;
}

export function assertBakeoffCall(spentUsd: number, nextCallCeilingUsd: number, capUsd: number): void {
  if (!allowBakeoffCall(spentUsd, nextCallCeilingUsd, capUsd)) {
    throw new BakeoffBudgetExceeded(`spend limit: next call would exceed $${capUsd}`);
  }
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

export type BlindUnit = {
  code: string;
  sourceId: string;
  source: string;
  key: string;
  planId: string;
  change: string;
  preserve: string[];
  forbidden: string[];
  expectedStudentMisreading: string;
  option: string;
};

export function packBlindOptions(input: {
  seed: number;
  items: { sourceId: string; source: string; key: string; model: string; options: { planId: string; change: string; preserve: string[]; forbidden: string[]; expectedStudentMisreading: string; text: string }[] }[];
}): { pack: BlindUnit[]; key: { code: string; model: string; sourceId: string; planId: string }[]; seed: number } {
  const rows: { unit: BlindUnit; model: string }[] = [];
  let n = 0;
  for (const item of input.items) {
    for (const option of item.options) {
      n += 1;
      const code = `R${String(n).padStart(3, "0")}`;
      rows.push({
        model: item.model,
        unit: {
          code,
          sourceId: item.sourceId,
          source: item.source,
          key: item.key,
          planId: option.planId,
          change: option.change,
          preserve: option.preserve,
          forbidden: option.forbidden,
          expectedStudentMisreading: option.expectedStudentMisreading,
          option: option.text,
        },
      });
    }
  }
  const packed = shuffle(rows, input.seed);
  return {
    seed: input.seed,
    pack: packed.map((row) => row.unit),
    key: packed.map((row) => ({ code: row.unit.code, model: row.model, sourceId: row.unit.sourceId, planId: row.unit.planId })),
  };
}

export function freezeWriterBakeoffTasks() {
  const items = byId();
  return architectureV2FrozenSourceIds.map((row) => {
    const item = items.get(row.id);
    if (!item) throw new Error(`missing ${row.id}`);
    const source = sourceSentence(item);
    const key = item.core.correctAnswer;
    const frame = frameForFrozenItem(row.id);
    const present = (Object.values(frame.slots) as { relation: SemanticRelation; status: string; statement: string | null }[])
      .filter((slot) => slot.status === "present")
      .map((slot) => ({ relation: slot.relation, statement: slot.statement }));
    const selected = selectIndependentPlans(liveReadings(row.id, row.liveDir));
    const plans = attachPreserve(selected.plans, present.map((slot) => slot.relation));
    const trap = reportTrapPlans(frame, plans);
    const scoring = selected.status === "ok";
    return {
      id: row.id,
      bucket: row.bucket,
      questionType: item.questionType,
      direction: item.direction,
      role: scoring ? ("scoring" as const) : ("negative_control" as const),
      source,
      key,
      sourceHash: contentVersion(source),
      keyHash: contentVersion(key),
      frameHash: contentVersion(JSON.stringify(frame.slots)),
      planHash: contentVersion(JSON.stringify(plans.map((plan) => ({ planId: plan.planId, family: plan.family, change: plan.changeRelation, misreading: plan.expectedStudentMisreading })))),
      independentRelationCount: selected.independentRelationCount,
      mechanismLabelCount: selected.mechanismLabelCount,
      droppedVariants: selected.droppedVariants,
      trapStatus: selected.status,
      paddedToFour: selected.paddedToFour,
      reportStatus: trap.status === "plan_invalid" ? trap.status : selected.status,
      plans: scoring ? plans : plans,
      framePresent: present,
      writerClaimIsNotProof: true as const,
      sourceImmutable: true as const,
      keyImmutable: true as const,
      observedDifficulty: null,
      meaningProven: false as const,
    };
  });
}

export function assessWriterBakeoffReadiness(input: {
  openrouterPrices: PriceCatalog;
  gatewayPrices: PriceCatalog;
  requestedWriters: readonly string[];
}) {
  const tasks = freezeWriterBakeoffTasks();
  const scoring = tasks.filter((task) => task.role === "scoring");
  const negative = tasks.filter((task) => task.role === "negative_control");
  const probes = input.requestedWriters.map((setting) => probeAdapter(setting, { openrouter: input.openrouterPrices, gateway: input.gatewayPrices }));
  const eligible = probes.filter((probe) => probe.priced && probe.catalog === "openrouter");
  const rejected = probes.filter((probe) => !probe.priced).map((probe) => ({ setting: probe.setting, reason: "unsupported_provider_id" as const, substituted: false as const }));
  const smokeTask = scoring.find((task) => task.id === writerBakeoffSmokeSourceId) ?? null;
  const smokeCalls = eligible.length;
  const comparisonCalls = scoring.length * eligible.length;
  const remainingAfterReusableSmoke = Math.max(0, scoring.length - (smokeTask ? 1 : 0)) * eligible.length;
  const reusableTotalCalls = smokeCalls + remainingAfterReusableSmoke;
  const discardedSmokeTotalCalls = smokeCalls + comparisonCalls;
  const writerCalls = comparisonCalls;
  const plannerCalls = 0;
  const judgeCalls = 0;
  const recoveryCalls = 0;
  const maxCalls = discardedSmokeTotalCalls;
  const ceilings = eligible.map((probe) => {
    const usd = probe.in != null && probe.out != null ? callCeilingUsd({ in: probe.in, out: probe.out, cacheWrite: probe.cacheWrite ?? undefined }, architectureV2WriterTokenCeiling) : null;
    return { setting: probe.setting, perCallUsd: usd, inputTokens: architectureV2WriterTokenCeiling.input, outputTokens: architectureV2WriterTokenCeiling.output, reasoningTokens: "reported_separately_from_usage_never_inferred" };
  });
  const perCallKnown = ceilings.every((row) => row.perCallUsd != null);
  const perModelSumUsd = perCallKnown ? ceilings.reduce((sum, row) => sum + (row.perCallUsd ?? 0), 0) : null;
  const smokeCeilingUsd = perModelSumUsd;
  const bakeoffCeilingUsd = perModelSumUsd != null ? scoring.length * perModelSumUsd : null;
  const reusablePathCeilingUsd = bakeoffCeilingUsd;
  const worstCaseCeilingUsd = smokeCeilingUsd != null && bakeoffCeilingUsd != null ? smokeCeilingUsd + bakeoffCeilingUsd : null;
  const fitsTargetCap = bakeoffCeilingUsd != null && bakeoffCeilingUsd <= writerBakeoffTargetCapUsd;
  const fourModelCeilingUsd = eligible.length === input.requestedWriters.length && bakeoffCeilingUsd != null ? bakeoffCeilingUsd : null;
  const sampleWriter = scoring[0]
    ? bakeoffWriterUser({
        source: scoring[0].source,
        key: scoring[0].key,
        targetLanguage: scoring[0].direction === "en_tr" ? "tr" : scoring[0].direction === "tr_en" ? "en" : null,
        framePresent: scoring[0].framePresent,
        plans: scoring[0].plans,
      })
    : "";
  const fixturePack = packBlindOptions({
    seed: writerBakeoffBlindSeed,
    items: scoring.flatMap((task) =>
      eligible.map((probe) => ({
        sourceId: task.id,
        source: task.source,
        key: task.key,
        model: probe.setting,
        options: task.plans.map((plan) => ({
          planId: plan.planId,
          change: plan.family,
          preserve: plan.preserveRelations,
          forbidden: plan.forbiddenAdditions,
          expectedStudentMisreading: plan.expectedStudentMisreading,
          text: `[pending writer output for ${plan.planId}]`,
        })),
      })),
    ),
  });
  const humanPack = fixturePack.pack;
  const packHasModelId = /claude-haiku|claude-sonnet|deepseek|openrouter:|gemini-4/i.test(JSON.stringify(humanPack));
  const readyReasons = [
    "This round forbids live Writer, Judge, Recovery, and bank calls.",
    `Equal eight-item comparison needs eight scoring sources; ${scoring.length} scored and ${negative.length} held as negative controls. No replacement source was added.`,
    "Human blind panel is not staffed.",
    "JSON-schema honor stays unverified: catalog structured_outputs is not a live decode proof.",
    "Production Writer and Judge stay frozen until a completed comparison and an explicit switch.",
  ];
  if (!fitsTargetCap) readyReasons.push(`Four-model ceiling $${bakeoffCeilingUsd?.toFixed(4) ?? "unknown"} exceeds the $0.50 target. Do not drop a model, a source, or the 4096 floor to fit.`);
  return {
    version: writerBakeoffAuthorization,
    liveAuthorized: writerBakeoffLiveAuthorized,
    readyForLiveBakeOff: false as const,
    readyReasons,
    providerCalls: 0 as const,
    studentBankWrites: 0 as const,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
    judgeDuringComparison: "off" as const,
    judgeModelUnchanged: writerBakeoffJudgeUnchanged,
    productionWriterUnchanged: qualityFirstFrozenModels.writer,
    productionPathUnchanged: true as const,
    recordsImmutable: true as const,
    meaningProven: false as const,
    qualityProven: false as const,
    observedDifficulty: null,
    forbiddenDirsIncludeOutput: (qualityFirstPilotForbiddenDirs as readonly string[]).includes(writerBakeoffOutputDir),
    tasks,
    scoringIds: scoring.map((task) => task.id),
    negativeControlIds: negative.map((task) => task.id),
    equalEightItemComparison: scoring.length === 8,
    adapter: {
      probes,
      eligibleWriters: eligible.map((probe) => probe.setting),
      rejectedWriters: rejected,
      noSubstitution: true as const,
      jsonSchemaHonored: "unverified" as const,
      reasoningInequality: "OpenRouter always sends reasoning.exclude=true and a 4096 output floor. Gateway uses reasoning.effort. Bake-off stays on OpenRouter. Reasoning tokens are recorded from usage, never inferred.",
    },
    callGraph: {
      plannerCalls,
      writerCalls,
      judgeCalls,
      recoveryCalls,
      smokeCalls,
      comparisonCalls,
      reusableTotalCalls,
      discardedSmokeTotalCalls,
      maxCalls,
      smokeSourceId: writerBakeoffSmokeSourceId,
      smokeIsScoring: Boolean(smokeTask),
      reuseSmokeIfContractHolds: true,
      varyWriterOnly: true,
      sharedFrozenPlans: true,
    },
    budget: {
      targetCapUsd: writerBakeoffTargetCapUsd,
      bakeoffCeilingUsd,
      smokeCeilingUsd,
      reusablePathCeilingUsd,
      worstCaseCeilingUsd,
      fitsTargetCap,
      recommendedCapUsd: worstCaseCeilingUsd == null ? null : Math.ceil(worstCaseCeilingUsd * 100) / 100,
      perModel: ceilings,
      fourRequestedModelCeilingUsd: fourModelCeilingUsd,
      fourRequestedModelScenario: "First round is Haiku 5.5, DeepSeek V3.2, Gemini 4 Hydrogen, Gemini 4 Argon. Neon is stage-2 only. The 6×4 Writer ceiling exceeds $0.50. Conservative cap includes four smoke calls discarded plus the full comparison. Do not drop Argon or Hydrogen, shrink the 4096 floor, or swap Neon / v3.2-exp / v4.1-flash / 3.8-flash. Authorize a higher cap or keep the comparison closed.",
      inputReasoningOutputReportedSeparately: true,
      failedProductionCostIncluded: true,
    },
    contract: {
      rules: bakeoffWriterRules,
      writerSelfEvalIsNotProof: true,
      sampleUserHasRules: bakeoffWriterRules.every((rule) => sampleWriter.includes(rule.slice(0, 24))),
    },
    blind: {
      seed: writerBakeoffBlindSeed,
      modelNameHidden: !packHasModelId,
      unitCount: humanPack.length,
      judgeScoreIsNotEditorialAcceptance: true,
    },
    bank: { publishThrows: true as const },
  };
}

export function writeWriterBakeoffReadiness(input: {
  openrouterPrices: PriceCatalog;
  gatewayPrices: PriceCatalog;
  requestedWriters: readonly string[];
}) {
  const report = assessWriterBakeoffReadiness(input);
  mkdirSync(writerBakeoffOutputDir, { recursive: true });
  writeFileSync(
    path.join(writerBakeoffOutputDir, "summary.json"),
    `${JSON.stringify({
      version: report.version,
      liveAuthorized: false,
      readyForLiveBakeOff: false,
      readyReasons: report.readyReasons,
      providerCalls: 0,
      studentBankWrites: 0,
      scoringIds: report.scoringIds,
      negativeControlIds: report.negativeControlIds,
      eligibleWriters: report.adapter.eligibleWriters,
      rejectedWriters: report.adapter.rejectedWriters,
      maxCalls: report.callGraph.maxCalls,
      smokeCalls: report.callGraph.smokeCalls,
      reusableTotalCalls: report.callGraph.reusableTotalCalls,
      discardedSmokeTotalCalls: report.callGraph.discardedSmokeTotalCalls,
      bakeoffCeilingUsd: report.budget.bakeoffCeilingUsd,
      smokeCeilingUsd: report.budget.smokeCeilingUsd,
      worstCaseCeilingUsd: report.budget.worstCaseCeilingUsd,
      recommendedCapUsd: report.budget.recommendedCapUsd,
      fitsTargetCap: report.budget.fitsTargetCap,
      equalEightItemComparison: report.equalEightItemComparison,
    }, null, 2)}\n`,
  );
  writeFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), `${JSON.stringify(report.tasks.map((task) => ({
    id: task.id,
    role: task.role,
    sourceHash: task.sourceHash,
    keyHash: task.keyHash,
    frameHash: task.frameHash,
    planHash: task.planHash,
    trapStatus: task.trapStatus,
    independentRelationCount: task.independentRelationCount,
    mechanismLabelCount: task.mechanismLabelCount,
    paddedToFour: task.paddedToFour,
    plans: task.plans.map((plan) => ({
      planId: plan.planId,
      family: plan.family,
      mechanismId: plan.mechanismId,
      changeRelation: plan.changeRelation,
      preserveRelations: plan.preserveRelations,
      forbiddenAdditions: plan.forbiddenAdditions,
      expectedStudentMisreading: plan.expectedStudentMisreading,
    })),
  })), null, 2)}\n`);
  writeFileSync(path.join(writerBakeoffOutputDir, "plan.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function refuseWriterBakeoffLive(authorization: string): {
  started: false;
  executed: false;
  providerCalls: 0;
  studentBankWrites: 0;
  recoveryCalls: 0;
  reason: string;
} {
  const reason =
    authorization !== writerBakeoffAuthorization
      ? "writer bake-off authorization required"
      : "live bake-off is closed";
  return { started: false, executed: false, providerCalls: 0, studentBankWrites: 0, recoveryCalls: 0, reason };
}

export function assertStudentBankClosed(): void {
  publishToStudentBank();
}
