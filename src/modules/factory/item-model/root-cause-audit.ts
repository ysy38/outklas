import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  architectureV2OutputDir,
  architectureV2WriterTokenCeiling,
  callCeilingUsd,
  frameForFrozenItem,
  type CatalogPrice,
  type PriceCatalog,
} from "./architecture-v2";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { publishToStudentBank } from "./review-status";
import { writerTask, type SemanticRelation } from "./semantic-preservation";
import { taxonomyLiveOutputDir } from "./taxonomy-live";
import {
  bakeoffWriterRules,
  bakeoffWriterUser,
  freezeWriterBakeoffTasks,
  writerBakeoffOutputDir,
  writerBakeoffSmokeSourceId,
  type BakeoffPlan,
} from "./writer-bakeoff";
import { writerBakeoffCompareOutputDir, writerBakeoffRemainingSourceIds } from "./writer-bakeoff-compare";
import { editorialPlans, writerBakeoffEditorialOutputDir, type EditorialFeasibility } from "./writer-bakeoff-editorial";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffSmokeOutputDir, writerBakeoffV1Fingerprint } from "./writer-bakeoff-smoke";

export const rootCauseAuditAuthorization = "cognitive-trap-root-cause-audit-v1";
export const rootCauseAuditOutputDir = ".data/analysis/_factory/cognitive-trap/root-cause-audit-v1";
export const rootCauseAuditLiveAuthorized = false;
export const rootCauseAuditProviderCalls = 0 as const;

export const scoringSourceAliases = {
  plates: "quality-first-restatement-counterfactual",
  embargo: "taxonomy-restatement-hard",
  registry: "taxonomy-restatement-medium",
  faculty: "quality-first-translation-en_tr",
  referees: "taxonomy-translation-en_tr",
  board: "taxonomy-translation-tr_en",
} as const;

const scoringIds = [writerBakeoffSmokeSourceId, ...writerBakeoffRemainingSourceIds];

const settings = [
  "openrouter:anthropic/claude-haiku-5.5",
  "openrouter:deepseek/deepseek-v3.2",
  "openrouter:google/gemini-4-hydrogen",
  "openrouter:google/gemini-4-argon",
] as const;

/** One read-only GET https://openrouter.ai/api/v1/models on 2026-11-20. Not a generate. Not persisted as secrets. */
const catalogGetSnapshot = {
  fetched: "2026-11-20",
  source: "https://openrouter.ai/api/v1/models",
  method: "GET" as const,
  generateCalls: 0 as const,
  models: {
    "tencent/hy4": {
      present: true,
      name: "Tencent: Hy4",
      inUsdPerMillion: 0.417,
      outUsdPerMillion: 1.2505,
      cacheReadUsdPerMillion: 0.021,
      supportedParameters: [
        "frequency_penalty",
        "include_reasoning",
        "logit_bias",
        "logprobs",
        "max_completion_tokens",
        "max_tokens",
        "min_p",
        "presence_penalty",
        "reasoning",
        "reasoning_effort",
        "repetition_penalty",
        "response_format",
        "stop",
        "structured_outputs",
        "temperature",
        "tool_choice",
        "tools",
        "top_k",
        "top_logprobs",
        "top_p",
      ],
    },
    "deepseek/deepseek-v4.1-flash-1017": {
      present: true,
      name: "DeepSeek: DeepSeek V4.1 Flash 1017",
      inUsdPerMillionDefault: 0.15,
      outUsdPerMillionDefault: 0.6,
      cacheReadUsdPerMillionDefault: 0.003,
      peakWeekdayInUsdPerMillion: 0.3,
      peakWeekdayOutUsdPerMillion: 1.2,
      supportedParameters: [
        "frequency_penalty",
        "include_reasoning",
        "logit_bias",
        "logprobs",
        "max_completion_tokens",
        "max_tokens",
        "min_p",
        "parallel_tool_calls",
        "presence_penalty",
        "reasoning",
        "reasoning_effort",
        "repetition_penalty",
        "response_format",
        "seed",
        "stop",
        "structured_outputs",
        "temperature",
        "tool_choice",
        "tools",
        "top_k",
        "top_logprobs",
        "top_p",
      ],
    },
  },
} as const;

type LiveReading = {
  misreadingMechanism: string | null;
  studentMisreading: string;
  actualSemanticDifference?: string;
  whyIncorrect?: string;
};

type WriterCandidate = { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string };

type CellRecord = {
  setting: string;
  candidates: WriterCandidate[];
  technicalFailure: string | null;
  finishReason: string | null;
  contentText: string | null;
  usage: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number | null } | null;
};

function scoringTasks() {
  return freezeWriterBakeoffTasks().filter((task) => scoringIds.includes(task.id as (typeof scoringIds)[number]));
}

function liveReadings(id: string): LiveReading[] {
  const dirs = [qualityFirstPilotOutputDir, taxonomyLiveOutputDir];
  for (const dir of dirs) {
    const file = path.join(dir, `${id}.json`);
    if (!existsSync(file)) continue;
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { arms?: { B?: { readings?: LiveReading[] } } };
    return parsed.arms?.B?.readings ?? [];
  }
  return [];
}

function recordedPrompt(sourceId: string): { promptVersion: string | null; user: string | null; file: string | null } {
  if (sourceId === writerBakeoffSmokeSourceId) {
    const file = path.join(writerBakeoffSmokeOutputDir, "prompt.json");
    if (!existsSync(file)) return { promptVersion: null, user: null, file: null };
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { promptVersion?: string; user?: string };
    return { promptVersion: parsed.promptVersion ?? null, user: parsed.user ?? null, file };
  }
  const file = path.join(writerBakeoffCompareOutputDir, `${sourceId}.prompt.json`);
  if (!existsSync(file)) return { promptVersion: null, user: null, file: null };
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { promptVersion?: string; user?: string };
  return { promptVersion: parsed.promptVersion ?? null, user: parsed.user ?? null, file };
}

