import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { architectureV2BlindEvalProtocol } from "./architecture-v2";
import { discourseConnectorSwap } from "./cognitive-trap";
import { assessMeaningIntegrity } from "./core";
import { buildV6PilotTask, factoryV6LivePilotSourceIds } from "./factory-v6-live-pilot";
import { auditChallengeOption } from "./factory-v6-writer-challenge";
import {
  compareOption,
  comparisonWriters,
  factoryV6WriterComparisonOutputDir,
  modelScorecard,
  type ComparisonCell,
} from "./factory-v6-writer-comparison";
import { factoryRootCauseFixEnabled, refereesSecondAnswerRisk } from "./root-cause-fix";
import { scoringSourceAliases } from "./root-cause-audit";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { assessWholeSet, classifyOption, sequenceNearCopy, shownDifference } from "./whole-set";
import { writerBakeoffBlindSeed } from "./writer-bakeoff";
import { auditFrozenPlans } from "./writer-bakeoff-compare";
import { buildWholeSetForms } from "./writer-bakeoff-editorial";

export const semanticFailureEditorialVersion = "semantic-failure-root-cause-editorial-v1";
export const semanticFailureEditorialOutputDir = ".data/analysis/_factory/cognitive-trap/semantic-failure-editorial-v1";

const embargoSource =
  "Had the editors completed the citation check before the embargo, only the two contested appendices would have been released to the preprint server.";
const embargoKey =
  "Only the two contested appendices would have been released to the preprint server if the editors had finished checking the citations ahead of the embargo.";

export const flashEmbargoOptions = {
  CONDITION_DIRECTION:
    "Only the two contested appendices would have been released to the preprint server had the editors completed the citation check before the embargo.",
  COUNTERFACTUAL_FACTUAL:
    "If the editors had completed the citation check before the embargo, only the two contested appendices would have been released to the preprint server.",
  QUANTITY_SCOPE:
    "Had the editors completed the citation check before the embargo, the preprint server would have received only the two contested appendices.",
  TEMPORAL_ORDER:
    "Had the editors completed the citation check prior to the embargo, only the two contested appendices would have been released to the preprint server.",
} as const;

const haikuEmbargoAppliedControl = {
  CONDITION_DIRECTION:
    "Had only the two contested appendices been released to the preprint server, the editors would have completed the citation check before the embargo.",
  COUNTERFACTUAL_FACTUAL:
    "The editors completed the citation check before the embargo, and only the two contested appendices were released to the preprint server.",
  QUANTITY_SCOPE:
    "Had the editors completed the citation check before the embargo, at least the two contested appendices would have been released to the preprint server.",
  TEMPORAL_ORDER:
    "Had the editors completed the citation check after the embargo, only the two contested appendices would have been released to the preprint server.",
} as const;

export type DefectOrigin = "planner_origin" | "writer_execution" | "semantic_gate" | "unresolved";
export type MutationHumanStatus = "applied" | "not_applied" | "key_equivalent_risk" | "unverified";

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

function overlapTokens(left: string, right: string): number {
  const tokens = (text: string) =>
    text
      .toLocaleLowerCase("tr-TR")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2);
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

