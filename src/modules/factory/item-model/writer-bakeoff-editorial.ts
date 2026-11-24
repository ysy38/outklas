import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { architectureV2BlindEvalProtocol } from "./architecture-v2";
import { incompleteOption, sameProposition } from "./misreading-mechanisms";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { assessWholeSet, classifyOption } from "./whole-set";
import {
  bakeoffHardBlocks,
  freezeWriterBakeoffTasks,
  writerBakeoffBlindSeed,
  writerBakeoffSmokeSourceId,
  type BakeoffPlan,
} from "./writer-bakeoff";
import {
  activeToPassiveEquivalence,
  artificialRoleSwap,
  auditFrozenPlans,
  evaluateWriterOption,
  loadPlatesSmokeCells,
  writerBakeoffCompareOutputDir,
  writerBakeoffRemainingSourceIds,
  type PlanFeasibility,
} from "./writer-bakeoff-compare";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffSmokeOutputDir, writerBakeoffV1Fingerprint } from "./writer-bakeoff-smoke";

export const writerBakeoffEditorialAuthorization = "writer-bakeoff-editorial-analysis-v1";
export const writerBakeoffEditorialOutputDir = ".data/analysis/_factory/cognitive-trap/writer-bakeoff-editorial-v1";
export const writerBakeoffEditorialLiveAuthorized = false;

export type EditorialFeasibility = "feasible" | "questionable" | "infeasible";
export type AnalystShown = "pass" | "fail" | "yes" | "no" | "unverified";

const feasibilityMap: Record<PlanFeasibility, EditorialFeasibility> = {
  natural: "feasible",
  strained: "questionable",
  artificial: "infeasible",
};

const scoringIds = [writerBakeoffSmokeSourceId, ...writerBakeoffRemainingSourceIds];

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

function seedFor(sourceId: string, setting: string) {
  let hash = writerBakeoffBlindSeed >>> 0;
  const text = `${sourceId}|${setting}`;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 2654435761) >>> 0;
  return hash;
}

function rating(analyst: AnalystShown) {
  return { analyst, human: "pending" as const };
}

function targetLanguage(direction: string | null): "tr" | "en" | null {
  return direction === "en_tr" ? "tr" : direction === "tr_en" ? "en" : null;
}

type CompareSummary = {
  executed: boolean;
  providerCalls: number;
  recordedSmokeUsd: number;
  remainingActualUsd: number;
  totalBakeoffUsd: number;
  unrecordedHaiku?: { conservativeCeilingUsd: number | null };
  cells: { sourceId: string; setting: string; reused: boolean; options: string[]; costUsd: number | null; technicalFailure?: string | null }[];
};

function loadCompareSummary(): CompareSummary {
  return JSON.parse(readFileSync(path.join(writerBakeoffCompareOutputDir, "summary.json"), "utf8")) as CompareSummary;
}

function loadCellRecord(sourceId: string, setting: string, reused: boolean) {
  if (reused) {
    const cell = loadPlatesSmokeCells().find((row) => row.setting === setting);
    return {
      candidates: cell?.candidates ?? [],
      usage: cell?.usage ?? null,
      technicalFailure: null as string | null,
      finishReason: null as string | null,
      contentText: null as string | null,
    };
  }
  const file = path.join(writerBakeoffCompareOutputDir, `${sourceId}__${setting.replaceAll("/", "_")}.json`);
  const rawFile = path.join(writerBakeoffCompareOutputDir, `${sourceId}__${setting.replaceAll("/", "_")}.raw.json`);
  const parsed = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as {
        candidates?: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string }[];
        usage?: { inputTokens: number; outputTokens: number; reasoningTokens: number | null; totalTokens: number };
        technicalFailure?: string | null;
      })
    : {};
  const raw = existsSync(rawFile)
    ? (JSON.parse(readFileSync(rawFile, "utf8")) as { finishReason?: string | null; contentText?: string | null; usage?: { outputTokens?: number; reasoningTokens?: number | null } })
    : {};
  return {
    candidates: parsed.candidates ?? [],
    usage: parsed.usage ?? null,
    technicalFailure: parsed.technicalFailure ?? null,
    finishReason: raw.finishReason ?? null,
    contentText: raw.contentText ?? null,
  };
}

