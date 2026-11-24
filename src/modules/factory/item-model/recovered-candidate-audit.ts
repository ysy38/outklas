import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { OptionLabel } from "@/modules/analysis/contract";
import { integrityProblems } from "../validator";
import { linkMisreadingCandidates, type OptionWriterCandidate } from "./candidate-lifecycle";
import { candidateRetentionCache, candidateRetentionLiveSourceDir } from "./candidate-retention";
import { layoutOptions, surfaceEdit } from "./cognitive-trap";
import { assessMeaningIntegrity } from "./core";
import { selectCognitiveDistractors } from "./distractor-strategy";
import { classifyMisreading, incompleteOption, sameProposition } from "./misreading-mechanisms";
import { assessTargetLanguage, optionScript } from "./option-language";
import { addedFrames, assessProposition } from "./proposition-guard";
import { qualityFirstItems, qualityFirstPilotOutputDir } from "./quality-first-pilot";
import { translationModel } from "./registry";
import { assessWholeSet, classifyOption } from "./whole-set";

export const recoveredCandidateAuditAuthorization = "recovered-candidate-quality-audit-v1";
export const recoveredCandidateAuditOutputDir = ".data/analysis/_factory/cognitive-trap/recovered-candidate-audit-v1";

const cacheDir = ".data/analysis/cache/ai";

type LiveArm = {
  status: string;
  qualityDecision: string;
  modelVerdict: string | null;
  judgeAgreesWithKey: boolean | null;
  editorial: string;
  options: Record<string, string> | null;
  keyLetter: string | null;
  droppedDistractors: { candidateText: string; reason: string }[];
  decisionRisks: { whole_set_clue_risk: string[] } | null;
  readings: { studentMisreading: string; temptingEvidence: string; actualSemanticDifference: string; whyIncorrect: string; misreadingMechanism: string | null }[];
  rationales: { text: string; mechanism: string; whyInferior: string }[];
};

type LiveRecord = { id: string; source: string; key: string; observedDifficulty: null; arms: { B: LiveArm } };

function live(id: string): LiveRecord {
  return JSON.parse(readFileSync(path.join(candidateRetentionLiveSourceDir, `${id}.json`), "utf8")) as LiveRecord;
}

