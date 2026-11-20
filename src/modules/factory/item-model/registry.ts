import type { NodeRef } from "@/modules/knowledge/graph";
import { implementedItemTypes, itemQuestionTypes, type ImplementedItemType, type ItemModelDefinition, type ItemQuestionType } from "./contract";

const ref = (value: string) => value as NodeRef;

/** Model targetDifficulty is the assemble default. A trap item's designTarget is what the judge receives. */
const specified = (
  questionType: ImplementedItemType,
  fields: Omit<ItemModelDefinition, "questionType" | "reviewStatus" | "implemented">,
): ItemModelDefinition => ({
  questionType,
  reviewStatus: "specified",
  implemented: true,
  ...fields,
});

export const restatementModel = specified("restatement", {
  graphRefs: [ref("question_type:closest_meaning")],
  itemModelId: "restatement.meaning_equivalence",
  measuredConstruct: "meaning equivalence across quantity, scope, modality, polarity, roles, causal direction, predicate and tense",
  sourcePolicy: "The writer creates one original proposition and its meaning frame. tense is a short relation label of at most 40 characters. It may distinguish past perfect before a simple past from a bare simple past. The explanation of time and aspect goes in argumentStructure. An over-long tense is invalid and is not shortened. Empty fields fail the source gate. This type does not use a production source record.",
  stemStructure: "The proposition is the stem. The task is to choose the equivalent statement.",
  answerStructure: "One statement that keeps the actors, quantity, scope, modality, polarity, tense, condition and causal direction. Do not add only or solely. A writer claim of preserved is not proof.",
  distractorStrategy: "A pool of controlled meaning shifts. errorMechanism is only the listed token. The explanation goes in whyInferior and is not written after the token. Word order alone is not a wrong answer. A second defensible option is recorded separately.",
  verificationStrategy: "Structural frame check, then an independent judge. Doubtful equivalence stays in editorial review. The judge does not certify the key.",
  errorMechanisms: ["scope_widening", "quantity_scope", "modality_shift", "polarity_reversal", "argument_swap", "causal_direction", "predicate_meaning", "tense_shift"],
  targetDifficulty: "hard",
  promptVersion: "item-model.restatement.v3.4",
});

export const translationModel = specified("translation", {
  graphRefs: [ref("question_type:translation"), ref("question_type:translation_en_tr"), ref("question_type:translation_tr_en")],
  itemModelId: "translation.meaning_preservation",
  measuredConstruct: "preservation of modality, scope, quantity, cause, contrast, purpose, role and tense across languages",
  sourcePolicy: "The writer creates one original sentence, an explicit direction, role labels and scope. Both languages are required. Empty fields fail the source gate. This type does not use a production source record. A word-order change is not a wrong answer.",
  stemStructure: "The source sentence is the stem. The options are target-language renderings.",
  answerStructure: "One target rendering that keeps the actors, quantity, scope, modality, polarity, tense, condition and causal direction. Do not move an actor onto another role. Do not add only or solely. A writer claim of preserved is not proof.",
  distractorStrategy: "Each distractor records the relation it changes. errorMechanism is only the listed token. The explanation goes in whyInferior. A natural paraphrase is not counted as an error.",
  verificationStrategy: "Direction and frame check, then an independent judge. Doubtful equivalence goes to editorial review and is not an automatic pass.",
  errorMechanisms: ["scope_shift", "quantity_shift", "modality_shift", "polarity_reversal", "causal_direction", "contrast_shift", "purpose_shift", "role_reversal", "tense_shift", "omitted_qualifier"],
  targetDifficulty: "hard",
  promptVersion: "item-model.translation.v3.4",
});

