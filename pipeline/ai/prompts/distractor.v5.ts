import type { LexicalDiagnostics } from "@/modules/factory/distractor";
import type { DistractorSpec, EventRelation } from "@/modules/factory/distractor-spec";
import type { ExperimentSet } from "@/modules/factory/experiments";
import type { QuestionSkeleton } from "@/modules/factory/skeleton";
import { contentWords } from "@/modules/factory/validator";
import type { NodeRef } from "@/modules/knowledge/graph";
import { distractorSystem, distractorUser } from "./distractor.v4";

/** distractor.v4 plus one section per experiment; with no experiments the factory keeps using distractor.v4. */
export const distractorExperimentalPromptVersion = "distractor.v5";

export const eventText: Record<EventRelation, string> = {
  compatible_with_outcome: "is compatible with the main clause's outcome, so there is nothing to contrast",
  works_against_outcome: "would make the main clause's outcome less likely",
  setback_right_before_outcome: "is a setback placed right before the outcome, as if it had triggered it",
  does_not_follow_from_outcome: "does not follow from the main clause",
  unrelated_purpose: "is a purpose the main clause's action could not serve",
  contradicts_outcome: "points against the main clause instead of matching it",
  does_not_illustrate: "is an example that does not illustrate the main clause",
  parallel_to_outcome: "is a parallel fact that neither explains nor hinders the main clause's outcome, so there is nothing to contrast",
  purpose_against_outcome: "is a purpose that the main clause's action would work against",
};

export function distractorSystemFor(experiments: ExperimentSet): string {
  const rules = [
    ...(experiments.includes("contrast") ? ['- never negate, reverse or contradict a statement the stem makes ("rose" → "fell") and never restate it: a wrong option brings its own proposition.'] : []),
    ...(experiments.includes("plausibility") ? ["- describe a scenario a reader could meet in real life in this context, in a tense that fits the main clause; world knowledge alone must never be enough to reject it."] : []),
    ...(experiments.includes("lexical") ? ["- use your own words: borrow at most a few of the stem's content words, copy no phrase from it, and never just swap in synonyms."] : []),
  ];
  return rules.length ? `${distractorSystem}\n\nAlso:\n${rules.join("\n")}` : distractorSystem;
}

export function distractorUserFor(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; usedConnectors: NodeRef[]; feedback: string[]; experiments: ExperimentSet; failureText?: string }): string {
  const { dspec, skeleton, experiments } = input;
  const lines = [distractorUser({ ...input, feedback: [] }, input.failureText)];
  if (experiments.includes("contrast")) lines.push("- Stem relation: do not negate, reverse or restate any statement of the stem.");
  if (experiments.includes("plausibility")) {
    lines.push("", "SCENARIO AND TIME", "- Scenario: realistic in this context; world knowledge alone must not rule it out; unusual content only when the stem's context justifies it.");
    if (dspec.temporalConstraint) {
      lines.push("- Tense and aspect: compatible with the main clause, in the same time frame.");
      if (dspec.temporalConstraint.eventRelation) lines.push(`- The option's event ${eventText[dspec.temporalConstraint.eventRelation]}.`);
    }
  }
  if (experiments.includes("lexical")) {
    const stemWords = [...contentWords(skeleton.stem.replaceAll("----", " "))];
    lines.push("", "WORDING", `- The stem already uses: ${stemWords.join(", ")}. Reuse at most ${dspec.lexicalConstraint.stemEchoAt - 1} of them and copy no phrase of two or more words from the stem; say something new rather than swapping in synonyms.`);
  }
  if (input.feedback.length) lines.push("", "YOUR PREVIOUS ATTEMPTS FOR THIS OPTION WERE REJECTED", ...input.feedback.map((line) => `- ${line}`), "Write a different option that avoids these problems.");
  return lines.join("\n");
}

/** Shown to the judge under the lexical experiment: measured overlap, for information, not a verdict. */
export const lexicalNote = (lexical: LexicalDiagnostics) =>
  `LEXICAL DIAGNOSTICS (computed): shares ${lexical.stemContentWords.length} content word(s) with the stem${lexical.stemContentWords.length ? ` (${lexical.stemContentWords.join(", ")})` : ""}; longest phrase repeated from the stem: ${lexical.longestStemPhrase ? `"${lexical.longestStemPhrase}"` : "none"}.`;
