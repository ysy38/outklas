import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sourceSentence } from "./cognitive-trap";
import { contentVersion } from "./distractor-strategy";
import { selectMisreadingMechanisms } from "./misreading-mechanisms";
import { qualityFirstFrozenModels, qualityFirstItems, qualityFirstPilotOutputDir } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import {
  buildSemanticFrame,
  reportTrapPlans,
  semanticPreservationVersion,
  semanticRelations,
  writerTask,
  type DistractorPlan,
  type SemanticFrame,
  type SemanticRelation,
} from "./semantic-preservation";
import { taxonomyLiveItems, taxonomyLiveOutputDir } from "./taxonomy-live";

export const architectureV2Authorization = "question-factory-architecture-v2";
export const architectureV2OutputDir = ".data/analysis/_factory/cognitive-trap/architecture-v2";
export const architectureV2LiveAuthorized = false;

/** Same OpenRouter rail as production. Not a change to modelDefaults. */
export const architectureV2RoleDefaults = {
  misreadingPlannerModel: "openrouter:anthropic/claude-haiku-5.5",
  distractorWriterModel: "openrouter:anthropic/claude-haiku-5.5",
  blindJudgeModel: "openrouter:anthropic/claude-sonnet-5.5",
  repairModel: "openrouter:anthropic/claude-haiku-5.5",
} as const;

export const architectureV2WriterTokenCeiling = { input: 3000, output: 4096, cacheWrite: 1500 } as const;
export const architectureV2JudgeTokenCeiling = { input: 4000, output: 4096, cacheWrite: 1700 } as const;

export type CatalogPrice = { in: number; out: number; cacheWrite?: number; cacheRead?: number; note?: string };
export type PriceCatalog = Record<string, CatalogPrice>;

export type FrozenSourceBucket =
  | "restatement_condition_time_counterfactual"
  | "restatement_epistemic_negation_scope"
  | "en_tr"
  | "tr_en";

export const architectureV2FrozenSourceIds: { id: string; bucket: FrozenSourceBucket; liveDir: string }[] = [
  { id: "quality-first-restatement-counterfactual", bucket: "restatement_condition_time_counterfactual", liveDir: qualityFirstPilotOutputDir },
  { id: "taxonomy-restatement-hard", bucket: "restatement_condition_time_counterfactual", liveDir: taxonomyLiveOutputDir },
  { id: "quality-first-restatement-epistemic", bucket: "restatement_epistemic_negation_scope", liveDir: qualityFirstPilotOutputDir },
  { id: "taxonomy-restatement-medium", bucket: "restatement_epistemic_negation_scope", liveDir: taxonomyLiveOutputDir },
  { id: "quality-first-translation-en_tr", bucket: "en_tr", liveDir: qualityFirstPilotOutputDir },
  { id: "taxonomy-translation-en_tr", bucket: "en_tr", liveDir: taxonomyLiveOutputDir },
  { id: "quality-first-translation-tr_en", bucket: "tr_en", liveDir: qualityFirstPilotOutputDir },
  { id: "taxonomy-translation-tr_en", bucket: "tr_en", liveDir: taxonomyLiveOutputDir },
];

export type AdapterProbe = {
  setting: string;
  provider: string;
  model: string;
  catalog: "openrouter" | "gateway" | "absent";
  priced: boolean;
  in: number | null;
  out: number | null;
  cacheWrite: number | null;
  note: string | null;
  jsonSchemaOnWire: "openrouter_json_schema_strict" | "gateway_json_schema_strict" | "unverified";
  jsonSchemaHonored: "unverified";
  reasoningOnWire: "openrouter_exclude_true" | "gateway_effort_or_none" | "unverified";
  outputTokenFloor: 4096 | null;
  substituted: false;
};

export type BlindOptionRating = {
  coverageRetention: "pass" | "fail" | "unverified";
  singleDominantMutation: "pass" | "fail" | "unverified";
  naturalness: "pass" | "fail" | "unverified";
  extraClaim: "yes" | "no" | "unverified";
  secondAnswerRisk: "yes" | "no" | "unverified";
  duplicateTrap: "yes" | "no" | "unverified";
  formalCue: "yes" | "no" | "unverified";
  semanticStatus: "confirmed_difference" | "confirmed_equivalent" | "unverified";
};