export const readingModel = specified("reading_comprehension", {
  graphRefs: [ref("question_type:reading_comprehension")],
  itemModelId: "reading.evidence_based",
  measuredConstruct: "four questions on one original passage, each tied to its own planned proposition, function and evidence span",
  sourcePolicy: "A granted production source with a URL, DOI or document id, a topic and fact notes. The model may write an original passage only from those notes. The same response carries one plan of four questions. Each entry has its own proposition id and a different evidence span id, plus a tested proposition and a cognitive operation. A proposition id is not an evidence reference and is not cognitive diversity. A function label is not proof that the question performs that operation. A near copy of a passage sentence is a lookup, not an inference and not a hard item. An empty source list stops the package. Official exam text is not a source. Pilot length is the observed 154–312 words and is not a permanent rule. Source fidelity stays unchecked until an independent review.",
  stemStructure: "One passage id shared by four questions. Each question uses its own plan slot: function, evidence span id, tested proposition and cognitive operation. The key may cite only that evidence span id. Four different functions are not required. Do not copy a passage sentence into the key and label it inference.",
  answerStructure: "One option whose evidence span occurs in the passage. The span locates text. It does not prove the key. A near copy of a passage sentence is a direct lookup.",
  distractorStrategy: "Four distinct wrong texts. Mechanisms may repeat. A quote match is not semantic proof.",
  verificationStrategy: "Source rights, pilot length and quote location, then an independent judge. The package is complete only when all four questions clear. Quote presence is not semantic proof.",
  errorMechanisms: ["unsupported_detail", "opposite_claim", "out_of_passage", "partial_evidence", "wrong_operation"],
  targetDifficulty: "hard",
  promptVersion: "item-model.reading.v3.4",
});

const unimplemented: { questionType: ItemQuestionType; graphRefs: NodeRef[]; construct: string; strategy: string }[] = [
  { questionType: "vocabulary", graphRefs: [ref("question_type:vocabulary")], construct: "word meaning in context", strategy: "Context, collocation and near-synonym candidates." },
  { questionType: "grammar", graphRefs: [ref("question_type:grammar")], construct: "a grammatical constraint", strategy: "Controlled syntax and selective constraints." },
  { questionType: "cloze", graphRefs: [ref("question_type:cloze")], construct: "local and passage-level closure", strategy: "A coherent passage first, then the gaps." },
  { questionType: "sentence_completion", graphRefs: [ref("question_type:sentence_completion")], construct: "discourse continuation", strategy: "A discourse frame, a natural continuation and compared options." },
  { questionType: "dialogue", graphRefs: [ref("question_type:dialogue_completion")], construct: "speaker purpose and turn fit", strategy: "Speech act, contextual fit and turn sequence." },
  { questionType: "paragraph_completion", graphRefs: [ref("question_type:paragraph_completion")], construct: "paragraph unity", strategy: "Reference and topic progression." },
  { questionType: "irrelevant_sentence", graphRefs: [ref("question_type:irrelevant_sentence")], construct: "discourse disruption", strategy: "A coherent paragraph plus one disrupting sentence." },
];

function unimplementedModel(entry: (typeof unimplemented)[number]): ItemModelDefinition {
  return {
    questionType: entry.questionType,
    graphRefs: entry.graphRefs,
    itemModelId: `${entry.questionType}.unimplemented`,
    measuredConstruct: entry.construct,
    targetDifficulty: "medium",
    sourcePolicy: "Not specified. This type has no producer.",
    stemStructure: "Not specified.",
    answerStructure: "Not specified.",
    distractorStrategy: entry.strategy,
    verificationStrategy: "Not specified.",
    reviewStatus: "unimplemented",
    errorMechanisms: [],
    promptVersion: "item-model.unimplemented",
    implemented: false,
  };
}

export const itemModels: Record<ItemQuestionType, ItemModelDefinition> = {
  restatement: restatementModel,
  translation: translationModel,
  reading_comprehension: readingModel,
  ...Object.fromEntries(unimplemented.map((entry) => [entry.questionType, unimplementedModel(entry)])),
} as Record<ItemQuestionType, ItemModelDefinition>;

export function itemModel(questionType: ItemQuestionType): ItemModelDefinition {
  return itemModels[questionType];
}

export function requireImplemented(questionType: ItemQuestionType): ItemModelDefinition {
  const model = itemModel(questionType);
  if (!model.implemented) throw new Error(`${questionType} has no item-model producer`);
  return model;
}

export function requireModelId(itemModelId: string): ItemModelDefinition {
  const model = Object.values(itemModels).find((entry) => entry.itemModelId === itemModelId);
  if (!model) throw new Error(`unknown item model ${itemModelId}`);
  if (!model.implemented) throw new Error(`${model.questionType} has no item-model producer`);
  return model;
}

export const registryCoverage = {
  named: itemQuestionTypes.length,
  implemented: implementedItemTypes.length,
} as const;
