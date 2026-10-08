import { generatedQuestionCandidate } from "@/modules/factory/candidate";
import { connectorSurface } from "@/modules/factory/spec-engine";
import type { QuestionSpec } from "@/modules/factory/spec";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema, withRefEnums } from "./schema";

export const generatorPromptVersion = "generator.v3";

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");
const words = (list: NodeRef[]) => list.map((value) => `"${connectorSurface(value)}"`).join(", ");

/* Static layers: identical for every spec of the same type and family, so they sit in the system instruction. */

const role = `ROLE
You are a senior item writer for the Turkish YDS English exam (ÖSYM format). You write one entirely original multiple-choice item from a QuestionSpec. You work only from the spec and the rules below: you have not been shown any real exam item and you must not recall, reproduce, paraphrase, translate or imitate one.`;

const ydsRules = `YDS RULES
- Five options, A to E, exactly one defensible correct answer; every wrong option fails for one clear, principled reason.
- Academic register on general-interest academic topics (science, health, history, society, education). No trivia, no culture-specific knowledge, no named real people, no current events, no brand names, no statistics a candidate would need to know.
- Standard written English (British or American, consistent), grammatically flawless, natural, never telegraphic.
- No accidental clues: the correct option must not be the longest or the only one echoing words of the stem, and the options must be parallel in length and structure.
- Never use the words "correct", "answer", "option" or option letters inside the item text.`;

const typeRules: Record<string, string> = {
  "question_type:sentence_completion": `QUESTION TYPE RULES: sentence completion
- The stem is ONE sentence with exactly one blank written as ---- (four hyphens). The blank stands for a whole clause.
- Blank at the end: "<main clause> ----." and every option starts with a lowercase connector and has no final full stop.
- Blank at the start: "----, <main clause>." and every option starts with a capitalised connector and has no final comma or full stop.
- Each option is one clause opened by its connector and continuing with a finite clause (subject + finite verb), so that every option is grammatical in the blank. Candidates choose by the logical relation AND the content.
- Every option has its OWN content. Never reuse the correct option's clause (or most of its words) behind another connector: an item where only the connector changes is a grammar item, not sentence completion.
- All five options use the same capitalisation pattern for the blank position.`,
};

const familyRules: Record<string, string> = {
  "sentence_completion.concession": `FAMILY RULES: concession in sentence completion
- The correct option expresses CONCESSION: it states a fact that would clearly and directly lead a reader to expect the OPPOSITE of the main clause (an obstacle, a disadvantage, a reason against). The stronger the expected-vs-actual clash, the better. It opens with one of the allowed concessive connectors in the spec.
- Design principle for every wrong option: it is ON TOPIC (same scene, same vocabulary field) so that a weak candidate is tempted, but the full sentence it produces is FALSE or INCOHERENT as a statement. A wrong option that yields a true, sensible sentence is a second correct answer and ruins the item.
- The contrast distractor opens with a contrast connector. It is about the SAME subject as the main clause and states something that points in the SAME direction as the main clause (or is fully compatible with it), so that there is nothing to contrast. NEVER introduce a different group, place, period or species that genuinely differs: "X happened whereas Y (another group) did the opposite" is a perfectly good sentence and therefore forbidden.
- The cause distractor opens with a cause connector and gives a reason that would make the main clause LESS likely (it supports the opposite outcome). Test it: if "<main clause> because <reason>" sounds like a sensible explanation, it is forbidden. Never give a reason that genuinely explains, enables or is neutral to the main clause.
- The condition distractor opens with a condition connector and is grammatically or logically unable to restrict the main clause: for a main clause about a settled past or a general fact, use a condition about a future or hypothetical action that cannot have caused it. It must not describe a realistic precondition of the main clause.
- The sequence distractor opens with a time connector and describes an event that cannot stand in that time relation to the main clause: for example an event that only makes sense AFTER the main clause placed with "before", or an event that would have prevented the main clause. It must never describe an earlier event that explains or enables the main clause (for example "after they improved X, Y succeeded" is a sensible sentence and forbidden).
- Wrong options must not contain any word listed in vocabularyConstraints.forbiddenInDistractors, anywhere in the option.
- Self-check before answering: write out the full sentence for each wrong option and ask "Would a careful editor accept this as a true, sensible statement?" If the answer is yes or maybe for ANY wrong option, rewrite that option until the answer is clearly no. Then confirm that the correct sentence is clearly sensible and that it is the only one.`,
};

