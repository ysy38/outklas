import { optionLabels } from "@/modules/analysis/contract";
import type { GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import { judgeReport } from "@/modules/factory/judge";
import type { QuestionSpec } from "@/modules/factory/spec";
import type { CandidateValidation } from "@/modules/factory/validator";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const judgePromptVersion = "judge.v1";

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");

export const judgeSystem = `You are an independent quality reviewer for original YDS English exam items. Another model wrote the item; your job is to find out whether it is bad. Be strict: a weak item reaching learners is worse than a good item being sent back.

Check, in this order:
1. Solve the item yourself. List in alternativeDefensibleOptions every option other than the key that a strong candidate could defend (empty when there are none).
2. correctness: the key is right and the item works as intended.
3. ambiguityRisk: chance that the item has more than one defensible answer or none (0 = none, 1 = certain).
4. distractorQuality: wrong options are plausible to a weaker candidate and each fails for a clear reason.
5. targetAlignment: the item really tests the target concept and the planned distractor mechanisms.
6. difficultyFit: matches the target band; estimatedDifficulty is your own band.
7. grammar and semantic: the stem completed with each option is grammatical; the correct sentence is natural and coherent.
8. ydsAlignment: format, register and length look like a real YDS item of this type.
9. originalityRisk: it looks copied or closely adapted from a known exam or textbook (0 = clearly original).
10. clueRisk: accidental clues (length, word echoes, grammar that rules options out for the wrong reason).

All scores 0..1. verdict: APPROVE only when you would put it in front of learners unchanged; REVIEW when a human should look; REJECT when it is broken. reasons: at most six short points in English, no quotes longer than four words from the item.`;

export function judgeUser(input: { spec: QuestionSpec; candidate: GeneratedQuestionCandidate; validation: CandidateValidation }): string {
  const { spec, candidate, validation } = input;
  const plan = spec.distractorPlan.map((slot) => `${slot.option}: ${name(slot.expresses)} via ${slot.distractorType}${slot.misconception ? ` (probes ${slot.misconception})` : ""}`).join("; ");
  const warnings = validation.issues.filter((issue) => issue.severity === "warn").map((issue) => `${issue.code}${issue.option ? `@${issue.option}` : ""}`);
  return [
    `TARGET: ${spec.questionType}; family ${spec.questionFamily}; concept ${spec.primaryConcept}; pattern ${spec.grammarPattern ?? "none"}; misconception ${spec.targetMisconception ?? "none"}; band ${spec.difficulty.band} (CEFR ${spec.difficulty.cefr}).`,
    `DISTRACTOR PLAN: ${plan}.`,
    `DETERMINISTIC CHECKS: passed; warnings: ${warnings.length ? warnings.join(", ") : "none"}.`,
    "",
    "ITEM",
    candidate.question.stem,
    optionLabels.map((label) => `${label}) ${candidate.question.options[label]}`).join("\n"),
    "",
    `KEY: ${spec.answerConstraints.correctOption}`,
    `EXPLANATION (Turkish, for learners): ${candidate.explanation}`,
  ].join("\n");
}

export const judgeResponseSchema = () => responseSchema(judgeReport);
