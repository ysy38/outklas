import { questionSkeleton } from "@/modules/factory/skeleton";
import { relationConnectors } from "@/modules/factory/families";
import { connectorSurface } from "@/modules/factory/spec-engine";
import type { QuestionSpec } from "@/modules/factory/spec";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const skeletonPromptVersion = "skeleton.v1";

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");
const quoted = (list: string[]) => list.map((word) => `"${word}"`).join(", ");

function bandNote(band: QuestionSpec["difficulty"]["band"]): string {
  if (band === "easy") return "EASY: B1 and one plain clause, with no embedded clause and only words a B1 reader knows. The obstacle is explicit. An impossible result is not a concession.";
  if (band === "hard") return "HARD: C1. Inside the correct option, one which/who/that clause that contains both the precise word and the fact a reader needs in order to expect the opposite outcome. A clause that only adds when, how long, who confirmed it, or a restatement does not count: 'rescinded the permit, which it had issued a fortnight earlier' fails, because cancelling the permit is already the obstacle. 'a storage solution that had turned hypoxic' works, because the clash depends on the solution having lost oxygen. An impossible result is not a concession.";
  return "MEDIUM: B2. Ordinary academic vocabulary a B2 reader knows, and no term that only a C1 reader would know. An impossible result is not a concession.";
}

/* Static layers. */

export const skeletonHeader = "SKELETON WRITER";

const role = `${skeletonHeader}
You write the skeleton of one entirely original item for the Turkish YDS English exam (ÖSYM format): the stem and its correct option only. Other writers add the wrong options and the explanation later, so you write neither. You have not been shown any real exam item and you must not recall, reproduce, paraphrase, translate or imitate one.`;

const ydsRules = `YDS RULES
- Academic register on general-interest academic topics. No trivia, no named real people, no current events, no brand names, no statistics a candidate would need to know.
- Standard written English, grammatically flawless, natural, never telegraphic.
- Sound like a human exam setter. One concrete situation. No adjective triads, no empty abstractions. Do not use: interplay, tapestry, landscape, delve, pivotal, robust, underscore, testament, shed light.`;

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

export function skeletonSystem(spec: QuestionSpec): string {
  const type = typeRules[spec.questionType];
  const relation = spec.discourseRelation ? relationRules[spec.discourseRelation] : undefined;
  if (!type || !relation) throw new Error(`${skeletonPromptVersion} has no rules for ${spec.questionType} / ${spec.discourseRelation ?? "no relation"}`);
  return [role, ydsRules, type, relation, output].join("\n\n");
}

/* Dynamic layer. */

export function skeletonUser(spec: QuestionSpec, feedback: string[] = []): string {
  const banned = [...(spec.discourseRelation ? relationConnectors(spec.discourseRelation).map(connectorSurface) : []), ...spec.vocabularyConstraints.forbiddenInDistractors];
  const lines = [
    "TARGET",
    `Relation: ${name(spec.discourseRelation)}; grammar pattern: ${name(spec.grammarPattern)}; skill: ${name(spec.targetSkill)}; difficulty ${spec.difficulty.band} (CEFR ${spec.difficulty.cefr}).`,
    "",
    "CONSTRAINTS",
    `- Topic area: ${spec.contextConstraints.domain.replaceAll("_", " ")}. Invent the situation; no real study or person.`,
    `- Blank position: ${spec.contextConstraints.blankPosition}.`,
    `- Stem ${spec.contextConstraints.stemWords.min}–${spec.contextConstraints.stemWords.max} words; correct option ${spec.contextConstraints.optionWords.min}–${spec.contextConstraints.optionWords.max} words.`,
    `- The correct option opens with one of: ${quoted(spec.answerConstraints.connectors.map(connectorSurface))}.`,
    `- Never in the stem: ${quoted(banned)}.`,
    `- Vocabulary up to CEFR ${spec.vocabularyConstraints.cefrCeiling}.`,
    `- ${bandNote(spec.difficulty.band)}`,
  ];
  if (feedback.length) lines.push("", "YOUR PREVIOUS SKELETON WAS REJECTED BY AUTOMATIC CHECKS", ...feedback.map((line) => `- ${line}`), "Write a new skeleton that fixes these problems.");
  return lines.join("\n");
}

export const skeletonResponseSchema = () => responseSchema(questionSkeleton);