function loadCell(sourceId: string, setting: string): CellRecord {
  if (sourceId === writerBakeoffSmokeSourceId) {
    const file = path.join(writerBakeoffSmokeOutputDir, `${setting.replaceAll("/", "_")}.json`);
    const rawFile = path.join(writerBakeoffSmokeOutputDir, `${setting.replaceAll("/", "_")}.raw.json`);
    const parsed = existsSync(file)
      ? (JSON.parse(readFileSync(file, "utf8")) as { candidates?: WriterCandidate[]; usage?: CellRecord["usage"]; technicalFailure?: string | null })
      : {};
    const raw = existsSync(rawFile)
      ? (JSON.parse(readFileSync(rawFile, "utf8")) as { finishReason?: string | null; contentText?: string | null })
      : {};
    return {
      setting,
      candidates: parsed.candidates ?? [],
      technicalFailure: parsed.technicalFailure ?? null,
      finishReason: raw.finishReason ?? null,
      contentText: raw.contentText ?? null,
      usage: parsed.usage ?? null,
    };
  }
  const file = path.join(writerBakeoffCompareOutputDir, `${sourceId}__${setting.replaceAll("/", "_")}.json`);
  const rawFile = path.join(writerBakeoffCompareOutputDir, `${sourceId}__${setting.replaceAll("/", "_")}.raw.json`);
  const parsed = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as { candidates?: WriterCandidate[]; usage?: CellRecord["usage"]; technicalFailure?: string | null })
    : {};
  const raw = existsSync(rawFile)
    ? (JSON.parse(readFileSync(rawFile, "utf8")) as { finishReason?: string | null; contentText?: string | null })
    : {};
  return {
    setting,
    candidates: parsed.candidates ?? [],
    technicalFailure: parsed.technicalFailure ?? null,
    finishReason: raw.finishReason ?? null,
    contentText: raw.contentText ?? null,
    usage: parsed.usage ?? null,
  };
}

function frozenCatalog(): { models: Record<string, { supportedParameters?: string[]; in?: number; out?: number }> } {
  const file = path.join(writerBakeoffOutputDir, "openrouter-catalog.json");
  return JSON.parse(readFileSync(file, "utf8")) as { models: Record<string, { supportedParameters?: string[]; in?: number; out?: number }> };
}

