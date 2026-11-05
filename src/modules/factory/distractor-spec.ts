import { z } from "zod";
import { nodeRef, optionLabels } from "@/modules/analysis/contract";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { mainClauseFrames, type MainClauseFrame } from "./context";
import { diagnoseSlot, distractorDiagnosis, diagnosisCoverage } from "./diagnosis";
import type { ExperimentSet } from "./experiments";
import type { DistractorSlot, QuestionSpec } from "./spec";
import { defaultFactoryThresholds, type FactoryThresholds } from "./thresholds";
import { factoryVersions } from "./versions";

export const distractorProperties = [
  "opens_with_allowed_connector",
  "finite_clause",
  "grammatical",
  "coherent_clause",
  "on_topic",
  "expresses_target_relation",
  "false_as_whole_sentence",
  "becomes_correct_answer",
  "true_sensible_sentence",
  "reuses_answer_clause",
  "reuses_other_distractor_clause",
  "expresses_correct_relation",
  "changes_question_intent",
  "contains_forbidden_marker",
] as const;
export type DistractorProperty = (typeof distractorProperties)[number];

/** How a wrong option is meant to fail. Codes only: the prompt layer turns them into instructions. */
export const failureModes = [
  "no_broken_expectation",
  "no_real_opposition",
  "similarity_does_not_hold",
  "reason_supports_opposite",
  "consequence_does_not_follow",
  "condition_cannot_restrict",
  "impossible_time_order",
  "purpose_does_not_fit",
  "addition_contradicts",
  "example_does_not_illustrate",
  "logically_incompatible",
  "meaning_does_not_fit",
  "collocation_breaks",
  "grammatical_form_breaks",
] as const;
export type FailureMode = (typeof failureModes)[number];

/** Relation a wrong option expresses → how it must fail. Applies to every family, not to one example item. */
const relationFailure: Partial<Record<string, FailureMode>> = {
  concession: "no_broken_expectation",
  contrast: "no_real_opposition",
  comparison: "similarity_does_not_hold",
  cause: "reason_supports_opposite",
  result: "consequence_does_not_follow",
  condition: "condition_cannot_restrict",
  sequence: "impossible_time_order",
  purpose: "purpose_does_not_fit",
  addition: "addition_contradicts",
  example: "example_does_not_illustrate",
};

/** Distractor type → failure when the option expresses no discourse relation. */
const typeFailure: Partial<Record<string, FailureMode>> = {
  logical_incompatibility: "logically_incompatible",
  semantic_mismatch: "meaning_does_not_fit",
  meaning_shift: "meaning_does_not_fit",
  collocation_failure: "collocation_breaks",
  grammatical_mismatch: "grammatical_form_breaks",
  syntactic_mismatch: "grammatical_form_breaks",
  tense_mismatch: "grammatical_form_breaks",
  part_of_speech_mismatch: "grammatical_form_breaks",
};

/**
 * How the option's event must stand to the main clause's outcome. Mirrors the failure mode, so a wrong option is
 * wrong through its relation and never through an implausible or unrelated event.
 */
export const eventRelations = [
  "compatible_with_outcome",
  "works_against_outcome",
  "setback_right_before_outcome",
  "does_not_follow_from_outcome",
  "unrelated_purpose",
  "contradicts_outcome",
  "does_not_illustrate",
  "parallel_to_outcome",
  "purpose_against_outcome",
] as const;
export type EventRelation = (typeof eventRelations)[number];

const eventRelationFor: Partial<Record<FailureMode, EventRelation>> = {
  no_broken_expectation: "compatible_with_outcome",
  no_real_opposition: "compatible_with_outcome",
  similarity_does_not_hold: "contradicts_outcome",
  reason_supports_opposite: "works_against_outcome",
  condition_cannot_restrict: "works_against_outcome",
  impossible_time_order: "setback_right_before_outcome",
  consequence_does_not_follow: "does_not_follow_from_outcome",
  purpose_does_not_fit: "unrelated_purpose",
  addition_contradicts: "contradicts_outcome",
  example_does_not_illustrate: "does_not_illustrate",
};

/** Event relations of the second-round experiments: parallel facts for contrast (opposition), purposes the action would work against (compatibility). */
const revisedEventRelation: Partial<Record<FailureMode, { experiment: "opposition" | "compatibility"; relation: EventRelation }>> = {
  no_real_opposition: { experiment: "opposition", relation: "parallel_to_outcome" },
  purpose_does_not_fit: { experiment: "compatibility", relation: "purpose_against_outcome" },
};

/**
 * The clause form a wrong option must take for the main clause's time frame (compatibility experiment). Codes only:
 * the prompt layer turns them into instructions. Null when the relation has no frame-specific form.
 */
