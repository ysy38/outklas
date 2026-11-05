import type { MainClauseFrame } from "@/modules/factory/context";
import type { ClauseForm, DistractorSpec, FailureMode } from "@/modules/factory/distractor-spec";
import { revisionExperiments, type ExperimentSet, type FactoryExperiment } from "@/modules/factory/experiments";
import type { QuestionSkeleton } from "@/modules/factory/skeleton";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { distractorSystemFor, distractorUserFor } from "./distractor.v5";

/**
 * distractor.v5 plus the second-round experiments (opposition, compatibility, relation, overlap). The first-round
 * sections are rendered by distractor.v5 unchanged; sets without a second-round experiment keep using v5 or v4.
 */
export const distractorRevisionPromptVersion = "distractor.v6";

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");
/** overlap replaces lexical's stricter wording rule, so the two are never rendered together. */
const firstRound = (experiments: ExperimentSet) =>
  experiments.filter((experiment) => !revisionExperiments.includes(experiment) && !(experiment === "lexical" && experiments.includes("overlap")));

export const frameText: Record<MainClauseFrame, string> = {
  past_event: "a single completed past event",
  past_ongoing: "an ongoing or repeated situation in the past",
  present_general: "a general or present situation",
  future: "a future situation",
  counterfactual: "an unreal past (would or could have)",
  unknown: "not determined automatically; follow the main clause's own tense",
};

const formText: Record<ClauseForm, string> = {
  standing_past_condition: "simple past, as a standing circumstance over the same period (as long as, provided that, if + simple past); no past perfect, no would",
  present_condition: "simple present; no will in the condition clause",
  counterfactual_condition: "past perfect, matching the main clause's would or could have",
  purpose_with_modal: "so that or in order that + could, would or might + verb; it must read as a purpose, never as a consequence",
  past_time_clause: "simple past or past perfect, in an order of events that can really happen; no will",
  present_time_clause: "simple present or present perfect; no will in the time clause",
  match_main_clause: "a tense that fits the main clause; no will in a time or condition clause",
};

/** Revised failure instructions; each belongs to one experiment and replaces the distractor.v4 line only under it. */
export const revisedFailureInstructions: Partial<Record<FailureMode, { experiment: FactoryExperiment; text: string }>> = {
  no_real_opposition: {
    experiment: "opposition",
    text: "Use the contrast connector with a realistic clause about the same subject or its immediate situation that runs PARALLEL to the main clause: it neither explains, supports or enables the outcome (no reason, evidence or precondition for it) nor works against it (no obstacle, risk or disadvantage). Two compatible facts side by side leave nothing to contrast, so the contrast connector makes the sentence illogical. Test: if the clause would make sense after \"given that\" or after \"although\" with this main clause, change it. Never negate or restate the stem, and never bring in another group, place or period that genuinely differs.",
  },
  condition_cannot_restrict: {
    experiment: "compatibility",
    text: "State a realistic, on-topic condition, in the clause form given below, that would make the main clause's outcome LESS likely, so the sentence claims the outcome depended on something that works against it. It must be a condition this kind of event could depend on in this time frame: never a completed past event offered as a condition for a settled past result, never an absurd, unrelated or future event, and never a realistic precondition that makes the sentence sensible.",
  },
  impossible_time_order: {
    experiment: "compatibility",
    text: "Use the time connector with a realistic, on-topic development, in the clause form given below, that would work against the outcome, placed as the moment that starts, ends or triggers it, so the time link makes the sentence illogical. The order of events must be one that can really happen (nothing that did not exist yet, nothing that undoes the outcome before it happens), and it must not be an earlier event that explains or enables the main clause. Vary the development: a policy, a shortage, a seasonal change, a rule or a decision works as well as an accident or a breakdown.",
  },
  purpose_does_not_fit: {
    experiment: "compatibility",
    text: "Use \"so that\" or \"in order that\" with could, would or might. State a realistic, on-topic purpose that the main clause's action would work against, so the purpose link makes the sentence illogical. It must read as a purpose someone involved could have had, never as a consequence the main clause could have led to.",
  },
};

const targetText: Record<string, string> = {
  concession: "concession (an unexpected outcome: the correct option sets up an expectation that the main clause breaks)",
};

export const targetRelationText = (relation: NodeRef | null) => (relation ? (targetText[parseRef(relation).slug] ?? name(relation)) : "none");

export function distractorRevisionSystem(experiments: ExperimentSet): string {
  const base = distractorSystemFor(firstRound(experiments));
  const rules = [
    ...(experiments.includes("opposition") ? ["- a contrast option is neither a reason for the outcome (\"whereas\" would read as \"given that\") nor an obstacle to it (it would read as a concession): it states a parallel fact."] : []),
    ...(experiments.includes("compatibility")
      ? ["- a condition, purpose or time option fits the main clause's time frame and kind of event: no completed past event offered as a condition for a settled past result, no order of events that cannot happen, no absurd or unrelated scenario."]
      : []),
    ...(experiments.includes("relation") ? ['- no natural reading of your connector ("whereas" as "given that", "while" as "although", "so that" as a result) may make the completed sentence correct.'] : []),
    ...(experiments.includes("overlap") ? ["- reuse the stem's topic words when that is natural; do not copy its phrasing or rebuild its clause, and never swap in an unnatural synonym just to avoid a shared word."] : []),
  ];
  if (!rules.length) return base;
  return base.includes("\n\nAlso:\n") ? `${base}\n${rules.join("\n")}` : `${base}\n\nAlso:\n${rules.join("\n")}`;
}

export function distractorRevisionUser(input: { dspec: DistractorSpec; skeleton: QuestionSkeleton; usedConnectors: NodeRef[]; feedback: string[]; experiments: ExperimentSet }): string {
  const { dspec, experiments } = input;
  const revised = revisedFailureInstructions[dspec.semanticConstraint.failureMode];
  const failureText = revised && experiments.includes(revised.experiment) ? revised.text : undefined;
  const lines = [distractorUserFor({ ...input, experiments: firstRound(experiments), feedback: [], failureText })];
  const temporal = dspec.temporalConstraint;
  if (experiments.includes("compatibility") && temporal?.mainClauseFrame) {
    lines.push("", "CONTEXT (computed from the stem)", `- Main clause time frame: ${frameText[temporal.mainClauseFrame]}.`);
    if (temporal.form) lines.push(`- Clause form: ${formText[temporal.form]}.`);
  }
  if (experiments.includes("relation")) lines.push("", "RELATION", `- The item's target relation is ${targetRelationText(dspec.relationConstraint.correctRelation)}. Your completed sentence must not read that way under any natural reading of its connector.`);
  if (experiments.includes("overlap")) lines.push("", "WORDING", "- Topic words from the stem may be reused when that is natural. Copy no phrase of four or more words from the stem and do not rebuild its clause.");
  if (input.feedback.length) lines.push("", "YOUR PREVIOUS ATTEMPTS FOR THIS OPTION WERE REJECTED", ...input.feedback.map((line) => `- ${line}`), "Write a different option that avoids these problems.");
  return lines.join("\n");
}