export type BlindItemDecision = "accept" | "reject" | "return_to_source";

type LiveArmSnapshot = {
  status: string;
  editorial: string;
  modelVerdict: string | null;
  qualityDecision: string | null;
};

function itemsById() {
  return new Map(
    [...qualityFirstItems().map((entry) => entry.item), ...taxonomyLiveItems().map((entry) => entry.item)].map((item) => [item.id, item]),
  );
}

function meaningById() {
  return new Map(
    [...qualityFirstItems().map((entry) => [entry.item.id, entry.meaningMap] as const), ...taxonomyLiveItems().map((entry) => [entry.item.id, entry.meaningMap] as const)],
  );
}

function readLiveArm(dir: string, id: string): LiveArmSnapshot | null {
  const file = path.join(dir, `${id}.json`);
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { arms?: { B?: LiveArmSnapshot } };
  const arm = parsed.arms?.B;
  if (!arm) return null;
  return {
    status: arm.status,
    editorial: arm.editorial,
    modelVerdict: arm.modelVerdict ?? null,
    qualityDecision: arm.qualityDecision ?? null,
  };
}

function parseSetting(setting: string): { provider: string; model: string } {
  const cut = setting.indexOf(":");
  return cut === -1 ? { provider: "unknown", model: setting } : { provider: setting.slice(0, cut), model: setting.slice(cut + 1) };
}

export function callCeilingUsd(price: CatalogPrice, tokens: { input: number; output: number; cacheWrite: number }): number {
  return (tokens.input * price.in + tokens.output * price.out + tokens.cacheWrite * (price.cacheWrite ?? 0)) / 1_000_000;
}

export function probeAdapter(setting: string, catalogs: { openrouter: PriceCatalog; gateway: PriceCatalog }): AdapterProbe {
  const { provider, model } = parseSetting(setting);
  const row = provider === "openrouter" ? catalogs.openrouter[setting] : provider === "gateway" ? catalogs.gateway[setting] : undefined;
  const catalog = row ? (provider === "gateway" ? "gateway" : "openrouter") : "absent";
  return {
    setting,
    provider,
    model,
    catalog,
    priced: Boolean(row),
    in: row?.in ?? null,
    out: row?.out ?? null,
    cacheWrite: row?.cacheWrite ?? null,
    note: row?.note ?? null,
    jsonSchemaOnWire: provider === "openrouter" ? "openrouter_json_schema_strict" : provider === "gateway" ? "gateway_json_schema_strict" : "unverified",
    jsonSchemaHonored: "unverified",
    reasoningOnWire: provider === "openrouter" ? "openrouter_exclude_true" : provider === "gateway" ? "gateway_effort_or_none" : "unverified",
    outputTokenFloor: provider === "openrouter" || provider === "gateway" ? 4096 : null,
    substituted: false,
  };
}

const evaluationToSlot: Record<string, SemanticRelation> = {
  participant_roles: "actors",
  two_predicates: "main_actions",
  quantity: "quantity_scope",
  exclusive_focus: "quantity_scope",
  time_order: "time_order",
  time_interval: "time_order",
  cause: "cause",
  concession: "cause",
  purpose: "purpose",
  condition: "condition_counterfactual",
  counterfactual: "condition_counterfactual",
  negation: "negation",
  modal_force: "modality_epistemic",
  evidence: "modality_epistemic",
  reference: "referents",
};

