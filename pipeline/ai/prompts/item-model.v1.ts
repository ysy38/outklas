import { z } from "zod";
import { optionLabels } from "@/modules/analysis/contract";
import { judgeReport, optionAcceptability } from "@/modules/factory/judge";
import { readingQuestionFunctions, semanticRisks, shiftTargets, tenseLabelMax, type ItemModelDefinition, type ItemSource, type ReadingSource, type SourceRecord, type TranslationDirection } from "@/modules/factory/item-model/contract";
import type { ImplementedItemType } from "@/modules/factory/item-model/contract";
import { typeSemanticFocus } from "@/modules/factory/item-model/precheck";
import { factoryVersions } from "@/modules/factory/versions";
import { responseSchema } from "./schema";

/** Frozen with the item-model registry versions. A run may not swap these strings. */
export const itemModelSchemaVersion = factoryVersions.itemSchema;
export const itemJudgePromptVersion = factoryVersions.itemJudgePrompt;

export const sourceSystem = `ITEM MODEL SOURCE
Return JSON only for the source. Do not write the answer or the options.
Use the measured construct, source policy and stem structure in the user message.
Write original text. Do not reproduce a published exam item.
Restatement and translation do not use a production source record. Write the proposition or the source sentence yourself. Empty strings are not a source. A missing production record is not a reason to return empty fields.
Reading uses only the production source record in the user message. Do not invent a source id, a URL, or a DOI. If that record is missing, return nothing. Official exam wording is not a source. Fact notes are the only facts you may use.
Restatement tense is a short relation label of at most 40 characters. It may distinguish one time relation from another. Put the explanation of time and aspect in argumentStructure. Do not write that explanation in tense, and do not shorten an over-long tense.
The reading source also returns one plan of four questions. Each entry has its own proposition id and a different evidence span id, plus a tested proposition and a cognitive operation. A proposition id is not an evidence reference and is not cognitive diversity. A function label is not proof of the operation. A near copy of a passage sentence is a lookup, not an inference and not a hard item. Different function labels are not four propositions.
A quote inside a passage is not semantic proof.
A target difficulty in the user message is a request, not a measured difficulty.`;

export const coreSystem = `ITEM MODEL KEY
The source is fixed. Return the stem and the one answer.
meaningDelta is "preserved" only when the answer keeps the actors, quantity, scope, modality, polarity, tense, condition and causal direction. Do not add only or solely. Do not move an actor onto another role. A writer claim of preserved is not proof.
sourceReferences lists existing ids only. Restatement: proposition. Translation: source_sentence. Reading: only the allowed evidence span id named in the user message. A proposition id is not an evidence reference. Do not put an explanation in that list. A reference that is not one of those ids is invalid. Do not shorten a reference to force a fit.
Reading: use the question slot in the user message. Copy that slot's proposition id, tested proposition, cognitive operation and evidence span id. Do not measure another slot's proposition.
Do not write distractors.
Do not change the prompt version.`;

export const distractorSystem = `ITEM MODEL DISTRACTOR POOL
Return exactly eight candidates for the fixed source and key.
errorMechanism is exactly one token from MECHANISMS in the user message. Do not add a colon, a gloss, or a sentence in that field. Put the explanation in whyInferior. An explanation written into errorMechanism is invalid and is not shortened into a token.
Each candidate also names one shiftTarget.
shiftTarget is "none" when the only difference is word order or a natural paraphrase. That is not evidence the option is wrong.
A label such as syntactic_mismatch is not verified wrongness.
semanticRisk is "second_answer" when the candidate is as suitable as the key, "off_construct" when it leaves the measured construct, "ungrammatical" when the sentence is broken, otherwise "none".
whyInferior is a note for an editor. It does not prove the candidate is wrong.
Four different mechanisms are not required. Four different texts are required.`;

export const judgeSystem = `INDEPENDENT ITEM JUDGE
You did not write this item. The key is not shown. Solve the item first.
Then fill every score and every option.
Restatement: judge meaning equivalence across scope, modality, polarity, tense and argument structure.
Translation: judge meaning preservation across the two languages.
Reading: judge whether the passage evidence supports the option. Outside knowledge is not support. A quote that occurs in the passage is not proof.
If another option is equally acceptable, name it. Your verdict does not certify the key.
A doubtful equivalence is a review, not an approval.`;