function localPrices(): PriceCatalog {
  const file = path.resolve("pipeline/ai/prices.openrouter.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { models: PriceCatalog };
  return parsed.models;
}

function uniqueFrameStatements(slots: { relation: SemanticRelation; statement: string | null }[]): boolean {
  const texts = slots.map((slot) => slot.statement).filter((text): text is string => Boolean(text));
  return new Set(texts).size === texts.length;
}

function duplicateChangeRelations(plans: BakeoffPlan[]): string[] {
  const counts = new Map<string, number>();
  for (const plan of plans) counts.set(plan.changeRelation, (counts.get(plan.changeRelation) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([relation]) => relation);
}

function mechanismContradictsMisreading(plan: BakeoffPlan): boolean {
  if (plan.planId === "p3-AGENT_ROLE" && plan.expectedStudentMisreading.includes("conservators sealed the glass plates") && plan.expectedStudentMisreading.includes("needed humidity")) {
    return true;
  }
  if (plan.planId === "p4-TEMPORAL_SCOPE" && /humidity fell/.test(plan.expectedStudentMisreading)) {
    return true;
  }
  return false;
}

export function writerBakeoffEditorialFingerprint(): string {
  return fingerprintFiles(writerBakeoffEditorialOutputDir, ["summary.json", "plans.json", "option-records.json"]);
}

export function architectureV2SourceContainsGemini4ModelId(source: string): boolean {
  return /gemini-4-/.test(source);
}

const proposedFrameBySource: Record<string, { relation: SemanticRelation; statement: string; status: "present" | "absent" }[]> = {
  "quality-first-restatement-counterfactual": [
    { relation: "actors", statement: "conservators are the agents of sealing; glass plates are sealed; the two earliest negatives are what would remain printable", status: "present" },
    { relation: "main_actions", statement: "seal the glass plates; remain printable", status: "present" },
    { relation: "quantity_scope", statement: "two earliest negatives", status: "present" },
    { relation: "time_order", statement: "sealing completed before the humidity rose", status: "present" },
    { relation: "condition_counterfactual", statement: "unreal past: if the conservators had sealed, the negatives would still have been printable; the sealing is not asserted as fact", status: "present" },
    { relation: "cause", statement: "no because-cause in the source", status: "absent" },
    { relation: "purpose", statement: "no purpose clause in the source", status: "absent" },
  ],
  "taxonomy-restatement-hard": [
    { relation: "actors", statement: "editors complete the citation check; appendices are released to the preprint server", status: "present" },
    { relation: "main_actions", statement: "complete the citation check; be released", status: "present" },
    { relation: "quantity_scope", statement: "only the two contested appendices", status: "present" },
    { relation: "time_order", statement: "citation check before the embargo", status: "present" },
    { relation: "condition_counterfactual", statement: "unreal: had the editors completed the check, only those two appendices would have been released", status: "present" },
  ],
  "taxonomy-restatement-medium": [
    { relation: "actors", statement: "the registry held logs; the archivist found no trace", status: "present" },
    { relation: "main_actions", statement: "held every laboratory log; found no trace of filing", status: "present" },
    { relation: "quantity_scope", statement: "every laboratory log; two withdrawn samples", status: "present" },
    { relation: "cause", statement: "although-concession, not because; holding logs does not cause the missing trace", status: "present" },
    { relation: "negation", statement: "no trace that the samples had been filed", status: "present" },
    { relation: "modality_epistemic", statement: "absence of a filing trace, not a proof that filing never occurred", status: "present" },
    { relation: "referents", statement: "them = the laboratory logs", status: "present" },
  ],
  "quality-first-translation-en_tr": [
    { relation: "actors", statement: "faculty hired; department would not value; same staff prepared figures", status: "present" },
    { relation: "main_actions", statement: "hired an outside auditor", status: "present" },
    { relation: "purpose", statement: "so that the department would not value its own equipment (değerlememesi için)", status: "present" },
    { relation: "cause", statement: "because last year's figures had been prepared by the same staff (nedeniyle)", status: "present" },
    { relation: "negation", statement: "not value its own equipment", status: "present" },
    { relation: "referents", statement: "its own equipment = the department's equipment", status: "present" },
  ],
  "taxonomy-translation-en_tr": [
    { relation: "main_actions", statement: "found no evidence; left open a slower decline", status: "present" },
    { relation: "quantity_scope", statement: "primary outcome vs two secondary measures", status: "present" },
    { relation: "cause", statement: "although-concession: no primary evidence, still left the secondary decline open", status: "present" },
    { relation: "negation", statement: "no evidence that the supplement altered the primary outcome", status: "present" },
    { relation: "modality_epistemic", statement: "no evidence of primary change; secondary decline left open, not closed", status: "present" },
    { relation: "referents", statement: "they = the referees", status: "present" },
  ],
  "taxonomy-translation-tr_en": [
    { relation: "main_actions", statement: "board reading the draft; tables going to external reviewers", status: "present" },
    { relation: "quantity_scope", statement: "only two disputed tables", status: "present" },
    { relation: "time_order", statement: "reading before the draft entered the archive", status: "present" },
    { relation: "condition_counterfactual", statement: "unreal: if the board had read, only those two tables would have gone to reviewers", status: "present" },
  ],
};

function filterProposedPlans(plans: BakeoffPlan[], feasibility: Map<string, EditorialFeasibility>) {
  const seen = new Set<string>();
  const kept: BakeoffPlan[] = [];
  const heldOut: { planId: string; reason: "infeasible" | "duplicate_changeRelation"; changeRelation: string }[] = [];
  for (const plan of plans) {
    const label = feasibility.get(plan.planId) ?? "questionable";
    if (label === "infeasible") {
      heldOut.push({ planId: plan.planId, reason: "infeasible", changeRelation: plan.changeRelation });
      continue;
    }
    if (seen.has(plan.changeRelation)) {
      heldOut.push({ planId: plan.planId, reason: "duplicate_changeRelation", changeRelation: plan.changeRelation });
      continue;
    }
    seen.add(plan.changeRelation);
    kept.push(plan);
  }
  return {
    plans: kept,
    heldOut,
    trapStatus: kept.length >= 4 ? ("ok" as const) : ("source_insufficient_traps" as const),
    paddedToFour: false as const,
  };
}

function optionQuote(cell: CellRecord, planId: string): string | null {
  return cell.candidates.find((row) => row.planId === planId)?.candidateText ?? null;
}

export function buildSourcePlanMatrix() {
  const plans = editorialPlans();
  return scoringTasks().map((task) => {
    const alias = (Object.entries(scoringSourceAliases).find(([, id]) => id === task.id)?.[0] ?? task.id) as string;
    const prompt = recordedPrompt(task.id);
    const reconstructed = bakeoffWriterUser({
      source: task.source,
      key: task.key,
      targetLanguage: task.direction === "en_tr" ? "tr" : task.direction === "tr_en" ? "en" : null,
      framePresent: task.framePresent,
      plans: task.plans,
    });
    const frame = frameForFrozenItem(task.id);
    const cells = settings.map((setting) => {
      const cell = loadCell(task.id, setting);
      return {
        setting,
        technicalFailure: cell.technicalFailure,
        finishReason: cell.finishReason,
        contentEmpty: cell.contentText === "",
        outputTokens: cell.usage?.outputTokens ?? null,
        reasoningTokens: cell.usage?.reasoningTokens ?? null,
        options: cell.candidates.map((row) => ({
          planId: row.planId,
          text: row.candidateText,
          writerSemanticRisk: row.semanticRisk,
          writerClaimIsNotProof: true as const,
        })),
      };
    });
    return {
      alias,
      sourceId: task.id,
      questionType: task.questionType,
      direction: task.direction,
      source: task.source,
      key: task.key,
      sourceHash: task.sourceHash,
      keyHash: task.keyHash,
      frameHash: task.frameHash,
      planHash: task.planHash,
      liveReadings: liveReadings(task.id).map((reading) => ({
        misreadingMechanism: reading.misreadingMechanism,
        studentMisreading: reading.studentMisreading,
      })),
      semanticFrame: {
        version: frame.version,
        writerClaimIsNotProof: true,
        slots: task.framePresent,
        slotStatementsUnique: uniqueFrameStatements(task.framePresent),
        collapseNote:
          "frameForFrozenItem/slotFromMeaning falls back to meaning.preserved[0] when the relation name is not a substring of a preserved line. Recorded prompts therefore repeat one clause under every present slot.",
      },
      plans: task.plans.map((plan) => {
        const row = plans.find((item) => item.sourceId === task.id && item.planId === plan.planId);
        return {
          planId: plan.planId,
          mechanismId: plan.mechanismId,
          family: plan.family,
          changeRelation: plan.changeRelation,
          preserveRelations: plan.preserveRelations,
          forbiddenAdditions: plan.forbiddenAdditions,
          expectedStudentMisreading: plan.expectedStudentMisreading,
          editorialFeasibility: row?.feasibility ?? null,
          humanEditorial: "pending" as const,
        };
      }),
      duplicateChangeRelations: duplicateChangeRelations(task.plans),
      writerPrompt: {
        promptVersion: prompt.promptVersion,
        recordedFile: prompt.file,
        recordedUserMatchesReconstructed: prompt.user === reconstructed,
        userExcerpt: (prompt.user ?? reconstructed).slice(0, 900),
        rulesReachWriter: bakeoffWriterRules.every((rule) => reconstructed.includes(rule.slice(0, 24))),
      },
      writerOutputs: cells,
    };
  });
}

export function buildPlanFeasibility() {
  const editorial = editorialPlans();
  const tasks = scoringTasks();
  return editorial.map((row) => {
    const task = tasks.find((item) => item.id === row.sourceId);
    const plan = task?.plans.find((item) => item.planId === row.planId);
    const siblings = task?.plans.filter((item) => item.planId !== row.planId && item.changeRelation === row.changeRelation).map((item) => item.planId) ?? [];
    const studentReasonable =
      row.feasibility === "infeasible"
        ? "No: the stored misreading is not a role inversion a YDS student would make, and the only NP swap that keeps both nouns is ontologically absurd."
        : row.feasibility === "questionable"
          ? "Maybe: a student could drift this way, but the stored misreading adds a second mutation, a new event, or a near-key wording."
          : "Yes: the stored misreading is a documented exam-style relation slip on this sentence.";
    const canKeepEvents =
      row.feasibility === "infeasible"
        ? "No: swapping conservators and glass plates as sealer/sealed cannot keep the source ontology."
        : row.planId.endsWith("TEMPORAL_SCOPE") && /humidity fell/.test(row.expectedStudentMisreading)
          ? "Interval shift (before vs during) can keep events; the stored misreading adds humidity falling, which the source does not contain."
          : "Yes, if only the named relation changes and actors/events stay.";
    const impossibleWithoutBreakingOntology = row.feasibility === "infeasible";
    const rationale = `${row.notes} Analyst label ${row.feasibility} remaps prior ${row.priorLabel}. This is text-based observation of the frozen plan, not human acceptance and not automatic semantic proof. Frozen plan is unchanged.`;
    return {
      sourceId: row.sourceId,
      planId: row.planId,
      mechanismId: row.mechanismId,
      family: row.family,
      changeRelation: row.changeRelation,
      expectedStudentMisreading: row.expectedStudentMisreading,
      targetedSourceRelation: row.changeRelation,
      studentCouldReasonablyMisread: studentReasonable,
      requestedChangeCanKeepSourceEventsAndActors: canKeepEvents,
      duplicatesOnSameSource: siblings,
      independentFamilyIsNotMechanismLabel: true,
      purposeResultEqualsPurposeTime: row.mechanismId === "PURPOSE_RESULT",
      quantityScopeEqualsQuantityShift: row.family === "quantity" || row.family === "universal_negative_quantity",
      focusScopeOftenQuantityScope: row.mechanismId === "FOCUS_SCOPE" && row.changeRelation === "quantity_scope",
      impossibleWithoutBreakingOntology,
      feasibility: row.feasibility,
      priorLabel: row.priorLabel,
      defectKind: row.defectKind,
      textRationale: rationale,
      automaticClassificationIsNotSemanticProof: true as const,
      agreesWithEditorialV1: true as const,
      disagreement: null,
      frozenUnchanged: true as const,
      humanEditorial: "pending" as const,
      preserveRelations: plan?.preserveRelations ?? [],
    };
  });
}

export function buildWriterContractAudit() {
  const plates = scoringTasks().find((task) => task.id === writerBakeoffSmokeSourceId)!;
  const sampleUser = bakeoffWriterUser({
    source: plates.source,
    key: plates.key,
    targetLanguage: null,
    framePresent: plates.framePresent,
    plans: plates.plans,
  });
  const agentPlan = plates.plans.find((plan) => plan.planId === "p3-AGENT_ROLE")!;
  const contradictions = scoringTasks().flatMap((task) =>
    task.plans.filter(mechanismContradictsMisreading).map((plan) => ({
      sourceId: task.id,
      planId: plan.planId,
      mechanismId: plan.mechanismId,
      studentMisreading: plan.expectedStudentMisreading,
    })),
  );
  return {
    bakeoffPath: {
      userAssembler: "src/modules/factory/item-model/writer-bakeoff.ts:bakeoffWriterUser",
      systemPrompt: "pipeline/ai/prompts/writer-bakeoff.v1.ts:writerBakeoffSystem",
      smokeCall: "pipeline/stages/writer-bakeoff-smoke.ts uses writerBakeoffSystem + bakeoffWriterUser",
      changePreserveForbiddenReachWriter: true,
      evidence: {
        bakeoffWriterUserLines: "169:205:src/modules/factory/item-model/writer-bakeoff.ts",
        snippet: "PLAN ${plan.planId}\\nchange: ${plan.family} (${plan.changeRelation})\\npreserve: ${plan.preserveRelations.join(\", \")}\\nforbidden: ${plan.forbiddenAdditions.join(\", \")}\\nstudentMisreading: ${plan.expectedStudentMisreading}",
        systemSnippet: "1. Change only the one targeted meaning relation named on that plan.",
        systemCitation: "pipeline/ai/prompts/writer-bakeoff.v1.ts:10",
        recordedPlatesUserHasChangePreserveForbidden: /change: /.test(sampleUser) && /preserve: /.test(sampleUser) && /forbidden: /.test(sampleUser),
        rules: bakeoffWriterRules,
      },
    },
    semanticFrameTransfer: {
      allRequiredComponentsTransferred: false,
      presentSlotsListed: true,
      perSlotStatementsDistinct: uniqueFrameStatements(plates.framePresent),
      collapseCitation: "src/modules/factory/item-model/architecture-v2.ts:171",
      collapseSnippet: "meaning.preserved.find((line) => line.includes(relation.split(\"_\").join(\" \"))) ?? meaning.preserved[0]",
      recordedPlatesFrame: plates.framePresent,
      note: "Every present plates slot in the recorded smoke prompt is the same preserved[0] clause: sealing the glass plates before the humidity rose is the unreal condition.",
    },
    mechanismVsStudentMisreading: {
      copiesStudentMisreadingUnchanged: true,
      systemCitation: "pipeline/ai/prompts/writer-bakeoff.v1.ts:18",
      contradictions,
      platesAgentRole: {
        mechanismId: agentPlan.mechanismId,
        family: agentPlan.family,
        changeRelation: agentPlan.changeRelation,
        studentMisreading: agentPlan.expectedStudentMisreading,
        contradiction: "AGENT_ROLE / participant roles / actors asks for a role swap; the live B-read text is factual sealing plus a humidity need, not role inversion.",
      },
    },
    changeOnlyOneRelation: {
      bakeoffRule: bakeoffWriterRules[0],
      clearEnoughToPreserveOtherPropositions: false,
      note: "The rule names one relation, but preserve is a list of relation tokens whose statements are duplicated, so the Writer is not shown the other propositions to keep. Production options.v5 never sends a preserve list.",
      productionSnippet: "Keep the same situation, actors and roughly the same length as the key.",
      productionCitation: "pipeline/ai/prompts/cognitive-trap.v1.ts:44",
    },
    productionMin4: {
      catalogIsNotAQuota: true,
      catalogQuote: "The supplied mechanisms are the ones grounded in this source. They are not a quota.",
      catalogCitation: "pipeline/ai/prompts/cognitive-trap.v1.ts:36",
      misreadingOutputMin4: true,
      misreadingOutputCitation: "pipeline/ai/prompts/cognitive-trap.v1.ts:82",
      misreadingOptionsOutputMin4: true,
      misreadingOptionsCitation: "pipeline/ai/prompts/cognitive-trap.v1.ts:117",
      selectDistractorsRequired4: true,
      poolCitation: "src/modules/factory/item-model/pool.ts:13 and :53-61",
      finishArmFailsUnder4: true,
      finishArmCitation: "pipeline/stages/cognitive-trap.ts:400-404",
      bakeoffDoesNotPad: true,
      bakeoffSchemaMatchesPlanCount: true,
      bakeoffSchemaCitation: "pipeline/ai/prompts/writer-bakeoff.v1.ts:4 and :34-35",
      artificialTask: "Production min-4 sends an artificial fourth reading/option when the source supports fewer independent traps. Bake-off selectIndependentPlans refuses to pad, then freeze still takes four live readings including infeasible AGENT_ROLE.",
    },
    unusedSemanticPreservationContract: {
      version: "semantic-preservation-contract-v1",
      file: "src/modules/factory/item-model/semantic-preservation.ts",
      usedByLiveFactory: false,
      writerTaskWouldSend: writerTask({
        dominantMisreading: agentPlan.mechanismId,
        changeRelation: agentPlan.changeRelation,
        preserveRelations: agentPlan.preserveRelations,
        forbiddenAdditions: agentPlan.forbiddenAdditions,
        expectedStudentMisreading: agentPlan.expectedStudentMisreading,
      }),
    },
    writerSelfReportIsNotProof: true,
  };
}

function liveVerdict(id: string) {
  const file = path.join(qualityFirstPilotOutputDir, `${id}.json`);
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    arms: { B: { status: string; modelVerdict: string | null; editorial: string; qualityDecision: string; judgeAgreesWithKey: boolean | null } };
  };
  const arm = parsed.arms.B;
  return {
    status: arm.status,
    modelVerdict: arm.modelVerdict,
    editorial: arm.editorial,
    qualityDecision: arm.qualityDecision,
    judgeAgreesWithKey: arm.judgeAgreesWithKey ?? null,
  };
}

export function buildGateSelectorJudgeAudit() {
  const plates = liveVerdict("quality-first-restatement-counterfactual");
  const faculty = liveVerdict("quality-first-translation-en_tr");
  const epistemic = liveVerdict("quality-first-restatement-epistemic");
  const complaints = liveVerdict("quality-first-translation-tr_en");
  const summary = JSON.parse(readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8")) as {
    decision: { reason: string };
    metrics: { firstPassYield: number; meaningProven: boolean; qualityProven: boolean; observedDifficulty: null };
  };
  return {
    bakeoffHasNoSelector: true,
    bakeoffSelectorCitation: "src/modules/factory/item-model/writer-bakeoff-editorial.ts:364",
    duplicateTrapsNotCulledInBakeoff: true,
    productionSelector: {
      function: "selectCognitiveDistractors",
      citation: "src/modules/factory/item-model/distractor-strategy.ts:41-69",
      drops: ["misreading_fields_missing", "second_answer", "equivalent_to_source", "incomplete_option", "discourse_unresolved", "surface_edit", "repeated_misreading"],
      overlapIsNotEquivalence: true,
      meaningProvenNeverRises: true,
    },
    wholeSetGate: {
      function: "assessWholeSet",
      citation: "src/modules/factory/item-model/whole-set.ts:86-116",
      failOnlyOn: ["confirmed_equivalent", "scope_not_carried"],
      overlapAtLeast72IsRiskNotFail: true,
      overlapCitation: "src/modules/factory/item-model/whole-set.ts:101",
      failSkipsJudge: true,
      failSkipsJudgeCitation: "pipeline/stages/cognitive-trap.ts:659-667 and qualityFirstActualCallOrder assessWholeSet_fail_skips_judge",
      reviewStillReachesJudge: true,
      meaningProven: false,
      approvesTarget: false,
      falseSuccess: "review + Judge APPROVE can look like a finished item while editorial stays pending and qualityDecision is needs_revision.",
    },
    judge: {
      prompt: "item-model.judge.v3.1",
      systemCitation: "pipeline/ai/prompts/item-model.v1.ts:43-50",
      approveDoesNotCertifyKey: "Your verdict does not certify the key.",
      qualityFirstLive: {
        plates,
        faculty,
        epistemic,
        complaints,
        approveCount: [plates, faculty, epistemic].filter((row) => row.modelVerdict === "APPROVE").length,
        editoriallyAcceptedCount: 0,
        qualityDecisionNeedsRevision: true,
        summaryReason: summary.decision.reason,
      },
      judgeApproveIsNotEditorialAcceptance: true,
    },
    productionMin4Padding: {
      writerSchemaForcesFourReadings: true,
      writerSchemaForcesFourOptions: true,
      poolDeletesItemIfFewerThanFour: true,
      falseFailure: "Three independent good traps become fewer_than_four_options / insufficient_pool, so the item fails even though the source was honest.",
      falseSuccess: "A weak fourth trap invented to fill min-4 can survive selector if it is not a surface edit, then Judge APPROVE on the five-option set masks the planner pad.",
    },
    writerSemanticRisk: {
      notProof: true,
      deepseekRefereesAllNone: true,
      masksNearKey: "DeepSeek referees semanticRisk none while four options stay inside kanıt / birincil / açık bıraktı or göz ardı etmediler.",
    },
    qualityFirstYield: {
      firstPassYield: summary.metrics.firstPassYield,
      meaningProven: summary.metrics.meaningProven,
      qualityProven: summary.metrics.qualityProven,
      observedDifficulty: summary.metrics.observedDifficulty,
      note: "0.75 is structural five_options / 4, not editorial acceptance.",
    },
    noNewValidatorWritten: true,
  };
}

export function buildDefectRootCauses() {
  const platesP3 = settings.map((setting) => {
    const cell = loadCell(writerBakeoffSmokeSourceId, setting);
    return { setting, text: optionQuote(cell, "p3-AGENT_ROLE"), semanticRisk: cell.candidates.find((row) => row.planId === "p3-AGENT_ROLE")?.semanticRisk ?? null };
  });
  const refereesDeepseek = loadCell("taxonomy-translation-en_tr", "openrouter:deepseek/deepseek-v3.2");
  const facultyCells = settings.map((setting) => loadCell("quality-first-translation-en_tr", setting));
  const registryP4 = settings.map((setting) => ({ setting, text: optionQuote(loadCell("taxonomy-restatement-medium", setting), "p4-NEGATION_SCOPE") }));
  const boardDeepseek = loadCell("taxonomy-translation-tr_en", "openrouter:deepseek/deepseek-v3.2");
  const hydrogenFaculty = loadCell("quality-first-translation-en_tr", "openrouter:google/gemini-4-hydrogen");
  const hydrogenReferees = loadCell("taxonomy-translation-en_tr", "openrouter:google/gemini-4-hydrogen");
  return [
    {
      id: "plates_artificial_agent_role",
      classes: ["planner_origin", "writer_execution", "contract_origin"],
      certainty: "high_on_planner_infeasible; writer_execution_only_after_the_impossible_task; contract_origin_because_label_contradicts_misreading",
      evidence: {
        liveBRead: "The conservators sealed the glass plates, so the plates needed humidity to stay printable.",
        frozenPlan: "p3-AGENT_ROLE family participant roles changeRelation actors",
        outputs: platesP3,
      },
      split: "Planner asked for a role swap the ontology cannot host. Haiku/Hydrogen/Argon executed plates-sealing-people or negatives/plates swap. DeepSeek used had been sealed and dropped conservators (active→passive), a second-answer risk, not a role trap. Do not score those wording failures as if the plan were feasible.",
    },
    {
      id: "referees_deepseek_near_key",
      classes: ["writer_execution", "contract_origin"],
      certainty: "high_on_writer_wording; contract may have under-specified the preserve propositions in Turkish",
      evidence: {
        key: "Hakemler, ekin birincil sonucu değiştirdiğine dair kanıt bulamadılar; yine de iki ikincil ölçütte daha yavaş düşüş ihtimalini açık bıraktılar.",
        options: refereesDeepseek.candidates.map((row) => ({ planId: row.planId, text: row.candidateText, semanticRisk: row.semanticRisk })),
        tokens: "kanıt / birincil / açık bıraktı or göz ardı etmediler",
      },
      split: "Writer stayed inside the key's two clauses. p2 only adds hiçbir; p3 changes bulamadılar to bulamadıklarını belirttiler; p4 swaps açık bıraktılar for göz ardı etmediler. Selector was not in the bake-off path, so these were not culled. semanticRisk none is not proof.",
    },
    {
      id: "faculty_purpose_cause",
      classes: ["writer_execution", "contract_origin"],
      certainty: "high_that_writers_collapsed_için_vs_nedeniyle; contract frame collapse is a contributing cause, not the only one",
      evidence: {
        sourcePurpose: "so that the department would not value its own equipment",
        keyPurpose: "değerlememesi için",
        keyCause: "aynı kadronun hazırlamış olması nedeniyle",
        deepseekP1: optionQuote(facultyCells.find((row) => row.setting.endsWith("deepseek-v3.2"))!, "p1-PURPOSE_RESULT"),
        haikuP1: optionQuote(facultyCells.find((row) => row.setting.endsWith("claude-haiku-5.5"))!, "p1-PURPOSE_RESULT"),
      },
      split: "The source has both purpose (için) and cause (nedeniyle). Writers collapse purpose to sonucunda or drop için while keeping nedeniyle. That is Writer execution of a feasible PURPOSE_RESULT plan. The recorded faculty frame listed purpose correctly but repeated the hiring clause on actors/main_actions/negation/referents, so preserve was weak.",
    },
    {
      id: "registry_absence_vs_proof_of_absence",
      classes: ["planner_origin", "writer_execution"],
      certainty: "medium_split: p3 is a usable epistemic trap if writers keep the filing event; p4 near-key is planner overlap",
      evidence: {
        source: "the archivist found no trace that the two withdrawn samples had been filed",
        p3Misreading: "The archivist established that the two withdrawn samples were never filed with the logs.",
        p4Misreading: "The archivist found a trace that the two withdrawn samples had not been filed with the logs.",
        p4Outputs: registryP4,
      },
      split: "Planner p3 asks to harden no-trace into established-never-filed (feasible if only epistemic force changes). Planner p4 stored misreading is close to a second key. Writers who prove absence or invert to a filing-trace fail the preserve. Not a selector issue in this bake-off.",
    },
    {
      id: "board_condition_direction",
      classes: ["writer_execution", "planner_origin"],
      certainty: "high_that_p2_is_the_intended_reversal; DeepSeek p4 key copy is writer; p3/p4 share quantity_scope is planner",
      evidence: {
        p2Misreading: "If only the two disputed tables had gone to reviewers, the board would have read the draft before archiving.",
        deepseekP2: optionQuote(boardDeepseek, "p2-CONDITION_DIRECTION"),
        deepseekP4: optionQuote(boardDeepseek, "p4-FOCUS_SCOPE"),
        key: "Only the two disputed tables would have gone to the external reviewers if the board had read the draft before it entered the archive.",
      },
      split: "p2 is condition reversal and DeepSeek executed it. DeepSeek p4 is the English key verbatim — writer_execution, not reversal. p3 and p4 both change quantity_scope (FOCUS_SCOPE alias), a planner duplicate. Board p1 and p2 also share condition_counterfactual.",
    },
    {
      id: "hydrogen_empty_response_reasoning_consumption",
      classes: ["provider_configuration"],
      certainty: "high",
      evidence: {
        faculty: { finishReason: hydrogenFaculty.finishReason, outputTokens: hydrogenFaculty.usage?.outputTokens ?? null, reasoningTokens: hydrogenFaculty.usage?.reasoningTokens ?? null, contentEmpty: hydrogenFaculty.contentText === "" },
        referees: { finishReason: hydrogenReferees.finishReason, outputTokens: hydrogenReferees.usage?.outputTokens ?? null, reasoningTokens: hydrogenReferees.usage?.reasoningTokens ?? null, contentEmpty: hydrogenReferees.contentText === "" },
        wire: "pipeline/ai/openrouter.ts:137-138 reasoning: { exclude: true }, max_tokens floor 4096",
      },
      split: "HTTP success, finishReason LENGTH, content empty, reasoningTokens 4093 / output 4096 on both EN→TR cells. Not a Writer wording score. exclude=true did not prevent reasoning tokens. Retry stayed 0. Do not add this model to production from this defect.",
    },
  ];
}

export function buildApproaches() {
  const editorial = editorialPlans();
  const tasks = scoringTasks();
  const feasibility = (sourceId: string) => new Map(editorial.filter((row) => row.sourceId === sourceId).map((row) => [row.planId, row.feasibility]));
  const proposedB = tasks.map((task) => {
    const filtered = filterProposedPlans(task.plans, feasibility(task.id));
    return {
      sourceId: task.id,
      sourceHash: task.sourceHash,
      keyHash: task.keyHash,
      status: "proposed_unreviewed" as const,
      editorially_verified: false as const,
      humanEditorial: "pending" as const,
      contract: "old_bakeoff_writer_user",
      ...filtered,
      plans: filtered.plans.map((plan) => ({
        planId: plan.planId,
        mechanismId: plan.mechanismId,
        family: plan.family,
        changeRelation: plan.changeRelation,
        preserveRelations: plan.preserveRelations,
        forbiddenAdditions: plan.forbiddenAdditions,
        expectedStudentMisreading: plan.expectedStudentMisreading,
      })),
    };
  });
  const proposedD = proposedB.map((row) => {
    const task = tasks.find((item) => item.id === row.sourceId)!;
    const frame = proposedFrameBySource[row.sourceId] ?? [];
    return {
      ...row,
      contract: "semantic_preservation_contract_v1",
      proposedFrame: { status: "proposed_unreviewed" as const, slots: frame, notLiveFrameHash: true as const },
      plans: row.plans.map((plan) => ({
        ...plan,
        writerTask: writerTask({
          dominantMisreading: plan.mechanismId,
          changeRelation: plan.changeRelation,
          preserveRelations: plan.preserveRelations,
          forbiddenAdditions: plan.forbiddenAdditions,
          expectedStudentMisreading: plan.expectedStudentMisreading,
        }),
      })),
    };
  });
  return {
    A: {
      name: "Old plan + old Writer contract",
      liveNow: true,
      plans: "freezeWriterBakeoffTasks / freeze.json (immutable)",
      contract: "bakeoffWriterUser + writer-bakeoff.options.v1",
      defectsKept: ["plates AGENT_ROLE infeasible", "duplicate changeRelation", "collapsed frame statements", "production min-4 not in this path but still live"],
      doNotRunThisRound: true,
    },
    B: {
      name: "Editorially reviewed plan + old contract",
      liveNow: false,
      plans: "proposed-plans-b.json in this dir only",
      contract: "same bakeoffWriterUser",
      filter: "hold infeasible; one plan per changeRelation keep-first; do not pad; not editorially_verified. Keep-first is mechanical: board currently keeps p1 COUNTERFACTUAL_FACTUAL and holds p2 CONDITION_DIRECTION, even though p2 is the intended reversal. Human must choose the colliding pair; this file is not that choice.",
      humanEditorial: "pending",
      rows: proposedB,
      doNotRunThisRound: true,
    },
    C: {
      name: "Old plan + new semantic preservation contract",
      liveNow: false,
      plans: "unchanged freeze.json plans, including infeasible AGENT_ROLE",
      contract: "src/modules/factory/item-model/semantic-preservation.ts writerTask + distinct frame statements",
      note: "Isolates contract vs planner. AGENT_ROLE remains a bad task; C measures whether a clearer preserve list reduces other collapses.",
      doNotRunThisRound: true,
    },
    D: {
      name: "Reviewed plan + new contract",
      liveNow: false,
      plans: "proposed-plans-d.json in this dir only",
      contract: "semantic-preservation-contract-v1",
      humanEditorial: "pending",
      rows: proposedD,
      doNotRunThisRound: true,
    },
    sourceKeyHashesUnchanged: tasks.map((task) => ({ id: task.id, sourceHash: task.sourceHash, keyHash: task.keyHash })),
  };
}

export function buildCatalogProbe() {
  const frozen = frozenCatalog();
  const prices = localPrices();
  const hy4Frozen = frozen.models["tencent/hy4"] ?? frozen.models["tencent/hy4-flash"];
  const flashFrozen = frozen.models["deepseek/deepseek-v4.1-flash-1017"];
  const flashPrice = prices["openrouter:deepseek/deepseek-v4.1-flash-1017"];
  const hy4Price = prices["openrouter:tencent/hy4"];
  const architectureSrc = readFileSync(path.resolve("src/modules/factory/item-model/architecture-v2.ts"), "utf8");
  return {
    generateCalls: 0,
    catalogGetCallsThisRound: 1,
    liveAuthorized: false,
    addedToProductionConfig: false,
    architectureV2ContainsGemini4ModelId: architectureV2SourceContainsGemini4ModelId(architectureSrc),
    catalogStructuredOutputsIsNotHonor: true,
    openrouterGenerateAlways: {
      reasoningExclude: true,
      maxTokensFloor: 4096,
      citation: "pipeline/ai/openrouter.ts:137-138",
      hydrogenLengthShowsExcludeDoesNotAlwaysPreventReasoningTokens: true,
    },
    candidates: {
      "tencent/hy4": {
        requestedId: "tencent/hy4",
        frozenBakeoffCatalog: Boolean(hy4Frozen),
        localPricesOpenrouter: hy4Price ?? null,
        liveList: catalogGetSnapshot.models["tencent/hy4"],
        structuredOutputsListed: catalogGetSnapshot.models["tencent/hy4"].supportedParameters.includes("structured_outputs"),
        reasoningParamsListed: (["reasoning", "reasoning_effort", "include_reasoning"] as const).every((name) =>
          catalogGetSnapshot.models["tencent/hy4"].supportedParameters.includes(name),
        ),
        jsonSchemaHonor: "unverified",
        productionConfigUnchanged: true,
      },
      "deepseek/deepseek-v4.1-flash-1017": {
        requestedId: "deepseek/deepseek-v4.1-flash-1017",
        frozenBakeoffCatalog: Boolean(flashFrozen),
        localPricesOpenrouter: flashPrice ?? null,
        liveList: catalogGetSnapshot.models["deepseek/deepseek-v4.1-flash-1017"],
        priceNote: "prices.openrouter.json stores the peak weekday $0.30/$1.20 row. Live list default is $0.15/$0.60 with peak overrides matching the local file. Catalog presence is not JSON-schema honor.",
        structuredOutputsListed: catalogGetSnapshot.models["deepseek/deepseek-v4.1-flash-1017"].supportedParameters.includes("structured_outputs"),
        reasoningParamsListed: (["reasoning", "reasoning_effort", "include_reasoning"] as const).every((name) =>
          catalogGetSnapshot.models["deepseek/deepseek-v4.1-flash-1017"].supportedParameters.includes(name),
        ),
        jsonSchemaHonor: "unverified",
        productionConfigUnchanged: true,
        notSubstitutedForV32: true,
      },
    },
    notAddedToArchitectureV2: true,
  };
}

export function buildExperimentDesign(prices: PriceCatalog) {
  const haiku = prices["openrouter:anthropic/claude-haiku-5.5"];
  const deepseek = prices["openrouter:deepseek/deepseek-v3.2"];
  const hydrogen = prices["openrouter:google/gemini-4-hydrogen"];
  const argon = prices["openrouter:google/gemini-4-argon"];
  const ceiling = (row: CatalogPrice | undefined) =>
    row ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined }, architectureV2WriterTokenCeiling) : null;
  const haikuCeil = ceiling(haiku);
  const deepseekCeil = ceiling(deepseek);
  const hydrogenCeil = ceiling(hydrogen);
  const argonCeil = ceiling(argon);
  const cheapCallSum = haikuCeil != null && deepseekCeil != null ? haikuCeil + deepseekCeil : null;
  const proposedNewUsd = cheapCallSum != null ? 12 * cheapCallSum : null;
  return {
    runThisRound: false,
    isolate: ["Planner", "Writer", "Contract", "Provider"],
    sameFrozenSourcesAndKeys: scoringIds,
    cells: [
      { id: "A_baseline", description: "Reuse recorded 22 complete writer cells. Do not regenerate. Hold Hydrogen EN→TR empty cells out of Writer wording scores.", live: false },
      { id: "A_vs_B", description: "Plan only: proposed-plans-b.json + old bakeoffWriterUser. Haiku + DeepSeek on the same six sources. Retry 0.", live: "later" },
      { id: "A_vs_C", description: "Contract only: freeze.json plans + semantic-preservation writerTask and distinct frame statements. Same two cheap writers. Retry 0.", live: "later" },
      { id: "D_if_both_help", description: "Only if B and C each move feasible-plan execution without new second keys. Do not start D this round.", live: "later" },
    ],
    holdOutOfScoring: [
      "plates p3-AGENT_ROLE infeasible",
      "duplicate changeRelation second tasks",
      "Hydrogen faculty+referees LENGTH empty cells as Writer wording",
      "Judge APPROVE as acceptance",
      "writer semanticRisk as proof",
    ],
    doNotBakeOffNewWritersUntil: "Planner/contract defects on plates AGENT_ROLE and duplicate changeRelation are addressed or explicitly held out of scoring.",
    noApiFixes: [
      "Hold out infeasible plans from writer scoring",
      "Stop sending duplicate changeRelation as two tasks",
      "Do not count Judge APPROVE as acceptance",
      "Do not treat writer semanticRisk as proof",
      "Document Hydrogen reasoning floor: exclude=true + 4096 still spent 4093 reasoning tokens",
      "Keep recovery off",
    ],
    noApiFixesAreLaterAuthorizedEdits: true,
    liveFactoryUnchangedThisRound: true,
    reuseExistingSmokeWhereValid: true,
    retry: 0,
    unrecordedHaikuPrecedent: {
      conservativeCeilingUsd: haikuCeil,
      note: "First technical-smoke generate returned, then the runner threw before persist. Billed, not a plates cell, not reused. Any later live budget must include this class of miss.",
    },
    tokenCeiling: architectureV2WriterTokenCeiling,
    perCallCeilingUsd: { haiku: haikuCeil, deepseekV32: deepseekCeil, hydrogen: hydrogenCeil, argon: argonCeil },
    smallLiveBudget: {
      proposedCapUsd: 0.08,
      previousBakeoffCapUsd: 0.62,
      previousRecordedUsd: 0.1828165,
      justification: "12 Haiku+DeepSeek calls for B and 12 for C at the 3000/4096/1500 Writer ceiling. Haiku $0.0025355 + DeepSeek $0.0023365 ≈ $0.00487 per source. 12 sources-worth of calls ≈ $0.058. Buffer for one unrecorded Haiku-class miss and JSON leftover. Well under $0.62. Argon (~$0.047/call) and Hydrogen (~$0.035/call) stay out until B/C show planner/contract movement. hy4 and v4.1-flash-1017 are catalog-only, not in this budget.",
      proposedNewUsd,
      hydrogenEnTrNotScoredAsWriter: true,
    },
    winnerDeclared: false,
  };
}