export function editorialPlans() {
  return auditFrozenPlans().map((row) => ({
    sourceId: row.sourceId,
    planId: row.planId,
    mechanismId: row.mechanismId,
    family: row.family,
    changeRelation: row.changeRelation,
    expectedStudentMisreading: row.expectedStudentMisreading,
    feasibility: feasibilityMap[row.feasibility],
    priorLabel: row.feasibility,
    defectKind: row.defectKind,
    notes: row.notes,
    frozenUnchanged: true as const,
    humanEditorial: "pending" as const,
  }));
}

/** Recorded-bake-off observations only. Not imported by the live factory path. */
function analystCaseNotes(input: { sourceId: string; setting: string; planId: string; text: string; key: string; source: string }): string[] {
  const notes: string[] = [];
  const opt = input.text.toLocaleLowerCase("tr-TR");
  if (input.sourceId === writerBakeoffSmokeSourceId && input.planId === "p3-AGENT_ROLE" && artificialRoleSwap(input.text)) {
    notes.push("executed_infeasible_agent_role_as_impossible_event");
  }
  if (input.sourceId === writerBakeoffSmokeSourceId && activeToPassiveEquivalence(input.source, input.text)) {
    notes.push("active_to_passive_may_keep_the_counterfactual");
  }
  if (input.sourceId === "taxonomy-translation-en_tr" && refereesStaysInsideKey(input.text)) {
    notes.push("referees_option_stays_inside_key_clauses");
  }
  if (input.sourceId === "taxonomy-translation-tr_en" && sameProposition(input.key, input.text)) {
    notes.push("board_option_is_the_key");
  }
  if (input.sourceId === "taxonomy-translation-tr_en" && input.planId === "p2-CONDITION_DIRECTION") {
    notes.push("board_condition_reversal_is_the_intended_trap_if_if-and-only-if_is_not_created");
  }
  if (input.sourceId === "taxonomy-restatement-medium" && input.planId === "p3-EVIDENCE_CERTAINTY") {
    notes.push("registry_must_change_epistemic_force_not_the_filing_event");
  }
  if (input.sourceId === "taxonomy-restatement-medium" && /trace/.test(opt) && /had not been filed/.test(opt)) {
    notes.push("registry_p4_near_key_absence_of_filing_plus_a_trace");
  }
  if (input.sourceId === "quality-first-translation-en_tr") {
    if (/sonucunda/.test(opt) && !/için/.test(opt)) notes.push("faculty_purpose_collapsed_to_result");
    if (/nedeniyle/.test(opt) && !/için/.test(opt)) notes.push("faculty_purpose_clause_dropped");
    if (/diğer donanım/.test(opt)) notes.push("faculty_unsupported_other_equipment");
  }
  if (input.text.includes("humidity fell") || /\bhumidity fell\b/i.test(input.text)) notes.push("unsupported_humidity_falling");
  return notes;
}

function refereesStaysInsideKey(option: string): boolean {
  const opt = option.toLocaleLowerCase("tr-TR");
  const keepsEvidence = /kanıt/.test(opt) && /birincil/.test(opt);
  const keepsOpen = /açık bırakt/.test(opt) || /göz ardı etmed/.test(opt);
  const causeSwap = /bulamadıkları için/.test(opt);
  const dismiss = /reddett/.test(opt);
  const quantityWiden = /tüm ölçüt/.test(opt) || /hiçbir sonucu/.test(opt);
  return keepsEvidence && keepsOpen && !causeSwap && !dismiss && !quantityWiden;
}

