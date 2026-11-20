import { assignedStrategy, completeStem, skeletonCheckReport, type QuestionSkeleton } from "@/modules/factory/skeleton";
import type { QuestionSpec } from "@/modules/factory/spec";
import { parseRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const skeletonCheckPromptVersion = "skeleton-check.v2";

const relationTests: Record<string, string> = {
  "discourse_relation:concession":
    "concession: the correct option states a fact that would lead a reader to expect the OPPOSITE of the main clause's outcome (an obstacle, a disadvantage, a reason against), and the main clause breaks that expectation. A weak or merely neutral clash scores low. If ordinary knowledge makes the outcome impossible, keyTrue is false.",
};

export const skeletonCheckSystem = `SKELETON REVIEWER
You check the stem, the correct option, and any planned wrong beliefs of an original YDS sentence-completion item BEFORE the wrong clauses are written. Another model wrote them. A flawed skeleton cannot be repaired by good wrong options, so reject it now when it is flawed. A stem that also allows some other natural completion is not, by itself, flawed.

Write reasons FIRST (at most four short points in English), then:
- grammatical: the completed sentence is grammatical, with correct punctuation around the blank.
- natural (0..1): it reads as natural academic English, not forced or telegraphic.
- keyTrue: the completed sentence is a true, sensible statement given ordinary world knowledge.
- targetRelation (0..1): how clearly the correct option establishes the TARGET RELATION with the main clause (test below).
- keyAmbiguous (0..1): chance that the correct option's link to the main clause reads as a different relation, or that the sentence has an unresolved second reading (unclear reference, two meanings).
- confidence (0..1): how sure you are overall.
- embedding: the exact words of the one which/who/that clause you are judging, copied from inside the correct option, or "" if the option has none.
- preciseTerm: the one academic verb, adjective, or abstract noun that carries the concession, copied from the correct option, or "" if there is none. Never a phrase. curtail, undermine, exacerbate, impede, susceptible, and volatility count. A disease name, a geology password, or a journal-only word does not count: aquifer, bioturbated, hygroscopic, dysarthria, hypoxic. An intensifier does not count: severely, completely, fatally.
- embedding: a short span copied from the correct option that contains preciseTerm, or "" if there is none.
- clauseCarriesClash: true when replacing that word with a plain verb such as affect clearly weakens the concession. The sentence does not have to become impossible. False when other words already state the same obstacle. Do not delete the word. "an aquifer which has been severely depleted" is false, because depleted already states the obstacle. "expected to curtail small enterprise transactions" is true, because affect in place of curtail no longer leads the reader to expect the opposite outcome.
- otherContinuationsPossible: true when you can name some other natural completion of this stem. That fact is not a defect. A stem may allow several natural continuations. Do not lower targetRelation, keyTrue, or natural because of it, and do not treat it as a second answer.
- plannedReviews: one object per planned wrong option when PLANNED WRONGS is present, otherwise []. For each: option; secondAnswerRisk shown, none, or uncertain; propositionStatus entailed, contradicted, not_entailed, external_assumption, restatement, or undetermined; presentedAsInference; anchorGrounding quoted, declared_only, missing, or uncertain.
secondAnswerRisk is shown only when that planned proposition is itself a defensible completion of this stem. none when it is not. uncertain when you cannot show either. Other completions that are not in the plan do not make a planned row shown.
propositionStatus is your reading. Do not call a proposition entailed or a restatement because it shares words with the stem. Use undetermined when you cannot tell. not_entailed means the stem neither requires nor rules out the proposition. restatement means it repeats the stem or what the stem already requires.
presentedAsInference is true only when the plan offers the proposition as an invalid inference. A restatement offered that way is not a real invalid inference. You record the reading. You do not invent a contradiction to make it one.
anchorGrounding is quoted when the reason turns on a specific expression in the stem. declared_only when the plan names evidence that is not that expression. missing when no stem expression is used. uncertain when you cannot tell. A declared label is not proof.`;

export function skeletonCheckUser(spec: QuestionSpec, skeleton: QuestionSkeleton): string {
  const relation = spec.discourseRelation;
  const test = relation ? relationTests[relation] : undefined;
  if (!relation || !test) throw new Error(`${skeletonCheckPromptVersion} has no relation test for ${relation ?? "no relation"}`);
  const band =
    spec.difficulty.band === "easy"
      ? "BAND: easy, B1, one plain clause. embedding and preciseTerm are empty."
      : spec.difficulty.band === "hard"
        ? `BAND: hard, C1. Strategy: ${assignedStrategy(spec)}. preciseTerm is one academic verb, adjective, or abstract noun in the correct option, or "" when the item does not turn on one word. clauseCarriesClash is true when replacing that word with a plain verb such as affect clearly weakens the concession, and false when other words already state the same obstacle. On relational_inference the word does not have to carry the concession alone; still report the diagnostic.`
        : "BAND: medium, B2. preciseTerm is empty unless a word is genuinely beyond B2.";
  const plans = skeleton.distractorBlueprints ?? [];
  const planned = plans.length
    ? ["PLANNED WRONGS", ...plans.map((plan) => `${plan.option}. status ${plan.propositionStatus ?? "unset"}. claim ${plan.inferenceClaim ?? "unset"}. proposition: ${plan.proposition}. reason: ${plan.decisiveFailureReason}. anchor: ${plan.stemEvidenceAnchor}`)].join("\n")
    : "PLANNED WRONGS: none. Return plannedReviews as an empty array.";
  return [band, `TARGET RELATION: ${parseRef(relation).slug} (${test})`, "", `STEM: ${skeleton.stem}`, `CORRECT OPTION: ${skeleton.correctAnswer}`, `COMPLETED SENTENCE: ${completeStem(skeleton.stem, skeleton.correctAnswer)}`, "", planned].join("\n");
}

export const skeletonCheckResponseSchema = () => responseSchema(skeletonCheckReport);
