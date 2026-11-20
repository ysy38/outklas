import { z } from "zod";
import type { ItemModelDefinition } from "@/modules/factory/item-model/contract";
import { responseSchema } from "./schema";

/** Method B only. The catalog of past items is not part of this prompt. */
export const misreadingPromptVersion = "cognitive-trap.misreading.v4";
export const misreadingOptionsPromptVersion = "cognitive-trap.options.v5";
export const keyParaphrasePromptVersion = "cognitive-trap.key-paraphrase.v1";

export const keyParaphraseSystem = `MEANING-PRESERVING PARAPHRASE
The source is fixed. Write one natural answer that keeps its meaning.
Do not stop at a change of clause order. Had X, Y restated as Y if X is not enough for a medium or hard item.
Keep the actors, reference, quantity, scope, modality, certainty, polarity, time, condition, counterfactual, cause, purpose and contrast.
In translation, carry any, all, each, only, before and unless. Do not narrow any of them to a smaller subset.
If a natural paraphrase would change one of those relations, return meaningDelta shifted. Do not force distance by changing the meaning.
A writer claim of preserved is not proof.`;

export const misreadingSystem = `MISREADING PATHS
The source and the key are fixed. Do not rewrite the key.
Record the relations the key keeps: roles, quantity, modality, polarity, tense, cause, and reference.
For each reading, follow this order:
1. State the source meaning that must stay.
2. Choose one plausible student misreading.
3. Bind that misreading to one mechanism supplied in the user message. Add a second mechanism only when the option changes two related meanings.
4. The later option must keep the source's other core relations and read as a natural sentence.
5. Explain why the option is not equivalent to the source. A mechanism label is not that explanation.
6. Say whether the option could also be a correct answer.
Return four to six readings. Do not invent a relation, an actor, or an event that the source does not have.
Do not use a mechanism that was not supplied.
Each way is a full interpretation, not a one-word swap.
For each way return studentMisreading, temptingEvidence, actualSemanticDifference, whyIncorrect, misreadingMechanism and prevalence.
additionalMechanisms is optional and only for a second related change.
prevalence is exactly the token unmeasured. Do not say the misreading is common, rare, or observed.
Do not copy a published exam item.
Do not write the answer options in this step.
The supplied mechanisms are the ones grounded in this source. They are not a quota.`;

export const misreadingOptionsSystem = `MISREADING OPTIONS
The source and the key are fixed. Do not rewrite either one.
The misreading notes already exist. Do not repeat them and do not add a commentary field.
Write one natural option for each different misreading.
Copy that misreading's studentMisreading unchanged so the option stays tied to it.
The option is the sentence that reader would accept as the meaning.
Keep the same situation, actors and roughly the same length as the key. Do not drop a whole clause to make the key the only complete sentence.
Do not change only one word of the key, and do not state the opposite by flipping a single visible word.
Do not repeat one misreading in two options.
Do not write an unrelated situation.
Keep every option grammatical.
Do not add a second rendering that is also correct. If you cannot avoid that, set semanticRisk to second_answer.
The misreading's mechanism label is not proof that the option is wrong.
Do not add an actor, an event, or a relation that the source does not have.
errorMechanism is exactly one token from the enum in the user message. That enum is separate from the misreading mechanism.
shiftTarget names the relation that changed. Use none only for word order or a natural paraphrase.
No fixed count of mechanisms is required.
Return one candidate per misreading. No text outside the JSON.`;

export const meaningMapOutput = z.object({
  roles: z.string().min(1).max(300),
  quantity: z.string().min(1).max(300),
  modality: z.string().min(1).max(300),
  polarity: z.string().min(1).max(300),
  tense: z.string().min(1).max(300),
  cause: z.string().min(1).max(300),
  reference: z.string().min(1).max(300),
});