export const typeFocusLine: Record<ImplementedItemType, string> = {
  restatement: "This item asks for meaning equivalence. Compare scope, modality, polarity, tense and argument structure.",
  translation: "This item asks for meaning preservation across the two languages. A shift of role, scope, polarity, modality or tense is not faithful.",
  reading_comprehension: "This item asks for textual evidence. An option is acceptable only when the passage supports it.",
};

const frame = {
  proposition: z.string().min(1).max(500),
  scope: z.string().min(1).max(200),
  modality: z.string().min(1).max(200),
  polarity: z.enum(["affirmative", "negative"]),
  tense: z.string().min(1).max(tenseLabelMax),
  argumentStructure: z.string().min(1).max(400),
};

export const restatementSourceOutput = z.object(frame);
export const translationSourceOutput = z.object({
  sourceSentence: z.string().min(1).max(500),
  sourceLanguage: z.enum(["tr", "en"]),
  targetLanguage: z.enum(["tr", "en"]),
  roles: z.array(z.string().min(1).max(80)).min(1).max(8),
  scope: z.string().min(1).max(200),
});
const readingPlanEntry = z.object({
  propositionId: z.string().min(1).max(40),
  evidenceSpanId: z.string().min(1).max(40),
  testedProposition: z.string().min(1).max(300),
  cognitiveOperation: z.string().min(1).max(120),
  questionFunction: z.enum(readingQuestionFunctions),
});

export const readingSourceOutput = z.object({
  sourceId: z.string().min(1).max(80),
  passage: z.string().min(1).max(4000),
  questionPlan: z.array(readingPlanEntry).length(4),
});

export const itemCoreOutput = z.object({
  stem: z.string().min(1).max(800),
  correctAnswer: z.string().min(1).max(400),
  constructEvidence: z.string().min(1).max(400),
  correctnessRationale: z.string().min(1).max(400),
  sourceReferences: z.array(z.string().min(1)).min(1).max(8),
  meaningDelta: z.enum(["preserved", "shifted"]),
});

export const readingCoreOutput = itemCoreOutput.extend({
  questionFunction: z.enum(readingQuestionFunctions),
  evidenceSpan: z.object({ id: z.string().min(1).max(40), quote: z.string().min(1).max(300) }),
  propositionId: z.string().min(1).max(40),
  testedProposition: z.string().min(1).max(300),
  cognitiveOperation: z.string().min(1).max(120),
});

export const distractorPoolEnvelope = z.object({
  candidates: z.array(z.unknown()),
});

export function distractorCandidateSchema(mechanisms: readonly string[]) {
  const list = [...mechanisms] as [string, ...string[]];
  return z.object({
    candidateText: z.string().min(1).max(400),
    errorMechanism: z.enum(list),
    shiftTarget: z.enum(shiftTargets),
    whyPlausible: z.string().min(1).max(400),
    whyInferior: z.string().min(1).max(400),
    sourceEvidence: z.string().min(1).max(200),
    semanticRisk: z.enum(semanticRisks),
  });
}

export function distractorPoolOutputFor(mechanisms: readonly string[]) {
  return z.object({ candidates: z.array(distractorCandidateSchema(mechanisms)).length(8) });
}

export const itemJudgePacket = z.object({
  blindAnswer: z.enum(optionLabels),
  blindConfidence: z.number().min(0).max(1),
  blindEvidence: z.string().max(300),
  blindUncertain: z.boolean(),
  blindAlternative: z.enum(optionLabels).nullable(),
  acceptability: optionAcceptability,
  report: judgeReport,
});

export const sourceSchemaFor = {
  restatement: restatementSourceOutput,
  translation: translationSourceOutput,
  reading_comprehension: readingSourceOutput,
} as const;

export const sourceResponseSchema = (type: ImplementedItemType) => responseSchema(sourceSchemaFor[type]);
export const coreResponseSchema = (type: ImplementedItemType = "restatement") => responseSchema(type === "reading_comprehension" ? readingCoreOutput : itemCoreOutput);
export const distractorResponseSchema = (mechanisms: readonly string[]) => responseSchema(distractorPoolOutputFor(mechanisms));
export const judgeResponseSchemaForItem = () => responseSchema(itemJudgePacket);

