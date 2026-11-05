import type { LexicalDiagnostics } from "@/modules/factory/distractor";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import { revisionExperiments, type ExperimentSet } from "@/modules/factory/experiments";
import type { QuestionSkeleton } from "@/modules/factory/skeleton";
import { distractorJudgeSystemFor, distractorJudgeUserFor } from "./distractor-judge.v4";
import { frameText, targetRelationText } from "./distractor.v6";

/**
 * distractor-judge.v4 plus the second-round dimensions; sets without a second-round experiment keep using v4 or v3.
 * v6 drops v5's contextCompatible question: asking whether a wrong option's event "can stand in the stated relation"
 * asks whether the relation holds, which a wrong option must not, so it rejected options that failed as intended.
 * Time-frame fit stays with the deterministic tense rules; the plausibility experiment's tenseCompatible is still
 * asked, but under compatibility a "false" only sends the option to a human (see distractorDecision).
 */
export const distractorJudgeRevisionPromptVersion = "distractor-judge.v6";

/** overlap replaces lexical's stricter wording rule, so the two are never rendered together. */
const firstRound = (experiments: ExperimentSet) =>
  experiments.filter((experiment) => !revisionExperiments.includes(experiment) && !(experiment === "lexical" && experiments.includes("overlap")));

/**
 * Semantic checks only. Connector family, punctuation and tense rules that a rule can decide are validated
 * deterministically before this call; the judge answers what needs reading: whether the completed sentence reads as
 * the item's target relation and whether any plausible reading makes it correct.
 */
export function distractorJudgeRevisionSystem(experiments: ExperimentSet): string {
  const relation = experiments.includes("relation");
  const lines = [
    ...(relation && !experiments.includes("contrast")
      ? ["   - relationHolds: ignore how the option was meant to fail. Does the relation its connector signals (contrast, cause, condition, time …) actually hold between the option and the main clause? 1 = it holds, so the sentence could be read as correct."]
      : []),
    ...(relation
      ? [
          "   - targetRelationReading: read naturally, does the completed sentence express the ITEM'S TARGET RELATION (given below), whatever connector it uses? For concession: the option sets up an expectation that the main clause breaks. 1 = it does, so it competes with the key.",
          '   - alternativeReadingCorrect: is there a plausible interpretation under which the completed sentence is correct: another sense of the connector ("whereas" as "given that", "while" as "although", "as long as" as "since", "so that" as a result) or a looser reading of the content? 1 = yes.',
        ]
      : []),
  ];
  return distractorJudgeSystemFor(firstRound(experiments), { lines, reasonsFirst: relation, judgesRelation: relation });
}

export function distractorJudgeRevisionUser(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; text: string; experiments: ExperimentSet; lexical?: LexicalDiagnostics }): string {
  const { dspec, experiments } = input;
  const lines = [distractorJudgeUserFor({ ...input, experiments: firstRound(experiments) })];
  if (experiments.includes("relation")) lines.push("", `ITEM TARGET RELATION: ${targetRelationText(dspec.relationConstraint.correctRelation)}`);
  if (experiments.includes("compatibility") && dspec.temporalConstraint?.mainClauseFrame) lines.push(`MAIN CLAUSE TIME FRAME (computed): ${frameText[dspec.temporalConstraint.mainClauseFrame]}`);
  return lines.join("\n");
}