export function assessRootCauseAudit(input: { openrouterPrices: PriceCatalog }) {
  const beforeV1 = writerBakeoffV1Fingerprint();
  const beforeSmoke = fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]);
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
  const beforeEditorial = writerBakeoffEditorialFingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();
  const matrix = buildSourcePlanMatrix();
  const feasibility = buildPlanFeasibility();
  const contract = buildWriterContractAudit();
  const gates = buildGateSelectorJudgeAudit();
  const defects = buildDefectRootCauses();
  const approaches = buildApproaches();
  const catalog = buildCatalogProbe();
  const experiment = buildExperimentDesign(input.openrouterPrices);
  const counts = {
    feasible: feasibility.filter((row) => row.feasibility === "feasible").length,
    questionable: feasibility.filter((row) => row.feasibility === "questionable").length,
    infeasible: feasibility.filter((row) => row.feasibility === "infeasible").length,
  };
  return {
    version: rootCauseAuditAuthorization,
    providerCalls: rootCauseAuditProviderCalls,
    liveAuthorized: rootCauseAuditLiveAuthorized,
    winnerDeclared: false as const,
    humanEditorial: "pending" as const,
    meaningProven: false as const,
    qualityProven: false as const,
    observedDifficulty: null,
    editorialAcceptance: false as const,
    writerClaimIsNotProof: true as const,
    automaticEvaluationIsNotEditorialAcceptance: true as const,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
    productionWriterUnchanged: qualityFirstFrozenModels.writer,
    productionJudgeUnchanged: qualityFirstFrozenModels.judge,
    studentBankWrites: 0 as const,
    plansEditoriallyVerified: false as const,
    feasibilityCounts: counts,
    agreesWithEditorialV1: feasibility.every((row) => row.agreesWithEditorialV1),
    matrix,
    feasibility,
    contract,
    gates,
    defects,
    approaches,
    catalog,
    experiment,
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeV1,
      platesSmokeUnchanged: fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]) === beforeSmoke,
      compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
      editorialUnchanged: writerBakeoffEditorialFingerprint() === beforeEditorial,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    },
    forbiddenDirsIncludeOutput: (qualityFirstPilotForbiddenDirs as readonly string[]).includes(rootCauseAuditOutputDir),
  };
}

