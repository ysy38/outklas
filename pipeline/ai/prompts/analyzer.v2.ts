import { analysisDraft } from "@/modules/analysis/contract";
import type { AnalyzerInput } from "../types";
import { formatItem } from "./item";
import { responseSchema, withRefEnums } from "./schema";
import { taxonomyListing } from "./taxonomy";

export const analyzerPromptVersion = "analyzer.v2";

/**
 * Reference fields become enums of the nodes their facet allows. Gemini rejects the schema once all of them are enums
 * (about 24k characters; 15k works), so the concept lists and distractor targets, which the model already filled
 * correctly under v1, are left to Zod.
 */
export const analyzerResponseSchema = () =>
  withRefEnums(responseSchema(analysisDraft), {
    question_type: "question_type",
    "knowledge.grammar.[]": "grammar",
    "knowledge.vocabulary.[].ref": "vocabulary",
    "knowledge.discourse_relations.[]": "discourse",
    "skills.primary": "skill_primary",
    "skills.secondary.[]": "skill_secondary",
    "skills.cognitive.[]": "cognitive",
    "answer_expresses.[]": "answer_expresses",
    "distractors.[].type": "distractor_type",
    "distractors.[].expresses": "distractor_expresses",
    "distractors.[].misconception": "misconception",
    "misconceptions.[]": "misconception",
    "prerequisites.[]": "prerequisite",
  });

export const analyzerSystem = () => `You are an assessment analyst for the Turkish YDS English exam (ÖSYM). You study one historical exam item and describe what it tests and how it tests it, so that patterns can be mined across many items. You never rewrite, translate, continue or reproduce the item.

Rules:
- Reference fields take only node references from the TAXONOMY below, written type:slug exactly; the response schema lists the allowed ones per field. Never invent a reference and never write prose in a reference field: when nothing fits, use null or an empty list. When something important is missing from the taxonomy, add it to "proposals" (type, snake_case slug, short English name, reason) and leave it out of the reference fields.
- question_type: use the type given in the request.
- correct_option: the official answer key is given; analyse the item with it.
- knowledge.primary_concepts: 1–3 references naming what a candidate must know to get this item right (for a connector item the discourse_relation and/or grammar_pattern; for a word item the relevant skill such as skill:collocation or skill:contextual_meaning; for a reading item the reading skill).
- knowledge.secondary_concepts: other concepts that play a part.
- knowledge.grammar: grammar and grammar_pattern references involved in solving it.
- knowledge.vocabulary: up to 8 lowercase lemmas central to solving it, each with part of speech and role (tested = the word or phrase the item tests; answer = in the correct option; distractor = in a wrong option; key_context = a context word the solution hinges on). ref is a connector or vocabulary reference when one exists, otherwise null.
- knowledge.discourse_relations: discourse relations that matter for the solution.
- skills.primary: the single best skill reference, or null when no skill node fits (for example a pure grammar item). skills.secondary: other skills. skills.cognitive: 1–3 cognitive_skill references.
- difficulty: each 0..1 for a typical YDS candidate (B1–C1): about 0.2 easy, 0.5 typical, 0.8 hard. overall is the expected difficulty of the whole item.
- answer_expresses: what the correct option expresses (connector, discourse relation, grammar structure).
- distractors: exactly one entry for every wrong option. type is a distractor_type reference; expresses is what that option expresses (reference or null); targeted_concept is the concept the trap tests (reference or null); misconception is a misconception reference or null. why_plausible and why_wrong are at most 30 words each, in your own words.
- misconceptions: misconception references the item exploits. prerequisites: references a candidate must already master.
- learning_objective: one generic sentence in your own words (for example "Tell concessive connectors from contrastive ones before a finite clause").
- pedagogy.cognitive_demand: remember, understand, apply, analyze or evaluate. pedagogy.transfer_requirement: low, medium or high, for how far beyond a memorised surface pattern the candidate has to go.
- ambiguities: concerns such as two defensible options, a doubtful key, or text that looks garbled by OCR. Empty when there are none.
- confidence: 0..1, calibrated. needs_review: true when the text looks corrupted, the key looks wrong, or you are unsure of the analysis.
- Free-text fields (why_plausible, why_wrong, learning_objective, ambiguities, proposal reasons) must never copy five or more consecutive words from the item. Describe, do not quote.

TAXONOMY
${taxonomyListing()}`;

export function analyzerUser(input: AnalyzerInput): string {
  return [
    `Exam: ${input.examLabel}`,
    `Question number: ${input.question.number}`,
    `Question type: ${input.questionType}`,
    input.question.translationDirection ? `Translation direction: ${input.question.translationDirection === "en_tr" ? "English to Turkish" : "Turkish to English"}` : null,
    `Official answer key: ${input.answerKey}`,
    "",
    "ITEM",
    formatItem(input.question),
  ]
    .filter((line) => line !== null)
    .join("\n");
}