export function evaluateOptionRecord(input: {
  sourceId: string;
  setting: string;
  source: string;
  key: string;
  targetLanguage: "tr" | "en" | null;
  plan: BakeoffPlan;
  priorFeasibility: PlanFeasibility;
  feasibility: EditorialFeasibility;
  text: string;
  siblings: { planId: string; family: string; changeRelation: string; text: string }[];
  writerSemanticRisk: string;
}) {
  const classified = classifyOption(input.source, input.key, input.text);
  const execution = evaluateWriterOption({
    source: input.source,
    key: input.key,
    targetLanguage: input.targetLanguage,
    plan: input.plan,
    planFeasibility: input.priorFeasibility,
    candidate: { candidateText: input.text, planId: input.plan.planId, studentMisreading: input.plan.expectedStudentMisreading, semanticRisk: input.writerSemanticRisk },
  });
  const notes = analystCaseNotes({ sourceId: input.sourceId, setting: input.setting, planId: input.plan.planId, text: input.text, key: input.key, source: input.source });
  const set = assessWholeSet({
    source: input.source,
    key: input.key,
    options: {
      A: input.key,
      B: input.siblings[0]?.text ?? input.text,
      C: input.siblings[1]?.text ?? input.text,
      D: input.siblings[2]?.text ?? input.text,
      E: input.siblings[3]?.text ?? input.text,
    },
    correct: "A",
  });
  const duplicate = input.siblings.some((row) => row.planId !== input.plan.planId && (row.changeRelation === input.plan.changeRelation || row.family === input.plan.family));
  const extra = execution.flags.includes("artificial_role_swap") || notes.includes("faculty_unsupported_other_equipment") || notes.includes("unsupported_humidity_falling") || /\bintervened\b/i.test(input.text);
  const second =
    execution.flags.includes("critical_second_answer_risk") ||
    execution.hardBlocks.includes("key_equivalence") ||
    execution.hardBlocks.includes("second_defensible") ||
    execution.semanticStatus === "confirmed_equivalent" ||
    notes.includes("referees_option_stays_inside_key_clauses") ||
    notes.includes("board_option_is_the_key") ||
    notes.includes("registry_p4_near_key_absence_of_filing_plus_a_trace") ||
    notes.includes("active_to_passive_may_keep_the_counterfactual");
  return {
    sourceId: input.sourceId,
    setting: input.setting,
    planId: input.plan.planId,
    option: input.text,
    writerSemanticRisk: input.writerSemanticRisk,
    writerClaimIsNotProof: true as const,
    planFeasibility: input.feasibility,
    sourceCoverage: rating(execution.writerExecutionQuality.coverageRetention === "fail" || incompleteOption(input.text) ? "fail" : "unverified"),
    singleDominantMutation: rating(execution.writerExecutionQuality.singleDominantMutation === "fail" ? "fail" : "unverified"),
    wrongAnswerValidity: rating(execution.writerExecutionQuality.wrongAnswerQuality === "fail" || second ? "fail" : "unverified"),
    secondDefensibleAnswerRisk: rating(second ? "yes" : "unverified"),
    naturalness: rating(execution.writerExecutionQuality.naturalness === "fail" ? "fail" : "unverified"),
    unsupportedAdditions: rating(extra ? "yes" : "unverified"),
    duplicateTrap: rating(duplicate ? "yes" : "unverified"),
    structuralClue: rating(set.risks.whole_set_clue_risk.length ? "yes" : "unverified"),
    classified: classified.relation,
    overlapWithKeyOrSource: classified.overlap,
    hardBlocks: bakeoffHardBlocks({ source: input.source, key: input.key, option: input.text, targetLanguage: input.targetLanguage }),
    flags: execution.flags,
    wholeSetClues: set.risks.whole_set_clue_risk,
    analystCaseNotes: notes,
    meaningProven: false as const,
    humanEditorialAcceptance: "pending" as const,
    automaticEvaluationIsNotEditorialAcceptance: true as const,
  };
}

type SpecialInvestigation = {
  id: string;
  rootCause: "Planner" | "Writer" | "Provider/Reasoning" | "Selector";
  humanEditorial: "pending";
  finding: string;
  records?: unknown;
  overlap?: number | null;
  secondDefensibleAnswerRisk?: string | null;
  flags?: string[];
  options?: { planId: string; overlap: number; second: string; notes: string[] }[];
  cells?: { sourceId: string; finishReason: string | null; outputTokens: number | null; reasoningTokens: number | null; contentEmpty: boolean }[];
};

