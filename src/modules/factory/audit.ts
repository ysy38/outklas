import { z } from "zod";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import type { NodeRef } from "@/modules/knowledge/graph";
import { discourseForConnector } from "@/modules/knowledge/seed";
import { constructedContentLabel, effectiveDiagnosis, labelStatus, observedContentFailures, type DiagnosisLabelCode, type DistractorDiagnosis, type LabelStatus, type ObservedContentFailure } from "./diagnosis";
import type { OptionDiagnosis } from "./review";
import { defaultFactoryThresholds, type FactoryThresholds } from "./thresholds";
import { leadingConnector, longestSharedPhrase, sharedWording, stemEcho, stemOverlap, type OverlapLevel } from "./validator";

/**
 * Post-hoc AI review of a finished item, run the same way for every benchmark variant. It never changes a verdict:
 * it measures distractor quality, validates the constructed misconception labels and gives the evidence a calibrated
 * difficulty band is computed from. It is AI review, not human approval.
 */
export const itemAuditVersion = "item-audit.v2";

/** How a candidate who reads carefully, but does not yet know the target relation, gets rid of a wrong option. */
export const eliminationRoutes = ["at_a_glance", "world_knowledge", "relation_logic", "cannot_eliminate"] as const;
/** A cue that gives a wrong option away without the target concept. */
export const optionClues = ["none", "repeats_stem", "repeats_key", "grammar_or_tense", "negates_stem", "length_or_register"] as const;

const unit = z.number().min(0).max(1);

export const itemAuditReport = z.object({
  reasons: z.array(z.string().max(300)).max(6),
  answer: z.enum(optionLabels),
  answerConfidence: unit,
  options: z
    .array(
      z.object({
        option: z.enum(optionLabels),
        note: z.string().max(300),
        acceptable: z.boolean(),
        /** Grammatical, natural English in the blank (item-audit.v2). */
        natural: z.boolean(),
        eliminatedBy: z.enum(eliminationRoutes),
        clue: z.enum(optionClues),
        implausibleScenario: z.boolean(),
        tenseClash: z.boolean(),
        negatesStem: z.boolean(),
        restatesStem: z.boolean(),
        contentFailure: z.enum(observedContentFailures as unknown as [ObservedContentFailure, ...ObservedContentFailure[]]),
        contentConfidence: unit,
      }),
    )
    .length(optionLabels.length),
  answerFoundWithoutTarget: z.boolean(),
  whyWithoutTarget: z.string().max(300),
});
export type ItemAuditReport = z.infer<typeof itemAuditReport>;

/** A difficulty a spec requests or a judge estimates. */
export type Band = "easy" | "medium" | "hard";
/** A calibrated label: a defective item has no difficulty, it has a flaw. */
export type CalibratedBand = Band | "defective";

export type OptionAudit = {
  option: OptionLabel;
  role: string;
  eliminatedBy: (typeof eliminationRoutes)[number];
  clue: (typeof optionClues)[number];
  secondAnswer: boolean;
  natural: boolean;
  implausible: boolean;
  tenseClash: boolean;
  negatesStem: boolean;
  restatesStem: boolean;
  /** Deterministic, diagnostic only: shared content words and longest shared phrase with the stem and with the key. */
  stemOverlap: { contentWords: number; longestPhrase: string; excessive: boolean; level: OverlapLevel };
  keyOverlap: { contentWords: number };
  /** Eliminable only by reading the relation, with no clue and no quality problem. */
  functional: boolean;
  label: { expected: DiagnosisLabelCode | null; observed: ObservedContentFailure; status: LabelStatus; effective: DistractorDiagnosis | null } | null;
};

export type ItemAudit = {
  version: typeof itemAuditVersion;
  specId: string;
  blindAnswer: OptionLabel;
  blindAgrees: boolean;
  /** The band the QuestionSpec asked for. */
  requested: Band;
  /** The final judge's own band, kept as it was. */
  original: Band;
  calibrated: { band: CalibratedBand | null; reason: string; evidence: CalibrationEvidence };
  distractorQuality: { functional: number; of: number };
  options: OptionAudit[];
};

