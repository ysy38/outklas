import { assignedStrategy, distractorPlanOutput, questionSkeleton, relationalPlannerOutput, type DifficultyStrategy, type QuestionSkeleton } from "@/modules/factory/skeleton";
import { relationConnectors } from "@/modules/factory/families";
import { connectorSurface } from "@/modules/factory/spec-engine";
import type { QuestionSpec } from "@/modules/factory/spec";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import type { ProductionSequence } from "../config";
import { responseSchema } from "./schema";

export const skeletonPromptVersion = "skeleton.v2";

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");
const quoted = (list: string[]) => list.map((word) => `"${word}"`).join(", ");

function bandNote(band: QuestionSpec["difficulty"]["band"]): string {
  if (band === "easy") return "EASY: B1 and one plain clause, with no embedded clause and only words a B1 reader knows. The obstacle is explicit. An impossible result is not a concession.";
  if (band === "hard")
    return `HARD: C1. Write one natural academic sentence for this situation, the way a human exam setter would. The grammar test is a check on that sentence, not a frame to fill in.
The user message assigns one difficulty strategy. Follow that strategy. Do not use the other one.
lexical_pivot: one academic verb, adjective, or abstract noun carries the concession. curtail, undermine, exacerbate, impede, susceptible, and volatility are the right weight. Do not use hypoxic, bioturbated, hygroscopic, dysarthria, or aquifer. Do not put severely, critically, completely, fatally, or destructively next to the word. Replace that word with a plain verb such as affect. The concession must become clearly weaker. The sentence does not have to become impossible. Do not restate the same obstacle in plainer words beside the target word.
relational_inference: the reader has to connect a real obstacle with an outcome that ordinary knowledge would not expect from it. Do not spell that link out. The academic word does not have to carry the concession alone. Do not add a clause that only repeats the obstacle, and do not stretch the sentence to make it look harder.
A month, a year, or a season is a time stamp and is rejected. Do not reuse one sentence frame.
FAIL when another word already states the obstacle: "an aquifer which has been severely depleted" (depleted is the obstacle, and severely is a leftover). FAIL when the load-bearing word is a corner noun. Invent a new situation. Do not copy the examples, and do not use hypoxic.
An impossible result is not a concession. Blank at the start: stem is "----, ..." and the option starts with a capital. Blank at the end: stem ends with " ----." and the option starts with a lowercase letter.`;
  return "MEDIUM: B2. Ordinary academic vocabulary a B2 reader knows, and no term that only a C1 reader would know. An impossible result is not a concession.";
}

/* Static layers. */

export const skeletonHeader = "SKELETON WRITER";

const role = `${skeletonHeader}
You write the skeleton of one entirely original item for the Turkish YDS English exam (ÖSYM format): the stem and its correct option only. Other writers add the wrong options and the explanation later, so you write neither. You have not been shown any real exam item and you must not recall, reproduce, paraphrase, translate or imitate one.`;

const ydsRules = `YDS RULES
- Academic register on general-interest academic topics. No trivia, no named real people, no current events, no brand names, no statistics a candidate would need to know.
- Standard written English, grammatically flawless, natural, never telegraphic.
- Sound like a human exam setter. One concrete situation, written for itself. Do not reuse a sentence frame. No adjective triads, no empty abstractions. Do not use: interplay, tapestry, landscape, delve, pivotal, robust, underscore, testament, shed light.`;

const typeRules: Record<string, string> = {
  "question_type:sentence_completion": `SENTENCE COMPLETION SKELETON
- The stem is ONE sentence with exactly one blank written as ---- (four hyphens). The blank stands for a whole clause.
- Blank at the end: "<Main clause> ----." Blank at the start: "----, <main clause>."
- The correct option is one clause: it opens with one of the allowed connectors, continues with a finite clause (subject + finite verb), and has no final punctuation. It starts with a capital letter only when the blank is at the start.
- The main clause must not contain the correct option's connector or any other word of the same relation.`,
};

const relationRules: Record<string, string> = {
  "discourse_relation:concession": `RELATION: concession
- The main clause states an outcome. The correct option states a fact that would clearly and directly lead a reader to expect the OPPOSITE outcome (an obstacle, a disadvantage, a reason against). The clash between expectation and outcome must be strong and obvious.
- The outcome must stay possible. An obstacle that makes the result impossible (a sharp image through an opaque mirror, a complete record of speakers who were already dead) is not a concession.
- Make the main clause specific enough that only this unexpected-outcome reading completes it well: avoid main clauses that almost any reason, condition or time clause could complete.`,
};

