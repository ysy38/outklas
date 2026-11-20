import { pilotItems } from "./cognitive-trap-pilot";
import { sourceSentence, trapItems, type TrapItem } from "./cognitive-trap";
import { assessKey } from "./core";
import { assessParaphraseKey, type ParaphraseDistance } from "./paraphrase-key";
import { qualityItems } from "./quality-profile";
import { selectMisreadingMechanisms } from "./misreading-mechanisms";
import { restatementModel, translationModel } from "./registry";

/** Separate from quality-repair-pilot-v1. The live call stays closed until this token is passed. */
export const taxonomyLiveAuthorization = "semantic-taxonomy-live-v1";
export const taxonomyLiveOutputDir = ".data/analysis/_factory/cognitive-trap/taxonomy-live-v1";

export const taxonomyLiveForbiddenDirs = [
  ".data/analysis/_factory/cognitive-trap/openrouter-v1",
  ".data/analysis/_factory/cognitive-trap/pilot-v1",
  ".data/analysis/_factory/cognitive-trap/quality-v1",
  ".data/analysis/_factory/cognitive-trap/quality-judge-replay-v1",
  ".data/analysis/_factory/editorial-gold/v1",
] as const;

export type TaxonomyDesignTarget = "medium" | "hard";

export type TaxonomyLiveEntry = {
  designTarget: TaxonomyDesignTarget;
  /** Design note. It is not measured difficulty and it is not a quality score. */
  cognitiveDemand: string;
  meaningMap: { preserved: string[]; relations: string[] };
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

/**
 * Four original academic sentences. None is a source from the comparison, the pilot, or quality-v1.
 * The design target is a request. It is not measured difficulty.
 */
export function taxonomyLiveItems(): TaxonomyLiveEntry[] {
  const registry = "Although the registry held every laboratory log from the trial, the archivist found no trace that the two withdrawn samples had been filed with them.";
  const registryKey = "Although the registry kept every laboratory log from the trial, its archivist discovered no trace that the two withdrawn samples had been filed with those logs.";
  const embargo = "Had the editors completed the citation check before the embargo, only the two contested appendices would have been released to the preprint server.";
  const embargoKey = "Only the two contested appendices would have been released to the preprint server if the editors had finished checking the citations ahead of the embargo.";
  const referees = "Although the referees found no evidence that the supplement altered the primary outcome, they left open a slower decline in the two secondary measures.";
  const refereesKey = "Hakemler, ekin birincil sonucu değiştirdiğine dair kanıt bulamadılar; yine de iki ikincil ölçütte daha yavaş düşüş ihtimalini açık bıraktılar.";
  const board = "Hakem kurulu taslağı arşive girmeden önce okumuş olsaydı, yalnızca iki itirazlı tablo dış değerlendiricilere gidecekti.";
  const boardKey = "Only the two disputed tables would have gone to the external reviewers if the board had read the draft before it entered the archive.";
  return [
    {
      designTarget: "medium",
      cognitiveDemand: "Keep the concession, every log in the registry, and the absence of evidence that the two samples were filed with those logs.",
      meaningMap: {
        preserved: ["every laboratory log was held in the registry", "no trace that the two withdrawn samples had been filed with those logs", "them refers to the laboratory logs"],
        relations: ["concession", "quantity", "evidence", "reference"],
      },
      item: {
        id: "taxonomy-restatement-medium",
        questionType: "restatement",
        direction: null,
        designTarget: "medium",
        preservedRelations: ["every laboratory log", "no trace that the two samples had been filed with those logs", "concession"],
        source: { kind: "restatement", proposition: registry, frame: { scope: "every log and two withdrawn samples", modality: "stated", polarity: "negative", tense: "past", argumentStructure: "Every log was held, and there was no trace that the two withdrawn samples had been filed with those logs." } },
        core: core(restatementModel.promptVersion, registry, registryKey, "proposition"),
      },
    },
    {
      designTarget: "hard",
      cognitiveDemand: "Keep the unreal past, release of only two appendices to the preprint server, and the order ahead of the embargo.",
      meaningMap: {
        preserved: ["the citation check was not completed before the embargo", "only two appendices would have been released", "the release did not happen"],
        relations: ["counterfactual", "condition", "time", "exclusive quantity"],
      },
      item: {
        id: "taxonomy-restatement-hard",
        questionType: "restatement",
        direction: null,
        designTarget: "hard",
        preservedRelations: ["counterfactual completion", "only two appendices", "before the embargo"],
        source: { kind: "restatement", proposition: embargo, frame: { scope: "only the two contested appendices", modality: "counterfactual", polarity: "affirmative", tense: "past_perfect_before_conditional", argumentStructure: "An earlier citation check would have released only the two contested appendices." } },
        core: core(restatementModel.promptVersion, embargo, embargoKey, "proposition"),
      },
    },
    {
      designTarget: "medium",
      cognitiveDemand: "Keep absence of evidence about the primary outcome distinct from an open possibility about two secondary measures.",
      meaningMap: {
        preserved: ["no evidence that the supplement altered the primary outcome", "a slower decline in two secondary measures stays possible", "the concession"],
        relations: ["concession", "evidence", "modality", "quantity"],
      },
      item: {
        id: "taxonomy-translation-en_tr",
        questionType: "translation",
        direction: "en_tr",
        designTarget: "medium",
        preservedRelations: ["no evidence of a changed primary outcome", "slower decline left open", "two secondary measures"],
        source: { kind: "translation", sourceSentence: referees, sourceLanguage: "en", targetLanguage: "tr", roles: ["referees"], scope: "primary outcome and two secondary measures" },
        core: core(translationModel.promptVersion, referees, refereesKey, "source_sentence"),
      },
    },
    {
      designTarget: "hard",
      cognitiveDemand: "Keep the unreal reading, the exclusive two tables, and the time before the draft entered the archive.",
      meaningMap: {
        preserved: ["the board did not read the draft before the archive", "only two disputed tables would have gone out", "the transfer did not happen"],
        relations: ["counterfactual", "condition", "time", "exclusive quantity"],
      },
      item: {
        id: "taxonomy-translation-tr_en",
        questionType: "translation",
        direction: "tr_en",
        designTarget: "hard",
        preservedRelations: ["counterfactual reading", "only two disputed tables", "before entering the archive"],
        source: { kind: "translation", sourceSentence: board, sourceLanguage: "tr", targetLanguage: "en", roles: ["board"], scope: "only two disputed tables" },
        core: core(translationModel.promptVersion, board, boardKey, "source_sentence"),
      },
    },
  ];
}

export type TaxonomyKeyGate = {
  id: string;
  proceed: boolean;
  failure: string | null;
  distance: ParaphraseDistance;
  meaning: "fail" | "unverified" | "not_run";
  meaningProven: false;
  approvesTarget: false;
};

/**
 * A near copy, a dropped scope, or a shown meaning failure blocks distractors.
 * An unverified cross-language key may proceed. Unverified is not approval.
 */
export function taxonomyKeyGate(item: TrapItem): TaxonomyKeyGate {
  const sentence = sourceSentence(item);
  const model = item.questionType === "restatement" ? restatementModel : translationModel;
  const key = assessKey(model, item.source, item.core);
  const paraphrase = assessParaphraseKey(sentence, item.core.correctAnswer);
  const meaning = key.meaning.status;
  const blocked = !key.valid || meaning === "fail" || paraphrase.failures.includes("key_near_copy") || paraphrase.failures.includes("scope_not_carried");
  return {
    id: item.id,
    proceed: !blocked,
    failure: blocked ? "key_equivalence_uncertain" : null,
    distance: paraphrase.distance,
    meaning,
    meaningProven: false,
    approvesTarget: false,
  };
}

export function priorTaxonomySources(): Set<string> {
  return new Set(
    [...trapItems(), ...pilotItems(), ...qualityItems().map((entry) => entry.item)].map((item) => sourceSentence(item)),
  );
}

export function assessTaxonomyLive(): { ready: boolean; failures: string[]; gates: TaxonomyKeyGate[] } {
  const used = priorTaxonomySources();
  const failures: string[] = [];
  const entries = taxonomyLiveItems();
  const targets = entries.map((entry) => entry.designTarget);
  if (entries.length !== 4) failures.push("item_count");
  if (targets.filter((target) => target === "medium").length !== 2 || targets.filter((target) => target === "hard").length !== 2) failures.push("design_targets");
  const types = entries.map((entry) => `${entry.item.questionType}:${entry.item.direction ?? "restatement"}`);
  if (types.filter((type) => type === "restatement:restatement").length !== 2) failures.push("restatement_count");
  if (!types.includes("translation:en_tr") || !types.includes("translation:tr_en")) failures.push("translation_directions");
  const gates = entries.map((entry) => taxonomyKeyGate(entry.item));
  for (const entry of entries) {
    const sentence = sourceSentence(entry.item);
    if (used.has(sentence)) failures.push(`${entry.item.id}:reused_source`);
    const gate = gates.find((item) => item.id === entry.item.id)!;
    if (!gate.proceed) failures.push(`${entry.item.id}:${gate.failure}`);
    if (entry.item.questionType === "restatement" && gate.distance !== "independent") failures.push(`${entry.item.id}:${gate.distance}`);
    if (gate.meaningProven || gate.approvesTarget) failures.push(`${entry.item.id}:false_pass`);
    const support = selectMisreadingMechanisms(sentence, entry.item.questionType);
    if (support.status !== "selected") failures.push(`${entry.item.id}:${support.failure ?? "mechanisms"}`);
  }
  return { ready: failures.length === 0, failures, gates };
}
