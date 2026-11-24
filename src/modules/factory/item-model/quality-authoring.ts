import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { factoryVersions } from "../versions";
import type { DistractorCandidate, ItemCore, ItemSource } from "./contract";
import { assessKey, assessMeaningIntegrity } from "./core";
import { screenExamSurface } from "./gold";
import { incompleteOption } from "./misreading-mechanisms";
import { optionScript } from "./option-language";
import { assessParaphraseKey } from "./paraphrase-key";
import { qualityFirstFrozenModels } from "./quality-first-pilot";
import { restatementModel, translationModel } from "./registry";
import { recoveryDefaultEnabled } from "./recovery";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";
import { buildWholeSetForms } from "./writer-bakeoff-editorial";
import { classifyOption, sequenceNearCopy, shownDifference } from "./whole-set";

export const qualityAuthoringPromptVersion = "quality-authoring.design-then-write.v1";
export const qualityAuthoringVersion = "quality-authoring-v1";
export const qualityAuthoringOutputDir = ".data/analysis/_factory/cognitive-trap/quality-authoring-v1";
export const qualityAuthoringLiveAuthorized = false;
/** Default-off trap experiment switch. Same class as factoryRootCauseFixEnabled; not FACTORY_EXPERIMENTS. */
export const qualityAuthoringTrapEnabled = false;
export const qualityAuthoringTrapAuthorization = "quality-authoring-trap-v1";
export const qualityAuthoringSpendCapUsd = 0.05;
export const qualityAuthoringPoolSize = 6;
export const qualityAuthoringKeep = 4;

export type QualityAuthoringTrapRequest = {
  authorization: string;
  situationBrief?: string;
};

/** Both the default-off experiment flag and an explicit user token are required. */
export function qualityAuthoringTrapAuthorized(request?: QualityAuthoringTrapRequest | null): boolean {
  return Boolean(qualityAuthoringTrapEnabled) && request?.authorization === qualityAuthoringTrapAuthorization;
}

/** Pair-verdict after the two contracts. Not a shared boolean on the raw relation. */
export type SemanticStanding = "fail" | "suitable" | "unverified";
export type SemanticPair = "source_key" | "distractor_key" | "distractor_source";

export type SemanticStandingReport = {
  standing: SemanticStanding;
  evidence: string | null;
  heuristic: boolean;
};

function standingRelation(reference: string, option: string): { kind: "shown_difference" | "equivalent" | "unverified"; evidence: string | null; heuristic: boolean } {
  const shown = shownDifference(reference, option);
  if (shown) return { kind: "shown_difference", evidence: shown, heuristic: false };
  const foldedOption = wordingKey(option);
  const foldedRef = wordingKey(reference);
  if (foldedOption.length > 0 && foldedOption === foldedRef) return { kind: "equivalent", evidence: "same_wording", heuristic: false };
  if (sequenceNearCopy(option, reference)) return { kind: "equivalent", evidence: "near_copy_sequence", heuristic: false };
  const integrity = assessMeaningIntegrity(reference, option);
  if (integrity.status === "fail") return { kind: "unverified", evidence: integrity.failures[0] ?? "meaning_shift", heuristic: true };
  return { kind: "unverified", evidence: null, heuristic: true };
}

/**
 * SOURCE↔KEY: equivalence is expected; shown difference is invalid; heuristics stay unverified.
 * DISTRACTOR↔KEY/SOURCE: equivalence is invalid; shown difference is required but not sufficient, so not suitable.
 */
export function semanticStanding(reference: string, option: string, pair: SemanticPair): SemanticStandingReport {
  const relation = standingRelation(reference, option);
  if (pair === "source_key") {
    if (relation.kind === "shown_difference") return { standing: "fail", evidence: relation.evidence, heuristic: false };
    if (relation.kind === "equivalent") return { standing: "suitable", evidence: relation.evidence, heuristic: false };
    return { standing: "unverified", evidence: relation.evidence, heuristic: true };
  }
  if (relation.kind === "equivalent") return { standing: "fail", evidence: relation.evidence, heuristic: false };
  return { standing: "unverified", evidence: relation.evidence, heuristic: relation.heuristic };
}

export const qualityAuthoringModels = {
  author: qualityFirstFrozenModels.writer,
  judge: qualityFirstFrozenModels.judge,
} as const;

export const qualityAuthoringReusedModules = [
  "assessParaphraseKey",
  "assessKey",
  "screenExamSurface",
  "classifyOption",
  "shownDifference",
  "sequenceNearCopy",
  "assessMeaningIntegrity",
  "incompleteOption",
  "optionScript",
  "buildWholeSetForms",
] as const;