export const clauseForms = ["standing_past_condition", "present_condition", "counterfactual_condition", "purpose_with_modal", "past_time_clause", "present_time_clause", "match_main_clause"] as const;
export type ClauseForm = (typeof clauseForms)[number];

export function clauseFormFor(relation: string | null, frame: MainClauseFrame): ClauseForm | null {
  const past = frame === "past_event" || frame === "past_ongoing";
  if (relation === "condition") return past ? "standing_past_condition" : frame === "present_general" || frame === "future" ? "present_condition" : frame === "counterfactual" ? "counterfactual_condition" : "match_main_clause";
  if (relation === "purpose") return "purpose_with_modal";
  if (relation === "sequence") return past ? "past_time_clause" : frame === "present_general" || frame === "future" ? "present_time_clause" : "match_main_clause";
  return null;
}

/** Types whose whole point is a broken form; every other wrong option must be grammatical. */
const formTypes = new Set(["grammatical_mismatch", "syntactic_mismatch", "tense_mismatch", "part_of_speech_mismatch"]);

export const distractorSpec = z.object({
  version: z.literal(factoryVersions.distractorSpec),
  id: z.string().regex(/^[a-z0-9_.-]+$/),
  option: z.enum(optionLabels),
  /** Unique within an item: distractor type and the relation it expresses. */
  role: z.string().regex(/^[a-z_]+:[a-z_]+$/),
  distractorType: nodeRef,
  targetMisconception: nodeRef.nullable(),
  requiredProperties: z.array(z.enum(distractorProperties)),
  forbiddenProperties: z.array(z.enum(distractorProperties)),
  relationConstraint: z.object({
    correctRelation: nodeRef.nullable(),
    targetRelation: nodeRef.nullable(),
    connectors: z.array(nodeRef).min(1),
    mustNotExpress: z.array(nodeRef),
  }),
  semanticConstraint: z.object({ failureMode: z.enum(failureModes), onTopic: z.literal(true), wholeSentenceMustFail: z.literal(true) }),
  /** The scenario stays believable: an option must not be ruled out by world knowledge or absurdity alone. */
  plausibilityConstraint: z.object({
    scenario: z.literal("realistic_in_context"),
    worldKnowledge: z.literal("must_not_eliminate_alone"),
    unusualContent: z.literal("needs_contextual_justification"),
  }),
  /** Null for form-breaking types, whose tense may be wrong on purpose. */
  temporalConstraint: z
    .object({
      tenseAspect: z.literal("compatible_with_main_clause"),
      timeFrame: z.literal("same_as_main_clause"),
      eventRelation: z.enum(eventRelations).nullable(),
      /** The stem's main-clause time frame and the clause form it requires; null unless context rules apply (compatibility). */
      mainClauseFrame: z.enum(mainClauseFrames).nullable(),
      form: z.enum(clauseForms).nullable(),
    })
    .nullable(),
  /** A wrong option brings its own proposition: it never negates, reverses or restates one of the stem's. */
  stemRelationConstraint: z.object({ negateStemProposition: z.literal("forbidden"), restateStem: z.literal("forbidden") }),
  grammarConstraint: z.object({
    pattern: nodeRef.nullable(),
    mustBeGrammatical: z.boolean(),
    finiteClause: z.boolean(),
    capitalised: z.boolean(),
    terminalPunctuation: z.literal(false),
  }),
  lexicalConstraint: z.object({
    forbiddenWords: z.array(z.string()),
    words: z.object({ min: z.number().int(), max: z.number().int() }),
    maxAnswerTokenOverlap: z.number(),
    maxAnswerTrigramOverlap: z.number(),
    /** Stem content words at which an option starts to read as a restatement of the stem. */
    stemEchoAt: z.number().int(),
  }),
  reusePolicy: z.object({ answerClause: z.literal("forbidden"), otherDistractorClauses: z.literal("forbidden"), topicVocabulary: z.literal("allowed") }),
  explanationRequirement: z.object({ mustName: z.array(z.enum(["target_relation", "failure_reason", "misconception"])) }),
  /** Why this distractor type appears more than once in the item; null when it does not. */
  repeatedTypeReason: z.enum(["distinct_relation"]).nullable(),
  /** Misconception label assigned by construction (diagnoseSlot); null only for question types without a diagnosis yet. */
  diagnosis: distractorDiagnosis.nullable(),
});
export type DistractorSpec = z.infer<typeof distractorSpec>;

const slug = (value: NodeRef) => parseRef(value).slug;

export function failureModeFor(slot: Pick<DistractorSlot, "distractorType" | "expresses">): FailureMode {
  const mode = (slot.expresses && relationFailure[slug(slot.expresses)]) || typeFailure[slug(slot.distractorType)];
  if (!mode) throw new Error(`No failure mode for ${slot.distractorType} expressing ${slot.expresses ?? "nothing"}`);
  return mode;
}

