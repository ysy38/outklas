import { generatedDistractor } from "@/modules/factory/distractor";
import type { DistractorSpec, FailureMode } from "@/modules/factory/distractor-spec";
import type { QuestionSkeleton } from "@/modules/factory/skeleton";
import { connectorSurface } from "@/modules/factory/spec-engine";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const distractorPromptVersion = "distractor.v2";

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");
const quoted = (list: string[]) => list.map((word) => `"${word}"`).join(", ");

export const distractorHeader = "DISTRACTOR WRITER";

export const distractorSystem = `${distractorHeader}
You write ONE wrong option for an original YDS sentence-completion item. The stem and the correct option are fixed: you cannot change them and you do not write the other options.

Your option must:
- open with one of the allowed connectors and continue with a natural, grammatical, meaningful clause on the same topic as the stem;
- have its OWN content: never repeat the correct option's clause (or most of its words) behind a different connector;
- make the completed sentence false or illogical, in exactly the way the spec's failure mode describes, so that no competent candidate could defend it as correct. A wrong option that produces a true, sensible sentence is a second correct answer and ruins the item.

Before answering, write the completed sentence in your head and ask: "Would a careful editor accept this as a true, sensible statement?" If yes or maybe, change the option.

Return JSON only: {"text": "<the option>", "rationale": "<one short English sentence: why the completed sentence fails>"}.`;

/** Relation-level instructions per failure mode. */
const failureInstructions: Record<FailureMode, string> = {
  contrast_does_not_fit:
    "Use the contrast connector for a real contrast, but contrast the main clause with something that makes the completed sentence false or self-contradictory: for example, deny or reverse what the main clause states about the same subject. Never contrast with another group, place, period or species that genuinely differs: that makes a good, correct contrast sentence.",
  similarity_does_not_hold:
    "Use the similarity connector with a point that is not similar to the main clause or that contradicts it, so the comparison makes the completed sentence illogical.",
  reason_supports_opposite:
    'Give a reason that would make the main clause LESS likely (it argues for the opposite outcome). Test: if "<main clause> because <reason>" sounds like a sensible explanation, it is forbidden.',
  consequence_does_not_follow: "State a consequence that does not follow from the main clause, or that contradicts it.",
  condition_cannot_restrict:
    "State a condition that cannot restrict the main clause: for a settled past fact or a general truth, a future or hypothetical action that could not have caused it. Never a realistic precondition of the main clause.",
  impossible_time_order:
    'Use a time connector with an event that cannot stand in that time relation to the main clause: an event that only makes sense after it placed with "before", or an event that would have prevented it. Never an earlier event that explains or enables the main clause.',
  purpose_does_not_fit: "State a purpose that the action in the main clause could not serve.",
  addition_contradicts: "Add a point that contradicts the main clause instead of supporting it.",
  example_does_not_illustrate: "Give an example that does not illustrate the main clause.",
  logically_incompatible: "Make the completed sentence logically impossible while every word stays on topic.",
  meaning_does_not_fit: "Keep the form right but make the meaning clash with the stem.",
  collocation_breaks: "Use a word combination that native writers would not use in this context.",
  grammatical_form_breaks: "Make the option grammatically impossible in the blank while it stays on topic.",
};

export function distractorUser(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; usedConnectors: NodeRef[]; feedback: string[] }): string {
  const { dspec, skeleton } = input;
  const allowed = dspec.relationConstraint.connectors.filter((connector) => !input.usedConnectors.includes(connector));
  const lines = [
    `STEM: ${skeleton.stem}`,
    `CORRECT OPTION (fixed, do not reuse its clause): ${skeleton.correctAnswer}`,
    "",
    "DISTRACTOR SPEC",
    `- Role: a wrong option expressing ${name(dspec.relationConstraint.targetRelation)} where the item needs ${name(dspec.relationConstraint.correctRelation)}.`,
    `- Open with one of: ${quoted((allowed.length ? allowed : dspec.relationConstraint.connectors).map(connectorSurface))}.`,
    `- How it must fail: ${failureInstructions[dspec.semanticConstraint.failureMode]}`,
    ...(dspec.targetMisconception ? [`- It should tempt a learner who has this misconception: ${name(dspec.targetMisconception)}.`] : []),
    `- ${dspec.lexicalConstraint.words.min}–${dspec.lexicalConstraint.words.max} words; ${dspec.grammarConstraint.capitalised ? "starts with a capital letter" : "starts with a lowercase letter"}; no final punctuation.`,
    `- Never use: ${quoted(dspec.lexicalConstraint.forbiddenWords)}.`,
  ];
  if (input.feedback.length) lines.push("", "YOUR PREVIOUS ATTEMPTS FOR THIS OPTION WERE REJECTED", ...input.feedback.map((line) => `- ${line}`), "Write a different option that avoids these problems.");
  return lines.join("\n");
}

export const distractorResponseSchema = () => responseSchema(generatedDistractor);
