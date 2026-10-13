import { optionLabels } from "@/modules/analysis/contract";
import type { DistractorSpec } from "@/modules/factory/distractor-spec";
import { itemExplanation, type ItemCore } from "@/modules/factory/explanation";
import type { QuestionSpec } from "@/modules/factory/spec";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const explanationPromptVersion = "explanation.v2";

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");

export const explanationHeader = "EXPLANATION WRITER";

export const explanationSystem = `${explanationHeader}
You explain one finished YDS sentence-completion item to a Turkish learner. The item and its key are final: do not change, question or rewrite them.

Write in natural, correct Turkish, addressing the learner as "sen". No greeting, no "Merhaba", no exclamation marks. Name connectors in English exactly as written in the options. Use the product's terms: concession is "beklenmedik sonuç (-e rağmen)" and contrast is "zıtlık"; never "taviz" or "ödünleme".

Return JSON only:
- explanation: why the key is right: what the reader would normally expect and why the main clause is the unexpected outcome; then one short sentence per wrong option saying which relation it builds and why the completed sentence is false or illogical. At most the given word limit.
- distractorRationales: one entry per wrong option letter: whyPlausible (why a learner might pick it) and whyWrong, each at most 25 words.
- transferNote: one or two sentences on how to recognise this relation in another item.
- estimatedDifficulty: your estimate for a typical YDS candidate.`;

export function explanationUser(input: { spec: QuestionSpec; core: ItemCore; dspecs: DistractorSpec[]; feedback: string[] }): string {
  const { spec, core, dspecs } = input;
  const lines = [
    "ITEM",
    core.stem,
    ...optionLabels.map((label) => `${label}) ${core.options[label]}`),
    `KEY: ${core.correctOption}`,
    "",
    `TARGET: ${name(spec.primaryConcept)}; misconception probed: ${name(spec.targetMisconception)}; word limit ${spec.explanationRequirements.maxWords}.`,
    "WRONG OPTION ROLES",
    ...dspecs.map((dspec) => `${dspec.option}: ${name(dspec.relationConstraint.targetRelation)}, fails by ${dspec.semanticConstraint.failureMode.replaceAll("_", " ")}${dspec.targetMisconception ? `, targets ${name(dspec.targetMisconception)}` : ""}`),
  ];
  if (input.feedback.length) lines.push("", "YOUR PREVIOUS EXPLANATION WAS REJECTED", ...input.feedback.map((line) => `- ${line}`));
  return lines.join("\n");
}

export const explanationResponseSchema = () => responseSchema(itemExplanation);
