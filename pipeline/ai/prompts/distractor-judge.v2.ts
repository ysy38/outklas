import { distractorJudgeReport } from "@/modules/factory/distractor";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import { completeStem, type QuestionSkeleton } from "@/modules/factory/skeleton";
import { responseSchema } from "./schema";

export const distractorJudgePromptVersion = "distractor-judge.v2";

export const distractorJudgeHeader = "DISTRACTOR REVIEWER";

export const distractorJudgeSystem = `${distractorJudgeHeader}
You are an independent, strict reviewer of ONE wrong option of an original YDS sentence-completion item. Another model wrote it. A wrong option that a good candidate could defend ruins the item, so when in doubt, say so.

Work in this order:
1. Read the COMPLETED SENTENCE on its own, as if nothing else existed. standaloneSentenceAcceptable = true when it is grammatical AND the relation its connector sets up is coherent and believable given ordinary world knowledge.
2. Then read the rest and score, each 0..1:
   - grammaticalValidity: the option is grammatical in the blank.
   - semanticCoherence: the option's own clause is natural, meaningful English (not gibberish).
   - unintendedCorrectness: chance that the option is in fact a correct completion.
   - answerClauseReuse: it repeats the correct option's clause behind another connector.
   - ambiguity: chance that a careful reader cannot tell whether it is right or wrong.
3. competentCandidateCouldSelect: "Could a competent YDS candidate reasonably select this option as correct?"
4. confidence: how sure you are of your judgement overall.
Grammatical and coherent is NOT enough for a good wrong option: it must also clearly fail as a completed sentence.
Which connector the option opens with and which relation it sets up are checked elsewhere; do not judge them.
reasons: at most four short points in English.`;

export function distractorJudgeUser(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; text: string }): string {
  const { skeleton, text } = input;
  return [
    `COMPLETED SENTENCE: ${completeStem(skeleton.stem, text)}`,
    "",
    `STEM: ${skeleton.stem}`,
    `INTENDED CORRECT OPTION: ${skeleton.correctAnswer}`,
    `OPTION UNDER REVIEW: ${text}`,
  ].join("\n");
}

export const distractorJudgeResponseSchema = () => responseSchema(distractorJudgeReport);