const output = `OUTPUT
Return JSON only: {"context": null, "stem": "...", "correctAnswer": "..."}. No explanation, no wrong options, no labels.`;

const relationalOutput = `OUTPUT
Decide the item plan before you write any English sentence. This call has two results. Return JSON only.
{"decision": "produce", "facts": ["...", "...", "..."], "scenario": {"domain": "...", "actor": "...", "obstacle": "...", "expected": "...", "outcome": "...", "relation": "..."}, "difficultyStrategy": "relational_inference", "targetLexeme": "...", "neutralSubstitute": "...", "distractorBlueprints": [], "stem": "...", "correctBlueprint": "...", "context": null, "missingDistractors": [], "declineReason": null}
{"decision": "decline", "facts": null, "scenario": null, "difficultyStrategy": null, "targetLexeme": null, "neutralSubstitute": null, "distractorBlueprints": [], "stem": "...", "correctBlueprint": "...", "context": null, "missingDistractors": [{"option": "A", "reason": "..."}], "declineReason": "..."}
produce: facts are the events that are true. scenario.obstacle is the one event reserved for the correct option. distractorBlueprints holds four different beliefs. The stem is the narrative written from those events. missingDistractors is empty. declineReason is null.
decline: a belief has no concrete failure a reader can see. Include the events, the stem you would have told, the beliefs you can defend, and one missingDistractors entry for every letter you cannot defend. A short stem is not a reason to decline. Do not return null plans. Do not invent a vague proposition to fill a slot.`;

const hardOutput = `OUTPUT
Decide the item plan before you write any English sentence. Then write the stem and the correct option so they carry that plan. Do not write the sentence and afterwards invent a plan that fits it.
Return JSON only, with the plan fields first:
{"difficultyStrategy": "lexical_pivot or relational_inference", "targetLexeme": "...", "neutralSubstitute": "...", "scenario": {"domain": "...", "actor": "...", "obstacle": "...", "expected": "...", "outcome": "...", "relation": "..."}, "context": null, "stem": "...", "correctAnswer": "..."}
No explanation and no wrong options.`;

const answerFirstOutput = `OUTPUT
Write the stem and the correct continuation together. They must be one natural, grammatical, and logically consistent sentence.
Return JSON only:
{"difficultyStrategy": "relational_inference", "targetLexeme": "...", "neutralSubstitute": "...", "scenario": {"domain": "...", "actor": "...", "obstacle": "...", "expected": "...", "outcome": "...", "relation": "..."}, "context": null, "stem": "...", "correctAnswer": "..."}
scenario.relation names how the correct continuation relates to the stem. Do not return wrong options. Do not return four wrong beliefs.`;

export function skeletonSystem(spec: QuestionSpec, sequence: ProductionSequence = "plan_first"): string {
  const type = typeRules[spec.questionType];
  const relation = spec.discourseRelation ? relationRules[spec.discourseRelation] : undefined;
  if (!type || !relation) throw new Error(`${skeletonPromptVersion} has no rules for ${spec.questionType} / ${spec.discourseRelation ?? "no relation"}`);
  const relational = spec.difficulty.band === "hard" && assignedStrategy(spec) === "relational_inference" && sequence === "plan_first";
  const answerFirst = sequence === "answer_first" && spec.difficulty.band === "hard" && assignedStrategy(spec) === "relational_inference";
  const voice = relational
    ? role.replace(
        "the stem and its correct option only. Other writers add the wrong options and the explanation later, so you write neither.",
        "the situation, four different wrong beliefs, the stem that lets a reader judge them, and the correct option. A later writer turns each belief into its clause. You do not write the explanation.",
      )
    : role;
  const ending = spec.difficulty.band !== "hard" ? output : relational ? relationalOutput : answerFirst ? answerFirstOutput : hardOutput;
  return [voice, ydsRules, type, relation, ending].join("\n\n");
}

/* Dynamic layer. */