export function specialInvestigations(records: ReturnType<typeof evaluateOptionRecord>[]): SpecialInvestigation[] {
  const platesAgent = records.filter((row) => row.sourceId === writerBakeoffSmokeSourceId && row.planId === "p3-AGENT_ROLE");
  const deepseekPlatesP3 = records.find((row) => row.sourceId === writerBakeoffSmokeSourceId && row.setting.endsWith("deepseek-v3.2") && row.planId === "p3-AGENT_ROLE");
  const deepseekReferees = records.filter((row) => row.sourceId === "taxonomy-translation-en_tr" && row.setting.endsWith("deepseek-v3.2"));
  const hydrogenFaculty = loadCellRecord("quality-first-translation-en_tr", "openrouter:google/gemini-4-hydrogen", false);
  const hydrogenReferees = loadCellRecord("taxonomy-translation-en_tr", "openrouter:google/gemini-4-hydrogen", false);
  return [
    {
      id: "plates_agent_role_plan",
      rootCause: "Planner",
      humanEditorial: "pending",
      finding: "Plates AGENT_ROLE is infeasible. Conservators and glass plates are not interchangeable agents. The live misreading is not a role inversion. Frozen plan is unchanged. Haiku, Hydrogen, and Argon executed the impossible event; that is plan execution, not a feasible-trap score.",
      records: platesAgent.map((row) => ({ setting: row.setting, flags: row.flags, naturalness: row.naturalness.analyst, unsupportedAdditions: row.unsupportedAdditions.analyst })),
    },
    {
      id: "deepseek_plates_p3_passive",
      rootCause: "Writer",
      humanEditorial: "pending",
      finding: "DeepSeek plates p3 drops the conservators and uses had been sealed. Active-to-passive can keep the same counterfactual. Analyst marks critical second-defensible risk. Writer semanticRisk none is not proof.",
      overlap: deepseekPlatesP3?.overlapWithKeyOrSource ?? null,
      secondDefensibleAnswerRisk: deepseekPlatesP3?.secondDefensibleAnswerRisk.analyst ?? null,
      flags: deepseekPlatesP3?.flags ?? [],
    },
    {
      id: "deepseek_referees_near_key",
      rootCause: "Writer",
      humanEditorial: "pending",
      finding: "DeepSeek's four referee options stay inside the key's two clauses (no evidence on the primary outcome; secondary decline left open). p2 only adds hiçbir; p3 only changes bulamadılar to bulamadıklarını belirttiler; p4 replaces açık bıraktılar with göz ardı etmediler, which can still be read as leaving the possibility open. Analyst flags potential second-key risk on the whole set.",
      options: deepseekReferees.map((row) => ({ planId: row.planId, overlap: row.overlapWithKeyOrSource, second: row.secondDefensibleAnswerRisk.analyst, notes: row.analystCaseNotes })),
    },
    {
      id: "hydrogen_en_tr_length",
      rootCause: "Provider/Reasoning",
      humanEditorial: "pending",
      finding: "Hydrogen returned HTTP success on faculty and referees EN→TR but finishReason LENGTH, content empty, reasoningTokens ≈ output floor 4096. This is a provider/reasoning budget failure, not a Writer wording failure. Retry stayed 0.",
      cells: [
        { sourceId: "quality-first-translation-en_tr", finishReason: hydrogenFaculty.finishReason, outputTokens: hydrogenFaculty.usage?.outputTokens ?? null, reasoningTokens: hydrogenFaculty.usage?.reasoningTokens ?? null, contentEmpty: hydrogenFaculty.contentText === "" },
        { sourceId: "taxonomy-translation-en_tr", finishReason: hydrogenReferees.finishReason, outputTokens: hydrogenReferees.usage?.outputTokens ?? null, reasoningTokens: hydrogenReferees.usage?.reasoningTokens ?? null, contentEmpty: hydrogenReferees.contentText === "" },
      ],
    },
    {
      id: "registry_evidence_vs_certainty",
      rootCause: "Planner",
      humanEditorial: "pending",
      finding: "Registry p3 EVIDENCE_CERTAINTY asks writers to turn found no trace into established never filed. That is a usable trap if kept to epistemic force. Registry p4 NEGATION_SCOPE (a trace that they had not been filed) is close to a second rendering of the key. Planner overlap, not a selector issue: this bake-off has no selector.",
    },
    {
      id: "faculty_purpose_cause",
      rootCause: "Writer",
      humanEditorial: "pending",
      finding: "Faculty source has both purpose (değerlememesi için) and cause (aynı kadronun hazırlamış olması nedeniyle). Several options collapse purpose into result (sonucunda), drop the purpose, or add diğer donanımlar. Human pending; analyst notes relation coverage risk without calling it editorial acceptance.",
    },
    {
      id: "board_conditional_vs_key",
      rootCause: "Writer",
      humanEditorial: "pending",
      finding: "Board p2 is the intended condition reversal. DeepSeek p4 is the key wording with Only the two disputed tables… if the board had read. That is a shown second key, not a reversal. Hydrogen/Argon p3 drop only and are quantity/focus changes pending human review.",
    },
  ];
}

