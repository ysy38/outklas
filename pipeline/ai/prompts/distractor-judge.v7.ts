import { standaloneDistractorReview } from "@/modules/factory/distractor";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import { completeStem, type DifficultyStrategy, type QuestionSkeleton } from "@/modules/factory/skeleton";
import { responseSchema } from "./schema";

export const distractorVerdictPromptVersion = "distractor-judge.v7";

export const distractorVerdictSystem = `DISTRACTOR REVIEWER
You review ONE completed sentence from an original YDS sentence-completion item. Another model wrote the clause in the blank. You do not know the answer key, the correct letter, or why the writer thinks the clause is wrong. Judge this sentence on its own. A reading of this one sentence is not a choice among five options.

Return JSON:
- surface: sound when the clause is grammatical and natural English. ungrammatical when it does not fit the blank. unnatural when the clause is awkward or garbled. too_obvious when even a weak reader rejects it without the logic: absurd, off topic, physically impossible, or a plain negation of the main clause. surface is not a verdict that the clause is a successful distractor.
- readings: every label that applies. Use none, one, or several.
  - second_answer: a careful reader could defend the completed sentence as a natural continuation of the stem.
  - restatement: the clause repeats what the stem says, or what the stem already requires. Up to three children already leaves a fourth child outside. Every room except one already states the exception. Those repeats are restatements, not new inferences.
  - unsupported_inference: the clause treats a step the stem does not require as if the stem had said it. Every applicant who passed receives funding does not entail that applicants who failed receive none, and it does not rule that exclusion out either. That exclusion can be unsupported_inference. It is not, by itself, a second answer.
  - discourse_failure: the completed sentence does not carry out the discourse task named in the user message.
  - uncertain: the stem and the clause are not enough for a reliable reading.
  unsupported_inference and discourse_failure may both apply. Do not collapse the readings into one word such as good or wrong.
- sure: false when you are torn, and whenever uncertain applies.
- reason: one short sentence, at most 20 words. Name what the stem and the clause do. Do not invent an answer key.`;

export function distractorVerdictUser(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; text: string; strategy?: DifficultyStrategy | null }): string {
  const { skeleton, text } = input;
  return [
    "EXAM: YDS sentence completion. One clause fills the blank.",
    "DISCOURSE TASK: concession.",
    "Judge this one completed sentence. You cannot see the other options.",
    "",
    `STEM: ${skeleton.stem}`,
    `COMPLETED SENTENCE: ${completeStem(skeleton.stem, text)}`,
    `CLAUSE UNDER REVIEW: ${text}`,
  ].join("\n");
}

export const distractorVerdictResponseSchema = () => responseSchema(standaloneDistractorReview);