export function writeRootCauseAudit(input: { openrouterPrices: PriceCatalog }) {
  const report = assessRootCauseAudit(input);
  mkdirSync(rootCauseAuditOutputDir, { recursive: true });
  writeFileSync(
    path.join(rootCauseAuditOutputDir, "summary.json"),
    `${JSON.stringify(
      {
        version: report.version,
        providerCalls: 0,
        liveAuthorized: false,
        winnerDeclared: false,
        humanEditorial: "pending",
        meaningProven: false,
        qualityProven: false,
        observedDifficulty: null,
        editorialAcceptance: false,
        recoveryDefault: report.recoveryDefault,
        productionWriterUnchanged: report.productionWriterUnchanged,
        productionJudgeUnchanged: report.productionJudgeUnchanged,
        feasibilityCounts: report.feasibilityCounts,
        agreesWithEditorialV1: report.agreesWithEditorialV1,
        recordsImmutable: report.recordsImmutable,
        forbiddenDirsIncludeOutput: report.forbiddenDirsIncludeOutput,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(path.join(rootCauseAuditOutputDir, "source-plan-matrix.json"), `${JSON.stringify(report.matrix, null, 2)}\n`);
  writeFileSync(path.join(rootCauseAuditOutputDir, "plan-feasibility.json"), `${JSON.stringify(report.feasibility, null, 2)}\n`);
  writeFileSync(path.join(rootCauseAuditOutputDir, "writer-contract-audit.json"), `${JSON.stringify(report.contract, null, 2)}\n`);
  writeFileSync(path.join(rootCauseAuditOutputDir, "gate-selector-judge-audit.json"), `${JSON.stringify(report.gates, null, 2)}\n`);
  writeFileSync(path.join(rootCauseAuditOutputDir, "defect-root-causes.json"), `${JSON.stringify(report.defects, null, 2)}\n`);
  writeFileSync(path.join(rootCauseAuditOutputDir, "approaches.json"), `${JSON.stringify({ A: report.approaches.A, B: { ...report.approaches.B, rows: undefined }, C: report.approaches.C, D: { ...report.approaches.D, rows: undefined }, sourceKeyHashesUnchanged: report.approaches.sourceKeyHashesUnchanged }, null, 2)}\n`);
  writeFileSync(
    path.join(rootCauseAuditOutputDir, "proposed-plans-b.json"),
    `${JSON.stringify({ status: "proposed_unreviewed", editorially_verified: false, humanEditorial: "pending", contract: "old_bakeoff_writer_user", rows: report.approaches.B.rows }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(rootCauseAuditOutputDir, "proposed-plans-d.json"),
    `${JSON.stringify({ status: "proposed_unreviewed", editorially_verified: false, humanEditorial: "pending", contract: "semantic_preservation_contract_v1", rows: report.approaches.D.rows }, null, 2)}\n`,
  );
  writeFileSync(path.join(rootCauseAuditOutputDir, "catalog-probe.json"), `${JSON.stringify(report.catalog, null, 2)}\n`);
  writeFileSync(path.join(rootCauseAuditOutputDir, "experiment-design.json"), `${JSON.stringify(report.experiment, null, 2)}\n`);
  writeFileSync(path.join(rootCauseAuditOutputDir, "plan.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function refuseRootCauseAuditLive(): {
  started: false;
  executed: false;
  providerCalls: 0;
  studentBankWrites: 0;
  reason: string;
} {
  return { started: false, executed: false, providerCalls: 0, studentBankWrites: 0, reason: "root-cause audit is offline" };
}

export function assertStudentBankClosed(): void {
  publishToStudentBank();
}

export { architectureV2OutputDir };