export function rootCauses() {
  return [
    {
      class: "Planner",
      items: [
        "Plates p3 AGENT_ROLE is infeasible and should not be scored as a Writer loss when the model invents plates-sealing-people.",
        "Plates p2 and p4 share time_order. Embargo p1/p2 and board p3/p4 share quantity_scope.",
        "Plates p4 studentMisreading introduces humidity falling, which the source does not contain.",
        "Registry p4 misreading is close to a second key.",
      ],
    },
    {
      class: "Writer",
      items: [
        "Counterfactual-to-factual on plates p1 (Haiku, Hydrogen, Argon) executes a feasible plan as a completed sealing.",
        "DeepSeek plates p3 uses passive equivalence instead of a role change.",
        "DeepSeek referees stay inside the key proposition four times.",
        "DeepSeek board p4 copies the key.",
        "Artificial role swaps on plates p3 for Haiku, Hydrogen, Argon follow an infeasible plan into impossible events.",
      ],
    },
    {
      class: "Provider/Reasoning",
      items: [
        "Hydrogen faculty and referees: LENGTH, empty content, reasoning consumed the 4096 floor.",
        "Unrecorded first Haiku smoke hit remains in the spend audit; it is not a plates cell.",
      ],
    },
    {
      class: "Selector",
      items: [
        "This bake-off has no selector. Duplicate traps are plan collisions, not a cull.",
        "Production min-4 still exists on the live factory path and is out of scope here.",
      ],
    },
  ] as const;
}

export function buildWholeSetForms(input: {
  sourceId: string;
  source: string;
  key: string;
  setting: string;
  options: { planId: string; text: string }[];
}[]) {
  const forms = input.map((item, index) => {
    const complete = item.options.length === 4;
    const shuffled = complete ? shuffle(item.options, seedFor(item.sourceId, item.setting)) : [];
    const letters = ["B", "C", "D", "E"] as const;
    const options = complete
      ? { A: item.key, B: shuffled[0]!.text, C: shuffled[1]!.text, D: shuffled[2]!.text, E: shuffled[3]!.text }
      : null;
    return {
      setId: `S${String(index + 1).padStart(2, "0")}`,
      sourceId: item.sourceId,
      source: item.source,
      labeledKey: item.key,
      complete,
      options,
      optionRatings: complete
        ? {
            B: emptyHumanOptionRatings(),
            C: emptyHumanOptionRatings(),
            D: emptyHumanOptionRatings(),
            E: emptyHumanOptionRatings(),
          }
        : null,
      skipReason: complete ? null : "four option texts missing; technical incomplete",
      planOrder: complete ? letters.map((letter, i) => ({ letter, planId: shuffled[i]!.planId })) : [],
      itemDecision: null,
      judgeApproveIsNotEditorialAcceptance: true as const,
      automaticGateIsNotEditorialAcceptance: true as const,
      humanEditorial: "pending" as const,
    };
  });
  const human = forms.map((form) => {
    const { planOrder, ...rest } = form;
    void planOrder;
    return rest;
  });
  const leaked = /claude-haiku|claude-sonnet|deepseek|openrouter:|gemini-4/i.test(JSON.stringify(human));
  return {
    protocol: architectureV2BlindEvalProtocol,
    modelNameHidden: !leaked,
    forms: human,
    key: forms.map((form, index) => ({
      setId: form.setId,
      sourceId: input[index]!.sourceId,
      model: input[index]!.setting,
      planOrder: forms[index]!.planOrder,
      complete: form.complete,
    })),
  };
}

function emptyHumanOptionRatings() {
  return {
    planFeasibility: null,
    sourceCoverage: null,
    singleDominantMutation: null,
    wrongAnswerValidity: null,
    secondDefensibleAnswerRisk: null,
    naturalness: null,
    unsupportedAdditions: null,
    duplicateTrap: null,
    structuralClue: null,
  };
}