export function skeletonUser(spec: QuestionSpec, feedback: string[] = [], avoided: string[] = [], brief?: string, sequence: ProductionSequence = "plan_first"): string {
  const banned = [...(spec.discourseRelation ? relationConnectors(spec.discourseRelation).map(connectorSurface) : []), ...spec.vocabularyConstraints.forbiddenInDistractors];
  const lines = [
    "TARGET",
    `Relation: ${name(spec.discourseRelation)}; grammar pattern: ${name(spec.grammarPattern)}; skill: ${name(spec.targetSkill)}; difficulty ${spec.difficulty.band} (CEFR ${spec.difficulty.cefr}).`,
    "",
    "CONSTRAINTS",
    `- Topic area: ${spec.contextConstraints.domain.replaceAll("_", " ")}. ${brief ? "Use the assigned situation below. Do not replace its actor, obstacle, or outcome. No real study or person." : "Invent the situation; no real study or person."}`,
    `- Blank position: ${spec.contextConstraints.blankPosition}.`,
    `- Stem ${spec.contextConstraints.stemWords.min}–${spec.contextConstraints.stemWords.max} words; correct option ${spec.contextConstraints.optionWords.min}–${spec.contextConstraints.optionWords.max} words.`,
    `- The correct option opens with one of: ${quoted(spec.answerConstraints.connectors.map(connectorSurface))}.`,
    `- Never in the stem: ${quoted(banned)}.`,
    `- Vocabulary up to CEFR ${spec.vocabularyConstraints.cefrCeiling}.`,
    `- ${bandNote(spec.difficulty.band)}`,
  ];
  const strategy = assignedStrategy(spec);
  const answerFirst = sequence === "answer_first" && strategy === "relational_inference";
  if (strategy && !answerFirst) {
    lines.push("", "Before the stem and the correct option, decide difficultyStrategy, targetLexeme, neutralSubstitute, and scenario (domain, actor, obstacle, expected, outcome, relation). Then write the English sentence from that plan. Do not write the sentence first and fit a plan to it afterwards.");
  }
  if (strategy === "lexical_pivot") {
    lines.push("", "ASSIGNED STRATEGY: lexical_pivot.", "Name one academic word. A plain substitute such as affect must make the expected opposite clearly weaker. Do not also state that obstacle in other words.");
  } else if (answerFirst) {
    lines.push(
      "",
      "ASSIGNED STRATEGY: relational_inference.",
      "Write the stem and the correct continuation first. They must read as one natural, grammatical, and logically consistent sentence.",
      "Do not plan the four wrong options in this call. Do not return four beliefs.",
      "The discourse task is concession. scenario.relation names the meaning relation the correct continuation bears to the stem.",
      "scenario.expected is what a reader would expect from the obstacle. scenario.outcome is what actually happens.",
      "The stem is a narrative. It does not repeat the obstacle, and it does not spell the concession out.",
      "Another natural continuation is not, by itself, a reason to refuse this sentence.",
    );
  } else if (strategy === "relational_inference") {
    const wrong = spec.distractorPlan.map((slot) => slot.option).join(", ");
    lines.push(
      "",
      "ASSIGNED STRATEGY: relational_inference.",
      "Build the question in this order. Do not write the stem first and then search it for four proofs.",
      "1. facts: three to five events that are true in this situation. scenario.obstacle is the one event reserved for the correct option. The stem does not repeat that obstacle, and it does not spell the concession out.",
      "2. scenario.expected is what a reader would expect from that obstacle. scenario.outcome is what actually happens.",
      "3. Four different beliefs, one for each of " + wrong + ". A belief is a claim a student might accept. Changing the actor, the time, or the noun of one claim does not make a new belief. Do not use the correct-option letter.",
      "",
      "JOINT OPTION PLAN",
      "Each plan has relationFamily, proposition, whyPlausible, stemEvidenceAnchor, failureMechanism, decisiveFailureReason, failureAnchor, connectorStrategy, propositionStatus, and inferenceClaim. actor, time, and scope are optional. Include one only when that belief's failure turns on it.",
      "proposition is the belief. whyPlausible is why a learner would consider it. stemEvidenceAnchor names the narrative event that belief is about. decisiveFailureReason is the concrete semantic break.",
      "propositionStatus is one of entailed, contradicted, not_entailed, external_assumption, restatement, undetermined. It names the proposition against the stem. It does not say the distractor is good or bad. entailed: the stem requires it. contradicted: the stem rules it out. not_entailed: the stem does not require it, and does not rule it out. external_assumption: the step needs a fact the stem does not give. restatement: the proposition repeats the stem or what the stem already requires. undetermined: you cannot tell. Do not decide entailed or restatement by shared words. If you cannot tell, use undetermined.",
      "inferenceClaim is invalid_inference or none. invalid_inference means the student treats a not_entailed step as if the stem had said it. Every applicant who passed receives funding does not entail that applicants who failed receive none, and it does not contradict that exclusion either. That exclusion can be the targeted invalid inference: propositionStatus not_entailed, inferenceClaim invalid_inference, and the reason names the stem expression plus the step that does not follow. It does not need a contradiction word. none means you are not offering that kind of trap. Do not set invalid_inference on a restatement or on an entailed proposition. Up to three children already leaves the fourth child outside. Every room except one already states the exception. Those are restatements, not new inferences.",
      "connectorStrategy is the string natural. The same connector may open more than one option. Do not repeat a connector inside one option. Do not name a connector as the reason an option is wrong.",
      "relationFamily is one of near_concession, cause, condition, time, contrast. It names that option's job. The same family may be used on more than one option when the propositions differ. A family may be unused. Do not invent a different family just to make the four labels different.",
      "The later writer realizes the proposition. It does not invent the failure afterwards.",
      "Student-visible evidence is the shared stem and ordinary knowledge. scenario.expected, scenario.obstacle, and any fact that is not written in the stem are hidden. Hidden notes cannot show that an option is wrong.",
      "A belief may fail in one of four ways. A direct contradiction is not required for every letter.",
      "Visible clash: the belief denies an event the narrative states.",
      "Reversed cause: the belief keeps the events but explains the outcome by something that would erase it.",
      "Concession that does not arise: the belief keeps the events, and the reason names the expectation that clause actually creates. That expectation is not the opposite of the outcome. Saying that the stem does not support the proposition, or that the option is not a concession, is not a reason, unless propositionStatus is not_entailed and inferenceClaim is invalid_inference. In that case name the stem expression and the step that does not follow. Do not add a contradiction word to disguise it. A restatement is not that exception.",
      "Different question: the belief answers a different question from the one the outcome asks, and the reason names both questions.",
      "Do not write a belief whose expectation is the opposite of the outcome. That is a second concession. Do not write a belief that explains the outcome. That is a second answer. Do not prove a belief with the obstacle, or with a specialist fact the narrative does not tell.",
      "If a belief's failure needs an event the narrative does not tell, the world is missing that event. Add the event and tell the stem again in this same response. A short stem is not a reason to decline. Shrink the world until one natural sentence can carry it. Do not stretch the sentence into a list of denials.",
      "Decline only when a belief still has no concrete failure, and then return decision decline. decline does not ask for another try. Include the events, the stem, every belief you can defend, and missingDistractors for the rest. produce leaves declineReason null, leaves missingDistractors empty, and includes four distractorBlueprints.",
      "The correct option is hidden. A fact that appears only there cannot prove an option wrong.",
      "failureMechanism is one of actor_mismatch, time_mismatch, reference_mismatch, scope_mismatch, causal_direction, contradicts_outcome, wrong_expectation. Use it for the break above. It is not a connector, and it is not the phrase not a concession. Leave actor, time, and scope empty unless the break turns on that one of them.",
      "failureAnchor is one of actor, scope, time, outcome, reference: the part of the full sentence the break turns on.",
      "Prefer one near_concession only when its expectation is not the opposite of the outcome. If the near concession is a real second obstacle, omit near_concession. Do not write a decoy that differs only by its connector.",
      "The other options are natural, grammatical, and on topic. Each is wrong for its own planned reason, not because it is absurd.",
      "Do not give two options the same proposition in different words. A time option for an ongoing main clause must not depend on a month, a year, or one past date.",
      "Return facts, scenario, and distractorBlueprints before the stem.",
    );
  }
  if (brief) lines.push("", "ASSIGNED SITUATION", brief, answerFirst ? "Write the stem and the correct continuation for this situation. Do not plan the four wrong options." : "Write the stem, the correct option, and the four wrong-option plans for this situation.");
  if (avoided.length) lines.push("", `TARGET WORDS ALREADY USED IN THIS BATCH: ${avoided.join(", ")}.`, "Do not use these words or their inflected or derived forms. Choose another academic word that still carries this concession. Do not pick a corner noun, an archaic word, or a weak synonym just to be different.");
  if (feedback.length) lines.push("", "YOUR PREVIOUS SKELETON WAS REJECTED BY AUTOMATIC CHECKS", ...feedback.map((line) => `- ${line}`), answerFirst ? "Write a new stem and correct continuation that fix these problems. Do not plan the four wrong options." : strategy ? "Keep the assigned strategy. Decide a new plan before you write the new sentence." : "Write a new skeleton that fixes these problems.");
  return lines.join("\n");
}

