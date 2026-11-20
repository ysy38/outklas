import { optionLabels } from "@/modules/analysis/contract";
import type { GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import { judgeReport } from "@/modules/factory/judge";
import { assignedStrategy } from "@/modules/factory/skeleton";
import type { QuestionSpec } from "@/modules/factory/spec";
import { soleConcessiveConnector, type CandidateValidation } from "@/modules/factory/validator";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const judgePromptVersion = "judge.v2";

/** What each option's own distractor judge decided; shown to the final judge, which must not take it on trust. */
export type DistractorCheckSummary = { option: (typeof optionLabels)[number]; decision: string; attempts: number; failures: string[]; concerns: string[] };

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");

export const judgeSystem = `You are an independent quality reviewer for original YDS English exam items. Another model wrote the item; your job is to find out whether it is bad. Be strict: a weak item reaching learners is worse than a good item being sent back.

Check, in this order:
1. Solve the item yourself. List in alternativeDefensibleOptions every option other than the key that a strong candidate could defend (empty when there are none). For each one, say in reasons which letter it is, why a reader could defend it, how its logic differs from the key, and whether the problem is grammar, meaning, scope, or a second concession. Judge that defence against this stem. A sentence that is merely possible in the real world is not a correct answer. A sentence that is only grammatical and natural on its own is not an equally defensible answer; list it only when, with all five options in view, it is as suitable a completion of this stem as the key. If another option is an equally defensible concession, the item is broken.
2. correctness: the key is right and the item works as intended.
3. ambiguityRisk: chance that the item has more than one defensible answer or none (0 = none, 1 = certain).
4. distractorQuality: wrong options are plausible to a weaker candidate and each fails for a clear reason.
5. targetAlignment: the item really tests the target concept and the planned distractor mechanisms.
6. difficultyFit: apply only the branch named by ASSIGNED STRATEGY. A difference from the requested band is the engine's estimate. It does not by itself make the item broken. When the strategy is none, estimate the band from the whole item and do not require either hard test below.
On lexical_pivot, estimatedDifficulty is hard only when the named word is a verb, an adjective, or an abstract noun, and replacing it with a plain verb such as affect clearly weakens the concession. The sentence does not have to become impossible. Do not delete the word. "an aquifer which has been severely depleted" is medium, because depleted already states the obstacle. "expected to curtail small enterprise transactions" is hard, because affect in place of curtail no longer leads the reader to expect the opposite outcome. If other words already state the same obstacle, the word is not carrying the concession. A disease name or a journal-only word is not hard.
On relational_inference, do not use the replacement test. A failed or missing neutralization is not a reject and is not by itself a reason to refuse hard. Judge the whole item. estimatedDifficulty is hard only when every one of these holds: the obstacle or limiting condition is actually in the sentence; the main clause states an outcome opposite to what that obstacle would lead a reader to expect; the reader must combine two or more pieces of information given in the sentence; the link is not obvious from one word or from the connector alone; and a general reader can make the inference from the sentence plus ordinary knowledge. Academic context is allowed when the needed fact is stated in the sentence or is a reasonable inference for a general reader. estimatedDifficulty is not hard when the unexpectedness depends on scientific, medical, or professional knowledge the sentence does not give, when the main clause already explains the outcome so no inference is required, when the item can be solved by recognizing the concessive connector, or when the gate's word test is the only evidence of difficulty. Do not approve hard for an item that cannot be solved without outside expertise. In reasons, name the inference the reader must make.
7. grammar and semantic: the stem completed with each option is grammatical; the correct sentence is natural and coherent.
8. ydsAlignment: format, register and length look like a real YDS item of this type.
9. originalityRisk: it looks copied or closely adapted from a known exam or textbook (0 = clearly original).
10. clueRisk: accidental clues (length, word echoes, grammar that rules options out for the wrong reason).

Each wrong option was checked on its own by another reviewer before you. Do not take those checks on trust: look at the five options together. If two options lead to the same logical reading, or any option other than the key could be defended once all five are side by side, list it in alternativeDefensibleOptions and raise ambiguityRisk.

All scores 0..1. verdict: APPROVE only when you would put it in front of learners unchanged; REVIEW when a human should look; REJECT when it is broken. reasons: at most six short points in English (≤20 words each), no quotes longer than four words from the item, no filler restating the stem.`;

export function judgeUser(input: { spec: QuestionSpec; candidate: GeneratedQuestionCandidate; validation: CandidateValidation; distractorChecks?: DistractorCheckSummary[] }): string {
  const { spec, candidate, validation } = input;
  const checks = (input.distractorChecks ?? []).map(
    (check) => `${check.option}: ${check.decision} after ${check.attempts} attempt(s)${check.concerns.length ? `; concerns ${check.concerns.join(", ")}` : ""}`,
  );
  const plan = spec.distractorPlan.map((slot) => `${slot.option}: ${name(slot.expresses)} via ${slot.distractorType}${slot.misconception ? ` (probes ${slot.misconception})` : ""}`).join("; ");
  const code = (issue: (typeof validation.issues)[number]) => `${issue.code}${issue.option ? `@${issue.option}` : ""}`;
  const critical = validation.issues.filter((issue) => issue.severity === "critical").map(code);
  const warnings = validation.issues.filter((issue) => issue.severity === "warn").map(code);
  const gate = candidate.metadata.gate;
  const strategy = assignedStrategy(spec);
  const evidence = !gate
    ? "GATE EVIDENCE: none."
    : strategy === "relational_inference"
      ? `GATE EVIDENCE (diagnostic only; do not use the replacement test to decide hard): embedding "${gate.embedding}"; preciseTerm "${gate.preciseTerm}"; clauseCarriesClash ${gate.clauseCarriesClash}.`
      : `GATE EVIDENCE (accepted by the skeleton gate; use the same replacement test on this word): embedding "${gate.embedding}"; preciseTerm "${gate.preciseTerm}"; clauseCarriesClash ${gate.clauseCarriesClash}.`;
  const connectorClue = strategy === "relational_inference" && soleConcessiveConnector(candidate.question.options, spec.answerConstraints.correctOption)
    ? "CONNECTOR CLUE: only the key opens with a concessive connector. The item can be solved by recognizing the connector, so estimatedDifficulty is not hard."
    : "";
  return [
    `TARGET: ${spec.questionType}; family ${spec.questionFamily}; concept ${spec.primaryConcept}; pattern ${spec.grammarPattern ?? "none"}; misconception ${spec.targetMisconception ?? "none"}; band ${spec.difficulty.band} (CEFR ${spec.difficulty.cefr}).`,
    `ASSIGNED STRATEGY: ${strategy ?? "none"}.`,
    evidence,
    ...(connectorClue ? [connectorClue] : []),
    `DISTRACTOR PLAN: ${plan}.`,
    `DETERMINISTIC CHECKS: ${validation.status}; critical: ${critical.length ? critical.join(", ") : "none"}; warnings: ${warnings.length ? warnings.join(", ") : "none"}.`,
    ...(checks.length ? [`INDIVIDUAL DISTRACTOR CHECKS (one option at a time): ${checks.join("; ")}.`] : []),
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
