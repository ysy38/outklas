import { generatedQuestionCandidate } from "@/modules/factory/candidate";
import { connectorSurface } from "@/modules/factory/spec-engine";
import type { QuestionSpec } from "@/modules/factory/spec";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema, withRefEnums } from "./schema";

export const generatorPromptVersion = "generator.v2";

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
- The correct option expresses CONCESSION: it states a fact that would normally lead one to expect the opposite of what the main clause says (expectation vs. actual outcome). It opens with one of the allowed concessive connectors in the spec.
- The contrast distractor opens with a contrast connector and sets two different subjects or groups side by side (a parallel comparison). It must not read as a concession; it fails because the stem needs an unexpected outcome, not a side-by-side comparison.
- The cause distractor gives a reason that would lead to the OPPOSITE of the main clause (it is on-topic, but "main clause because X" is illogical). Never give a reason that genuinely explains the main clause.
- The condition distractor states a condition that makes no sense as a restriction on the main clause (for example a past, settled fact or an unrelated action).
- The sequence distractor uses a time connector with an event that could not sensibly come before or after the main clause.
- Wrong options must not contain any word listed in vocabularyConstraints.forbiddenInDistractors, anywhere in the option.
- Self-check before answering: read the full sentence with each wrong option in the blank. If any wrong option produces a true, sensible sentence, rewrite that option until it clearly fails. Then confirm that only the correct option makes sense.`,
};

const outputRules = `OUTPUT
Return JSON only, matching the response schema:
- question.stem and question.options A–E as specified above.
- correctOption: exactly answerConstraints.correctOption from the spec.
- explanation: in Turkish, addressing the learner as "sen", natural and friendly, at most the spec's maxWords. Name the correct connector in English exactly as written in the option, say which relation it builds and why the outcome is unexpected, and say in one short sentence why each wrong option fails.
- distractorRationales: one entry for each wrong option letter; distractorType and misconception copied from the matching distractorPlan entry; whyPlausible and whyWrong in Turkish, at most 25 words each.
- targetConcept: the spec's primaryConcept. targetSkill: the spec's targetSkill.
- metadata.connectorByOption: the connector each option opens with, in lowercase, exactly as written. metadata.selfRatedDifficulty: your honest estimate.
You may not change the spec, move the answer, add taxonomy labels, or add fields.`;

export function generatorSystem(spec: QuestionSpec): string {
  const type = typeRules[spec.questionType];
  const family = familyRules[spec.questionFamily];
  if (!type || !family) throw new Error(`generator.v2 has no rules for ${spec.questionType} / ${spec.questionFamily}`);
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
