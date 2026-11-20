import { words } from "@/modules/analysis/surface";
import { generatedDistractor } from "@/modules/factory/distractor";
import type { DistractorSpec, FailureMode } from "@/modules/factory/distractor-spec";
import type { DifficultyStrategy, DistractorBlueprint, QuestionSkeleton } from "@/modules/factory/skeleton";
import { connectorSurface } from "@/modules/factory/spec-engine";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const distractorPromptVersion = "distractor.v4";

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");
const quoted = (list: string[]) => list.map((word) => `"${word}"`).join(", ");

export const distractorHeader = "DISTRACTOR WRITER";

export const distractorSystem = `${distractorHeader}
You write ONE wrong option for an original YDS sentence-completion item. The stem and the correct option are fixed: you cannot change them and you do not write the other options.

Your option must:
- open with one of the allowed connectors and continue with a natural, grammatical, meaningful clause on the same topic as the stem;
- have its OWN content: never repeat the correct option's clause (or most of its words) behind a different connector;
- make the completed sentence false or illogical, in exactly the way the spec's failure mode describes, so that no competent candidate could defend it as correct. A wrong option that produces a true, sensible sentence is a second correct answer and ruins the item. A second concession is the same failure: another real obstacle, or the correct option's obstacle in different words, still leaves a defensible concession. Topic similarity is not correctness, and a weaker restatement of the key is not a wrong option;
- still tempt: read on its own, the clause is a realistic, on-topic statement a candidate could believe. It fails only through how it connects to the main clause, never through absurd content (another planet, an unrelated institution, an obviously impossible event) or by simply negating the main clause.

Before answering, write the completed sentence in your head and ask: "Would a careful editor accept this as a true, sensible statement?" If yes or maybe, change the option. Also ask: "If this connector were because, would the clause explain the outcome?" If yes, it is a second answer. Do not write the true motive, the preparation that produced the result, or the demand that prompted it.

Return JSON only: {"text": "<the option>", "rationale": "<one short English sentence: why the completed sentence fails>"}.`;

/** Relation-level instructions per failure mode. */
export const failureInstructions: Record<FailureMode, string> = {
  no_broken_expectation:
    "Use the concession connector with a realistic, on-topic clause that supports the main clause's outcome or is neutral to it, so no expectation is broken and the concession makes the sentence illogical.",
  no_real_opposition:
    "Use the contrast connector with an on-topic clause about the same subject that neither explains the outcome nor states a real opposite. A fact that would justify the main clause, such as the true reason, the demand that prompted it, or the preparation that produced it, is forbidden: readers ignore the connector and take it as the answer. Never bring in another group, place, period or species that genuinely differs.",
  similarity_does_not_hold:
    "Use the similarity connector with a point that is not similar to the main clause or that contradicts it, so the comparison makes the completed sentence illogical.",
  reason_supports_opposite:
    'Give a reason that would make the main clause LESS likely (it argues for the opposite outcome). Test: if "<main clause> because <reason>" sounds like a sensible explanation, it is forbidden.',
  consequence_does_not_follow: "State a consequence that does not follow from the main clause, or that contradicts it.",
  condition_cannot_restrict:
    "State a realistic, on-topic condition, in a tense that fits the main clause (a past condition for a past main clause), that would make the outcome LESS likely, so the sentence claims the outcome depended on something that works against it. The clause needs its own subject and finite verb. Never a future event, a fragment, an unrelated matter, or a realistic precondition that makes the sentence sensible.",
  impossible_time_order:
    'Use the time connector with a realistic, on-topic event, in a tense that fits the main clause, whose time relation makes the sentence illogical: typically a setback placed right before the outcome (with "as soon as", "after", "once" and the like) as if the setback had triggered it. Never an event that is plainly impossible (the thing did not exist yet), a restatement of the main clause, or an earlier event that explains or enables the main clause.',
  purpose_does_not_fit: "State a purpose that the action in the main clause could not serve.",
  addition_contradicts: "Add a point that contradicts the main clause instead of supporting it.",
  example_does_not_illustrate: "Give an example that does not illustrate the main clause.",
  logically_incompatible: "Make the completed sentence logically impossible while every word stays on topic.",
  meaning_does_not_fit: "Keep the form right but make the meaning clash with the stem.",
  collocation_breaks: "Use a word combination that native writers would not use in this context.",
  grammatical_form_breaks: "Make the option grammatically impossible in the blank while it stays on topic.",
};