export const distractorPlanPromptVersion = "distractor-plan.v1";

const planRole = `DISTRACTOR PLANNER
The stem and the correct continuation are already accepted. Plan exactly four wrong beliefs for that finished sentence.
Do not rewrite the stem. Do not rewrite the correct continuation. Do not write the English clause of a wrong option.`;

export function distractorPlanSystem(): string {
  return planRole;
}

/** Four beliefs grounded in the accepted sentence. The same generator writes them; this is a separate call. */
export function distractorPlanUser(spec: QuestionSpec, skeleton: QuestionSkeleton, feedback: string[] = []): string {
  const wrong = spec.distractorPlan.map((slot) => slot.option).join(", ");
  const lines = [
    "ACCEPTED SENTENCE",
    "Do not rewrite the stem or the correct continuation.",
    `Stem: ${skeleton.stem}`,
    `Correct continuation: ${skeleton.correctAnswer}`,
    `Discourse relation: ${name(spec.discourseRelation)}.`,
    `How the correct continuation relates to the stem: ${skeleton.scenario?.relation ?? name(spec.discourseRelation)}.`,
    "",
    `Plan one belief for each of ${wrong}. Do not use the correct-option letter ${spec.answerConstraints.correctOption}.`,
    "Each plan is one wrong reading of a concrete expression in the stem. Ground stemEvidenceAnchor in words the stem already uses.",
    "proposition is the targeted misreading or inference. whyPlausible is why that reading looks reasonable at first glance.",
    "failureMechanism and decisiveFailureReason name the meaning shift, and why this belief cannot take the place of the correct continuation.",
    "Do not give two options the same error under different labels. Changing the family, the actor, or the wording of one claim does not make a new belief.",
    "propositionStatus is one of entailed, contradicted, not_entailed, external_assumption, restatement, undetermined. It names the proposition against the stem. It does not say the distractor is good or bad.",
    "entailed: the stem requires it. contradicted: the stem rules it out. not_entailed: the stem does not require it, and does not rule it out. A not_entailed invalid inference does not need a contradiction word. external_assumption: the step needs a fact the stem does not give. restatement: the proposition repeats the stem or what the stem already requires. A restatement is not a new inference. undetermined: you cannot tell. Do not decide entailed or restatement by shared words.",
    "inferenceClaim is invalid_inference or none. invalid_inference means the student treats a not_entailed step as if the stem had said it. Do not set invalid_inference on a restatement or on an entailed proposition.",
    "relationFamily is one of near_concession, cause, condition, time, contrast. connectorStrategy is the string natural. actor, time, and scope are optional.",
    "The correct continuation is shown so you can see the place a belief must not take. A fact that appears only there cannot prove a belief wrong. Quote the stem.",
  ];
  if (feedback.length) lines.push("", "YOUR PREVIOUS PLANS WERE REJECTED BY AUTOMATIC CHECKS", ...feedback.map((line) => `- ${line}`), "Keep this stem and this correct continuation. Plan four different beliefs that fix these problems.");
  return lines.join("\n");
}

