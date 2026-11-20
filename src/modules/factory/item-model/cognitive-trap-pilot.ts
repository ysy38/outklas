import { assessKey } from "./core";
import { sourceSentence, trapItems, type TrapItem } from "./cognitive-trap";
import { restatementModel, translationModel } from "./registry";

export const pilotAuthorization = "cognitive-trap-pilot-v1";
export const pilotOutputDir = ".data/analysis/_factory/cognitive-trap/pilot-v1";

function core(promptVersion: string, stem: string, answer: string, reference: string): TrapItem["core"] {
  return {
    stem,
    correctAnswer: answer,
    constructEvidence: "Actors, quantity, modality, polarity and the link between clauses stay in place.",
    correctnessRationale: "Fixed before either distractor method. A clean checker result is unverified, not proof.",
    sourceReferences: [reference],
    modelVersion: "fixed-before-distractors",
    promptVersion,
    meaningDelta: "preserved",
  };
}

/**
 * A second sample. These sentences are not the six used in the first comparison.
 * The pilot is prepared and is not started by this module.
 */
export function pilotItems(): TrapItem[] {
  const maps = "Although the archive could store every map, the curator decided that the two torn maps should be copied before the rest were moved.";
  const mapsKey = "The curator decided that the two torn maps should be copied before the rest were moved, although the archive could store every map.";
  const depot = "Had the drivers left the depot before dawn, the clinic would not have missed the morning delivery.";
  const depotKey = "The clinic would not have missed the morning delivery if the drivers had left the depot before dawn.";
  const issue = "While a few editors called the timeline unrealistic, the printed issue still reached shops on the promised day.";
  const issueKey = "The printed issue still reached shops on the promised day, but a few editors called the timeline unrealistic.";
  const hall = "Although the museum had room for all four sculptures, the registrar asked that the two cracked ones be photographed before any of them left the hall.";
  const hallKey = "Müzede dört heykelin tümü için yer vardı, ama kayıt görevlisi çatlak iki heykelin salondan çıkmadan önce fotoğraflanmasını istedi.";
  const trains = "The committee found no sign that the new schedule reduced delays, yet it did not dismiss a shorter wait for the evening trains.";
  const trainsKey = "Komite yeni programın gecikmeleri azalttığına dair iz bulamadı, ama akşam trenleri için daha kısa bekleyişi reddetmedi.";
  const boats = "Fırtınadan önce her balıkçı kendi ağını topladı, ama yalnızca iki tekne limana döndü.";
  const boatsKey = "Before the storm, every fisher gathered their own net, but only two boats returned to the harbor.";
  return [
    {
      id: "pilot-restatement-1",
      questionType: "restatement",
      direction: null,
      preservedRelations: ["concession", "every map", "two torn maps copied first"],
      source: { kind: "restatement", proposition: maps, frame: { scope: "every map, two torn maps", modality: "necessity", polarity: "affirmative", tense: "past", argumentStructure: "The archive could store every map, yet the curator put the two torn maps first." } },
      core: core(restatementModel.promptVersion, maps, mapsKey, "proposition"),
    },
    {
      id: "pilot-restatement-2",
      questionType: "restatement",
      direction: null,
      preservedRelations: ["counterfactual", "earlier departure avoids the missed delivery"],
      source: { kind: "restatement", proposition: depot, frame: { scope: "the morning delivery", modality: "counterfactual", polarity: "negative", tense: "past_perfect_before_conditional", argumentStructure: "An earlier departure would have kept the morning delivery." } },
      core: core(restatementModel.promptVersion, depot, depotKey, "proposition"),
    },
    {
      id: "pilot-restatement-3",
      questionType: "restatement",
      direction: null,
      preservedRelations: ["concession", "a few editors", "the issue still arrived"],
      source: { kind: "restatement", proposition: issue, frame: { scope: "a few editors and the printed issue", modality: "stated", polarity: "affirmative", tense: "past", argumentStructure: "A few editors doubted the timeline, and the issue still arrived on the promised day." } },
      core: core(restatementModel.promptVersion, issue, issueKey, "proposition"),
    },
    {
      id: "pilot-translation-en_tr-1",
      questionType: "translation",
      direction: "en_tr",
      preservedRelations: ["room for all four", "two cracked sculptures photographed first", "before leaving the hall"],
      source: { kind: "translation", sourceSentence: hall, sourceLanguage: "en", targetLanguage: "tr", roles: ["registrar"], scope: "four sculptures, two photographed first" },
      core: core(translationModel.promptVersion, hall, hallKey, "source_sentence"),
    },
    {
      id: "pilot-translation-en_tr-2",
      questionType: "translation",
      direction: "en_tr",
      preservedRelations: ["no sign of fewer delays", "a shorter evening wait not dismissed"],
      source: { kind: "translation", sourceSentence: trains, sourceLanguage: "en", targetLanguage: "tr", roles: ["committee"], scope: "delays and the evening wait" },
      core: core(translationModel.promptVersion, trains, trainsKey, "source_sentence"),
    },
    {
      id: "pilot-translation-tr_en-1",
      questionType: "translation",
      direction: "tr_en",
      preservedRelations: ["every fisher gathered their own net", "only two boats returned", "before the storm"],
      source: { kind: "translation", sourceSentence: boats, sourceLanguage: "tr", targetLanguage: "en", roles: ["fishers"], scope: "every net, only two boats" },
      core: core(translationModel.promptVersion, boats, boatsKey, "source_sentence"),
    },
  ];
}

export function pilotDisjointFromFirstSample(): boolean {
  const first = new Set(trapItems().map((item) => sourceSentence(item)));
  return pilotItems().every((item) => {
    const sentence = sourceSentence(item);
    const model = item.questionType === "restatement" ? restatementModel : translationModel;
    return !first.has(sentence) && assessKey(model, item.source, item.core).valid && assessKey(model, item.source, item.core).meaning.status !== "fail";
  });
}
