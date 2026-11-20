import { sourceSentence, trapItems, type TrapItem } from "./cognitive-trap";
import { pilotItems } from "./cognitive-trap-pilot";
import { assessKey } from "./core";
import { assessParaphraseKey, type ParaphraseDistance } from "./paraphrase-key";
import { qualityItems } from "./quality-profile";
import { selectMisreadingMechanisms } from "./misreading-mechanisms";
import { restatementModel, translationModel } from "./registry";
import { taxonomyLiveItems } from "./taxonomy-live";

/**
 * Four unused medium sources for a later Cognitive Trap First run.
 * This module does not call a provider, does not publish, and does not approve gold.
 * observedDifficulty stays null until student responses exist.
 */
export const mediumReproAuthorization = "medium-repro-sources-only";

export type MediumReproEntry = {
  designTarget: "medium";
  cognitiveDemand: string;
  meaningMap: { preserved: string[]; relations: string[] };
  /** How this event skeleton differs from earlier medium items. Not a prompt field. */
  priorOverlap: string;
  item: TrapItem;
};

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

export function mediumReproItems(): MediumReproEntry[] {
  const claim = "The reviewers did not claim that their second reading showed a clearer result than the first.";
  const claimKey = "The reviewers did not assert that their second reading had shown a clearer outcome than their first reading.";
  const freezer = "If the samples had stayed in the freezer until noon, the technicians would not have repeated the afternoon test.";
  const freezerKey = "The technicians would not have carried out the afternoon test a second time if the samples had remained inside the freezer until noon.";
  const scan = "The editor requested a second scan because the first was too faint, so that readers would check the dates on them.";
  const scanKey = "Editör ikinci taramayı istedi, çünkü ilki fazla silikti; amaç okuyucuların üzerlerindeki tarihleri kontrol etmesiydi.";
  const drafts = "Tüm taslaklar kurula dağıtıldı, ama onların çoğu sonradan ikinci okumaya alınmadı.";
  const draftsKey = "All of the drafts were distributed to the board, but most of them were not later taken up for the second reading.";
  return [
    {
      designTarget: "medium",
      cognitiveDemand: "Keep the negation on the claim, not on the result, and keep the second reading as what was said to show a clearer result.",
      meaningMap: {
        preserved: ["the reviewers did not make the claim", "the unmade claim is that their second reading showed a clearer result than the first", "the clearer result itself is not asserted"],
        relations: ["epistemic claim", "negation scope", "comparison"],
      },
      priorOverlap: "Not the registry or clinic evidence frame. Those report an absence of a trace or a finding. This sentence withholds a claim about what a reading showed.",
      item: {
        id: "medium-repro-restatement-1",
        questionType: "restatement",
        direction: null,
        designTarget: "medium",
        preservedRelations: ["negation scopes over the claim", "second reading showed a clearer result than the first", "the result is not asserted"],
        source: { kind: "restatement", proposition: claim, frame: { scope: "the reviewers' second reading and the first", modality: "reported claim", polarity: "negative", tense: "past", argumentStructure: "The reviewers did not claim that their second reading showed a clearer result than the first." } },
        core: core(restatementModel.promptVersion, claim, claimKey, "proposition"),
      },
    },
    {
      designTarget: "medium",
      cognitiveDemand: "Keep the counterfactual condition that the samples stayed in the freezer until noon and the consequent that the afternoon test would not have been repeated.",
      meaningMap: {
        preserved: ["staying in the freezer until noon is the unreal condition", "under that condition the afternoon test would not have been repeated", "the past counterfactual implicates that the samples did not stay until noon and that the technicians did repeat the test; the sentence asserts the dependence, not those two facts separately"],
        relations: ["condition", "counterfactual", "time endpoint"],
      },
      priorOverlap: "Shares an unreal past with the ferry and harbor sentences. The event is a state held until noon, not an earlier completion that removes a need, and there is no exclusive pair of recipients.",
      item: {
        id: "medium-repro-restatement-2",
        questionType: "restatement",
        direction: null,
        designTarget: "medium",
        preservedRelations: ["if the samples had remained in the freezer until noon", "the technicians would not have repeated the afternoon test", "unreal past"],
        source: { kind: "restatement", proposition: freezer, frame: { scope: "the samples and the afternoon test", modality: "counterfactual", polarity: "negative", tense: "unreal past", argumentStructure: "If the samples had stayed frozen until noon, the technicians would not have repeated the afternoon test. Both the stay and the non-repetition are presented as contrary to what happened." } },
        core: core(restatementModel.promptVersion, freezer, freezerKey, "proposition"),
      },
    },
    {
      designTarget: "medium",
      cognitiveDemand: "Keep the faint first scan as the cause of the request, and the purpose that readers would check the dates on those scans.",
      meaningMap: {
        preserved: ["the editor requested a second scan", "the cause is that the first scan was too faint", "the purpose is that readers would check the dates on the scans"],
        relations: ["cause", "purpose", "expected action"],
      },
      priorOverlap: "Not the clinic purpose frame. That one is an unreal possibility plus a negative purpose. This one is an actual request, a because-cause, and an expected check.",
      item: {
        id: "medium-repro-translation-en_tr",
        questionType: "translation",
        direction: "en_tr",
        designTarget: "medium",
        preservedRelations: ["second scan requested because the first was too faint", "purpose that readers would check the dates", "them refers to the scans"],
        source: { kind: "translation", sourceSentence: scan, sourceLanguage: "en", targetLanguage: "tr", roles: ["editor", "readers"], scope: "the faint scan and the dates on it" },
        core: core(translationModel.promptVersion, scan, scanKey, "source_sentence"),
      },
    },
    {
      designTarget: "medium",
      cognitiveDemand: "Keep all drafts as distributed, most of them as not later included, and both events as passive.",
      meaningMap: {
        preserved: ["all of the drafts were distributed to the board", "most of them were not later taken up for the second reading", "them refers to the drafts", "both clauses are passive"],
        relations: ["quantity", "reference", "passive", "time"],
      },
      priorOverlap: "Not the snow or meeting frame. Those have every agent acting on their own item before an event, with only two items moving. This one is a passive universal and a passive majority, with no exclusive two.",
      item: {
        id: "medium-repro-translation-tr_en",
        questionType: "translation",
        direction: "tr_en",
        designTarget: "medium",
        preservedRelations: ["all drafts were distributed to the board", "most of them were not later taken up for the second reading", "passive voice"],
        source: { kind: "translation", sourceSentence: drafts, sourceLanguage: "tr", targetLanguage: "en", roles: ["drafts", "board"], scope: "all drafts distributed, most not included later" },
        core: core(translationModel.promptVersion, drafts, draftsKey, "source_sentence"),
      },
    },
  ];
}