const qualityAuthoringInput = z.object({
  status: z.enum(["authored", "source_insufficient_quality_opportunities"]).optional(),
  source: z.string().min(20).max(500),
  key: z.string().min(20).max(500),
  questionType: z.enum(["restatement", "translation"]),
  direction: z.enum(["none", "en_tr", "tr_en"]),
  candidates: z
    .array(
      z.object({
        planId: z.enum(["p1", "p2", "p3", "p4", "p5", "p6"]),
        trap: z.enum([
          "TEMPORAL_ORDER",
          "CONDITION_DIRECTION",
          "COUNTERFACTUAL_FACTUAL",
          "QUANTITY_SCOPE",
          "CAUSE_CONCESSION",
          "PURPOSE_RESULT",
          "NEGATION_SCOPE",
          "AGENT_ROLE",
          "EVIDENCE_CERTAINTY",
          "LEXICAL_COLLOCATION",
          "GRAMMAR_FORM",
        ]),
        candidateText: z.string().min(1).max(400),
        studentMisreading: z.string().min(1).max(240),
      }),
    )
    .min(0)
    .max(6),
});

const planOrder = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;

function uniqueConsecutivePlanIds(ids: string[]): boolean {
  if (new Set(ids).size !== ids.length || ids.length > planOrder.length) return false;
  return [...ids].sort().join(",") === planOrder.slice(0, ids.length).join(",");
}

export type PooledCandidate = {
  planId: string;
  trap: string;
  candidateText: string;
  studentMisreading: string;
};

export type SelectionDecision =
  | "keep"
  | "drop_equivalent"
  | "drop_incomplete"
  | "drop_language"
  | "drop_duplicate"
  | "drop_plan_id"
  | "surplus";