function slotFromMeaning(relation: SemanticRelation, meaning: { preserved: string[]; relations: string[] }, evaluations: { relation: string; status: string; basis: string }[]): SemanticFrame["slots"][SemanticRelation] {
  const hits = evaluations.filter((row) => evaluationToSlot[row.relation] === relation);
  const present = hits.find((row) => row.status === "present");
  if (present) {
    const preserved = meaning.preserved.find((line) => line.toLocaleLowerCase("en-US").includes(relation.split("_").join(" "))) ?? meaning.preserved[0] ?? null;
    return { relation, status: "present", statement: preserved, basis: present.basis };
  }
  if (hits.length && hits.every((row) => row.status === "absent")) {
    return { relation, status: "absent", statement: null, basis: hits[0]?.basis ?? "No wording in the source supports this relation." };
  }
  if (hits.some((row) => row.status === "unresolved")) {
    return { relation, status: "unverified", statement: null, basis: "Mechanism evaluation left this relation unresolved." };
  }
  return { relation, status: "unverified", statement: null, basis: "Not shown by a deterministic checker." };
}

export function frameForFrozenItem(id: string): SemanticFrame {
  const item = itemsById().get(id);
  if (!item) throw new Error(`unknown frozen item ${id}`);
  const meaning = meaningById().get(id) ?? { preserved: item.preservedRelations, relations: [] };
  const support = selectMisreadingMechanisms(sourceSentence(item), item.questionType);
  const slots = Object.fromEntries(semanticRelations.map((relation) => [relation, slotFromMeaning(relation, meaning, support.evaluations)])) as SemanticFrame["slots"];
  return buildSemanticFrame({
    source: sourceSentence(item),
    questionType: item.questionType,
    direction: item.direction,
    slots,
  });
}

function naturalPlans(frame: SemanticFrame): DistractorPlan[] {
  const present = semanticRelations.filter((relation) => frame.slots[relation].status === "present");
  return present.map((relation) => ({
    dominantMisreading: relation,
    changeRelation: relation,
    preserveRelations: present.filter((item) => item !== relation),
    forbiddenAdditions: ["new actor", "new event", "unsupported assumption"],
    expectedStudentMisreading: `The reader changes ${relation} and keeps the rest of the source.`,
  }));
}

export const architectureV2BlindEvalProtocol = {
  modelNameHidden: true,
  judgeApproveIsNotEditorialAcceptance: true,
  recoveryOffDuringComparison: true,
  perOption: [
    "coverageRetention",
    "singleDominantMutation",
    "naturalness",
    "extraClaim",
    "secondAnswerRisk",
    "duplicateTrap",
    "formalCue",
  ] as const,
  semanticStatus: ["confirmed_difference", "confirmed_equivalent", "unverified"] as const,
  itemDecision: ["accept", "reject", "return_to_source"] as const,
  reportJudgeHumanDisagreementSeparately: true,
  doNotPadLowQualityOptions: true,
} satisfies {
  modelNameHidden: true;
  judgeApproveIsNotEditorialAcceptance: true;
  recoveryOffDuringComparison: true;
  perOption: readonly (keyof BlindOptionRating)[];
  semanticStatus: readonly BlindOptionRating["semanticStatus"][];
  itemDecision: readonly BlindItemDecision[];
  reportJudgeHumanDisagreementSeparately: true;
  doNotPadLowQualityOptions: true;
};

export const architectureV2Metrics = [
  "validOptionRate",
  "singleDominantMutationRate",
  "semanticCoverageRetention",
  "naturalnessPassRate",
  "duplicateTrapRate",
  "fiveOptionCompletion",
  "editorialAcceptanceRate",
  "totalCostPerAcceptedItem",
] as const;

export const architectureV2PermanentFlow = [
  "Source Design",
  "Key Verification",
  "Semantic Frame",
  "Misreading Plan",
  "Writer",
  "Structural Gate",
  "Semantic/Editorial Evaluation",
  "Targeted Recovery",
  "Final Review",
  "Bank",
] as const;

