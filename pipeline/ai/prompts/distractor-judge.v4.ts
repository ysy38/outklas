import { distractorJudgeReportFor, type LexicalDiagnostics } from "@/modules/factory/distractor";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import type { ExperimentSet } from "@/modules/factory/experiments";
import { completeStem, type QuestionSkeleton } from "@/modules/factory/skeleton";
import { distractorJudgeHeader } from "./distractor-judge.v3";
import { lexicalNote } from "./distractor.v5";
import { responseSchema } from "./schema";

/** distractor-judge.v3 with the experiments' dimensions; with no experiments the factory keeps using v3. */
export const distractorJudgeExperimentalPromptVersion = "distractor-judge.v4";

/**
 * Six separate questions, never folded into one: grammar, contextual plausibility, logical coherence of the
 * completed sentence, whether the connector's relation holds, a second defensible answer, and too easy to eliminate.
 */
/** `more` lets a later prompt version add dimensions; with no `more` the text is distractor-judge.v4's. */
export function distractorJudgeSystemFor(experiments: ExperimentSet, more: { lines?: string[]; reasonsFirst?: boolean; judgesRelation?: boolean } = {}): string {
  const contrast = experiments.includes("contrast");
  const reasonsFirst = contrast || !!more.reasonsFirst;
  const judgesRelation = contrast || !!more.judgesRelation;
  const extra = [
    ...(contrast
      ? [
          "   - relationHolds: ignore how the option was meant to fail. Does the relation its connector signals (contrast, cause, condition, time …) actually hold between the option and the main clause? 1 = it holds, so the sentence could be read as correct.",
          "   - negatesStem: true when the option simply negates, reverses or contradicts a statement of the stem instead of bringing its own content.",
        ]
      : []),
    ...(experiments.includes("plausibility")
      ? [
          "   - contextualPlausibility: the option's own scenario is realistic in this context; unusual content is fine only when the stem's context justifies it.",
          "   - tenseCompatible: its tense and aspect fit the main clause's time frame.",
          "   - worldKnowledgeAloneEliminates: world knowledge alone rules it out, without reading how it connects to the main clause.",
        ]
      : []),
    ...(experiments.includes("lexical") ? ["   - superficialRewrite: the option rearranges the stem's own words or phrases rather than saying something new."] : []),
    ...(more.lines ?? []),
  ];
  return `${distractorJudgeHeader}
You are an independent, strict reviewer of ONE wrong option of an original YDS sentence-completion item. Another model wrote it. A wrong option that a good candidate could defend ruins the item, so when in doubt, say so.
${reasonsFirst ? "\nWrite reasons FIRST (at most four short points in English, ≤20 words each), then the scores, then the final booleans. The booleans must agree with your reasons: if your reasons say the completed sentence is illogical or self-contradictory, a competent candidate would not select it. No filler.\n" : ""}
Work in this order:
1. Read the COMPLETED SENTENCE on its own, as if nothing else existed. standaloneSentenceAcceptable = true when it is grammatical AND the relation its connector sets up is coherent and believable given ordinary world knowledge.
2. Then read the rest and score, each 0..1:
   - grammaticalValidity: the option is grammatical in the blank.
   - semanticCoherence: the option's own clause is natural, meaningful English (not gibberish).
   - unintendedCorrectness: chance that the option is in fact a correct completion.
   - answerClauseReuse: it repeats the correct option's clause behind another connector.
   - ambiguity: chance that a careful reader cannot tell whether it is right or wrong.
   - obviouslyWrong: chance that even a weak candidate dismisses it at a glance, without reading the logic: absurd or off-topic content, an obviously impossible event, or a plain negation of the main clause.
${extra.length ? `${extra.join("\n")}\n` : ""}3. competentCandidateCouldSelect: "Could a competent YDS candidate reasonably select this option as correct?"
4. confidence: how sure you are of your judgement overall.
Grammatical and coherent is NOT enough for a good wrong option: it must also clearly fail as a completed sentence. A good wrong option fails on careful reading yet still tempts a weak candidate.
${judgesRelation ? "Which connector the option opens with is checked elsewhere; judge only whether its relation holds (relationHolds), not how the writer meant it to fail." : "Which connector the option opens with and which relation it sets up are checked elsewhere; do not judge them."}${reasonsFirst ? "" : "\nreasons: at most four short points in English (≤20 words each); no filler."}`;
}

export function distractorJudgeUserFor(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; text: string; experiments: ExperimentSet; lexical?: LexicalDiagnostics }): string {
  const { dspec, skeleton, text, experiments } = input;
  return [
    `COMPLETED SENTENCE: ${completeStem(skeleton.stem, text)}`,
    "",
    `STEM: ${skeleton.stem}`,
    `INTENDED CORRECT OPTION: ${skeleton.correctAnswer}`,
    `OPTION UNDER REVIEW: ${text}`,
    ...(experiments.includes("plausibility")
      ? ["", `REQUIRED OF EVERY WRONG OPTION: a realistic scenario in this context${dspec.temporalConstraint ? "; tense and aspect compatible with the main clause" : ""}; not ruled out by world knowledge alone.`]
      : []),
    ...(experiments.includes("lexical") && input.lexical ? ["", lexicalNote(input.lexical)] : []),
  ].join("\n");
}

export const distractorJudgeResponseSchemaFor = (experiments: ExperimentSet) => responseSchema(distractorJudgeReportFor(experiments));
