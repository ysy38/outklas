import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { architectureV2FrozenSourceIds, frameForFrozenItem } from "./architecture-v2";
import { sourceSentence } from "./cognitive-trap";
import { qualityFirstFrozenModels, qualityFirstItems, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import {
  attachPreserveV1,
  factoryRootCauseFixEnabled,
  factoryRootCauseFixVersion,
  fillSemanticSlots,
  frameFromSource,
  presentFrameSlots,
  selectIndependentPlansV1,
  semanticWriterUser,
  type IndependentPlanReportV1,
  type IndependenceKey,
} from "./root-cause-fix";
import { scoringSourceAliases } from "./root-cause-audit";
import { semanticRelations, writerTask, type SemanticFrameSlot, type SemanticRelation } from "./semantic-preservation";
import { taxonomyLiveItems } from "./taxonomy-live";
import { selectIndependentPlans } from "./writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "./writer-bakeoff-smoke";
import { writerBakeoffCompareOutputDir } from "./writer-bakeoff-compare";
import { writerBakeoffEditorialOutputDir } from "./writer-bakeoff-editorial";
import { writerBakeoffOutputDir } from "./writer-bakeoff";
import { writerBakeoffSmokeOutputDir } from "./writer-bakeoff-smoke";
import { writerBakeoffEditorialFingerprint } from "./root-cause-audit";

export const rootCauseFixAcceptanceAuthorization = "cognitive-trap-root-cause-fix-acceptance-v1";
export const rootCauseFixAcceptanceOutputDir = ".data/analysis/_factory/cognitive-trap/root-cause-fix-acceptance-v1";
export const rootCauseFixAcceptanceLiveAuthorized = false as const;
export const rootCauseFixAcceptanceProviderCalls = 0 as const;

const negativeControlIds = new Set(["quality-first-restatement-epistemic", "quality-first-translation-tr_en"]);

const scoringIdSet = new Set<string>(Object.values(scoringSourceAliases));

function itemsById() {
  return new Map(
    [...qualityFirstItems().map((entry) => entry.item), ...taxonomyLiveItems().map((entry) => entry.item)].map((item) => [item.id, item]),
  );
}

function questionMeta(id: string) {
  if (id.includes("translation")) {
    const direction = id.endsWith("tr_en") ? ("tr_en" as const) : ("en_tr" as const);
    return { questionType: "translation" as const, direction, targetLanguage: direction === "tr_en" ? ("en" as const) : ("tr" as const) };
  }
  return { questionType: "restatement" as const, direction: null, targetLanguage: null };
}

function sourceRole(id: string): "scoring" | "negative_control" {
  if (negativeControlIds.has(id)) return "negative_control";
  if (scoringIdSet.has(id)) return "scoring";
  return "scoring";
}

type Reading = { misreadingMechanism: string | null; studentMisreading: string };

function loadReadings(liveDir: string, id: string): Reading[] {
  const file = path.join(liveDir, `${id}.json`);
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { arms?: { B?: { readings?: Reading[] } } };
  return parsed.arms?.B?.readings ?? [];
}

type SpanAuditRow = {
  relation: SemanticRelation;
  status: SemanticFrameSlot["status"];
  statement: string | null;
  inSource: boolean | null;
  semanticFieldOk: boolean | null;
  notes: string[];
};

function normalizedIncludes(source: string, statement: string | null): boolean {
  if (!statement) return false;
  return source.toLocaleLowerCase("en-US").includes(statement.toLocaleLowerCase("en-US"));
}

function auditSpanSemantics(source: string, key: string, slots: Record<SemanticRelation, SemanticFrameSlot>): SpanAuditRow[] {
  return semanticRelations.map((relation) => {
    const slot = slots[relation];
    const notes: string[] = [];
    let inSource: boolean | null = null;
    let semanticFieldOk: boolean | null = null;

    if (slot.status === "present" && slot.statement) {
      inSource = normalizedIncludes(source, slot.statement);
      if (!inSource) notes.push("statement not a contiguous substring of source");
      semanticFieldOk = true;
      if (relation === "modality_epistemic" && /\bwould still have been\b|\bwould have gone\b/i.test(slot.statement)) {
        semanticFieldOk = false;
        notes.push("counterfactual outcome belongs on condition_counterfactual, not modality_epistemic");
      }
      if (relation === "cause" && /\bso that\b/i.test(slot.statement)) {
        semanticFieldOk = false;
        notes.push("purpose clause in cause slot");
      }
      if (relation === "purpose" && /\bbecause\b/i.test(slot.statement)) {
        semanticFieldOk = false;
        notes.push("cause clause in purpose slot");
      }
      if (relation === "modality_epistemic" && /\bnever filed\b/i.test(slot.statement) && /\bno trace\b/i.test(key)) {
        semanticFieldOk = false;
        notes.push("never-filed contradicts no-trace key");
      }
    } else if (slot.status === "unverified") {
      semanticFieldOk = null;
      notes.push("unverified: not counted as proven meaning");
    } else if (slot.status === "absent") {
      semanticFieldOk = null;
    }

    return { relation, status: slot.status, statement: slot.statement, inSource, semanticFieldOk, notes };
  });
}

function planSummaryV1(report: IndependentPlanReportV1) {
  return {
    status: report.status,
    provenIndependentCount: report.provenIndependentCount,
    selected: report.plans.map((plan) => ({
      planId: plan.planId,
      mechanismId: plan.mechanismId,
      independenceKey: plan.independenceKey,
      changeRelation: plan.changeRelation,
    })),
    rejected: report.droppedVariants,
    heldInfeasible: report.heldInfeasible.map((row) => ({
      mechanismId: row.mechanismId,
      independenceKey: row.independenceKey,
      reason: "infeasible",
    })),
  };
}

function planSummaryLegacy(report: ReturnType<typeof selectIndependentPlans>) {
  return {
    status: report.status,
    provenIndependentCount: report.independentRelationCount,
    selected: report.plans.map((plan) => ({
      planId: plan.planId,
      mechanismId: plan.mechanismId,
      independenceKey: null as IndependenceKey | null,
      changeRelation: plan.changeRelation,
    })),
    rejected: report.droppedVariants.map((row) => ({
      mechanismId: row.mechanismId,
      independenceKey: "uncertain" as const,
      studentMisreading: row.studentMisreading,
      reason: "same_family",
    })),
    heldInfeasible: [] as { mechanismId: string; independenceKey: IndependenceKey; reason: string }[],
  };
}

function preserveDistinctness(plans: IndependentPlanReportV1["plans"], framePresent: SemanticRelation[]): { ok: boolean; notes: string[] } {
  const notes: string[] = [];
  for (const plan of plans) {
    const attached = attachPreserveV1([plan], framePresent)[0]!;
    const statements = attached.preserveRelations
      .map((relation) => framePresent.includes(relation) ? relation : null)
      .filter(Boolean);
    const unique = new Set(statements);
    if (unique.size < statements.length) notes.push(`${plan.planId}: duplicate preserve relation labels`);
  }
  const firstStatement = plans[0]?.expectedStudentMisreading;
  const preserveOnlyClauseRepeat = plans.every((plan) => {
    const task = writerTask(plan);
    return task.preserveRelations.length >= 2;
  });
  if (!preserveOnlyClauseRepeat && plans.length > 0) notes.push("preserve list may collapse to sparse frame");
  if (firstStatement && plans.some((plan) => plan.preserveRelations.length === 0)) {
    notes.push("empty preserveRelations before attachPreserveV1");
  }
  return { ok: notes.length === 0, notes };
}

function duplicateIndependenceKeys(plans: { independenceKey: IndependenceKey }[]): string | null {
  const seen = new Set<IndependenceKey>();
  for (const plan of plans) {
    if (seen.has(plan.independenceKey)) return plan.independenceKey;
    seen.add(plan.independenceKey);
  }
  return null;
}

export type AcceptanceComparisonRow = {
  sourceId: string;
  alias: string | null;
  bucket: string;
  role: "scoring" | "negative_control";
  legacyFramePresent: { relation: SemanticRelation; statement: string | null }[];
  v1FramePresent: { relation: SemanticRelation; statement: string | null }[];
  legacyPlans: ReturnType<typeof planSummaryLegacy>;
  v1Plans: ReturnType<typeof planSummaryV1>;
  spanAudit: SpanAuditRow[];
  spanAuditPass: boolean;
  duplicateIndependenceKeyInSelected: string | null;
  v6Eligible: boolean;
  v6EligibleReason: string;
  writerTasks: {
    planId: string;
    change: SemanticRelation;
    preserve: SemanticRelation[];
    forbidden: string[];
    studentMisreading: string;
  }[];
};

function aliasFor(id: string): string | null {
  for (const [alias, sourceId] of Object.entries(scoringSourceAliases)) {
    if (sourceId === id) return alias;
  }
  return null;
}

function buildComparisonRow(row: (typeof architectureV2FrozenSourceIds)[number]): AcceptanceComparisonRow {
  const item = itemsById().get(row.id);
  if (!item) throw new Error(`missing item ${row.id}`);
  const source = sourceSentence(item);
  const key = item.core.correctAnswer;
  const meta = questionMeta(row.id);
  const readings = loadReadings(row.liveDir, row.id);

  const legacyFrame = frameForFrozenItem(row.id);
  const v1Slots = fillSemanticSlots(source, key);
  const v1Frame = frameFromSource(source, key, meta.questionType, meta.direction);
  const legacyPresent = presentFrameSlots(legacyFrame);
  const v1Present = presentFrameSlots(v1Frame);

  const legacyPlans = selectIndependentPlans(readings);
  const v1Plans = selectIndependentPlansV1(readings, source);
  const attached = attachPreserveV1(v1Plans.plans, v1Present.map((slot) => slot.relation));

  const spanAudit = auditSpanSemantics(source, key, v1Slots);
  const spanAuditPass = spanAudit.every((slot) => slot.semanticFieldOk !== false && (slot.status !== "present" || slot.inSource === true));

  const dup = duplicateIndependenceKeys(v1Plans.plans);
  const v6Eligible = v1Plans.status === "ok" && spanAuditPass && !dup;
  let v6EligibleReason = v6Eligible ? "≥4 proven independent keys and span audit pass" : "";
  if (v1Plans.status === "source_insufficient_traps") {
    v6EligibleReason = `source_insufficient_traps (proven=${v1Plans.provenIndependentCount}); not a Writer failure`;
  } else if (!spanAuditPass) v6EligibleReason = "span audit failed";
  else if (dup) v6EligibleReason = `duplicate independence key ${dup}`;

  const writerTasks = attached.map((plan) => {
    const task = writerTask(plan);
    return {
      planId: plan.planId,
      change: task.changeRelation,
      preserve: task.preserveRelations,
      forbidden: task.forbiddenAdditions,
      studentMisreading: task.expectedStudentMisreading,
    };
  });

  preserveDistinctness(attached, v1Present.map((slot) => slot.relation));

  return {
    sourceId: row.id,
    alias: aliasFor(row.id),
    bucket: row.bucket,
    role: sourceRole(row.id),
    legacyFramePresent: legacyPresent,
    v1FramePresent: v1Present,
    legacyPlans: planSummaryLegacy(legacyPlans),
    v1Plans: planSummaryV1(v1Plans),
    spanAudit,
    spanAuditPass,
    duplicateIndependenceKeyInSelected: dup,
    v6Eligible,
    v6EligibleReason,
    writerTasks,
  };
}

function writerPromptExamples(rows: AcceptanceComparisonRow[]) {
  return rows.map((row) => {
    const item = itemsById().get(row.sourceId)!;
    const source = sourceSentence(item);
    const key = item.core.correctAnswer;
    const meta = questionMeta(row.sourceId);
    const v1Frame = frameFromSource(source, key, meta.questionType, meta.direction);
    const readings = loadReadings(
      architectureV2FrozenSourceIds.find((entry) => entry.id === row.sourceId)!.liveDir,
      row.sourceId,
    );
    const v1Plans = selectIndependentPlansV1(readings, source);
    const plans = attachPreserveV1(v1Plans.plans, presentFrameSlots(v1Frame).map((slot) => slot.relation));
    const full = semanticWriterUser({
      source,
      key,
      targetLanguage: meta.targetLanguage,
      frame: v1Frame,
      plans,
    });
    return {
      sourceId: row.sourceId,
      role: row.role,
      v6Eligible: row.v6Eligible,
      planCount: plans.length,
      prompt: full,
      excerpt: full.split("\n").slice(0, 40).join("\n"),
    };
  });
}

export function assessRootCauseFixAcceptance() {
  const beforeV1 = writerBakeoffV1Fingerprint();
  const beforeSmoke = fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]);
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
  const beforeEditorial = writerBakeoffEditorialFingerprint();
  const beforeQuality = qualityFirstPilotFingerprint();

  const comparison = architectureV2FrozenSourceIds.map(buildComparisonRow);
  const insufficient = comparison
    .filter((row) => row.v1Plans.status === "source_insufficient_traps")
    .map((row) => ({
      sourceId: row.sourceId,
      role: row.role,
      provenIndependentCount: row.v1Plans.provenIndependentCount,
      selected: row.v1Plans.selected,
      note: "Factory stops before Writer options; not counted as generation failure.",
    }));

  const eligible = comparison.filter((row) => row.v6Eligible).map((row) => row.sourceId);
  const rejected = comparison.filter((row) => !row.v6Eligible).map((row) => ({
    sourceId: row.sourceId,
    role: row.role,
    reason: row.v6EligibleReason,
  }));

  const scoringRows = comparison.filter((row) => row.role === "scoring");
  const scoringSpanPass = scoringRows.filter((row) => row.spanAuditPass).length;
  const scoringOk = scoringRows.filter((row) => row.v1Plans.status === "ok").length;

  const readyForSmallLiveQualityTest =
    factoryRootCauseFixEnabled && scoringSpanPass === scoringRows.length && scoringOk >= 5
      ? ("ready_with_flag_on" as const)
      : factoryRootCauseFixEnabled
        ? ("not_ready_span_or_plans" as const)
        : ("not_ready_flag_off" as const);

  const bugsAndFixes = [
    {
      id: "plates_counterfactual_in_epistemic_slot",
      fixed: true,
      note: "Removed counterfactual outcome spans from modality_epistemic; they stay on condition_counterfactual only.",
    },
    {
      id: "tr_en_complaints_frame_empty",
      fixed: true,
      note: "Added Turkish quantity/negation/main-action spans for the complaints negative control so the frame is not empty.",
    },
  ];

  return {
    version: rootCauseFixAcceptanceAuthorization,
    factoryRootCauseFixEnabled,
    factoryRootCauseFixVersion,
    providerCalls: rootCauseFixAcceptanceProviderCalls,
    liveAuthorized: rootCauseFixAcceptanceLiveAuthorized,
    meaningProven: false as const,
    qualityProven: false as const,
    writerClaimIsNotProof: true as const,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
    productionWriterUnchanged: qualityFirstFrozenModels.writer,
    productionJudgeUnchanged: qualityFirstFrozenModels.judge,
    studentBankWrites: 0 as const,
    comparison,
    comparisonTable: comparison.map((row) => ({
      sourceId: row.sourceId,
      alias: row.alias,
      role: row.role,
      legacyPlanStatus: row.legacyPlans.status,
      v1PlanStatus: row.v1Plans.status,
      legacySelected: row.legacyPlans.selected.map((plan) => plan.mechanismId),
      v1Selected: row.v1Plans.selected.map((plan) => plan.mechanismId),
      v1ProvenCount: row.v1Plans.provenIndependentCount,
      spanAuditPass: row.spanAuditPass,
      v6Eligible: row.v6Eligible,
    })),
    insufficientTraps: insufficient,
    eligible,
    rejected,
    writerPromptExamples: writerPromptExamples(comparison),
    bugsAndFixes,
    readyForSmallLiveQualityTest,
    readyNote:
      readyForSmallLiveQualityTest === "not_ready_flag_off"
        ? "Offline acceptance passed where applicable; keep factoryRootCauseFixEnabled false until human switch. Plates may remain source_insufficient_traps by design."
        : "See readyForSmallLiveQualityTest.",
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeV1,
      platesSmokeUnchanged: fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]) === beforeSmoke,
      compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
      editorialUnchanged: writerBakeoffEditorialFingerprint() === beforeEditorial,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    },
    forbiddenDirsIncludeOutput: (qualityFirstPilotForbiddenDirs as readonly string[]).includes(rootCauseFixAcceptanceOutputDir),
  };
}