function cacheCandidates(hash: string): OptionWriterCandidate[] | null {
  const file = path.join(cacheDir, `${hash}.json`);
  if (!existsSync(file)) return null;
  try {
    const entry = JSON.parse(readFileSync(file, "utf8")) as { response?: { text?: string } };
    const parsed = JSON.parse(entry.response?.text ?? "") as { candidates?: OptionWriterCandidate[] };
    return Array.isArray(parsed.candidates) ? parsed.candidates : null;
  } catch {
    return null;
  }
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function shortOfKey(text: string, key: string): boolean {
  const keyWords = words(key);
  return incompleteOption(text) || (keyWords > 0 && words(text) <= keyWords * 0.7);
}

function complaintsComponents(text: string) {
  const folded = text.toLocaleLowerCase("en-US");
  return {
    zeroComplaintsForwarded: /\bno complaints\b|\bnone of the complaints\b/.test(folded),
    existentialComplaints: /\bsome complaints\b|\bnot every complaint\b/.test(folded),
    prosecutorOffice: /prosecutor/.test(folded),
    twoRecords: /\btwo\b/.test(folded) && /record/.test(folded),
    exclusiveOnly: /\bonly\b/.test(folded),
    readAloud: /read aloud|were read\b/.test(folded) && !/submitted/.test(folded),
    submitted: /submitted/.test(folded),
    hearingVenue: /hearing/.test(folded),
    venueExclusivity: /nowhere else|rather than elsewhere/.test(folded),
  };
}

function secondAnswerRisk(source: string, key: string, option: string, semanticRisk: string): "yes" | "no" | "unverified" {
  if (semanticRisk === "second_answer" || sameProposition(source, option) || sameProposition(key, option)) return "yes";
  const classified = classifyOption(source, key, option);
  if (classified.relation === "confirmed_equivalent") return "yes";
  if (classified.relation === "confirmed_difference") return "no";
  return "unverified";
}

export function assessRecoveredCandidateAudit() {
  const trEn = live("quality-first-translation-tr_en");
  const plates = live("quality-first-restatement-counterfactual");
  const faculty = live("quality-first-translation-en_tr");
  const generated = cacheCandidates(candidateRetentionCache.trEnOptions);
  const linking = generated ? linkMisreadingCandidates({ readings: trEn.arms.B.readings, candidates: generated }) : null;
  const selected = linking
    ? selectCognitiveDistractors({
        candidates: linking.linked,
        keyText: trEn.key,
        sourceText: trEn.source,
        allowedMechanisms: translationModel.errorMechanisms,
      })
    : null;
  const itemIndex = qualityFirstItems().findIndex((entry) => entry.item.id === trEn.id);
  const laid = selected?.status === "selected"
    ? layoutOptions(trEn.key, selected.selected.map((row) => row.candidateText), itemIndex + 2)
    : null;
  const gate = laid ? assessWholeSet({ source: trEn.source, key: trEn.key, options: laid.options, correct: laid.keyLetter }) : null;
  const language = laid ? assessTargetLanguage({ questionType: "translation", targetLanguage: "en", options: laid.options }) : null;
  const liveJudge = trEn.arms.B.modelVerdict;
  const distractors =
    laid && selected && linking
      ? (Object.entries(laid.options) as [OptionLabel, string][])
        .filter(([label]) => label !== laid.keyLetter)
        .map(([label, text]) => {
          const linked = linking.linked.find((row) => row.candidateText === text);
          const reading = trEn.arms.B.readings.find((row) => row.studentMisreading === linked?.studentMisreading);
          const againstSource = assessMeaningIntegrity(trEn.source, text);
          const againstKey = assessMeaningIntegrity(trEn.key, text);
          const classified = classifyOption(trEn.source, trEn.key, text);
          const shown = classifyMisreading(trEn.source, text);
          const proposition = assessProposition({
            source: trEn.source,
            key: trEn.key,
            option: text,
            mechanismId: reading?.misreadingMechanism ?? null,
            semanticRisk: linked?.semanticRisk ?? null,
          });
          const components = complaintsComponents(text);
          const keyComponents = complaintsComponents(trEn.key);
          const preserved = (Object.keys(keyComponents) as (keyof typeof keyComponents)[]).filter((name) => keyComponents[name] && components[name]);
          const lost = (Object.keys(keyComponents) as (keyof typeof keyComponents)[]).filter((name) => keyComponents[name] && !components[name]);
          const gained = (Object.keys(components) as (keyof typeof components)[]).filter((name) => components[name] && !keyComponents[name]);
          const frames = addedFrames(trEn.source, trEn.key, text);
          const integrity = integrityProblems(text);
          return {
            label,
            fullText: text,
            targetedMisreading: reading?.misreadingMechanism ?? "unverified",
            studentMisreading: reading?.studentMisreading ?? linked?.studentMisreading ?? null,
            writerDifference: reading?.actualSemanticDifference ?? null,
            writerDifferenceIsNotProof: true as const,
            meaningVsSource: { status: againstSource.status, failures: againstSource.failures },
            meaningVsKey: { status: againstKey.status, failures: againstKey.failures },
            classification: classified,
            shownMisreading: { status: shown.status, mechanisms: shown.mechanisms, actualDifference: shown.actualDifference },
            naturalness: integrity.length ? "malformed" : ("unverified" as const),
            integrityProblems: integrity,
            script: optionScript(text),
            preservedComponents: preserved,
            lostComponents: lost,
            addedComponentFlags: gained,
            newEventOrActor: frames.length ? { status: "unverified" as const, frames } : { status: "no_added_frame" as const, frames },
            secondAnswerRisk: secondAnswerRisk(trEn.source, trEn.key, text, linked?.semanticRisk ?? "none"),
            formalClue: {
              incompleteOption: incompleteOption(text),
              surfaceEditOfKey: surfaceEdit(trEn.key, text),
              wordCount: words(text),
              keyWordCount: words(trEn.key),
              relativeShort: shortOfKey(text, trEn.key),
              overlap: classified.overlap,
            },
            proposition,
          };
        })
      : [];

  const structuralCompletion = laid ? 1 : 0;
  const qualityDecision = !laid ? "fail" : gate?.decision === "fail" ? "fail" : "pending";
  const gateEligible = laid && qualityDecision !== "fail" ? 1 : 0;
  const judgeApproved = liveJudge && trEn.arms.B.judgeAgreesWithKey ? 1 : 0;
  const attachShort = (record: LiveRecord) =>
    record.arms.B.rationales.map((rationale) => {
      const reading = record.arms.B.readings.find((row) => row.whyIncorrect === rationale.whyInferior);
      const label = (Object.entries(record.arms.B.options ?? {}).find(([, text]) => text === rationale.text)?.[0] ?? null) as string | null;
      return {
        item: record.id,
        label,
        text: rationale.text,
        wordCount: words(rationale.text),
        keyWordCount: words(record.key),
        short: shortOfKey(rationale.text, record.key),
        errorMechanism: rationale.mechanism,
        misreadingMechanism: reading?.misreadingMechanism ?? null,
      };
    });
  const shortRows = [...attachShort(plates), ...attachShort(faculty)].filter((row) => row.short);
  const byMechanism: Record<string, number> = {};
  for (const row of shortRows) {
    const id = row.misreadingMechanism ?? row.errorMechanism ?? "unlabeled";
    byMechanism[id] = (byMechanism[id] ?? 0) + 1;
  }

  return {
    version: recoveredCandidateAuditAuthorization,
    liveSourceDir: qualityFirstPilotOutputDir,
    liveSummaryHash: createHash("sha256").update(readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"))).digest("hex").slice(0, 12),
    livePilotImmutable: true,
    providerCalls: 0,
    modelsFrozen: true,
    recoveryDefault: "off" as const,
    meaningProven: false as const,
    qualityProven: false as const,
    recoveredSet: {
      id: trEn.id,
      source: trEn.source,
      key: trEn.key,
      cacheHash: candidateRetentionCache.trEnOptions,
      recoveredDistractorTexts: generated?.map((row) => row.candidateText) ?? [],
      keyLetter: laid?.keyLetter ?? null,
      options: laid?.options ?? null,
      layoutSlot: itemIndex + 2,
    },
    gates: {
      selectorStatus: selected?.status ?? "unverified",
      wholeSet: gate
        ? { decision: gate.decision, failure: gate.failure, risks: gate.risks, meaningProven: gate.meaningProven, approvesTarget: gate.approvesTarget, options: gate.options }
        : null,
      targetLanguage: language,
      qualityDecision,
      judge: {
        status: "not_run" as const,
        liveVerdict: liveJudge,
        reason: "The live TR→EN arm failed before the judge. No stored judge packet exists. A judge result is not invented.",
      },
    },
    distractors,
    onlyCompleteConcentration: {
      rule: "incompleteOption or wordCount <= 0.7 × keyWords, matching the length side of only_complete_option",
      shortOptions: shortRows,
      byMisreadingMechanism: byMechanism,
      note: "Short incomplete options concentrate on COUNTERFACTUAL_FACTUAL / modality_shift (glass A) and PURPOSE_RESULT plus AGENT_ROLE (faculty A, D). Those writer sentences drop a clause, not a single targeted link.",
    },
    proposedWriterContract: {
      appliedThisRound: false,
      promptUnchanged: true,
      contract: "Each distractor must keep the source sentence's main events and relations and change only the one targeted meaning link.",
    },
    metrics: {
      recoveredReplay: {
        structuralCompletion: structuralCompletion,
        gateEligible,
        judgeApproved,
        editoriallyAccepted: 0,
        liveQualitySuccess: false as const,
      },
      liveFrozenUnchanged: {
        structuralCompletion: 0.75,
        firstPassYield: 0.75,
        judgeApproved: "not_recomputed" as const,
        editoriallyAccepted: 0,
      },
      meaningProven: false as const,
      observedDifficulty: null,
      firstPassReviewable: "retired" as const,
    },
  };
}

export function writeRecoveredCandidateAudit() {
  const report = assessRecoveredCandidateAudit();
  const body = report;
  mkdirSync(recoveredCandidateAuditOutputDir, { recursive: true });
  writeFileSync(path.join(recoveredCandidateAuditOutputDir, "summary.json"), `${JSON.stringify({
    version: body.version,
    liveSourceDir: body.liveSourceDir,
    liveSummaryHash: body.liveSummaryHash,
    livePilotImmutable: true,
    providerCalls: 0,
    meaningProven: false,
    qualityProven: false,
    judgeStatus: body.gates.judge.status,
    liveQualitySuccess: false,
  }, null, 2)}\n`);
  writeFileSync(path.join(recoveredCandidateAuditOutputDir, "metrics.json"), `${JSON.stringify(body.metrics, null, 2)}\n`);
  writeFileSync(path.join(recoveredCandidateAuditOutputDir, "report.json"), `${JSON.stringify(body, null, 2)}\n`);
  writeFileSync(path.join(recoveredCandidateAuditOutputDir, "five.json"), `${JSON.stringify({
    source: body.recoveredSet.source,
    key: body.recoveredSet.key,
    keyLetter: body.recoveredSet.keyLetter,
    options: body.recoveredSet.options,
  }, null, 2)}\n`);
  return report;
}