export function assessArchitectureV2(input: {
  openrouterPrices: PriceCatalog;
  gatewayPrices: PriceCatalog;
  requestedWriters: readonly string[];
  stage2Writers: readonly string[];
}) {
  const items = itemsById();
  const frozen = architectureV2FrozenSourceIds.map((row) => {
    const item = items.get(row.id);
    if (!item) throw new Error(`frozen source missing ${row.id}`);
    const source = sourceSentence(item);
    const key = item.core.correctAnswer;
    const support = selectMisreadingMechanisms(source, item.questionType);
    const frame = frameForFrozenItem(row.id);
    const plans = naturalPlans(frame);
    const trapReport = reportTrapPlans(frame, plans);
    const live = readLiveArm(row.liveDir, row.id);
    return {
      id: row.id,
      bucket: row.bucket,
      questionType: item.questionType,
      direction: item.direction,
      source,
      key,
      sourceHash: contentVersion(source),
      keyHash: contentVersion(key),
      supportableMisreadings: support.supportableMisreadings,
      mechanismStatus: support.status,
      trapReport: trapReport.status,
      naturalTrapCount: trapReport.naturalTrapCount,
      liveEditorial: live?.editorial ?? "record_absent",
      liveVerdict: live?.modelVerdict ?? null,
      liveQualityDecision: live?.qualityDecision ?? null,
      liveStatus: live?.status ?? null,
      sourceImmutable: true as const,
      keyImmutable: true as const,
      observedDifficulty: null,
      meaningProven: false as const,
    };
  });

  const probes = input.requestedWriters.map((setting) => probeAdapter(setting, { openrouter: input.openrouterPrices, gateway: input.gatewayPrices }));
  const stage2 = input.stage2Writers.map((setting) => probeAdapter(setting, { openrouter: input.openrouterPrices, gateway: input.gatewayPrices }));
  const eligibleWriters = probes.filter((probe) => probe.priced && probe.catalog === "openrouter");
  const blockedWriters = probes.filter((probe) => !probe.priced);
  const hydrogen = eligibleWriters.find((probe) => probe.setting.endsWith("-hydrogen")) ?? {
    label: "hydrogen",
    setting: null,
    catalog: "absent" as const,
    priced: false,
    substituted: false as const,
    note: "No priced OpenRouter row for this bake-off list.",
  };

  const haiku = probes.find((probe) => probe.setting === architectureV2RoleDefaults.distractorWriterModel);
  const argon = probes.find((probe) => probe.setting.endsWith("-argon"));
  const plannerCalls = frozen.length;
  const writerCalls = frozen.length * eligibleWriters.length;
  const judgeCalls = 0;
  const recoveryCalls = 0;
  const maxCalls = plannerCalls + writerCalls + judgeCalls + recoveryCalls;

  const haikuCall = haiku?.priced && haiku.in != null && haiku.out != null
    ? callCeilingUsd({ in: haiku.in, out: haiku.out, cacheWrite: haiku.cacheWrite ?? undefined }, architectureV2WriterTokenCeiling)
    : null;
  const argonCall = argon?.priced && argon.in != null && argon.out != null
    ? callCeilingUsd({ in: argon.in, out: argon.out, cacheWrite: argon.cacheWrite ?? undefined }, architectureV2WriterTokenCeiling)
    : null;
  const sonnetJudge = probeAdapter(architectureV2RoleDefaults.blindJudgeModel, { openrouter: input.openrouterPrices, gateway: input.gatewayPrices });
  const judgeCall = sonnetJudge.priced && sonnetJudge.in != null && sonnetJudge.out != null
    ? callCeilingUsd({ in: sonnetJudge.in, out: sonnetJudge.out, cacheWrite: sonnetJudge.cacheWrite ?? undefined }, architectureV2JudgeTokenCeiling)
    : null;

  const writerCallCeilings = eligibleWriters.map((probe) =>
    probe.in != null && probe.out != null ? callCeilingUsd({ in: probe.in, out: probe.out, cacheWrite: probe.cacheWrite ?? undefined }, architectureV2WriterTokenCeiling) : null,
  );
  const bakeoffCeilingUsd =
    haikuCall == null || writerCallCeilings.some((usd) => usd == null)
      ? null
      : plannerCalls * haikuCall + frozen.length * writerCallCeilings.reduce<number>((sum, usd) => sum + (usd ?? 0), 0);

  const unitEconomy = {
    metric: "totalCostPerAcceptedItem",
    notTokenPrice: true,
    haikuWriterCallCeilingUsd: haikuCall,
    argonWriterCallCeilingUsd: argonCall,
    argonOverHaikuPerCall: haikuCall && argonCall ? argonCall / haikuCall : null,
    note: "Argon cannot win on token price. It wins only if editorialAcceptanceRate lifts totalCostPerAcceptedItem. Live Quality-First accepted 0 items, so the current denominator is zero.",
  };

  const weaknesses = [
    "Writer B-options change several meaning relations at once, drop required events, and create only_complete_option length clues (plates A, faculty A/D/C).",
    "misreadingOutput and misreadingOptionsOutput require min 4 candidates, so the planner/writer invent weak fourth traps even when catalogIsNotAQuota is true.",
    "selectMisreadingMechanisms fails below 4 (insufficient_source_relations) while the schema still demands four readings.",
    "Judge APPROVE is not editorial acceptance: Quality-First had 3 APPROVE, 0 editorially_accepted, qualityDecision needs_revision.",
    "Writer self-evaluation and meaningDelta are not proof; meaningProven must stay false.",
    "Conflicting gates: surface_edit vs meaning-fail, only_complete_option after selector keep, proposition hold vs judge APPROVE, restatement quantity_scope vs translation quantity_shift names.",
    "OpenRouter always sends reasoning.exclude=true; Gateway sends reasoning.effort. Those budgets cannot be equalized.",
    "OpenRouter lists the four requested Writer ids; JSON-schema honor is still unverified. Substituting v4.1-flash, v3.2-exp, or 3.8-flash is forbidden.",
  ];

  const readyReasons = [
    "This round forbids live API calls.",
    "Four-model Writer comparison is priced, but JSON-schema honor is unverified and no live bake-off is authorized.",
    "JSON-schema honor and per-model reasoning consumption are unverified without a live probe.",
    "Shared planner artifacts are not frozen from a live B-read.",
    "Human blind panel is not staffed and no spend cap is authorized.",
    "Production models stay frozen until the comparison completes.",
  ];

  return {
    version: architectureV2Authorization,
    liveAuthorized: architectureV2LiveAuthorized,
    readyForLiveBakeOff: false as const,
    readyReasons,
    providerCalls: 0 as const,
    studentBankWrites: 0 as const,
    meaningProven: false as const,
    qualityProven: false as const,
    observedDifficulty: null,
    productionPathUnchanged: true as const,
    recordsImmutable: true as const,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
    roles: architectureV2RoleDefaults,
    rolesMatchQualityFirst: architectureV2RoleDefaults.distractorWriterModel === qualityFirstFrozenModels.writer && architectureV2RoleDefaults.blindJudgeModel === qualityFirstFrozenModels.judge,
    contractVersion: semanticPreservationVersion,
    frozenSources: frozen,
    adapter: {
      probes,
      stage2,
      hydrogen,
      eligibleWriters: eligibleWriters.map((probe) => probe.setting),
      blockedWriters: blockedWriters.map((probe) => ({ setting: probe.setting, reason: "no_price_in_local_catalog" })),
      reasoningInequality: "OpenRouter generate always sets reasoning.exclude=true and a 4096 max_tokens floor. Gateway sets reasoning.effort from the role thinking level, or none. Bake-off stays on OpenRouter so Writer comparison is not mixed with Gateway effort. Reasoning tokens, if billed, are recorded from usage.reasoningTokens and never inferred.",
      jsonSchema: "OpenRouter sends response_format json_schema strict true. Gateway sends the same after anthropicSchema wrapping. Catalog notes mark structured_outputs on some models; the argon row does not. Honor is unverified until a live probe.",
      noSubstitution: true as const,
    },
    bakeoff: {
      sharedPlanner: true,
      plannerModel: architectureV2RoleDefaults.misreadingPlannerModel,
      varyWriterOnly: true,
      recovery: "off",
      judgeDuringComparison: "off",
      modelNameHiddenFromRaters: true,
      sources: frozen.length,
      plannerCalls,
      writerCalls,
      judgeCalls,
      recoveryCalls,
      maxCalls,
      eligibleWriters: eligibleWriters.map((probe) => probe.setting),
      record: ["inputTokens", "outputTokens", "reasoningTokens", "latencyMs", "costUsd"],
    },
    budget: {
      assumption: "Upper bound uses 3000/4096/1500 Writer tokens and 4000/4096/1700 Judge tokens, including the OpenRouter output floor. It is not a measured bill.",
      bakeoffCeilingUsd,
      recommendedCapUsd: bakeoffCeilingUsd == null ? null : Math.ceil(bakeoffCeilingUsd * 100) / 100,
      haikuWriterCallCeilingUsd: haikuCall,
      argonWriterCallCeilingUsd: argonCall,
      sonnetJudgeCallCeilingUsd: judgeCall,
      failedProductionCostIncluded: true,
      recoveryCostUsd: 0,
      judgeCostDuringComparisonUsd: 0,
      humanEditorialRatings: frozen.length * eligibleWriters.length * 4,
      unitEconomy,
      totalCostPerAcceptedItem: null,
      liveQualityFirstCostUsd: 0.051902,
      liveQualityFirstAccepted: 0,
    },
    weaknesses,
    taskSplit: {
      misreadingPlannerModel: "Build the semantic frame and only natural single-dominant misreadings. Return source_insufficient_traps instead of padding.",
      distractorWriterModel: "Write one option per plan. Change only the targeted relation. Keep actors, events, and the preserve list.",
      blindJudgeModel: "Independent REVIEW/APPROVE/REJECT. Not editorial acceptance.",
      repairModel: "Local Repair/Replace after comparison, only on verified local defects.",
      humanEditor: "Blind option ratings and item accept/reject/return_to_source. Bank writes require this approval.",
    },
    permanentFlow: architectureV2PermanentFlow,
    modules: {
      reuse: [
        "assessKey",
        "assessMeaningIntegrity",
        "selectMisreadingMechanisms.evaluations",
        "selectCognitiveDistractors",
        "linkMisreadingCandidates",
        "selectDistractors.insufficient_pool",
        "assessWholeSet",
        "classifyOption",
        "assessProposition",
        "attachRecovery",
        "screenExamSurface",
        "contentVersion",
        "goldCriteria",
        "refuseStudentBankWrite",
      ],
      adapt: [
        "B-read prompt emits Semantic Preservation Contract instead of unconstrained four-to-six readings",
        "B-options user includes changeRelation, preserveRelations, forbiddenAdditions",
        "misreadingOutput min(4) and misreadingOptionsOutput min(4) become naturalTrapCount",
        "finishArm fewer_than_four_options vs source_insufficient_traps",
        "selectMisreadingMechanisms insufficient_source_relations returns to Source Design",
        "Independent role settings without changing modelDefaults",
        "Recovery runs only on verified local defects after the Writer comparison",
      ],
      retire: [
        "Forcing four traps per source",
        "Treating writer meaningDelta or Judge APPROVE as qualityProven",
        "firstPassYield as a quality metric",
        "Silent source or key rewrite after Key Verification",
        "A new LLM semantic-validator chain",
        "Substituting deepseek-v4.1-flash or 3.8-flash for missing requested ids",
      ],
    },
    validatorConflicts: [
      { a: "assessMeaningIntegrity never returns pass", b: "classifyOption confirmed_difference on meaning fail", note: "Compatible if unverified is not treated as equivalent." },
      { a: "surfaceEdit bag-of-words delta≤2", b: "meaning-fail keep exception", note: "Yield-opt aligned No→Some; unverified near copies still drop." },
      { a: "sameProposition", b: "assessMeaningIntegrity unverified", note: "Paraphrase can look different and still be unresolved." },
      { a: "selectMisreadingMechanisms <4 fail", b: "misreadingOutput.min(4)", note: "Catalog says not a quota; schema still forces four readings." },
      { a: "selector keeps a short option", b: "assessWholeSet only_complete_option", note: "Plates A is writer completeness, not a selector cull." },
      { a: "Judge APPROVE", b: "qualityDecision needs_revision and editorial pending", note: "Judge is not editorial acceptance." },
      { a: "proposition-guard hold", b: "Judge APPROVE", note: "A hold is not erased by the judge." },
      { a: "qualityFirstKeyGate requires mechanisms selected", b: "taxonomyKeyGate does not", note: "Unify as Source Design return via source_insufficient_traps." },
      { a: "restatement quantity_scope", b: "translation quantity_shift", note: "Same student error, two enum names; unknown_mechanism if mixed." },
    ],
    recovery: {
      keepRepairReplace: true,
      default: "off",
      bakeoff: "off",
      laterMeasureWinnerPlusRecoverySeparately: true,
      onlyVerifiedLocalDefects: true,
    },
    switchCriteria: {
      productionModelsUnchangedUntil: "bake-off complete + blind human ratings + explicit switch authorization",
      require: [
        "eligible priced Writers compared on the frozen eight with shared planner output",
        "editorialAcceptanceRate from blind humans, not Judge APPROVE",
        "singleDominantMutationRate and semanticCoverageRetention not worse than Haiku",
        "totalCostPerAcceptedItem is the economic score, not list price",
        "JSON parse success not worse than Haiku",
        "human-judge disagreements reported, not used as the switch",
        "no student-bank write",
      ],
      argonWinsOnlyIf: "Haiku editorialAcceptanceRate stays near zero and Argon produces accepted items whose fully loaded cost still clears the authorized cap.",
    },
    implementationSequence: [
      { step: 1, name: "Map current architecture", status: "done" },
      { step: 2, name: "Design Semantic Preservation Contract offline", status: "done" },
      { step: 3, name: "Freeze eight sources and evaluation set", status: "done" },
      { step: 4, name: "Test model adapter identity against local catalogs", status: "catalog_only" },
      { step: 5, name: "Prepare blind evaluation contract", status: "done" },
      { step: 6, name: "Run offline tests", status: "this_round" },
      { step: 7, name: "Writer bake-off budget and call plan", status: "done" },
      { step: 8, name: "Stop without live API authorization", status: "stop" },
    ],
    contract: {
      version: semanticPreservationVersion,
      relations: semanticRelations,
      sharedByRestatementAndTranslation: true,
      writerSelfEvalIsNotProof: true,
      sampleWriterTask: writerTask({
        dominantMisreading: "QUANTITY_SCOPE",
        changeRelation: "quantity_scope",
        preserveRelations: semanticRelations.filter((relation) => relation !== "quantity_scope"),
        forbiddenAdditions: ["new actor", "new event", "unsupported assumption"],
        expectedStudentMisreading: "every is read as some",
      }),
    },
    blindEval: architectureV2BlindEvalProtocol,
    metrics: architectureV2Metrics,
  };
}

export function writeArchitectureV2Plan(input: {
  openrouterPrices: PriceCatalog;
  gatewayPrices: PriceCatalog;
  requestedWriters: readonly string[];
  stage2Writers: readonly string[];
}) {
  const report = assessArchitectureV2(input);
  mkdirSync(architectureV2OutputDir, { recursive: true });
  writeFileSync(path.join(architectureV2OutputDir, "summary.json"), `${JSON.stringify({
    version: report.version,
    liveAuthorized: report.liveAuthorized,
    readyForLiveBakeOff: report.readyForLiveBakeOff,
    readyReasons: report.readyReasons,
    providerCalls: 0,
    studentBankWrites: 0,
    meaningProven: false,
    qualityProven: false,
    productionPathUnchanged: true,
    bakeoffCeilingUsd: report.budget.bakeoffCeilingUsd,
    eligibleWriters: report.adapter.eligibleWriters,
    blockedWriters: report.adapter.blockedWriters,
  }, null, 2)}\n`);
  writeFileSync(path.join(architectureV2OutputDir, "plan.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