/** `failureText` replaces the failure-mode instruction for later prompt versions; without it the output is distractor.v4. */
export function distractorUser(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; usedConnectors: NodeRef[]; feedback: string[]; strategy?: DifficultyStrategy | null; blueprints?: DistractorBlueprint[] }, failureText?: string): string {
  const { dspec, skeleton } = input;
  const nearMiss = input.strategy === "relational_inference" && dspec.semanticConstraint.failureMode === "no_broken_expectation";
  const allowed = dspec.relationConstraint.connectors.filter((connector) => !input.usedConnectors.includes(connector));
  const lines = [
    `STEM: ${skeleton.stem}`,
    `CORRECT OPTION (fixed, do not reuse its clause): ${skeleton.correctAnswer}`,
    "",
    "DISTRACTOR SPEC",
    nearMiss
      ? "- Role: a near-miss when one is natural for this stem, otherwise a plausible contrast. It is wrong only once it is joined to the stem."
      : `- Role: a wrong option expressing ${name(dspec.relationConstraint.targetRelation)} where the item needs ${name(dspec.relationConstraint.correctRelation)}.`,
    `- Open with one of: ${quoted((allowed.length ? allowed : dspec.relationConstraint.connectors).map(connectorSurface))}.`,
    `- How it must fail: ${failureText ?? (nearMiss ? "State a realistic, on-topic obstacle or limit. Joined to the stem, it must not be a concession a careful reader could defend: the obstacle does not make the outcome unexpected. If that near-miss is not natural, write an on-topic contrast that fails for the same reason. Choose the connector the clause needs. A concession connector is not required, and it is not by itself a second answer." : failureInstructions[dspec.semanticConstraint.failureMode])}`,
    ...(dspec.targetMisconception ? [`- It should tempt a learner who has this misconception: ${name(dspec.targetMisconception)}.`] : []),
    `- ${words(skeleton.correctAnswer).length} words, within two of the correct option. A much shorter option is rejected. ${dspec.grammarConstraint.capitalised ? "Starts with a capital letter" : "Starts with a lowercase letter"}; no final punctuation.`,
    `- Never use: ${quoted(dspec.lexicalConstraint.forbiddenWords)}.`,
  ];
  if (input.strategy === "relational_inference") {
    lines.push(
      "",
      "RELATIONAL DISTRACTOR",
      "The clause on its own must be natural academic English and about this stem's subject. It becomes wrong in the full sentence, for a reason you can name. Do not make it wrong by a grammar error, an obvious tense clash, an absurd event, an off-topic subject, or a blatant mismatch.",
      "A concession connector is allowed when the near-miss is natural. It is not required on this option, and the four wrong options must not all open with it. while and whereas are judged by the relation they form in the full sentence.",
      'Also return "whyPlausible": one English sentence saying why a learner might choose this clause before seeing how it fails in the full sentence.',
    );
  }
  const blueprints = input.blueprints ?? input.skeleton.distractorBlueprints;
  const mine = blueprints?.find((blueprint) => blueprint.option === dspec.option);
  if (mine) {
    lines.push(
      "",
      "PLANNED OPTION",
      "The proposition and its failure were decided before this clause. Write the proposition. Do not invent a new reason after the sentence.",
      ...(mine.actor ? [`Actor: ${mine.actor}`] : []),
      ...(mine.time ? [`Time: ${mine.time}`] : []),
      ...(mine.scope ? [`Scope: ${mine.scope}`] : []),
      `Proposition: ${mine.proposition}`,
      `Why a learner might choose it: ${mine.whyPlausible}`,
      `Stem evidence that eliminates it: ${mine.stemEvidenceAnchor}`,
      `Failure mechanism: ${mine.failureMechanism}`,
      `Why the full sentence is wrong: ${mine.decisiveFailureReason}`,
      `The miss is in the ${mine.failureAnchor}.`,
      "Keep every actor, time, or scope this plan states, as a meaning rather than a word-for-word copy. A natural synonym or a grammatical rewrite is acceptable. Omitting a stated time, actor, or scope is not. A field this plan does not state is not part of the proposition. Negation, a reversed result, or a different event is not.",
      "The clause fails because of the stem evidence above. The student does not see the correct option, so do not use it to make the clause wrong.",
      "Open with a connector from the allowed list. A different connector is not the reason the option is wrong.",
    );
  }
  const others = blueprints?.filter((blueprint) => blueprint.option !== dspec.option) ?? [];
  if (others.length) {
    lines.push("", "OTHER PLANS IN THIS SET", "Do not restate these propositions.", ...others.map((blueprint) => `- ${blueprint.option} (${blueprint.relationFamily}): ${blueprint.proposition}`));
  }
  if (input.feedback.length) lines.push("", "YOUR PREVIOUS ATTEMPTS FOR THIS OPTION WERE REJECTED", ...input.feedback.map((line) => `- ${line}`), "Write a different option that avoids these problems.");
  return lines.join("\n");
}

export const distractorResponseSchema = () => responseSchema(generatedDistractor);