/** What the blind audit and the deterministic checks say about one item; the only input of calibratedBand. */
export type CalibrationEvidence = {
  blindAgrees: boolean;
  answerConfidence: number;
  /** The auditor reads the key's completed sentence as a true, sensible statement. */
  keyAcceptable: boolean;
  /** The auditor reads the key as grammatical, natural English in the blank. */
  keyNatural: boolean;
  /** Wrong options a careful candidate could defend (second answers). */
  unresolved: number;
  /** Wrong options that fall to a superficial cue, an implausible scenario or a form problem, without the target relation. */
  cheaplyEliminable: number;
  relationLogic: number;
  /** Wrong options that are natural, plausible and ruled out only by the relation (no cue at all). */
  functional: number;
  wrong: number;
  answerFoundWithoutTarget: boolean;
  keyRelationUnique: boolean;
};

/** Below this blind-solve confidence an agreeing answer is not evidence that the item is valid. */
export const minAnswerConfidence = 0.6;

const cheap = (entry: Pick<OptionAudit, "eliminatedBy" | "clue" | "natural" | "implausible" | "tenseClash" | "negatesStem" | "restatesStem" | "stemOverlap">) =>
  entry.eliminatedBy === "at_a_glance" ||
  entry.eliminatedBy === "world_knowledge" ||
  entry.clue !== "none" ||
  !entry.natural ||
  entry.implausible ||
  entry.tenseClash ||
  entry.negatesStem ||
  entry.restatesStem ||
  entry.stemOverlap.level === "copied";

/**
 * Difficulty label from evidence, never from a model's own label, and never from a flaw. It is a calibrated
 * judgement of item construction, not an empirical difficulty: that needs learner responses.
 * - defective: the blind solve misses the key, the key does not read as true or natural, or a wrong option is defensible;
 * - null (not calibrated): the blind solve agrees only with low confidence, so validity itself is not established;
 * - easy: the answer is found without the target relation, or at least three wrong options fall to superficial cues;
 * - hard: a construction label only. Every wrong option is functional and another option shares the key's relation.
 *   It does not measure language. Requested band carries the CEFR load (easy B1 plain clause, medium B2, hard C1).
 *   Without a shared relation the item stays medium (conservative);
 * - medium: a valid item that needs the context and the target relation.
 */
export function calibratedBand(evidence: CalibrationEvidence): { band: CalibratedBand | null; reason: string } {
  const facts = `${evidence.cheaplyEliminable} of ${evidence.wrong} wrong option(s) cheaply eliminable, ${evidence.functional} functional, ${evidence.unresolved} defensible; answer ${evidence.answerFoundWithoutTarget ? "is" : "is not"} found without the target; key relation ${evidence.keyRelationUnique ? "unique" : "shared"}; blind confidence ${evidence.answerConfidence}`;
  if (!evidence.blindAgrees) return { band: "defective", reason: `blind answer differs from the key: ${facts}` };
  if (!evidence.keyAcceptable) return { band: "defective", reason: `the key's completed sentence is not accepted: ${facts}` };
  if (!evidence.keyNatural) return { band: "defective", reason: `the key is not grammatical, natural English: ${facts}` };
  if (evidence.unresolved > 0) return { band: "defective", reason: `a wrong option cannot be ruled out: ${facts}` };
  if (evidence.answerConfidence < minAnswerConfidence) return { band: null, reason: `not calibrated, blind solve agrees with low confidence: ${facts}` };
  if (evidence.answerFoundWithoutTarget || evidence.cheaplyEliminable >= 3) return { band: "easy", reason: facts };
  if (evidence.functional === evidence.wrong && !evidence.keyRelationUnique) return { band: "hard", reason: facts };
  return { band: "medium", reason: evidence.keyRelationUnique ? `${facts}; hard needs another option of the key's relation` : facts };
}