/**
 * Turns the spec's distractor plan into one DistractorSpec per wrong option. Deterministic: the same QuestionSpec
 * (and, under the second-round experiments, the same main-clause frame) always gives the same specs. Fails when two
 * options would use the same mechanism. Without options the result is the baseline contract.
 */
export function buildDistractorSpecs(spec: QuestionSpec, thresholds: FactoryThresholds = defaultFactoryThresholds, options: { experiments?: ExperimentSet; frame?: MainClauseFrame } = {}): DistractorSpec[] {
  const experiments = options.experiments ?? [];
  const frame = experiments.includes("compatibility") ? (options.frame ?? null) : null;
  const roles = spec.distractorPlan.map((slot) => `${slug(slot.distractorType)}:${slot.expresses ? slug(slot.expresses) : "none"}`);
  const duplicate = roles.find((role, i) => roles.indexOf(role) !== i);
  if (duplicate) throw new Error(`Distractor plan repeats the mechanism ${duplicate}; every wrong option needs its own.`);
  const typeCount = (type: NodeRef) => spec.distractorPlan.filter((slot) => slot.distractorType === type).length;
  const capitalised = spec.contextConstraints.blankPosition === "start";

  return spec.distractorPlan.map((slot, index) => {
    if (slot.connectors.length === 0) throw new Error(`Slot ${slot.option} has no connectors to open with.`);
    const form = formTypes.has(slug(slot.distractorType));
    const repeated = typeCount(slot.distractorType) > 1;
    if (repeated && !slot.expresses) throw new Error(`${slot.distractorType} repeats without a distinct relation.`);
    const failureMode = failureModeFor(slot);
    const revised = revisedEventRelation[failureMode];
    const diagnosis = diagnosisCoverage[spec.questionType]
      ? diagnoseSlot({ questionType: spec.questionType, correctRelation: spec.discourseRelation, expresses: slot.expresses, distractorType: slot.distractorType, failureMode, misconception: slot.misconception })
      : null;
    return distractorSpec.parse({
      version: factoryVersions.distractorSpec,
      id: `${spec.id}.${slot.option.toLowerCase()}`,
      option: slot.option,
      role: roles[index],
      distractorType: slot.distractorType,
      targetMisconception: slot.misconception,
      requiredProperties: [
        "opens_with_allowed_connector",
        "finite_clause",
        ...(form ? [] : (["grammatical", "coherent_clause"] as const)),
        "on_topic",
        ...(slot.expresses ? (["expresses_target_relation"] as const) : []),
        "false_as_whole_sentence",
      ],
      forbiddenProperties: [
        "becomes_correct_answer",
        "true_sensible_sentence",
        "reuses_answer_clause",
        "reuses_other_distractor_clause",
        ...(spec.discourseRelation ? (["expresses_correct_relation"] as const) : []),
        "changes_question_intent",
        "contains_forbidden_marker",
      ],
      relationConstraint: {
        correctRelation: spec.discourseRelation,
        targetRelation: slot.expresses,
        connectors: slot.connectors,
        mustNotExpress: spec.discourseRelation ? [spec.discourseRelation] : [],
      },
      semanticConstraint: { failureMode, onTopic: true, wholeSentenceMustFail: true },
      plausibilityConstraint: { scenario: "realistic_in_context", worldKnowledge: "must_not_eliminate_alone", unusualContent: "needs_contextual_justification" },
      temporalConstraint: form
        ? null
        : {
            tenseAspect: "compatible_with_main_clause",
            timeFrame: "same_as_main_clause",
            eventRelation: (revised && experiments.includes(revised.experiment) ? revised.relation : eventRelationFor[failureMode]) ?? null,
            mainClauseFrame: frame,
            form: frame ? clauseFormFor(slot.expresses ? slug(slot.expresses) : null, frame) : null,
          },
      stemRelationConstraint: { negateStemProposition: "forbidden", restateStem: "forbidden" },
      grammarConstraint: { pattern: spec.grammarPattern, mustBeGrammatical: !form, finiteClause: spec.grammarPattern === "grammar_pattern:clause_connector", capitalised, terminalPunctuation: false },
      lexicalConstraint: {
        forbiddenWords: spec.vocabularyConstraints.forbiddenInDistractors,
        words: spec.contextConstraints.optionWords,
        maxAnswerTokenOverlap: thresholds.answerReuseTokenOverlap,
        maxAnswerTrigramOverlap: thresholds.answerReuseTrigramOverlap,
        stemEchoAt: thresholds.stemSharedContentWords,
      },
      reusePolicy: { answerClause: "forbidden", otherDistractorClauses: "forbidden", topicVocabulary: "allowed" },
      explanationRequirement: { mustName: ["target_relation", "failure_reason", ...(slot.misconception ? (["misconception"] as const) : [])] },
      repeatedTypeReason: repeated ? "distinct_relation" : null,
      diagnosis,
    });
  });
}
