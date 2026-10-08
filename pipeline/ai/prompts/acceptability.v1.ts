import { optionLabels } from "@/modules/analysis/contract";
import { completedSentences, type GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import { optionAcceptability } from "@/modules/factory/judge";
import { responseSchema } from "./schema";

export const acceptabilityPromptVersion = "acceptability.v1";

export const acceptabilitySystem = `You are a careful editor of academic English. You receive five separate sentences labelled A to E. They are NOT a test item for you to solve, and there is no hidden answer: any number of them, from zero to five, may be acceptable.

Judge each sentence on its own, as if it were the only one on the page:
- acceptable = true only when the sentence is grammatical AND the logical relation its connector sets up between the two clauses (contrast, concession, cause, condition, time, purpose…) is coherent and believable given ordinary world knowledge. A careful writer could publish it unchanged.
- acceptable = false when the connector creates a relation that does not hold (for example a "cause" that would actually lead to the opposite outcome, a contrast between things that do not contrast, a condition that cannot restrict a settled past fact, a time order that makes no sense), or when the sentence is ungrammatical.
- A sentence that is merely plain, or less elegant than another, is still acceptable.

confidence is how sure you are of your own judgement (0..1). reason: one short sentence in English.`;

export function acceptabilityUser(candidate: Pick<GeneratedQuestionCandidate, "question">): string {
  const sentences = completedSentences(candidate);
  return ["SENTENCES", ...optionLabels.map((label) => `${label}. ${sentences[label]}`)].join("\n");
}

export const acceptabilityResponseSchema = () => responseSchema(optionAcceptability);