export function usedMediumSources(): Set<string> {
  return new Set(
    [...trapItems(), ...pilotItems(), ...qualityItems().map((entry) => entry.item), ...taxonomyLiveItems().map((entry) => entry.item)].map((item) => sourceSentence(item)),
  );
}

export type MediumReproGate = {
  id: string;
  proceed: boolean;
  failure: string | null;
  keyFailures: string[];
  distance: ParaphraseDistance;
  meaning: "fail" | "unverified" | "not_run";
  mechanisms: number;
  meaningProven: false;
  approvesTarget: false;
  observedDifficulty: null;
};

/** A shown meaning failure or a near copy blocks distractors. Unverified is not approval. */
export function mediumReproGate(item: TrapItem): MediumReproGate {
  const sentence = sourceSentence(item);
  const model = item.questionType === "restatement" ? restatementModel : translationModel;
  const key = assessKey(model, item.source, item.core);
  const paraphrase = assessParaphraseKey(sentence, item.core.correctAnswer);
  const support = selectMisreadingMechanisms(sentence, item.questionType);
  const meaning = key.meaning.status;
  const blocked = !key.valid || meaning === "fail" || paraphrase.failures.includes("key_near_copy") || paraphrase.failures.includes("scope_not_carried") || support.status !== "selected";
  const failure = !key.valid || meaning === "fail"
    ? key.failures[0] ?? "key_meaning_failed"
    : paraphrase.failures[0] ?? (support.status !== "selected" ? support.failure ?? "mechanisms" : null);
  return {
    id: item.id,
    proceed: !blocked,
    failure: blocked ? failure : null,
    keyFailures: key.failures,
    distance: paraphrase.distance,
    meaning,
    mechanisms: support.supportableMisreadings,
    meaningProven: false,
    approvesTarget: false,
    observedDifficulty: null,
  };
}

export function assessMediumRepro(): { ready: boolean; failures: string[]; gates: MediumReproGate[]; providerCalls: 0; studentBankWrites: 0; goldApproved: false } {
  const used = usedMediumSources();
  const failures: string[] = [];
  const entries = mediumReproItems();
  if (entries.length !== 4) failures.push("item_count");
  if (entries.some((entry) => entry.designTarget !== "medium" || entry.item.designTarget !== "medium")) failures.push("design_targets");
  const types = entries.map((entry) => `${entry.item.questionType}:${entry.item.direction ?? "restatement"}`);
  if (types.filter((type) => type === "restatement:restatement").length !== 2) failures.push("restatement_count");
  if (types.filter((type) => type === "translation:en_tr").length !== 1 || types.filter((type) => type === "translation:tr_en").length !== 1) failures.push("translation_directions");
  const gates = entries.map((entry) => mediumReproGate(entry.item));
  for (const entry of entries) {
    const sentence = sourceSentence(entry.item);
    if (used.has(sentence)) failures.push(`${entry.item.id}:reused_source`);
    const gate = gates.find((item) => item.id === entry.item.id)!;
    if (!gate.proceed) failures.push(`${entry.item.id}:${gate.failure}`);
    if (entry.item.questionType === "restatement" && gate.distance !== "independent") failures.push(`${entry.item.id}:${gate.distance}`);
    if (gate.meaningProven || gate.approvesTarget || gate.observedDifficulty !== null) failures.push(`${entry.item.id}:false_pass`);
  }
  return { ready: failures.length === 0, failures, gates, providerCalls: 0, studentBankWrites: 0, goldApproved: false };
}