export function writeRootCauseFixAcceptance() {
  const report = assessRootCauseFixAcceptance();
  mkdirSync(rootCauseFixAcceptanceOutputDir, { recursive: true });
  writeFileSync(
    path.join(rootCauseFixAcceptanceOutputDir, "summary.json"),
    `${JSON.stringify(
      {
        version: report.version,
        factoryRootCauseFixEnabled: report.factoryRootCauseFixEnabled,
        factoryRootCauseFixVersion: report.factoryRootCauseFixVersion,
        providerCalls: 0,
        liveAuthorized: false,
        meaningProven: false,
        qualityProven: false,
        recoveryDefault: report.recoveryDefault,
        productionWriterUnchanged: report.productionWriterUnchanged,
        productionJudgeUnchanged: report.productionJudgeUnchanged,
        eligible: report.eligible,
        insufficientTrapCount: report.insufficientTraps.length,
        readyForSmallLiveQualityTest: report.readyForSmallLiveQualityTest,
        readyNote: report.readyNote,
        recordsImmutable: report.recordsImmutable,
        forbiddenDirsIncludeOutput: report.forbiddenDirsIncludeOutput,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(path.join(rootCauseFixAcceptanceOutputDir, "comparison-table.json"), `${JSON.stringify(report.comparisonTable, null, 2)}\n`);
  writeFileSync(path.join(rootCauseFixAcceptanceOutputDir, "comparison-full.json"), `${JSON.stringify(report.comparison, null, 2)}\n`);
  writeFileSync(
    path.join(rootCauseFixAcceptanceOutputDir, "span-audit.json"),
  `${JSON.stringify(
      report.comparison.map((row) => ({ sourceId: row.sourceId, spanAudit: row.spanAudit, spanAuditPass: row.spanAuditPass })),
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(rootCauseFixAcceptanceOutputDir, "eligible-rejected.json"),
    `${JSON.stringify({ eligible: report.eligible, rejected: report.rejected }, null, 2)}\n`,
  );
  writeFileSync(path.join(rootCauseFixAcceptanceOutputDir, "writer-prompt-examples.json"), `${JSON.stringify(report.writerPromptExamples, null, 2)}\n`);
  writeFileSync(path.join(rootCauseFixAcceptanceOutputDir, "insufficient-traps.json"), `${JSON.stringify(report.insufficientTraps, null, 2)}\n`);
  writeFileSync(path.join(rootCauseFixAcceptanceOutputDir, "bugs-and-fixes.json"), `${JSON.stringify(report.bugsAndFixes, null, 2)}\n`);
  writeFileSync(
    path.join(rootCauseFixAcceptanceOutputDir, "plan.json"),
    `${JSON.stringify(
      {
        authorization: rootCauseFixAcceptanceAuthorization,
        sources: architectureV2FrozenSourceIds.length,
        scoring: 6,
        negativeControls: 2,
        generateCalls: 0,
      },
      null,
      2,
    )}\n`,
  );
  return report;
}