function contractLines(model: ItemModelDefinition): string {
  return [
    `ITEM MODEL: ${model.itemModelId}`,
    `PROMPT VERSION: ${model.promptVersion}`,
    `MEASURED CONSTRUCT: ${model.measuredConstruct}`,
    `SOURCE POLICY: ${model.sourcePolicy}`,
    `STEM: ${model.stemStructure}`,
    `ANSWER: ${model.answerStructure}`,
    `DISTRACTOR STRATEGY: ${model.distractorStrategy}`,
    `MECHANISMS: ${model.errorMechanisms.join(", ")}`,
    `TARGET DIFFICULTY REQUEST: ${model.targetDifficulty}`,
  ].join("\n");
}

export const sourceUser = (model: ItemModelDefinition, index: number, detail?: { direction?: TranslationDirection; source?: SourceRecord; passageId?: string }) =>
  [
    contractLines(model),
    detail?.direction ? `DIRECTION: ${detail.direction}` : "",
    detail?.passageId ? `PASSAGE ID: ${detail.passageId}` : "",
    detail?.source ? `PRODUCTION SOURCE:\n${JSON.stringify(detail.source)}` : "",
    "",
    `Write source ${index}.`,
  ]
    .filter((line) => line !== "")
    .join("\n");

function readingPlan(source: unknown): ReadingSource["questionPlan"] | null {
  if (!source || typeof source !== "object" || !("questionPlan" in source)) return null;
  const plan = (source as { questionPlan?: ReadingSource["questionPlan"] }).questionPlan;
  return Array.isArray(plan) ? plan : null;
}

export const coreUser = (model: ItemModelDefinition, source: unknown, questionSlot?: number) => {
  const plan = readingPlan(source);
  const allowed = plan?.map((entry) => entry.evidenceSpanId).filter(Boolean) ?? [];
  const slotId = questionSlot && plan ? plan[questionSlot - 1]?.evidenceSpanId : undefined;
  return [
    contractLines(model),
    questionSlot ? `QUESTION SLOT: ${questionSlot}` : "",
    allowed.length ? `ALLOWED EVIDENCE SPAN IDS: ${allowed.join(", ")}` : "",
    slotId ? `THIS QUESTION'S EVIDENCE SPAN ID: ${slotId}` : "",
    `SOURCE:\n${JSON.stringify(source)}`,
  ]
    .filter((line) => line !== "")
    .join("\n\n");
};

export const distractorUser = (model: ItemModelDefinition, source: unknown, core: unknown) =>
  `${contractLines(model)}\n\nERROR MECHANISM ENUM: ${model.errorMechanisms.join(" | ")}\nWrite one of those tokens in errorMechanism. Write the explanation in whyInferior.\n\nSOURCE:\n${JSON.stringify(source)}\n\nKEY:\n${JSON.stringify(core)}\n\nReturn eight candidates.`;

export function judgeUser(
  model: ItemModelDefinition,
  stem: string,
  options: Record<(typeof optionLabels)[number], string>,
  source: ItemSource,
  designTarget?: "easy" | "medium" | "hard" | null,
): string {
  const type = model.questionType as ImplementedItemType;
  const contract = designTarget === undefined
    ? contractLines(model)
    : contractLines(model)
        .split("\n")
        .filter((line) => !line.startsWith("TARGET DIFFICULTY REQUEST:"))
        .concat(designTarget ? [`TARGET DIFFICULTY REQUEST: ${designTarget}`] : [])
        .join("\n");
  return [
    contract,
    `TYPE FOCUS: ${typeFocusLine[type]}`,
    `SEMANTIC FOCUS ID: ${typeSemanticFocus[type]}`,
    "The key letter is hidden.",
    "",
    "SOURCE",
    JSON.stringify(source),
    "",
    "ITEM",
    stem,
    optionLabels.map((label) => `${label}) ${options[label]}`).join("\n"),
  ].join("\n");
}