const outputRules = `OUTPUT
Return JSON only, matching the response schema:
- question.stem and question.options A–E as specified above.
- correctOption: exactly answerConstraints.correctOption from the spec.
- explanation: in natural, correct Turkish, addressing the learner as "sen", at most the spec's maxWords. No greeting, no "Merhaba", no exclamation marks. Name the correct connector in English exactly as written in the option. Call the relation "ödünleme (concession)", never "taviz"; contrast is "karşıtlık (contrast)". Say what the reader would normally expect and why the main clause is the unexpected outcome. Then one short sentence per wrong option saying which relation it builds and why the resulting sentence is false or illogical.
- distractorRationales: one entry for each wrong option letter; distractorType and misconception copied from the matching distractorPlan entry; whyPlausible and whyWrong in natural Turkish, at most 25 words each.
- targetConcept: the spec's primaryConcept. targetSkill: the spec's targetSkill.
- metadata.connectorByOption: the connector each option opens with, in lowercase, exactly as written. metadata.selfRatedDifficulty: your honest estimate.
You may not change the spec, move the answer, add taxonomy labels, or add fields.`;

export function generatorSystem(spec: QuestionSpec): string {
  const type = typeRules[spec.questionType];
  const family = familyRules[spec.questionFamily];
  if (!type || !family) throw new Error(`${generatorPromptVersion} has no rules for ${spec.questionType} / ${spec.questionFamily}`);
  return [role, ydsRules, type, family, outputRules].join("\n\n");
}

/* Dynamic layers: rendered from the spec. */

export function generatorUser(spec: QuestionSpec): string {
  const correct = spec.answerConstraints.correctOption;
  const target = `PEDAGOGICAL TARGET
Concept: ${name(spec.primaryConcept)} (${spec.primaryConcept}); grammar pattern: ${name(spec.grammarPattern)}; skill: ${name(spec.targetSkill)}; cognitive skill: ${name(spec.cognitiveSkill)}.
Misconception the item probes: ${name(spec.targetMisconception)}. Difficulty: ${spec.difficulty.band} (CEFR ${spec.difficulty.cefr}, target ${spec.difficulty.target} on a 0–1 scale for a typical YDS candidate).`;
  const slots = [
    `${correct}) CORRECT — opens with one of ${words(spec.answerConstraints.connectors)}`,
    ...spec.distractorPlan.map((slot) => `${slot.option}) ${name(slot.expresses)} distractor (${slot.distractorType}) — opens with one of ${words(slot.connectors)}${slot.misconception ? `; probes ${slot.misconception}` : ""}`),
  ].sort();
  const constraints = `GENERATION CONSTRAINTS
- Topic area: ${spec.contextConstraints.domain.replaceAll("_", " ")}. Invent the situation; do not describe a real study or a real person.
- Blank position: ${spec.contextConstraints.blankPosition}. Stem ${spec.contextConstraints.stemWords.min}–${spec.contextConstraints.stemWords.max} words; each option ${spec.contextConstraints.optionWords.min}–${spec.contextConstraints.optionWords.max} words, all options within a few words of each other.
- Vocabulary up to CEFR ${spec.vocabularyConstraints.cefrCeiling}, academic register. Never in a wrong option: ${spec.vocabularyConstraints.forbiddenInDistractors.map((word) => `"${word}"`).join(", ")}.
- Option layout (letter → role):
${slots.map((line) => `  ${line}`).join("\n")}
- Exactly one option may be defended as correct. Use five different connectors.`;
  const specForModel = { ...spec, evidenceReferences: undefined };
  return [target, `QUESTION SPEC\n${JSON.stringify(specForModel, null, 1)}`, constraints].join("\n\n");
}

export const generatorResponseSchema = () =>
  withRefEnums(responseSchema(generatedQuestionCandidate), {
    "distractorRationales.[].distractorType": "distractor_type",
    "distractorRationales.[].misconception": "misconception",
    targetConcept: "primary_concept",
    targetSkill: "skill_primary",
  });