const relationOf = (option: string): NodeRef | null => {
  const connector = leadingConnector(option);
  return connector ? discourseForConnector(connector) : null;
};

export function evaluateItemAudit(input: {
  specId: string;
  stem: string;
  options: Record<OptionLabel, string>;
  key: OptionLabel;
  targetRelation: NodeRef | null;
  roles: Partial<Record<OptionLabel, string>>;
  diagnoses: OptionDiagnosis[];
  original: Band;
  requested?: Band;
  report: ItemAuditReport;
  thresholds?: FactoryThresholds;
}): ItemAudit {
  const thresholds = input.thresholds ?? defaultFactoryThresholds;
  const byOption = new Map(input.report.options.map((entry) => [entry.option, entry]));
  if (byOption.size !== optionLabels.length) throw new Error(`Audit of ${input.specId} does not cover every option once`);
  const diagnoses = new Map(input.diagnoses.map((entry) => [entry.option, entry.diagnosis]));
  const wrong = optionLabels.filter((label) => label !== input.key);

  const options: OptionAudit[] = wrong.map((option) => {
    const seen = byOption.get(option)!;
    const text = input.options[option];
    const echo = stemEcho(input.stem, text);
    const phrase = longestSharedPhrase(input.stem, text);
    const diagnosis = diagnoses.get(option) ?? null;
    const secondAnswer = seen.acceptable || seen.eliminatedBy === "cannot_eliminate";
    const status = diagnosis ? labelStatus(diagnosis, { failure: seen.contentFailure, confidence: seen.contentConfidence }) : null;
    const entry = {
      option,
      role: input.roles[option] ?? "unknown",
      eliminatedBy: seen.eliminatedBy,
      clue: seen.clue,
      secondAnswer,
      natural: seen.natural,
      implausible: seen.implausibleScenario,
      tenseClash: seen.tenseClash,
      negatesStem: seen.negatesStem,
      restatesStem: seen.restatesStem,
      stemOverlap: { contentWords: echo.length, longestPhrase: phrase, excessive: echo.length >= thresholds.stemSharedContentWords || phrase.split(" ").length >= 3, level: stemOverlap(input.stem, text, thresholds).level },
      keyOverlap: { contentWords: sharedWording(input.options[input.key], text).length },
      label: diagnosis && status ? { expected: constructedContentLabel(diagnosis), observed: seen.contentFailure, status, effective: effectiveDiagnosis(diagnosis, status) } : null,
    };
    return { ...entry, functional: !secondAnswer && entry.eliminatedBy === "relation_logic" && !cheap(entry) };
  });

  const blindAgrees = input.report.answer === input.key;
  const keyRelation = relationOf(input.options[input.key]) ?? input.targetRelation;
  const evidence: CalibrationEvidence = {
    blindAgrees,
    answerConfidence: input.report.answerConfidence,
    keyAcceptable: byOption.get(input.key)!.acceptable,
    keyNatural: byOption.get(input.key)!.natural,
    unresolved: options.filter((entry) => entry.secondAnswer).length,
    cheaplyEliminable: options.filter((entry) => !entry.secondAnswer && cheap(entry)).length,
    relationLogic: options.filter((entry) => !entry.secondAnswer && !cheap(entry) && entry.eliminatedBy === "relation_logic").length,
    functional: options.filter((entry) => entry.functional).length,
    wrong: options.length,
    answerFoundWithoutTarget: input.report.answerFoundWithoutTarget,
    keyRelationUnique: !!keyRelation && wrong.every((label) => relationOf(input.options[label]) !== keyRelation),
  };
  return {
    version: itemAuditVersion,
    specId: input.specId,
    blindAnswer: input.report.answer,
    blindAgrees,
    requested: input.requested ?? input.original,
    original: input.original,
    calibrated: { ...calibratedBand(evidence), evidence },
    distractorQuality: { functional: options.filter((entry) => entry.functional).length, of: options.length },
    options,
  };
}