export function packBlindOptionUnits(input: {
  sourceId: string;
  source: string;
  key: string;
  setting: string;
  options: { planId: string; text: string }[];
}[]) {
  const rows: { unit: Record<string, unknown>; model: string; sourceId: string; planId: string }[] = [];
  let n = 0;
  for (const item of input) {
    if (item.options.length !== 4) continue;
    const shuffled = shuffle(item.options, seedFor(item.sourceId, item.setting));
    const set = { A: item.key, B: shuffled[0]!.text, C: shuffled[1]!.text, D: shuffled[2]!.text, E: shuffled[3]!.text };
    for (const [index, option] of shuffled.entries()) {
      n += 1;
      const letter = (["B", "C", "D", "E"] as const)[index]!;
      rows.push({
        model: item.setting,
        sourceId: item.sourceId,
        planId: option.planId,
        unit: {
          code: `E${String(n).padStart(3, "0")}`,
          source: item.source,
          labeledKey: item.key,
          rateThisLetter: letter,
          option: option.text,
          set,
          ratings: emptyHumanOptionRatings(),
          judgeApproveIsNotEditorialAcceptance: true,
          automaticGateIsNotEditorialAcceptance: true,
          humanEditorial: "pending",
        },
      });
    }
  }
  const packed = shuffle(rows, writerBakeoffBlindSeed);
  const units = packed.map((row, index) => ({ ...row.unit, code: `E${String(index + 1).padStart(3, "0")}` }));
  const leaked = /claude-haiku|claude-sonnet|deepseek|openrouter:|gemini-4/i.test(JSON.stringify(units));
  return {
    modelNameHidden: !leaked,
    units,
    key: packed.map((row, index) => ({ code: `E${String(index + 1).padStart(3, "0")}`, model: row.model, sourceId: row.sourceId, planId: row.planId })),
  };
}

export function modelScorecard(input: {
  setting: string;
  completedCells: number;
  scoringCells: number;
  records: ReturnType<typeof evaluateOptionRecord>[];
  costUsd: number;
}) {
  const feasible = input.records.filter((row) => row.planFeasibility === "feasible");
  const feasibleOk = feasible.filter(
    (row) => row.sourceCoverage.analyst !== "fail" && row.singleDominantMutation.analyst !== "fail" && row.wrongAnswerValidity.analyst !== "fail",
  );
  const second = input.records.filter((row) => row.secondDefensibleAnswerRisk.analyst === "yes");
  const natural = input.records.filter((row) => row.naturalness.analyst === "fail");
  const duplicate = input.records.filter((row) => row.duplicateTrap.analyst === "yes");
  const denom = input.records.length || 1;
  return {
    setting: input.setting,
    technicalCompletion: input.completedCells / input.scoringCells,
    completedCells: input.completedCells,
    scoringCells: input.scoringCells,
    optionCount: input.records.length,
    feasiblePlanExecutionRate: feasible.length ? feasibleOk.length / feasible.length : null,
    potentialSecondKeyRate: second.length / denom,
    naturalnessRiskRate: natural.length / denom,
    duplicateTrapRate: duplicate.length / denom,
    editorialAcceptanceRate: "unknown" as const,
    costPerAcceptedItem: undefined,
    costUsd: input.costUsd,
    humanEditorial: "pending" as const,
    writerClaimIsNotProof: true as const,
    automaticEvaluationIsNotEditorialAcceptance: true as const,
  };
}

export function decisionTable(scorecards: ReturnType<typeof modelScorecard>[]) {
  return {
    winnerDeclared: false,
    humanEditorialComplete: false,
    productionModelsUnchangedUntil: "human bake-off complete and an explicit switch",
    rows: scorecards.map((row) => ({
      setting: row.setting,
      technicalCompletion: row.technicalCompletion,
      feasiblePlanExecutionRate: row.feasiblePlanExecutionRate,
      potentialSecondKeyRate: row.potentialSecondKeyRate,
      naturalnessRiskRate: row.naturalnessRiskRate,
      duplicateTrapRate: row.duplicateTrapRate,
      editorialAcceptanceRate: row.editorialAcceptanceRate,
      costUsd: row.costUsd,
      costPerAcceptedItem: row.costPerAcceptedItem,
      selectNow: false,
      waitForHumanPack: true,
    })),
    notes: [
      "Do not pick a production Writer from analyst flags.",
      "Infeasible plates AGENT_ROLE must not count against a Writer as if the plan were feasible.",
      "Hydrogen EN→TR LENGTH failures are provider/reasoning, not wording quality.",
      "DeepSeek referee near-keys and board p4 key copy need human second-answer review before any cost argument.",
    ],
  };
}

