import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { itemAuditReport } from "@/modules/factory/audit";
import { diagnosisLabels, observedContentFailures, type DiagnosisLabel, type DiagnosisLabelCode } from "@/modules/factory/diagnosis";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { responseSchema } from "./schema";

export const itemAuditPromptVersion = "item-audit.v2";

const failureLines = observedContentFailures
  .filter((code): code is DiagnosisLabelCode => code in diagnosisLabels)
  .map((code) => `   - ${code}: ${(diagnosisLabels[code] as DiagnosisLabel).judgeCheck}`);

export const itemAuditSystem = `ITEM AUDITOR
You audit one original YDS sentence-completion item for a research benchmark. You are not told the key, who wrote the item or how. Be precise and sceptical; your answers are compared across many items.

1. Solve the item: answer and answerConfidence.
2. For EVERY option (all five, including the one you chose), fill in:
   - note: one short English sentence on why it is right or wrong.
   - acceptable: the completed sentence is a true, sensible statement (a correct answer).
   - natural: the option is grammatical and reads as natural English in the blank (judge the wording only, not whether it is the answer).
   - eliminatedBy: how a careful candidate who reads English well, but has NOT yet worked out which relation the sentence needs, rules this option out:
     at_a_glance (absurd, off-topic, a plain negation of the main clause, broken grammar or a clashing tense: visible without reading the logic),
     world_knowledge (the option's own scenario is implausible or impossible in this context),
     relation_logic (only by working out how the option's connector relates it to the main clause),
     cannot_eliminate (a careful candidate could defend it; use this for the option you chose as the answer).
   - clue: none, or the cue that gives it away without the logic: repeats_stem (reuses the stem's wording), repeats_key (shares wording with another option that is the answer), grammar_or_tense, negates_stem, length_or_register.
   - implausibleScenario: its own content is unrealistic in this context and the context does not justify it.
   - tenseClash: its tense or aspect does not fit the main clause's time frame.
   - negatesStem: it simply negates, reverses or contradicts a statement of the stem instead of bringing its own content.
   - restatesStem: it rephrases the stem's own words or phrases rather than saying something new.
   - contentFailure: read the option WITH its own connector in its normal meaning. Which ONE of these is the main reason the completed sentence fails? Prefer the first three whenever they apply, because then the connector is not what makes the option wrong:
   - contradicts_stem: the option's content simply contradicts or negates a statement of the stem.
   - unrelated_content: the option's content has no real bearing on the main clause.
   - implausible_content: the option's own scenario is absurd or unrealistic in this context.
${failureLines.join("\n")}
   - sentence_works: it does not fail; the completed sentence is acceptable (also for the option you chose).
   - other: it fails, but for none of the reasons above.
   - contentConfidence: how sure you are of contentFailure.
3. answerFoundWithoutTarget: could a candidate who does not understand the relation this item targets still find the answer through other cues (absurd wrong options, wording echoes, grammar, length)? whyWithoutTarget: one short sentence.
reasons: at most six short points in English, no quotes longer than four words from the item.`;

const name = (value: NodeRef | null) => (value ? parseRef(value).slug.replaceAll("_", " ") : "none");

export function itemAuditUser(input: { stem: string; options: Record<OptionLabel, string>; targetRelation: NodeRef | null }): string {
  return [`TARGET RELATION (for answerFoundWithoutTarget only): ${name(input.targetRelation)}`, "", input.stem, ...optionLabels.map((label) => `${label}) ${input.options[label]}`)].join("\n");
}

export const itemAuditResponseSchema = () => responseSchema(itemAuditReport);
