import { trapItems, type TrapItem } from "./cognitive-trap";
import { pilotItems } from "./cognitive-trap-pilot";
import { assessKey } from "./core";
import { assessParaphraseKey } from "./paraphrase-key";
import { restatementModel, translationModel } from "./registry";

export const qualityRepairAuthorization = "quality-repair-pilot-v1";
export const qualityOutputDir = ".data/analysis/_factory/cognitive-trap/quality-v1";

export type QualityDesignTarget = "medium" | "hard";

function core(promptVersion: string, stem: string, answer: string, reference: string): TrapItem["core"] {
  return {
    stem,
    correctAnswer: answer,
    constructEvidence: "Actors, quantity, modality, polarity and the link between clauses stay in place.",
    correctnessRationale: "Fixed before distractors. A clean checker result is unverified, not proof.",
    sourceReferences: [reference],
    modelVersion: "fixed-before-distractors",
    promptVersion,
    meaningDelta: "preserved",
  };
}

/**
 * Four new sources. None of these sentences is in the first comparison or the six-item pilot.
 * The design target is a request. It is not measured difficulty.
 */
export function qualityItems(): { item: TrapItem; designTarget: QualityDesignTarget }[] {
  const door = "The night clerk kept the side door locked until the two late drivers had signed the log, even though the yard could hold every truck.";
  const doorKey = "The yard could hold every truck. Even so, the night clerk refused entry through the side door until the two late drivers had written their names in the log.";
  const ferry = "Had the ferry left before the fog, only the two island clinics would have received the morning serum.";
  const ferryKey = "Only the two clinics on the island stood to be given the morning serum, a handover that would have happened once the ferry had sailed earlier than the fog.";
  const font = "The editor did not claim that the new font reduced errors, yet she left open a shorter pause before the evening edition.";
  const fontKey = "Editör, yeni yazı tipinin hataları azalttığını ileri sürmedi; yine de akşam baskısından önceki daha kısa arayı ihtimal olarak açık bıraktı.";
  const snow = "Kar yağmadan önce her çoban kendi sürüsünü saydı, ama yalnızca iki sürü vadiye indi.";
  const snowKey = "Before the snow, every shepherd counted their own flock, but only two flocks descended into the valley.";
  return [
    {
      designTarget: "medium",
      item: {
        id: "quality-restatement-medium",
        questionType: "restatement",
        direction: null,
        designTarget: "medium",
        preservedRelations: ["every truck", "two late drivers", "door stayed locked until the signatures"],
        source: { kind: "restatement", proposition: door, frame: { scope: "every truck and two late drivers", modality: "stated", polarity: "affirmative", tense: "past", argumentStructure: "The yard could hold every truck, and the door stayed locked until the two drivers signed." } },
        core: core(restatementModel.promptVersion, door, doorKey, "proposition"),
      },
    },
    {
      designTarget: "hard",
      item: {
        id: "quality-restatement-hard",
        questionType: "restatement",
        direction: null,
        designTarget: "hard",
        preservedRelations: ["counterfactual departure", "only two clinics", "before the fog"],
        source: { kind: "restatement", proposition: ferry, frame: { scope: "only the two island clinics", modality: "counterfactual", polarity: "affirmative", tense: "past_perfect_before_conditional", argumentStructure: "An earlier sailing would have brought the serum only to the two island clinics." } },
        core: core(restatementModel.promptVersion, ferry, ferryKey, "proposition"),
      },
    },
    {
      designTarget: "medium",
      item: {
        id: "quality-translation-en_tr",
        questionType: "translation",
        direction: "en_tr",
        designTarget: "medium",
        preservedRelations: ["no claim of fewer errors", "a shorter pause left open", "before the evening edition"],
        source: { kind: "translation", sourceSentence: font, sourceLanguage: "en", targetLanguage: "tr", roles: ["editor"], scope: "errors and the pause before the evening edition" },
        core: core(translationModel.promptVersion, font, fontKey, "source_sentence"),
      },
    },
    {
      designTarget: "hard",
      item: {
        id: "quality-translation-tr_en",
        questionType: "translation",
        direction: "tr_en",
        designTarget: "hard",
        preservedRelations: ["every shepherd counted their own flock", "only two flocks descended", "before the snow"],
        source: { kind: "translation", sourceSentence: snow, sourceLanguage: "tr", targetLanguage: "en", roles: ["shepherds"], scope: "every flock counted, only two descended" },
        core: core(translationModel.promptVersion, snow, snowKey, "source_sentence"),
      },
    },
  ];
}

export function qualityProfileReady(): { ready: boolean; failures: string[] } {
  const used = new Set([...trapItems(), ...pilotItems()].map((item) => (item.source.kind === "translation" ? item.source.sourceSentence : item.source.kind === "restatement" ? item.source.proposition : "")));
  const failures: string[] = [];
  const targets = qualityItems().map((entry) => entry.designTarget);
  if (targets.filter((target) => target === "medium").length !== 2 || targets.filter((target) => target === "hard").length !== 2) failures.push("design_targets");
  for (const entry of qualityItems()) {
    const sentence = entry.item.source.kind === "translation" ? entry.item.source.sourceSentence : entry.item.source.kind === "restatement" ? entry.item.source.proposition : "";
    if (used.has(sentence)) failures.push(`${entry.item.id}:reused_source`);
    const model = entry.item.questionType === "restatement" ? restatementModel : translationModel;
    const key = assessKey(model, entry.item.source, entry.item.core);
    if (!key.valid || key.meaning.status === "fail") failures.push(`${entry.item.id}:${key.failures.join(",") || key.meaning.status}`);
    const paraphrase = assessParaphraseKey(sentence, entry.item.core.correctAnswer);
    if (paraphrase.failures.includes("scope_not_carried")) failures.push(`${entry.item.id}:scope_not_carried`);
    if (entry.item.questionType === "restatement" && paraphrase.distance !== "independent") failures.push(`${entry.item.id}:${paraphrase.distance}`);
    if (paraphrase.approvesTarget || paraphrase.meaningProven) failures.push(`${entry.item.id}:false_pass`);
  }
  return { ready: failures.length === 0, failures };
}
