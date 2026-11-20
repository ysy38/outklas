import { completeStem, skeletonCheckReport, type QuestionSkeleton } from "@/modules/factory/skeleton";
import type { QuestionSpec } from "@/modules/factory/spec";
import { parseRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const skeletonCheckPromptVersion = "skeleton-check.v1";

const relationTests: Record<string, string> = {
  "discourse_relation:concession":
    "concession: the correct option states a fact that would lead a reader to expect the OPPOSITE of the main clause's outcome (an obstacle, a disadvantage, a reason against), and the main clause breaks that expectation. A weak or merely neutral clash scores low. If ordinary knowledge makes the outcome impossible, keyTrue is false.",
};

export const skeletonCheckSystem = `SKELETON REVIEWER
You check the stem and the correct option of an original YDS sentence-completion item BEFORE any wrong options are written. Another model wrote them. A flawed skeleton cannot be repaired by good wrong options, so reject it now when it is flawed.

Write reasons FIRST (at most four short points in English), then:
- grammatical: the completed sentence is grammatical, with correct punctuation around the blank.
- natural (0..1): it reads as natural academic English, not forced or telegraphic.
- keyTrue: the completed sentence is a true, sensible statement given ordinary world knowledge.
- targetRelation (0..1): how clearly the correct option establishes the TARGET RELATION with the main clause (test below).
- keyAmbiguous (0..1): chance that the correct option's link to the main clause reads as a different relation, or that the sentence has an unresolved second reading (unclear reference, two meanings).
- confidence (0..1): how sure you are overall.
- embedding: the exact words of one relative or complement clause inside the correct option (which, who, or that plus its verb), or "" if the option has none.
- preciseTerm: one single word copied from inside that embedding that a B2 reader may not know, or "" if every word there is ordinary. Never a phrase.
- clauseCarriesClash: true only when deleting that embedding removes the fact a reader needs in order to expect the opposite outcome. False when the words left behind already state a clear obstacle in ordinary vocabulary, and the embedding only adds a time, a duration, a confirmation, or a restatement of the expectation. "rescinded the permit, which it had issued a fortnight earlier" is false. "a storage solution that had turned hypoxic" is true.`;

export function skeletonCheckUser(spec: QuestionSpec, skeleton: QuestionSkeleton): string {
  const relation = spec.discourseRelation;
  const test = relation ? relationTests[relation] : undefined;
  if (!relation || !test) throw new Error(`${skeletonCheckPromptVersion} has no relation test for ${relation ?? "no relation"}`);
  const band =
    spec.difficulty.band === "easy"
      ? "BAND: easy, B1, one plain clause. embedding and preciseTerm are empty."
      : spec.difficulty.band === "hard"
        ? "BAND: hard, C1. embedding quotes the which/who/that clause inside the correct option. preciseTerm is a word inside that quote. clauseCarriesClash is false when deleting the quote still leaves an ordinary obstacle."
        : "BAND: medium, B2. preciseTerm is empty unless a word is genuinely beyond B2.";
  return [band, `TARGET RELATION: ${parseRef(relation).slug} (${test})`, "", `STEM: ${skeleton.stem}`, `CORRECT OPTION: ${skeleton.correctAnswer}`, `COMPLETED SENTENCE: ${completeStem(skeleton.stem, skeleton.correctAnswer)}`].join("\n");
}

export const skeletonCheckResponseSchema = () => responseSchema(skeletonCheckReport);