export const misreadingOutput = z.object({
  meaningMap: meaningMapOutput,
  preservedRelations: z.array(z.string().min(1).max(200)).min(2).max(6),
  readings: z
    .array(
      z.object({
        studentMisreading: z.string().min(1).max(400),
        temptingEvidence: z.string().min(1).max(400),
        actualSemanticDifference: z.string().min(1).max(400),
        whyIncorrect: z.string().min(1).max(400),
        prevalence: z.string().max(40),
        misreadingMechanism: z.string().min(1).max(80).optional(),
        additionalMechanisms: z.array(z.string().min(1).max(80)).max(3).optional(),
      }),
    )
    .min(4)
    .max(6),
});

/** The call schema accepts only the mechanisms grounded in this source. */
export function misreadingOutputFor(ids: readonly string[]) {
  const list = (ids.length > 0 ? [...ids] : ["NONE"]) as [string, ...string[]];
  return misreadingOutput.extend({
    readings: z
      .array(
        z.object({
          studentMisreading: z.string().min(1).max(400),
          temptingEvidence: z.string().min(1).max(400),
          actualSemanticDifference: z.string().min(1).max(400),
          whyIncorrect: z.string().min(1).max(400),
          prevalence: z.string().max(40),
          misreadingMechanism: z.enum(list),
          additionalMechanisms: z.array(z.enum(list)).max(3).optional(),
        }),
      )
      .min(4)
      .max(6),
  });
}

/** Option call. The long misreading notes stay on the earlier step and are not requested again. */
export function misreadingOptionsOutput(mechanisms: readonly string[]) {
  const list = [...mechanisms] as [string, ...string[]];
  return z.object({
    candidates: z.array(z.object({
      candidateText: z.string().min(1).max(400),
      errorMechanism: z.enum(list),
      shiftTarget: z.enum(["modality", "scope", "quantity", "cause", "contrast", "purpose", "role", "tense", "polarity", "predicate", "none"]),
      semanticRisk: z.enum(["none", "second_answer", "off_construct", "ungrammatical"]),
      studentMisreading: z.string().min(1).max(240),
    })).min(4).max(6),
  });
}

export const misreadingResponseSchema = responseSchema(misreadingOutput);
export const misreadingOptionsResponseSchema = (mechanisms: readonly string[]) => responseSchema(misreadingOptionsOutput(mechanisms));

export function misreadingUser(source: string, key: string, mechanisms: readonly { id: string; description: string }[] = []): string {
  const lines = mechanisms.map((item) => `- ${item.id}: ${item.description}`);
  return [
    `SOURCE`,
    source,
    ``,
    `KEY`,
    key,
    ``,
    `GROUNDED MECHANISMS`,
    lines.length ? lines.join("\n") : `None. Do not invent a mechanism.`,
    ``,
    `Use only a mechanism in that list. A label is not proof the option is wrong.`,
    `Return the relations and the misreadings. prevalence must be unmeasured.`,
  ].join("\n");
}

export function misreadingOptionsUser(
  model: ItemModelDefinition,
  source: string,
  key: string,
  readings: unknown,
  mechanisms: readonly { id: string; description: string }[] = [],
  targetLanguage: "tr" | "en" | null = null,
): string {
  const lines = mechanisms.map((item) => `- ${item.id}: ${item.description}`);
  const language = targetLanguage ? [`TARGET LANGUAGE: ${targetLanguage}. Write every option in this language. A distractor in the other language is invalid.`] : [];
  return [
    ...language,
    `ERROR MECHANISM ENUM: ${model.errorMechanisms.join(" | ")}`,
    `Write one of those tokens in errorMechanism. That enum is not the misreading mechanism.`,
    `GROUNDED MISREADING MECHANISMS`,
    lines.length ? lines.join("\n") : `None supplied.`,
    `Copy one studentMisreading exactly. Do not repeat the notes.`,
    ``,
    `SOURCE`,
    source,
    ``,
    `KEY`,
    key,
    ``,
    `MISREADINGS`,
    JSON.stringify(readings),
  ].join("\n");
}
