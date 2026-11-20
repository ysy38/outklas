import { z } from "zod";
import { openrouterPrecheckModels } from "../stages/item-precheck";
import { responseSchema } from "../ai/prompts/schema";

/** Offline pilot only. A parsed object is a model claim, not a meaning proof. */
export const semanticVerifierPromptVersion = "semantic-verifier.offline.v2";

const yesNoUncertain = z.enum(["yes", "no", "uncertain"]);

/**
 * relationMutation and unsupportedExtension are independent.
 * A changed relation does not force an extension, and both may be yes.
 */
export const semanticVerification = z.object({
  relation: z.enum(["equivalent", "non_equivalent", "uncertain"]),
  relationMutation: yesNoUncertain,
  mutationNotes: z.array(z.string().min(1).max(160)).max(4),
  unsupportedExtension: yesNoUncertain,
  extensionNotes: z.array(z.string().min(1).max(160)).max(4),
  alteredMeaning: z.string().min(1).max(400).nullable(),
  sourceEvidence: z.array(z.string().min(1).max(300)).max(6),
  optionEvidence: z.array(z.string().min(1).max(300)).max(6),
  plausibleStudentMisreading: z.boolean().nullable(),
  confidence: z.number().min(0).max(1),
});

export type SemanticVerification = z.infer<typeof semanticVerification>;

export type VerificationInput = {
  source: string;
  option: string;
  questionType: "restatement" | "translation";
  targetLanguage: "tr" | "en" | null;
};

const writerFields = ["semanticRisk", "misreadingMechanism", "errorMechanism", "whyIncorrect", "modelVerdict"] as const;

export const semanticVerifierSystem = `INDEPENDENT SEMANTIC VERIFIER
You did not write this option. You are not told why a writer kept it, what mechanism they named, or what a judge decided.
Compare the option with the source only.
questionType restatement: same language.
questionType translation: the option is in the target language named in the user message. Judge meaning across the two languages.

Answer two questions separately.

Question 1. Which meaning or relation from the source has changed?
relationMutation is yes when the option misreads a proposition already in the source. That includes a connective, a quantity, a time boundary, modality or actuality, polarity, epistemic strength, or an actor role.
If a state that lasts until a point is read as a new act after that point, name both the time change and the state-or-act change in mutationNotes.
relationMutation is no when no such relation changes.
relationMutation is uncertain when you cannot tell.

Question 2. Beyond that change, does the option add an independent claim the source does not support?
unsupportedExtension is yes only for an added event, an added actor-action link, an added recipient, or an added contrast. The changed relation itself is not this claim.
unsupportedExtension is no when the only difference is that changed relation, or when the option is a synonym or a natural paraphrase.
A new word or a new verb is not, by itself, an extension.
A yes on question 1 does not answer question 2. Both may be yes. Use uncertain when you cannot separate them.

relation is equivalent only when both answers are no and the actors, events, quantities, modality, polarity and relations are preserved.
relation is non_equivalent when either answer is yes.
relation is uncertain when you cannot tell.
alteredMeaning is one short sentence when relation is non_equivalent. Otherwise null.
sourceEvidence and optionEvidence quote short spans from the texts you were given. Do not invent a span.
plausibleStudentMisreading is true when a reader could arrive at this option by misreading the source, false when the meaning is the same, null when you cannot tell.
confidence is your own estimate from 0 to 1. It does not prove the decision.
Return JSON only.`;

export function semanticVerifierUser(input: VerificationInput): string {
  const language = input.targetLanguage ? `\nTARGET LANGUAGE: ${input.targetLanguage}` : "";
  return `QUESTION TYPE: ${input.questionType}${language}
SOURCE:
${input.source}
OPTION:
${input.option}`;
}

/** Rejects a payload that still carries writer or judge labels. */
export function verificationInput(value: VerificationInput): VerificationInput {
  const extra = Object.keys(value).filter((key) => !["source", "option", "questionType", "targetLanguage"].includes(key));
  if (extra.length) throw new Error(`verifier input carries ${extra.join(", ")}`);
  for (const field of writerFields) {
    if (field in value) throw new Error(`verifier input carries ${field}`);
  }
  if (!value.source.trim() || !value.option.trim()) throw new Error("verifier input needs a source and an option");
  return {
    source: value.source,
    option: value.option,
    questionType: value.questionType,
    targetLanguage: value.targetLanguage,
  };
}

export function semanticVerifierRequest(value: VerificationInput): {
  model: typeof openrouterPrecheckModels.judge;
  system: string;
  user: string;
  jsonSchema: Record<string, unknown>;
  maxOutputTokens: number;
  promptVersion: typeof semanticVerifierPromptVersion;
} {
  const input = verificationInput(value);
  const user = semanticVerifierUser(input);
  const packed = `${semanticVerifierSystem}\n${user}`;
  for (const field of writerFields) {
    if (packed.includes(field)) throw new Error(`verifier prompt carries ${field}`);
  }
  return {
    model: openrouterPrecheckModels.judge,
    system: semanticVerifierSystem,
    user,
    jsonSchema: responseSchema(semanticVerification),
    maxOutputTokens: 500,
    promptVersion: semanticVerifierPromptVersion,
  };
}

export function readVerification(value: unknown): { claim: SemanticVerification; isMeaningProof: false; confidenceIsAccuracy: false } {
  return { claim: semanticVerification.parse(value), isMeaningProof: false, confidenceIsAccuracy: false };
}

/** No provider is constructed. A live call needs a later, separate authorization. */
export function refuseLiveVerification(): { started: false; providerCalls: 0; studentBankWrites: 0; reason: string } {
  return { started: false, providerCalls: 0, studentBankWrites: 0, reason: "semantic verifier live call is not authorized" };
}
