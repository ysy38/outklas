import type { LexicalDiagnostics } from "@/modules/factory/distractor";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import { revisionExperiments, type ExperimentSet } from "@/modules/factory/experiments";
import type { QuestionSkeleton } from "@/modules/factory/skeleton";
import { distractorJudgeSystemFor, distractorJudgeUserFor } from "./distractor-judge.v4";
import { frameText, targetRelationText } from "./distractor.v6";

/** distractor-judge.v4 plus the second-round dimensions; sets without a second-round experiment keep using v4 or v3. */
export const distractorJudgeRevisionPromptVersion = "distractor-judge.v5";

/** overlap replaces lexical's stricter wording rule, so the two are never rendered together. */
const firstRound = (experiments: ExperimentSet) =>
  experiments.filter((experiment) => !revisionExperiments.includes(experiment) && !(experiment === "lexical" && experiments.includes("overlap")));

/**
 * Semantic checks only. Connector family, punctuation and tense rules that a rule can decide are validated
 * deterministically before this call; the judge answers what needs reading: whether the completed sentence reads as
 * the item's target relation, whether any plausible reading makes it correct, and whether the option's event can
 * stand in its relation to the main clause.
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
    ...(experiments.includes("compatibility")
      ? [
          "   - contextCompatible: the option's event can stand in the stated relation to the main clause's kind of event in its time frame: a condition the outcome could depend on (not a completed past event offered as a condition for a settled past result, unless the sentence supports that reading), a purpose someone involved could have had, or two events that can happen in the stated order. false when this fails, even if the clause itself is grammatical.",
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