function wordingKey(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function quantityWeakerThanKey(source: string, key: string, option: string): boolean {
  const shown = shownDifference(source, option) ?? shownDifference(key, option);
  return shown === "only_to_at_least";
}

function sameWording(left: string, right: string): boolean {
  const folded = wordingKey(left);
  return folded.length > 0 && folded === wordingKey(right);
}

function shownDistractorChange(source: string, key: string, option: string): string | null {
  const shown = shownDifference(source, option) ?? shownDifference(key, option);
  if (!shown || shown === "only_to_at_least") return null;
  return shown;
}

export function selectFourDistractors(input: {
  source: string;
  key: string;
  targetLanguage: "tr" | "en" | null;
  candidates: PooledCandidate[];
}) {
  const seenText = new Set<string>();
  const seenPlan = new Set<string>();
  const rows = input.candidates.map((candidate, index) => {
    const text = candidate.candidateText.trim();
    const vsSource = semanticStanding(input.source, text, "distractor_source");
    const vsKey = semanticStanding(input.key, text, "distractor_key");
    const classified = classifyOption(input.source, input.key, text);
    const script = optionScript(text);
    const risks: string[] = [];
    let decision: SelectionDecision = "keep";
    const folded = wordingKey(text);
    const provenEquivalent = sameWording(text, input.source) || sameWording(text, input.key);
    const shown = shownDistractorChange(input.source, input.key, text);
    const weakerQuantity = quantityWeakerThanKey(input.source, input.key, text);
    if (!text || incompleteOption(text)) decision = "drop_incomplete";
    else if (seenPlan.has(candidate.planId)) decision = "drop_plan_id";
    else if (seenText.has(folded)) decision = "drop_duplicate";
    else if (provenEquivalent) decision = "drop_equivalent";
    else if (input.targetLanguage && script !== "unverified" && script !== input.targetLanguage) decision = "drop_language";
    if (decision === "keep") {
      seenPlan.add(candidate.planId);
      seenText.add(folded);
      if (weakerQuantity) risks.push("only_to_at_least");
      if (vsSource.evidence === "near_copy_sequence" || vsKey.evidence === "near_copy_sequence") risks.push("near_copy_sequence");
      if (vsSource.heuristic || vsKey.heuristic) risks.push("standing_unverified");
      if (classified.overlap >= 0.72) risks.push("high_overlap_unverified");
    }
    const rank = decision !== "keep" ? 1000 + index : shown ? 0 : weakerQuantity ? 2 : 1;
    return { ...candidate, index, vsSource, vsKey, classified, script, shown, decision, rank, risks, reason: decision };
  });
  const eligible = rows.filter((row) => row.decision === "keep").sort((a, b) => a.rank - b.rank || a.index - b.index);
  /** Trap labels are not a uniqueness filter. Same wording still dropped above. */
  const chosen = eligible.slice(0, qualityAuthoringKeep);
  const keptIds = new Set(chosen.map((row) => row.index));
  const selected = rows.map((row) => (row.decision === "keep" && !keptIds.has(row.index) ? { ...row, decision: "surplus" as const, reason: "surplus" } : row));
  const finalKeep = selected.filter((row) => row.decision === "keep");
  return {
    poolSize: rows.length,
    kept: finalKeep.length,
    complete: finalKeep.length === qualityAuthoringKeep,
    padded: false as const,
    rows: selected,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    models: qualityAuthoringModels,
    editorialAcceptance: "pending" as const,
    studentBankWrites: 0 as const,
  };
}

function authoringSource(input: { questionType: "restatement" | "translation"; direction: "none" | "en_tr" | "tr_en"; source: string }): ItemSource {
  if (input.questionType === "translation") {
    const toTr = input.direction === "en_tr";
    return {
      kind: "translation",
      sourceSentence: input.source,
      sourceLanguage: toTr ? "en" : "tr",
      targetLanguage: toTr ? "tr" : "en",
      roles: ["unverified"],
      scope: "unverified",
    };
  }
  return {
    kind: "restatement",
    proposition: input.source,
    frame: { scope: "unverified", modality: "unverified", polarity: "affirmative", tense: "past", argumentStructure: "unverified" },
  };
}

function authoringCore(input: { source: string; key: string; questionType: "restatement" | "translation" }): ItemCore {
  const model = input.questionType === "translation" ? translationModel : restatementModel;
  return {
    stem: input.source,
    correctAnswer: input.key,
    constructEvidence: "source sentence",
    correctnessRationale: "intended paraphrase or translation of the source",
    sourceReferences: input.questionType === "translation" ? ["source_sentence"] : ["proposition"],
    modelVersion: factoryVersions.itemModel,
    promptVersion: model.promptVersion,
    meaningDelta: "preserved",
  };
}

export function assembleQualityAuthoring(raw: unknown, officialTexts: readonly string[] = []) {
  const parsed = qualityAuthoringInput.safeParse(raw);
  const locks = {
    liveGenerate: 0 as const,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
    editorialAcceptance: "pending" as const,
    editoriallyAccepted: false as const,
    qualityAccepted: false as const,
    humanEditorial: "pending" as const,
    meaningProven: false as const,
    qualityProven: false as const,
    studentBankWrites: 0 as const,
    winnerDeclared: false as const,
    fixtureIsNotQualityProof: true as const,
    reused: qualityAuthoringReusedModules,
  };
  if (!parsed.success) {
    return {
      ...locks,
      complete: false,
      structurallyComplete: false,
      publishedSet: false,
      parseOk: false,
      uniquePlanIds: false,
      authoringStatus: undefined,
      keyValid: false,
      keyStanding: null,
      optionStandings: [],
      authored: null,
      risks: ["schema_parse_failed"],
      selection: null,
      pack: null,
      dropped: [],
    };
  }
  const data = parsed.data;
  const authoringStatus = data.status ?? "authored";
  const planIds = data.candidates.map((row) => row.planId);
  const uniquePlanIds = uniqueConsecutivePlanIds(planIds);
  const source = authoringSource(data);
  const core = authoringCore(data);
  const keyAssessment = assessKey(data.questionType === "translation" ? translationModel : restatementModel, source, core);
  const paraphrase = assessParaphraseKey(data.source, data.key);
  const screen = screenExamSurface({ instructions: "", content: `${data.source}\n${data.key}` }, officialTexts);
  const keyStanding = semanticStanding(data.source, data.key, "source_key");
  const optionStandings = data.candidates.map((row) => ({
    planId: row.planId,
    vsSource: semanticStanding(data.source, row.candidateText, "distractor_source"),
    vsKey: semanticStanding(data.key, row.candidateText, "distractor_key"),
  }));
  const meaningFailureCodes = new Set(keyAssessment.meaning.failures);
  const structuralKeyOk = keyAssessment.failures.every((code) => meaningFailureCodes.has(code));
  const risks: string[] = ["meaning_unproven"];
  if (authoringStatus === "source_insufficient_quality_opportunities") risks.push("source_insufficient_quality_opportunities");
  if (!uniquePlanIds) risks.push("plan_id_not_unique_p1_p6");
  if (!keyAssessment.valid) risks.push(...keyAssessment.failures.map((code) => `key:${code}`));
  if (keyStanding.standing === "fail") risks.push(`key_standing_fail:${keyStanding.evidence ?? "shown_difference"}`);
  if (keyStanding.standing === "unverified") risks.push(`key_standing_unverified:${keyStanding.evidence ?? "heuristic"}`);
  for (const code of paraphrase.failures) risks.push(`paraphrase:${code}`);
  risks.push(`paraphrase_distance:${paraphrase.distance}`);
  if (keyAssessment.meaning.status !== "unverified") risks.push(`key_meaning:${keyAssessment.meaning.status}`);
  if (screen.status === "not_run") risks.push("exam_surface_not_run");
  if (screen.status === "overlap") risks.push("exam_surface_overlap");
  const keyValid = keyAssessment.valid;
  const targetLanguage = data.direction === "en_tr" ? "tr" : data.direction === "tr_en" ? "en" : "en";
  const selection = uniquePlanIds
    ? selectFourDistractors({
        source: data.source,
        key: data.key,
        targetLanguage,
        candidates: data.candidates,
      })
    : null;
  const structurallyComplete = Boolean(
    authoringStatus !== "source_insufficient_quality_opportunities" &&
      uniquePlanIds &&
      structuralKeyOk &&
      keyStanding.standing !== "fail" &&
      selection?.complete &&
      screen.status !== "overlap",
  );
  const pack = structurallyComplete
    ? buildWholeSetForms([
        {
          sourceId: "quality-authoring-offline",
          source: data.source,
          key: data.key,
          setting: "offline-fixture",
          options: selection!.rows.filter((row) => row.decision === "keep").map((row) => ({ planId: row.planId, text: row.candidateText })),
        },
      ])
    : null;
  return {
    ...locks,
    complete: structurallyComplete,
    structurallyComplete,
    publishedSet: false,
    parseOk: true,
    uniquePlanIds,
    authoringStatus,
    keyValid,
    keyStanding,
    optionStandings,
    authored: { source: data.source, key: data.key },
    keyAssessment: { valid: keyAssessment.valid, failures: keyAssessment.failures, meaning: keyAssessment.meaning.status },
    paraphrase: { distance: paraphrase.distance, failures: paraphrase.failures, meaningProven: paraphrase.meaningProven },
    examSurface: { status: screen.status, sharedRun: screen.sharedRun },
    risks,
    selection,
    pack: pack
      ? {
          modelNameHidden: pack.modelNameHidden,
          setCount: pack.forms.length,
          forms: pack.forms.map((form) => ({ setId: form.setId, complete: form.complete, source: form.source, labeledKey: form.labeledKey, options: form.options })),
          key: pack.key,
        }
      : null,
    dropped: selection?.rows.filter((row) => row.decision !== "keep").map((row) => ({ planId: row.planId, decision: row.decision, reason: row.reason, risks: row.risks })) ?? [],
  };
}

export function applyQualityAuthoringTrapArm(raw: unknown, officialTexts: readonly string[] = []) {
  const assembled = assembleQualityAuthoring(raw, officialTexts);
  const keptRows = assembled.selection?.rows.filter((row) => row.decision === "keep") ?? [];
  const kept: DistractorCandidate[] = keptRows.map((row) => ({
    candidateText: row.candidateText,
    errorMechanism: row.trap,
    shiftTarget: "none",
    whyPlausible: row.studentMisreading,
    whyInferior: row.trap,
    sourceEvidence: "quality-authoring",
    semanticRisk: "none",
  }));
  return {
    assembled,
    structurallyComplete: assembled.structurallyComplete,
    editoriallyAccepted: false as const,
    qualityAccepted: false as const,
    studentBankWrites: 0 as const,
    reachesStudentBank: false as const,
    keyStanding: assembled.keyStanding,
    optionStandings: assembled.optionStandings,
    authored: assembled.authored,
    kept,
  };
}

export function writeQualityAuthoringReplay(results: { id: string; report: ReturnType<typeof assembleQualityAuthoring> }[]) {
  const dir = path.join(qualityAuthoringOutputDir, "replay");
  mkdirSync(dir, { recursive: true });
  const summary = {
    liveGenerate: 0,
    fixtureIsNotQualityProof: true,
    editorialAcceptance: "pending",
    studentBankWrites: 0,
    factoryRootCauseFixEnabled,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
    livePilotReady: false,
    because: "offline assemble only; no generate, no human accept, no bank write",
    reused: qualityAuthoringReusedModules,
    fixtures: results.map((row) => ({
      id: row.id,
      complete: row.report.complete,
      publishedSet: row.report.publishedSet,
      risks: row.report.risks,
      dropped: row.report.dropped,
    })),
  };
  writeFileSync(path.join(dir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  for (const row of results) {
    writeFileSync(path.join(dir, `${row.id}.json`), `${JSON.stringify(row.report, null, 2)}\n`);
  }
  return summary;
}

export function refuseQualityAuthoring(reason: string, code: string) {
  return {
    started: false,
    executed: false,
    providerCalls: 0,
    reason,
    code,
    liveAuthorized: qualityAuthoringLiveAuthorized,
    trapEnabled: qualityAuthoringTrapEnabled,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled,
    productionWriter: qualityAuthoringModels.author,
    productionJudge: qualityAuthoringModels.judge,
    studentBankWrites: 0 as const,
  };
}