export function writeWriterBakeoffEditorial() {
  const beforeV1 = writerBakeoffV1Fingerprint();
  const beforeSmoke = fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]);
  const beforeCompare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
  const beforeQuality = qualityFirstPilotFingerprint();
  const tasks = freezeWriterBakeoffTasks().filter((task) => scoringIds.includes(task.id as (typeof scoringIds)[number]));
  const summary = loadCompareSummary();
  const plans = editorialPlans();
  const unrecordedUsd = summary.unrecordedHaiku?.conservativeCeilingUsd ?? 0;
  const records: ReturnType<typeof evaluateOptionRecord>[] = [];
  const missing: { sourceId: string; setting: string; reason: string; finishReason: string | null; outputTokens: number | null; reasoningTokens: number | null }[] = [];
  const setInputs: { sourceId: string; source: string; key: string; setting: string; options: { planId: string; text: string }[] }[] = [];
  const settings = [...new Set(summary.cells.map((cell) => cell.setting))];

  for (const cell of summary.cells) {
    const task = tasks.find((row) => row.id === cell.sourceId);
    if (!task) continue;
    const loaded = loadCellRecord(cell.sourceId, cell.setting, cell.reused);
    const candidates = loaded.candidates;
    if (candidates.length !== 4) {
      missing.push({
        sourceId: cell.sourceId,
        setting: cell.setting,
        reason: loaded.technicalFailure ?? cell.technicalFailure ?? "four option texts missing",
        finishReason: loaded.finishReason,
        outputTokens: loaded.usage?.outputTokens ?? null,
        reasoningTokens: loaded.usage?.reasoningTokens ?? null,
      });
      setInputs.push({ sourceId: cell.sourceId, source: task.source, key: task.key, setting: cell.setting, options: [] });
      continue;
    }
    const siblings = candidates.map((candidate) => {
      const plan = task.plans.find((row) => row.planId === candidate.planId);
      return {
        planId: candidate.planId,
        family: plan?.family ?? "",
        changeRelation: plan?.changeRelation ?? "",
        text: candidate.candidateText,
      };
    });
    for (const candidate of candidates) {
      const plan = task.plans.find((row) => row.planId === candidate.planId);
      if (!plan) continue;
      const planRow = plans.find((row) => row.sourceId === task.id && row.planId === plan.planId);
      records.push(
        evaluateOptionRecord({
          sourceId: task.id,
          setting: cell.setting,
          source: task.source,
          key: task.key,
          targetLanguage: targetLanguage(task.direction),
          plan,
          priorFeasibility: planRow?.priorLabel ?? "strained",
          feasibility: planRow?.feasibility ?? "questionable",
          text: candidate.candidateText,
          siblings,
          writerSemanticRisk: candidate.semanticRisk,
        }),
      );
    }
    setInputs.push({
      sourceId: cell.sourceId,
      source: task.source,
      key: task.key,
      setting: cell.setting,
      options: candidates.map((candidate) => ({ planId: candidate.planId, text: candidate.candidateText })),
    });
  }

  const whole = buildWholeSetForms(setInputs);
  const optionUnits = packBlindOptionUnits(setInputs);
  const costBySetting: Record<string, number> = {};
  for (const cell of summary.cells) costBySetting[cell.setting] = (costBySetting[cell.setting] ?? 0) + (cell.costUsd ?? 0);
  const haiku = settings.find((setting) => setting.endsWith("claude-haiku-5.5"));
  if (haiku) costBySetting[haiku] = (costBySetting[haiku] ?? 0) + unrecordedUsd;
  const scorecards = settings.map((setting) =>
    modelScorecard({
      setting,
      completedCells: summary.cells.filter((cell) => cell.setting === setting && cell.options.length === 4).length,
      scoringCells: scoringIds.length,
      records: records.filter((row) => row.setting === setting),
      costUsd: costBySetting[setting] ?? 0,
    }),
  );

  const report = {
    version: writerBakeoffEditorialAuthorization,
    providerCalls: 0,
    liveAuthorized: writerBakeoffEditorialLiveAuthorized,
    writerClaimIsNotProof: true,
    meaningProven: false,
    qualityProven: false,
    editorialAcceptance: false,
    humanEditorial: "pending",
    automaticEvaluationIsNotEditorialAcceptance: true,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
    productionWriterUnchanged: qualityFirstFrozenModels.writer,
    productionJudgeUnchanged: qualityFirstFrozenModels.judge,
    studentBankWrites: 0,
    optionUnits: records.length,
    missingCells: missing,
    recordedBakeoffUsd: summary.totalBakeoffUsd,
    unrecordedHaikuUsd: unrecordedUsd,
    plans,
    specialInvestigations: specialInvestigations(records),
    rootCauses: rootCauses(),
    scorecards,
    decisionTable: decisionTable(scorecards),
    recordsImmutable: {
      writerBakeoffV1Unchanged: writerBakeoffV1Fingerprint() === beforeV1,
      platesSmokeUnchanged: fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]) === beforeSmoke,
      compareUnchanged: fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]) === beforeCompare,
      qualityFirstUnchanged: qualityFirstPilotFingerprint() === beforeQuality,
    },
    forbiddenDirsIncludeOutput: (qualityFirstPilotForbiddenDirs as readonly string[]).includes(writerBakeoffEditorialOutputDir),
  };

  mkdirSync(writerBakeoffEditorialOutputDir, { recursive: true });
  mkdirSync(path.join(writerBakeoffEditorialOutputDir, "blind"), { recursive: true });
  writeFileSync(
    path.join(writerBakeoffEditorialOutputDir, "summary.json"),
    `${JSON.stringify(
      {
        version: report.version,
        providerCalls: 0,
        liveAuthorized: false,
        optionUnits: report.optionUnits,
        missingCells: missing,
        humanEditorial: "pending",
        winnerDeclared: false,
        editorialAcceptanceRate: "unknown",
        costPerAcceptedItem: null,
        scorecards,
        decisionTable: report.decisionTable,
        recordsImmutable: report.recordsImmutable,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(path.join(writerBakeoffEditorialOutputDir, "plans.json"), `${JSON.stringify(plans, null, 2)}\n`);
  writeFileSync(path.join(writerBakeoffEditorialOutputDir, "option-records.json"), `${JSON.stringify(records, null, 2)}\n`);
  writeFileSync(path.join(writerBakeoffEditorialOutputDir, "special-investigations.json"), `${JSON.stringify(report.specialInvestigations, null, 2)}\n`);
  writeFileSync(path.join(writerBakeoffEditorialOutputDir, "root-causes.json"), `${JSON.stringify(report.rootCauses, null, 2)}\n`);
  writeFileSync(
    path.join(writerBakeoffEditorialOutputDir, "blind", "whole-set.json"),
    `${JSON.stringify(
      {
        instructions: "Compare each B–E option with the source and the labeled key together. A is the key. Rate plan feasibility separately from writer execution. Do not infer the writer. Analyst flags are not in this pack and are not acceptance.",
        modelNameHidden: whole.modelNameHidden,
        judgeApproveIsNotEditorialAcceptance: true,
        units: whole.forms,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(writerBakeoffEditorialOutputDir, "blind", "option-units.json"),
    `${JSON.stringify(
      {
        instructions: "Rate the named letter against the source, the labeled key, and the A–E set. Do not infer the writer.",
        modelNameHidden: optionUnits.modelNameHidden,
        judgeApproveIsNotEditorialAcceptance: true,
        units: optionUnits.units,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(writerBakeoffEditorialOutputDir, "blind", "key.json"),
    `${JSON.stringify({ seed: writerBakeoffBlindSeed, wholeSet: whole.key, optionUnits: optionUnits.key }, null, 2)}\n`,
  );
  writeFileSync(path.join(writerBakeoffEditorialOutputDir, "plan.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