export function distractorPlanResponseSchema() {
  return responseSchema(distractorPlanOutput);
}

const planKeys = ["difficultyStrategy", "targetLexeme", "neutralSubstitute", "scenario"] as const;

/** Hard calls emit the plan fields before the sentence. Other bands keep the original contract. Relational plan_first calls also require the four option plans. */
export function skeletonResponseSchema(band?: QuestionSpec["difficulty"]["band"], strategy?: DifficultyStrategy | null, sequence: ProductionSequence = "plan_first") {
  if (strategy === "relational_inference" && sequence !== "answer_first") {
    const schema = responseSchema(relationalPlannerOutput) as { properties?: Record<string, unknown>; required?: string[] };
    const properties = { ...(schema.properties ?? {}) };
    const order = ["decision", "facts", "scenario", "difficultyStrategy", "targetLexeme", "neutralSubstitute", "distractorBlueprints", "stem", "correctBlueprint", "context", "missingDistractors", "declineReason"];
    const ordered: Record<string, unknown> = {};
    for (const key of order) if (key in properties) ordered[key] = properties[key];
    for (const [key, value] of Object.entries(properties)) if (!(key in ordered)) ordered[key] = value;
    return { ...schema, properties: ordered, required: order.filter((key) => key in properties) };
  }
  const schema = responseSchema(questionSkeleton) as { properties?: Record<string, unknown>; required?: string[] };
  const properties = { ...(schema.properties ?? {}) };
  delete properties.distractorBlueprints;
  delete properties.facts;
  if (band !== "hard" || !schema.properties) return { ...schema, properties };
  const order = [...planKeys, "context", "stem", "correctAnswer"];
  const ordered: Record<string, unknown> = {};
  for (const key of order) if (key in properties) ordered[key] = properties[key];
  for (const [key, value] of Object.entries(properties)) if (!(key in ordered)) ordered[key] = value;
  const required = [...new Set([...(schema.required ?? []).filter((key) => key !== "distractorBlueprints" && key !== "facts"), ...planKeys])];
  return { ...schema, properties: ordered, required };
}
