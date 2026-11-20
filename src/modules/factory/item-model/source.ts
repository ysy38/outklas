import { looksTurkish, sentences, words } from "@/modules/analysis/surface";
import { declaredProposition } from "./core";
import { pilotPassageWordBand, readingQuestionFunctions, tenseLabelMax, type ItemModelDefinition, type ItemSource, type MeaningFrame, type SourceRecord, type TranslationDirection } from "./contract";

export type SourceAssessment = { sufficient: boolean; failures: string[] };

const filled = (value: string) => value.trim().length > 0;

function frameFailures(frame: MeaningFrame): string[] {
  const failures: string[] = [];
  if (!filled(frame.scope)) failures.push("scope_missing");
  if (!filled(frame.modality)) failures.push("modality_missing");
  if (frame.polarity !== "affirmative" && frame.polarity !== "negative") failures.push("polarity_missing");
  if (!filled(frame.tense)) failures.push("tense_missing");
  else if (frame.tense.trim().length > tenseLabelMax) failures.push("tense_too_long");
  if (!filled(frame.argumentStructure)) failures.push("argument_structure_missing");
  return failures;
}

export type SourceContext = {
  sources?: SourceRecord[];
  expectedDirection?: TranslationDirection;
};

/** A granted production note. Official exam text and unclear rights do not qualify. */
export function productionSourceFailures(records: SourceRecord[] | undefined, sourceId: string): string[] {
  if (!records?.length) return ["production_source_missing"];
  const found = records.find((record) => record.sourceId === sourceId);
  if (!found) return ["source_unknown"];
  if (found.role === "official_exam") return ["official_text_not_a_source"];
  if (found.usageRights !== "granted") return [found.usageRights === "refused" ? "usage_rights_refused" : "usage_rights_unclear"];
  if (!found.locator.value.trim() || !found.topic.trim() || !found.factNotes.trim()) return ["source_record_incomplete"];
  return [];
}

export function passageLength(text: string): { wordCount: number; insidePilotBand: boolean } {
  const wordCount = words(text).length;
  return { wordCount, insidePilotBand: wordCount >= pilotPassageWordBand.min && wordCount <= pilotPassageWordBand.max };
}

/** A source that cannot be checked does not proceed to a stem. */
export function assessSource(model: ItemModelDefinition, source: ItemSource, context: SourceContext = {}): SourceAssessment {
  const failures: string[] = [];
  if (model.questionType === "restatement") {
    if (source.kind !== "restatement") failures.push("source_kind");
    else {
      if (!filled(source.proposition)) failures.push("proposition_missing");
      failures.push(...frameFailures(source.frame));
    }
  } else if (model.questionType === "translation") {
    if (source.kind !== "translation") failures.push("source_kind");
    else {
      if (!filled(source.sourceSentence)) failures.push("source_sentence_missing");
      if (source.sourceLanguage === source.targetLanguage) failures.push("language_direction");
      if (!source.roles.some(filled)) failures.push("roles_missing");
      if (!filled(source.scope)) failures.push("scope_missing");
      const direction = `${source.sourceLanguage}_${source.targetLanguage}`;
      if (context.expectedDirection && direction !== context.expectedDirection) failures.push("direction_mismatch");
      const sourceIsTurkish = looksTurkish(source.sourceSentence);
      if (source.sourceLanguage === "tr" && !sourceIsTurkish) failures.push("source_language_mismatch");
      if (source.sourceLanguage === "en" && sourceIsTurkish) failures.push("source_language_mismatch");
    }
  } else if (model.questionType === "reading_comprehension") {
    if (source.kind !== "reading") failures.push("source_kind");
    else {
      if (!filled(source.passageId)) failures.push("passage_id_missing");
      failures.push(...productionSourceFailures(context.sources, source.sourceId));
      if (!filled(source.passage)) failures.push("passage_missing");
      else {
        if (sentences(source.passage).length < 2) failures.push("passage_too_short");
        if (!passageLength(source.passage).insidePilotBand) failures.push("passage_outside_pilot_band");
      }
      const plan = source.questionPlan;
      if (plan.length !== 4) failures.push("question_plan_missing");
      else {
        const ids = plan.map((entry) => entry.propositionId.trim());
        const evidenceIds = plan.map((entry) => entry.evidenceSpanId.trim());
        const claims = plan.map((entry) => declaredProposition(entry.testedProposition));
        const operations = plan.map((entry) => entry.cognitiveOperation.trim());
        if (ids.some((id) => !id) || evidenceIds.some((id) => !id) || claims.some((claim) => !claim) || operations.some((operation) => !operation) || plan.some((entry) => !readingQuestionFunctions.includes(entry.questionFunction))) failures.push("question_plan_missing");
        if (new Set(ids.filter(Boolean)).size !== 4 || new Set(claims.filter(Boolean)).size !== 4) failures.push("repeated_proposition");
        if (new Set(evidenceIds.filter(Boolean)).size !== 4) failures.push("repeated_evidence");
        if (plan.some((entry) => entry.evidenceSpanId.trim() && entry.evidenceSpanId.trim() === entry.propositionId.trim())) failures.push("evidence_id_is_proposition");
      }
    }
  } else failures.push("unimplemented_source");
  return { sufficient: failures.length === 0, failures };
}