function wording(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Committed classifyOption before sequenceNearCopy and shownDifference expansions. Comparison only. */
export function shownDifferenceLegacy(reference: string, option: string): string | null {
  const concession = /\b(even though|although|though)\b/i;
  const cause = /\b(so|because|since)\b/i;
  if (concession.test(reference) && cause.test(option) && !concession.test(option)) return "concession_to_cause";
  if (/\bbefore\b/i.test(reference) && /\bduring\b/i.test(option) && !/\bbefore\b/i.test(option)) return "before_to_during";
  if (/önce/i.test(reference) && /\bduring\b/i.test(option) && !/önce/i.test(option)) return "before_to_during";
  const counterfactual = /\bhad\b[\s\S]{0,80}\bwould\b/i.test(reference) || /\bwould have\b/i.test(reference);
  if (counterfactual && /\bbecause\b/i.test(option) && /\breceived\b/i.test(option) && !/\bwould\b/i.test(option)) {
    return "counterfactual_to_factual";
  }
  if (/\breceived\b/i.test(reference) && /\bsent\b/i.test(option) && !/\breceived\b/i.test(option)) return "recipient_to_sender";
  const all = /\b(all|every|each)\b/i;
  const only = /\bonly\b/i;
  if (all.test(reference) && only.test(option) && !all.test(option) && !only.test(reference)) return "all_to_only";
  if (only.test(reference) && all.test(option) && !only.test(option) && !all.test(reference)) return "only_to_all";
  return null;
}

export function classifyOptionLegacy(source: string, key: string, option: string) {
  const shared = Math.max(overlapTokens(option, source), overlapTokens(option, key));
  if (discourseConnectorSwap(key, option) || discourseConnectorSwap(source, option)) {
    return { relation: "unresolved" as const, evidence: null as string | null, overlap: shared };
  }
  const difference = shownDifferenceLegacy(source, option) ?? shownDifferenceLegacy(key, option);
  if (difference) return { relation: "confirmed_difference" as const, evidence: difference, overlap: shared };
  const againstSource = assessMeaningIntegrity(source, option);
  const againstKey = assessMeaningIntegrity(key, option);
  if (againstSource.status === "fail") {
    return { relation: "confirmed_difference" as const, evidence: againstSource.failures[0] ?? "meaning_shift", overlap: shared };
  }
  if (againstKey.status === "fail") {
    return { relation: "confirmed_difference" as const, evidence: againstKey.failures[0] ?? "meaning_shift", overlap: shared };
  }
  if ((wording(option) === wording(key) || wording(option) === wording(source)) && wording(option).length > 0) {
    return { relation: "confirmed_equivalent" as const, evidence: "same_wording", overlap: shared };
  }
  return { relation: "unresolved" as const, evidence: null as string | null, overlap: shared };
}

function flashTargetChangeNote(planId: keyof typeof flashEmbargoOptions): string {
  if (planId === "CONDITION_DIRECTION") {
    return "The had-clause is still the editors completing the citation check. Result-first order matches the key shape. Clause-swap of the condition is not shown. Heuristic overlap with the key is 1.0; that is not a confirmed equivalence.";
  }
  if (planId === "COUNTERFACTUAL_FACTUAL") {
    return "Still If/had … would have. The unrealized alternative is intact. Sequence near-copy of the source after folding.";
  }
  if (planId === "QUANTITY_SCOPE") {
    return "Still only the two contested appendices. received vs released is not a quantity-class shift in assessMeaningIntegrity. Not a shown quantity mutation.";
  }
  return "prior to folds to before. Sequence near-copy of the source. Temporal order is unchanged.";
}

export function diagnoseFlashEmbargoOption(planId: keyof typeof flashEmbargoOptions) {
  const option = flashEmbargoOptions[planId];
  const classified = classifyOption(embargoSource, embargoKey, option);
  const legacy = classifyOptionLegacy(embargoSource, embargoKey, option);
  return {
    planId,
    option,
    classified,
    legacy,
    sequenceNearCopySource: sequenceNearCopy(option, embargoSource),
    sequenceNearCopyKey: sequenceNearCopy(option, embargoKey),
    refereesSecondAnswerRisk: refereesSecondAnswerRisk(embargoSource, embargoKey, option),
  };
}

export function flashEmbargoRootCause() {
  const rows = (Object.keys(flashEmbargoOptions) as (keyof typeof flashEmbargoOptions)[]).map(diagnoseFlashEmbargoOption);
  return {
    source: embargoSource,
    key: embargoKey,
    falseNegative:
      "classifyOption confirmed equivalent only on exact wording. assessMeaningIntegrity stays unverified when quantity, exclusivity, polarity, and counterfactual markers are unchanged. shownDifference had before_to_during but not before_to_after, and counterfactual_to_factual required because+received. assessWholeSet records overlap>=0.72 as a risk but does not fail. The comparison scorecard counted only keyEquivalent=yes, so unverified high-overlap paraphrases scored as potentialSecondAnswer=0.",
    notANewValidator: true,
    rows,
    mutation: {
      CONDITION_DIRECTION: "not_applied — result-first paraphrase of the key; the had-clause is still the editors completing the check.",
      COUNTERFACTUAL_FACTUAL: "not_applied — still If/had ... would have. Sequence near-copy of the source.",
      QUANTITY_SCOPE: "not_applied — still only the two contested appendices; received vs released is unverified, not a quantity change.",
      TEMPORAL_ORDER: "not_applied — prior to folds to before; sequence near-copy of the source.",
    },
  };
}

export function facultyNegationAndBoardQuantityPlans() {
  const rows = auditFrozenPlans().filter(
    (row) =>
      (row.sourceId === scoringSourceAliases.faculty && row.planId.includes("NEGATION")) ||
      (row.sourceId === scoringSourceAliases.board && row.planId.includes("QUANTITY")),
  );
  return {
    facultyNegation: rows.find((row) => row.sourceId === scoringSourceAliases.faculty) ?? null,
    boardQuantity: rows.find((row) => row.sourceId === scoringSourceAliases.board) ?? null,
    note: "Strained plans are plan defects. A Writer who follows them is not scored as if the plan were natural. Unverified wording is not a proven pass.",
  };
}

function loadComparisonCells(): ComparisonCell[] {
  const summary = JSON.parse(readFileSync(path.join(factoryV6WriterComparisonOutputDir, "summary.json"), "utf8")) as {
    executed?: boolean;
    cells?: ComparisonCell[];
  };
  if (!summary.executed || !summary.cells?.length) throw new Error("v6 writer comparison cells are missing");
  return summary.cells;
}

function loadComparedOptions() {
  const tasks = factoryV6LivePilotSourceIds.map((id) => buildV6PilotTask(id));
  const cells = loadComparisonCells();
  const options = cells.flatMap((cell) => {
    const task = tasks.find((row) => row.id === cell.sourceId)!;
    return cell.candidates.map((candidate, index) => {
      const compared = compareOption({ cell, task, candidate, index });
      const plan = task.plans.find((row) => row.planId === candidate.planId) ?? task.plans[index]!;
      return { cell, task, plan, candidate, compared };
    });
  });
  return { tasks, cells, options };
}

function wholeSetFromOptions(source: string, key: string, texts: string[]) {
  return assessWholeSet({
    source,
    key,
    options: { A: key, B: texts[0] ?? "", C: texts[1] ?? "", D: texts[2] ?? "", E: texts[3] ?? "" },
    correct: "A",
  });
}

function legacyWholeSetDecision(source: string, key: string, texts: string[]) {
  const classified = texts.map((text) => classifyOptionLegacy(source, key, text));
  const equivalent = classified.some((row) => row.relation === "confirmed_equivalent");
  return {
    decision: equivalent ? ("fail" as const) : ("review" as const),
    failure: equivalent ? "confirmed_equivalent" : null,
    overlapRisks: classified.filter((row) => row.relation === "unresolved" && row.overlap >= 0.72).length,
    classified,
  };
}

export function verifyFlashEmbargoSemanticGate() {
  const task = buildV6PilotTask(scoringSourceAliases.embargo);
  const rows = (Object.keys(flashEmbargoOptions) as (keyof typeof flashEmbargoOptions)[]).map((planId) => {
    const option = flashEmbargoOptions[planId];
    const plan = task.plans.find((row) => row.mechanismId === planId)!;
    const audit = auditChallengeOption({
      writer: "openrouter:deepseek/deepseek-v4.1-flash-1017",
      task,
      plan,
      candidate: { candidateText: option, planId: plan.planId, studentMisreading: "x", semanticRisk: "none" },
    });
    const current = classifyOption(embargoSource, embargoKey, option);
    const legacy = classifyOptionLegacy(embargoSource, embargoKey, option);
    const shown = shownDifference(embargoSource, option) ?? shownDifference(embargoKey, option);
    const shownOld = shownDifferenceLegacy(embargoSource, option) ?? shownDifferenceLegacy(embargoKey, option);
    const meaning = assessMeaningIntegrity(embargoSource, option);
    const targetApplied: MutationHumanStatus =
      audit.targetedChange === "fail" ? "not_applied" : audit.targetedChange === "shown" ? "applied" : "unverified";
    const keyRisk: MutationHumanStatus =
      current.relation === "confirmed_equivalent" ? "key_equivalent_risk" : current.overlap >= 0.72 ? "unverified" : "unverified";
    const falseNegativeFixed =
      legacy.relation !== "confirmed_equivalent" && current.relation === "confirmed_equivalent" && (planId === "COUNTERFACTUAL_FACTUAL" || planId === "TEMPORAL_ORDER");
    return {
      planId,
      option,
      targetSemanticChange: {
        status: targetApplied,
        note: flashTargetChangeNote(planId),
        embargoDetector: audit.targetedChange,
        embargoNotes: audit.notes,
        shownDifference: shown,
        meaningIntegrity: meaning.status,
        notProvenAsPass: true as const,
      },
      keyEquivalenceRisk: {
        status: keyRisk,
        currentRelation: current.relation,
        evidence: current.evidence,
        overlap: current.overlap,
        sequenceNearCopySource: sequenceNearCopy(option, embargoSource),
        sequenceNearCopyKey: sequenceNearCopy(option, embargoKey),
        refereesSecondAnswerRisk: refereesSecondAnswerRisk(embargoSource, embargoKey, option),
      },
      newGate: {
        classifyOption: current,
        wholeSetRole: current.relation === "confirmed_equivalent" ? "fails_set" : current.overlap >= 0.72 ? "overlap_risk_only" : "unresolved",
        scorecardBucket:
          current.relation === "confirmed_equivalent" ? "potentialSecondAnswerConfirmed" : current.overlap >= 0.72 ? "unverifiedHighOverlapRisk" : "neither",
      },
      oldGate: {
        classifyOption: legacy,
        shownDifference: shownOld,
        confirmedEquivalentOnlyOnExactWording: true as const,
        scorecardBucket: legacy.relation === "confirmed_equivalent" ? "potentialSecondAnswer" : "potentialSecondAnswer=0_unverified",
      },
      concreteFalseNegativeFixed: falseNegativeFixed,
      heuristicIsNotSemanticProof: true as const,
    };
  });
  const texts = rows.map((row) => row.option);
  const currentSet = wholeSetFromOptions(embargoSource, embargoKey, texts);
  const legacySet = legacyWholeSetDecision(embargoSource, embargoKey, texts);
  return {
    source: embargoSource,
    key: embargoKey,
    rows,
    wholeSet: {
      oldDecision: legacySet.decision,
      oldFailure: legacySet.failure,
      oldOverlapRisks: legacySet.overlapRisks,
      newDecision: currentSet.decision,
      newFailure: currentSet.failure,
      newOverlapRisks: currentSet.risks.distractor_equivalence_risk,
      falseNegativeFixed: legacySet.decision === "review" && currentSet.decision === "fail" && currentSet.failure === "confirmed_equivalent",
    },
    remainingUnverified: rows
      .filter((row) => row.keyEquivalenceRisk.currentRelation === "unresolved")
      .map((row) => row.planId),
    notANewValidator: true as const,
  };
}

export function verifyValidDistractorsNotRejected() {
  const { options } = loadComparedOptions();
  const wronglyRejected = options.filter((row) => {
    const shown = shownDifference(row.task.source, row.candidate.candidateText) ?? shownDifference(row.task.key, row.candidate.candidateText);
    const applied = row.compared.targetedChange === "shown" || shown != null;
    const relation = classifyOption(row.task.source, row.task.key, row.candidate.candidateText).relation;
    return applied && relation === "confirmed_equivalent";
  });
  const haikuControl = (Object.keys(haikuEmbargoAppliedControl) as (keyof typeof haikuEmbargoAppliedControl)[]).map((planId) => {
    const option = haikuEmbargoAppliedControl[planId];
    const current = classifyOption(embargoSource, embargoKey, option);
    const legacy = classifyOptionLegacy(embargoSource, embargoKey, option);
    return {
      planId,
      option,
      newRelation: current.relation,
      oldRelation: legacy.relation,
      shownDifference: shownDifference(embargoSource, option),
      wronglyRejectedAsEquivalent: current.relation === "confirmed_equivalent",
    };
  });
  const haikuSet = wholeSetFromOptions(embargoSource, embargoKey, Object.values(haikuEmbargoAppliedControl));
  return {
    appliedMutationMarkedEquivalent: wronglyRejected.map((row) => ({
      writer: row.cell.writer,
      sourceId: row.cell.sourceId,
      planId: row.candidate.planId,
      text: row.candidate.candidateText,
    })),
    haikuEmbargoControl: haikuControl,
    haikuEmbargoWholeSetDecision: haikuSet.decision,
    haikuEmbargoWholeSetFailure: haikuSet.failure,
    validDistractorsWronglyRejected: wronglyRejected.length > 0 || haikuControl.some((row) => row.wronglyRejectedAsEquivalent) || haikuSet.failure === "confirmed_equivalent",
  };
}

export function verifyAllComparisonGates() {
  const { options } = loadComparedOptions();
  return options.map((row) => {
    const current = classifyOption(row.task.source, row.task.key, row.candidate.candidateText);
    const legacy = classifyOptionLegacy(row.task.source, row.task.key, row.candidate.candidateText);
    return {
      writer: row.cell.writer,
      sourceId: row.cell.sourceId,
      planId: row.candidate.planId,
      mechanismId: row.plan.mechanismId,
      text: row.candidate.candidateText,
      oldRelation: legacy.relation,
      newRelation: current.relation,
      oldEvidence: legacy.evidence,
      newEvidence: current.evidence,
      overlap: current.overlap,
      targetedChange: row.compared.targetedChange,
      mutationStatus: row.compared.mutationStatus,
      highOverlapUnverified: row.compared.highOverlapUnverified,
      othersPreserved: row.compared.othersPreserved,
      relationChanged: legacy.relation !== current.relation,
    };
  });
}

export function classifyNamedDefects() {
  const plans = facultyNegationAndBoardQuantityPlans();
  const { options } = loadComparedOptions();
  const hy4CoverageFails = options.filter(
    (row) => row.cell.writer === "openrouter:tencent/hy4" && row.compared.othersPreserved === "fail",
  );
  const haikuQuantity = options.find(
    (row) =>
      row.cell.writer === "openrouter:anthropic/claude-haiku-5.5" &&
      row.cell.sourceId === scoringSourceAliases.embargo &&
      row.plan.mechanismId === "QUANTITY_SCOPE",
  );
  return [
    {
      id: "flash_embargo_mutations_not_applied",
      origin: "writer_execution" as DefectOrigin,
      because:
        "Embargo QUANTITY, CONDITION, COUNTERFACTUAL, and TEMPORAL plans are frozen as natural traps (all / clause swap / factual / after). Flash wrote four technically valid sentences that keep only the two, editors-completed as the unreal condition, would have, and before/prior to. That is Writer non-execution, not a plan defect.",
    },
    {
      id: "flash_embargo_sequence_near_copy_missed_by_old_gate",
      origin: "semantic_gate" as DefectOrigin,
      because:
        "Old classifyOption confirmed equivalent only on exact wording. COUNTERFACTUAL If-fronting and TEMPORAL prior-to folding were unresolved, so potentialSecondAnswer stayed 0. Current sequenceNearCopy marks those two confirmed_equivalent and the Flash embargo whole set fails. This is the concrete false-negative that was fixed. Not a new validator chain.",
    },
    {
      id: "flash_embargo_condition_and_quantity_equivalence_still_unverified",
      origin: "unresolved" as DefectOrigin,
      because:
        "CONDITION_DIRECTION is a result-first paraphrase of the key (overlap 1) but sequence distance > 2, so relation stays unresolved. QUANTITY received vs released is not a quantity_shift in assessMeaningIntegrity. Embargo detectors mark both targetedChange=fail. Equivalence is not confirmed. Heuristic overlap is not semantic proof. sequenceNearCopy is English-only, refuses quantity/exclusivity marker changes, and does not treat Turkish 2-edit morphology as a copy.",
    },
    {
      id: "faculty_negation_plan",
      origin: "planner_origin" as DefectOrigin,
      because: plans.facultyNegation?.notes ?? "Faculty NEGATION_SCOPE is frozen strained.",
      feasibility: plans.facultyNegation?.feasibility ?? null,
    },
    {
      id: "board_quantity_plan",
      origin: "planner_origin" as DefectOrigin,
      because: plans.boardQuantity?.notes ?? "Board QUANTITY_SCOPE is frozen strained.",
      feasibility: plans.boardQuantity?.feasibility ?? null,
    },
    {
      id: "hy4_off_target_proposition_loss",
      origin: hy4CoverageFails.length ? ("writer_execution" as DefectOrigin) : ("unresolved" as DefectOrigin),
      because: hy4CoverageFails.length
        ? `evaluateWriterOption coverageRetention=fail on ${hy4CoverageFails.length} HY4 option(s): ${hy4CoverageFails
            .map((row) => `${row.cell.sourceId}/${row.candidate.planId}`)
            .join(", ")}. Word-count/incomplete heuristics are not a full meaning proof. Embargo CONDITION also drops only-the-two-contested. Board TEMPORAL drops the board-reading condition. Faculty NEGATION mutates cause polarity (hazırlamadığı) instead of valuation scope.`
        : "HY4 coverageRetention did not fail on the existing heuristic; off-target loss stays unverified rather than invented.",
    },
    {
      id: "haiku_weak_quantity",
      origin: "writer_execution" as DefectOrigin,
      because: haikuQuantity
        ? `Embargo QUANTITY plan asks for all appendices. Haiku wrote at least the two (targetedChange=${haikuQuantity.compared.targetedChange}). The exclusivity weaken is shown (only_to_at_least) but is weaker than the planned all-appendices trap. Plan is natural; under-application is Writer execution.`
        : "Haiku embargo QUANTITY cell missing.",
    },
  ];
}

function humanOptionFields() {
  return {
    targetSemanticChangeApplied: null,
    offTargetMeaningLoss: null,
    naturalAcademicLanguage: null,
    sourceEquivalentSecondAnswerRisk: null,
    plausibleStudentMisreading: null,
    duplicateTrapWithOtherOptions: null,
    decision: null,
    rationale: null,
    allowed: {
      targetSemanticChangeApplied: ["yes", "no", "unverified"],
      offTargetMeaningLoss: ["yes", "no", "unverified"],
      naturalAcademicLanguage: ["yes", "no", "unverified"],
      sourceEquivalentSecondAnswerRisk: ["yes", "no", "unverified"],
      plausibleStudentMisreading: ["yes", "no", "unverified"],
      duplicateTrapWithOtherOptions: ["yes", "no", "unverified"],
      decision: ["accept", "revise", "reject"],
    },
    humanEditorial: "pending" as const,
    automaticFlagIsNotHumanApproval: true as const,
  };
}

function markdownWorksheet(form: {
  setId: string;
  source: string;
  labeledKey: string;
  options: Record<string, string> | null;
  complete: boolean;
}) {
  const letters = ["B", "C", "D", "E"] as const;
  const fields = [
    ["Hedef semantik değişiklik gerçekleşmiş mi?", "targetSemanticChangeApplied", "yes / no / unverified"],
    ["Hedef dışı anlam kaybı var mı?", "offTargetMeaningLoss", "yes / no / unverified"],
    ["Doğal akademik dil mi?", "naturalAcademicLanguage", "yes / no / unverified"],
    ["Kaynağa eşdeğer ikinci cevap riski var mı?", "sourceEquivalentSecondAnswerRisk", "yes / no / unverified"],
    ["Çeldirici makul bir öğrenci yanılgısı mı?", "plausibleStudentMisreading", "yes / no / unverified"],
    ["Diğer seçeneklerle aynı tuzağı mı tekrarlıyor?", "duplicateTrapWithOtherOptions", "yes / no / unverified"],
    ["Karar", "decision", "accept / revise / reject"],
    ["Gerekçe", "rationale", "free text"],
  ] as const;
  const optionBlocks = letters
    .map((letter) => {
      const text = form.options?.[letter] ?? "";
      const rows = fields.map(([label, key, allowed]) => `| ${label} | ${key} | ${allowed} | |`).join("\n");
      return `## Option ${letter}\n\n${text}\n\n| Alan | Field | İzinli değer | İnsan |\n| --- | --- | --- | --- |\n${rows}\n`;
    })
    .join("\n");
  return `# ${form.setId}

Kör paket. \`key.json\` açılmasın. Model adı bu dosyada yoktur. Otomatik analist işaretleri insan kabulü değildir. Emin olunmayan her alan \`unverified\` kalır.

**Kaynak / Source**

${form.source}

**Doğru anahtar (A)**

${form.labeledKey}

${optionBlocks}
## Madde kararı

| Alan | İzinli değer | İnsan |
| --- | --- | --- |
| itemDecision | accept / revise / reject | |
| gerekçe | free text | |
`;
}

export function buildDecisionReport() {
  const flash = verifyFlashEmbargoSemanticGate();
  const distractors = verifyValidDistractorsNotRejected();
  const compared = verifyAllComparisonGates();
  const defects = classifyNamedDefects();
  const { cells } = loadComparedOptions();
  const completeCells = cells.filter((cell) => cell.providerCallOk && cell.jsonHonored && cell.candidates.length === 4);
  const relationChanges = compared.filter((row) => row.relationChanged);
  return {
    liveGenerate: 0 as const,
    factoryRootCauseFixEnabled,
    productionWriter: qualityFirstFrozenModels.writer,
    productionJudge: qualityFirstFrozenModels.judge,
    recoveryDefault: recoveryDefaultEnabled,
    studentBankWrites: 0 as const,
    winnerDeclared: false as const,
    meaningProven: false as const,
    qualityProven: false as const,
    editorialAcceptance: "pending" as const,
    technicalCompletionIsNotEditorialAcceptance: true as const,
    cacheTimeoutSeparateFromQualityRegression: {
      firstRun: "quality-production.test.ts hit the 15s vitest limit while scanning .data/analysis/cache/ai",
      notAQualityGateFailure: true as const,
      rerun: "same assertions passed with --testTimeout=60000",
    },
    answers: {
      q1_semanticGateFixWorks: {
        answer: flash.wholeSet.falseNegativeFixed,
        detail:
          "Yes for the Flash embargo set as a whole: old assessWholeSet was review; current fails on confirmed_equivalent (COUNTERFACTUAL and TEMPORAL sequence near-copies). CONDITION_DIRECTION and QUANTITY_SCOPE stay unresolved. Heuristic overlap is not treated as confirmed equivalence.",
      },
      q2_errorsNowCaught: {
        confirmedEquivalent: compared.filter((row) => row.oldRelation !== "confirmed_equivalent" && row.newRelation === "confirmed_equivalent").map((row) => `${row.writer} ${row.sourceId} ${row.planId}`),
        shownDifferenceNewlyCaught: compared.filter((row) => row.oldEvidence == null && row.newRelation === "confirmed_difference").map((row) => `${row.writer} ${row.sourceId} ${row.planId}:${row.newEvidence}`),
        embargoMutationDetectors: ["embargo_quantity_not_applied", "embargo_condition_direction_not_applied", "embargo_counterfactual_not_applied", "embargo_temporal_not_applied"],
      },
      q3_stillUnverified: {
        flashEmbargo: flash.remainingUnverified,
        classes: [
          "CONDITION_DIRECTION key-shaped paraphrase with overlap 1 but sequence distance > 2",
          "QUANTITY received vs released (not a quantity_shift)",
          "high-overlap unresolved paraphrases (overlap>=0.72 is a risk, not a fail, except when confirmed_equivalent)",
          "Faculty NEGATION split-valuation meaning",
          "Board QUANTITY dropped-number vs incomplete-option",
          "HY4 off-target losses that coverageRetention does not prove",
        ],
      },
      q4_setsWithFourOptions: { count: completeCells.length, of: 9, allNine: completeCells.length === 9 },
      q5_setsReadyForHumanReview: {
        setIds: ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09"],
        allNine: true as const,
        editorialAcceptance: "pending" as const,
      },
      q6_supportedQualityDifferences: {
        technicalCompletion: "3/3 for Haiku, HY4, and Flash. This is not editorialAcceptance.",
        supported: [
          "Flash embargo is the only cell whose four options keep the source proposition; two are now confirmed_equivalent near-copies and two remain unverified high-overlap.",
          "Haiku embargo applies the four planned mutations; QUANTITY is the weaker at-least form, not all-appendices.",
          "HY4 embargo applies the four planned mutations; CONDITION drops only-the-two-contested.",
          "Faculty NEGATION and Board QUANTITY remain strained plans for every Writer.",
        ],
        notSupported: [
          "A Writer winner",
          "editorialAcceptance of any model",
          "That unverified high overlap is a proven second answer",
        ],
      },
      q7_enoughEvidenceToChangeProductionWriter: {
        answer: false,
        reason:
          "editorialAcceptance is pending on all three models. Human review of the nine blind sets has not been recorded. technicalCompletion is 3/3 for the current production Writer (Haiku 5.5) and for the two experiment Writers. Machine flags are not human approval. Production Writer stays Haiku 5.5; Judge stays Sonnet 5.5; factoryRootCauseFixEnabled stays false.",
      },
    },
    validDistractorsWronglyRejected: distractors.validDistractorsWronglyRejected,
    relationChangesFromLegacyGate: relationChanges.length,
    defects,
  };
}

export function assessSemanticFailureEditorial() {
  const { tasks, cells, options } = loadComparedOptions();
  const scorecards = comparisonWriters.map((writer) => {
    const card = modelScorecard({ writer, cells, options: options.map((row) => row.compared) });
    return {
      ...card,
      editorialAcceptance: "pending" as const,
      technicalCompletionIsNotEditorialAcceptance: true as const,
    };
  });
  const items = shuffle(
    cells.map((cell) => {
      const task = tasks.find((row) => row.id === cell.sourceId)!;
      return {
        sourceId: cell.sourceId,
        source: task.source,
        key: task.key,
        setting: cell.writer,
        options: cell.candidates.map((candidate) => ({ planId: candidate.planId, text: candidate.candidateText })),
      };
    }),
    writerBakeoffBlindSeed,
  );
  const packed = buildWholeSetForms(items);
  const forms = packed.forms.map((form) => ({
    ...form,
    sourceId: undefined,
    optionRatings: form.optionRatings
      ? {
          B: humanOptionFields(),
          C: humanOptionFields(),
          D: humanOptionFields(),
          E: humanOptionFields(),
        }
      : null,
    itemDecision: null,
    humanEditorial: "pending" as const,
  }));
  const leaked = /claude-haiku|claude-sonnet|deepseek|tencent\/hy4|openrouter:/i.test(JSON.stringify(forms));
  const decisionTable = comparisonWriters.map((writer) => {
    const card = scorecards.find((row) => row.writer === writer)!;
    return {
      writer,
      technicalCompletion: card.technicalCompletion,
      editorialAcceptance: "pending" as const,
      afterHumanReview: {
        keepAsWriterCandidate: null,
        reject: null,
        notes: null,
      },
      machineOnly: {
        potentialSecondAnswerConfirmed: card.potentialSecondAnswerConfirmed,
        unverifiedHighOverlapRisk: card.unverifiedHighOverlapRisk,
        mutationNotApplied: card.mutationNotApplied,
      },
      automaticFlagsAreNotHumanApproval: true as const,
    };
  });
  const gate = verifyFlashEmbargoSemanticGate();
  const distractors = verifyValidDistractorsNotRejected();
  const defects = classifyNamedDefects();
  const decisionReport = buildDecisionReport();
  return {
    version: semanticFailureEditorialVersion,
    liveGenerate: 0 as const,
    factoryRootCauseFixEnabled,
    productionWriter: qualityFirstFrozenModels.writer,
    productionJudge: qualityFirstFrozenModels.judge,
    recoveryDefault: recoveryDefaultEnabled,
    studentBankWrites: 0 as const,
    winnerDeclared: false as const,
    meaningProven: false as const,
    qualityProven: false as const,
    technicalCompletionIsNotEditorialAcceptance: true as const,
    flashEmbargoRootCause: flashEmbargoRootCause(),
    flashEmbargoGateVerification: gate,
    validDistractorCheck: distractors,
    facultyNegationAndBoardQuantityPlans: facultyNegationAndBoardQuantityPlans(),
    namedDefects: defects,
    decisionReport,
    scorecards,
    decisionTable,
    protocol: architectureV2BlindEvalProtocol,
    blind: {
      modelNameHidden: packed.modelNameHidden && !leaked,
      setCount: forms.length,
      completeSetCount: forms.filter((form) => form.complete).length,
      forms,
      key: packed.key,
    },
    forbiddenDirsIncludeOutput: (qualityFirstPilotForbiddenDirs as readonly string[]).includes(semanticFailureEditorialOutputDir),
  };
}

export function writeSemanticFailureEditorial() {
  const report = assessSemanticFailureEditorial();
  mkdirSync(semanticFailureEditorialOutputDir, { recursive: true });
  mkdirSync(path.join(semanticFailureEditorialOutputDir, "blind"), { recursive: true });
  writeFileSync(
    path.join(semanticFailureEditorialOutputDir, "summary.json"),
    `${JSON.stringify({ ...report, blind: { modelNameHidden: report.blind.modelNameHidden, setCount: report.blind.setCount, completeSetCount: report.blind.completeSetCount } }, null, 2)}\n`,
  );
  writeFileSync(path.join(semanticFailureEditorialOutputDir, "flash-embargo-root-cause.json"), `${JSON.stringify(report.flashEmbargoRootCause, null, 2)}\n`);
  writeFileSync(path.join(semanticFailureEditorialOutputDir, "gate-verification.json"), `${JSON.stringify(report.flashEmbargoGateVerification, null, 2)}\n`);
  writeFileSync(path.join(semanticFailureEditorialOutputDir, "defect-classification.json"), `${JSON.stringify(report.namedDefects, null, 2)}\n`);
  writeFileSync(path.join(semanticFailureEditorialOutputDir, "decision-report.json"), `${JSON.stringify(report.decisionReport, null, 2)}\n`);
  writeFileSync(path.join(semanticFailureEditorialOutputDir, "decision-table.json"), `${JSON.stringify(report.decisionTable, null, 2)}\n`);
  writeFileSync(
    path.join(semanticFailureEditorialOutputDir, "analyst-notes.json"),
    `${JSON.stringify(
      {
        warning: "Not for the blind reviewer. Machine flags only. Not human editorialAcceptance.",
        validDistractorCheck: report.validDistractorCheck,
        namedDefects: report.namedDefects,
        key: report.blind.key,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(semanticFailureEditorialOutputDir, "blind/sets.json"),
    `${JSON.stringify({ modelNameHidden: report.blind.modelNameHidden, forms: report.blind.forms }, null, 2)}\n`,
  );
  writeFileSync(path.join(semanticFailureEditorialOutputDir, "blind/key.json"), `${JSON.stringify({ key: report.blind.key }, null, 2)}\n`);
  writeFileSync(
    path.join(semanticFailureEditorialOutputDir, "blind/INSTRUCTIONS.md"),
    `# Kör editoryal inceleme

1. Yalnızca \`S01.md\` … \`S09.md\` veya eşdeğer \`S01.json\` … \`S09.json\` doldurulur.
2. \`key.json\` ve dizin dışındaki \`analyst-notes.json\` açılmaz.
3. Model adı paket içinde yoktur.
4. Her çeldirici için sekiz alan doldurulur. Emin olunmayan yer \`unverified\` kalır.
5. \`decision\`: accept / revise / reject.
6. Otomatik kapı çıktısı insan kabulü değildir. \`editorialAcceptance\` insan kaydı olmadan pending kalır.
7. Yeni soru üretilmez. Üretim Writer / Judge değişmez.
`,
  );
  for (const form of report.blind.forms) {
    writeFileSync(path.join(semanticFailureEditorialOutputDir, "blind", `${form.setId}.json`), `${JSON.stringify(form, null, 2)}\n`);
    writeFileSync(path.join(semanticFailureEditorialOutputDir, "blind", `${form.setId}.md`), markdownWorksheet(form));
  }
  return report;
}
