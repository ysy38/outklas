import { looksTurkish } from "@/modules/analysis/surface";
import { normalized } from "../validator";
import { readingQuestionFunctions, type ItemCore, type ItemModelDefinition, type ItemSource } from "./contract";

export type KeyAssessment = { valid: boolean; failures: string[]; validity: "structural_only"; meaning: MeaningIntegrity };

export const meaningAreas = ["roles", "quantity", "modality", "polarity", "tense", "condition", "cause", "exclusivity"] as const;
export type MeaningArea = (typeof meaningAreas)[number];

/** A clean deterministic check is unverified. It is not a semantic pass. */
export type MeaningIntegrity = {
  status: "fail" | "unverified" | "not_run";
  failures: string[];
  areas: Record<MeaningArea, "fail" | "unverified">;
};

export type OperationFit = {
  status: "recorded" | "not_run";
  labeled: string | null;
  observed: "direct_lookup" | "unverified";
  labelAgrees: boolean | null;
  /** A passage lookup is not a hard candidate. Anything else stays unverified. */
  hardCandidate: false | "unverified";
};

export type ReadingDiversity = {
  status: "fail" | "review" | "unverified" | "not_run";
  failures: string[];
  /** Shared words between stems are not evidence that two questions differ. */
  surfaceOverlapIsNotDiversityProof: true;
  /** Distinct proposition ids are not evidence that the questions measure different meanings. */
  propositionIdentityIsNotCognitiveProof: true;
};

const diversityMark = { surfaceOverlapIsNotDiversityProof: true as const, propositionIdentityIsNotCognitiveProof: true as const };

function blankAreas(): MeaningIntegrity["areas"] {
  return { roles: "unverified", quantity: "unverified", modality: "unverified", polarity: "unverified", tense: "unverified", condition: "unverified", cause: "unverified", exclusivity: "unverified" };
}

export function meaningNotRun(): MeaningIntegrity {
  return { status: "not_run", failures: [], areas: blankAreas() };
}

const filled = (value: string) => value.trim().length > 0;

/** Identity of a declared proposition. Equal text is the same declaration. It is not a stem-overlap score. */
export function declaredProposition(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function referenceFailures(source: ItemSource, references: string[], extra: string[] = []): string[] {
  const known = new Set<string>(extra);
  if (source.kind === "restatement") known.add("proposition");
  if (source.kind === "translation") known.add("source_sentence");
  if (!references.length) return ["source_references_missing"];
  return references.filter((reference) => !known.has(reference)).map((reference) => `unknown_source_reference:${reference}`);
}

/**
 * Structural key gate. It runs before distractors.
 * A passed gate means the required fields are present. It does not mean the key is semantically true.
 */
export function assessKey(model: ItemModelDefinition, source: ItemSource, core: ItemCore | null): KeyAssessment {
  const failures: string[] = [];
  if (!core) return { valid: false, failures: ["core_missing"], validity: "structural_only", meaning: meaningNotRun() };
  if (!filled(core.stem)) failures.push("stem_missing");
  if (!filled(core.correctAnswer)) failures.push("answer_missing");
  if (!filled(core.constructEvidence)) failures.push("construct_evidence_missing");
  if (!filled(core.correctnessRationale)) failures.push("rationale_missing");
  if (!filled(core.modelVersion)) failures.push("model_version_missing");
  if (core.promptVersion !== model.promptVersion) failures.push("prompt_version_mismatch");
  if (core.meaningDelta !== "preserved") failures.push("key_meaning_shifted");
  const plannedEvidenceId = source.kind === "reading" && core.reading ? source.questionPlan.find((entry) => entry.propositionId === core.reading?.propositionId)?.evidenceSpanId : undefined;
  failures.push(...referenceFailures(source, core.sourceReferences, plannedEvidenceId ? [plannedEvidenceId] : []));
  if (source.kind === "restatement" && filled(core.correctAnswer) && normalized(core.correctAnswer) === normalized(source.proposition)) failures.push("key_copies_proposition");
  if (source.kind === "translation" && filled(core.correctAnswer)) {
    const turkish = looksTurkish(core.correctAnswer);
    if (source.targetLanguage === "tr" && !turkish) failures.push("target_language_mismatch");
    if (source.targetLanguage === "en" && turkish) failures.push("target_language_mismatch");
  }
  const meaning = source.kind === "reading" ? meaningNotRun() : assessMeaningIntegrity(sourceText(source), core.correctAnswer);
  if (meaning.status === "fail") failures.push(...meaning.failures);
  if (source.kind === "reading") {
    const reading = core.reading;
    const span = reading?.evidenceSpan;
    if (!reading || !readingQuestionFunctions.includes(reading.questionFunction)) failures.push("reading_question_missing");
    else if (!span?.id.trim() || !span.quote.trim()) failures.push("evidence_incomplete");
    else if (!source.passage.includes(span.quote)) failures.push("evidence_not_in_passage");
    else if (!plannedEvidenceId || span.id !== plannedEvidenceId) failures.push("evidence_id_mismatch");
    else if (!core.sourceReferences.includes(plannedEvidenceId)) failures.push("key_missing_evidence");
    if (!reading?.propositionId?.trim() || !reading?.testedProposition?.trim() || !reading?.cognitiveOperation?.trim()) failures.push("proposition_missing");
    else if (reading) {
      const planned = source.questionPlan.find((entry) => entry.propositionId === reading.propositionId);
      if (!planned) failures.push("proposition_not_in_plan");
      else if (declaredProposition(planned.testedProposition) !== declaredProposition(reading.testedProposition)) failures.push("proposition_mismatch");
      else if (planned.cognitiveOperation.trim() !== reading.cognitiveOperation.trim()) failures.push("operation_mismatch");
    }
  }
  return { valid: failures.length === 0, failures, validity: "structural_only", meaning };
}

/**
 * Set-level reading check. Different function labels do not count.
 * A repeated proposition id fails even when the answers use different words.
 * Distinct ids are not a pass. The same meaning under two ids goes to review.
 * Surface word overlap between stems is not consulted.
 */
export function assessReadingDiversity(questions: { propositionId: string | null; testedProposition: string | null; questionFunction: string | null }[]): ReadingDiversity {
  if (questions.length === 0) return { status: "not_run", failures: [], ...diversityMark };
  const failures: string[] = [];
  if (questions.length !== 4) failures.push("question_plan_missing");
  const ids = questions.map((question) => question.propositionId?.trim() ?? "");
  const claims = questions.map((question) => declaredProposition(question.testedProposition ?? ""));
  if (ids.some((id) => !id) || claims.some((claim) => !claim)) failures.push("proposition_missing");
  const presentIds = ids.filter(Boolean);
  const presentClaims = claims.filter(Boolean);
  if (new Set(presentIds).size !== presentIds.length || new Set(presentClaims).size !== presentClaims.length) failures.push("repeated_proposition");
  const signatures = presentClaims.map(meaningSignature).filter((signature) => signature.split(" ").length >= 3);
  if (new Set(signatures).size !== signatures.length) failures.push("same_meaning");
  const hard = failures.filter((failure) => failure !== "same_meaning");
  const status = hard.length ? "fail" : failures.includes("same_meaning") ? "review" : "unverified";
  return { status, failures: [...new Set(failures)], ...diversityMark };
}

function sourceText(source: ItemSource): string {
  return source.kind === "translation" ? source.sourceSentence : source.kind === "restatement" ? source.proposition : source.passage;
}

const roleForms: [string, string[]][] = [
  ["manager", ["müdür", "mudur", "manager", "managers"]],
  ["analyst", ["analistlerin", "analistlerin", "analistler", "analistin", "analist", "analysts", "analyst"]],
  ["auditor", ["denetçilerin", "denetçiler", "denetçinin", "denetçi", "denetciler", "denetci", "auditors", "auditor"]],
  ["committee", ["komitenin", "komite", "committee"]],
  ["board", ["kurul", "board"]],
  ["city", ["şehir", "sehir", "kent", "city"]],
  ["company", ["şirketin", "şirket", "sirket", "company"]],
];

const verbFamilies: Record<string, string[]> = {
  see: ["gördü", "gordu", "görür", "görmüş", "saw", "sees", "seen", "see"],
  ask: ["istemesine", "istedi", "istiyor", "asked", "asks", "wanted", "wants"],
  argue: ["savundu", "savunuyor", "argued", "argues"],
};

function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/üçte\s+bir\w*/g, " fractionthird ")
    .replace(/\b(one|a)\s+third\b/g, " fractionthird ")
    .replace(/\bbir\s+kıs\w*/g, " part ")
    .replace(/\bone\s+part\b/g, " part ");
}

function firstRole(text: string): string | null {
  const lower = fold(text);
  let found: { role: string; pos: number } | null = null;
  for (const [role, forms] of roleForms) {
    for (const form of forms) {
      const pos = lower.indexOf(form);
      if (pos >= 0 && (found === null || pos < found.pos)) found = { role, pos };
    }
  }
  return found?.role ?? null;
}

function nearestRoleBefore(text: string, verb: string): string | null {
  const lower = fold(text);
  const at = lower.indexOf(verb);
  if (at < 0) return null;
  const before = lower.slice(0, at);
  let found: { role: string; pos: number } | null = null;
  for (const [role, forms] of roleForms) {
    for (const form of forms) {
      const pos = before.lastIndexOf(form);
      if (pos >= 0 && (found === null || pos > found.pos)) found = { role, pos };
    }
  }
  return found?.role ?? null;
}

function actorOf(text: string, verbs: string[]): string | null {
  const lower = fold(text);
  const verb = verbs.find((form) => lower.includes(form));
  if (!verb) return null;
  return looksTurkish(text) ? firstRole(text) : nearestRoleBefore(text, verb);
}

function wordTokens(text: string): string[] {
  return fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function numberSet(text: string): Set<string> {
  const folded = fold(text);
  const found = new Set<string>();
  if (folded.includes("fractionthird")) found.add("fractionthird");
  const words: Record<string, string> = {
    one: "1", bir: "1", two: "2", iki: "2", three: "3", uc: "3", üç: "3", four: "4", dort: "4", dört: "4",
    five: "5", bes: "5", beş: "5", six: "6", alti: "6", altı: "6", seven: "7", yedi: "7", eight: "8", sekiz: "8",
    nine: "9", dokuz: "9", ten: "10", zero: "0", sifir: "0", sıfır: "0",
  };
  for (const token of wordTokens(text)) {
    const value = words[token];
    if (value) found.add(value);
    if (/^\d+$/.test(token)) found.add(token);
  }
  if (looksTurkish(text) && wordTokens(text).includes("on")) found.add("10");
  return found;
}

function quantityClasses(text: string): Set<string> {
  const folded = fold(text);
  const found = new Set<string>();
  const groups: [string, string[]][] = [
    ["universal", ["all", "every", "each", "hepsi", "tüm", "bütün", "tum", "butun"]],
    ["existential", ["some", "bazı", "bazi", "birkaç", "birkac"]],
    ["none", ["none", "hiçbir", "hicbir", "hiçbiri"]],
    ["part", ["part", "kısmı", "kisim", "kısmının"]],
    ["most", ["most", "çoğu", "cogu"]],
  ];
  for (const [name, forms] of groups) if (forms.some((form) => folded.includes(form))) found.add(name);
  if (wordTokens(text).includes("no")) found.add("none");
  return found;
}

function setsDiffer(left: Set<string>, right: Set<string>): boolean {
  if (left.size === 0 || right.size === 0) return false;
  if (left.size !== right.size) return true;
  for (const value of left) if (!right.has(value)) return true;
  return false;
}

function modalityBands(text: string): { possibility: boolean; strong: boolean; advice: boolean } {
  const tokens = wordTokens(text);
  const has = (word: string) => tokens.includes(word);
  const adjacent = (left: string, right: string) => tokens.some((token, index) => token === left && tokens[index + 1] === right);
  return {
    possibility: has("could") || has("might") || has("may") || adjacent("able", "to") || tokens.some((token) => token.includes("bilirdi")),
    strong: has("must") || adjacent("have", "to") || adjacent("had", "to") || tokens.some((token) => token.includes("zorunda")),
    advice: has("should") || adjacent("supposed", "to") || tokens.some((token) => token.length > 4 && /(?:meli|malı|mali|melidir|malidir)$/.test(token)) || tokens.some((token) => /^(?:gerekir|gerekti|gerekiyor|gerekecek|gerekmektedir)$/.test(token)),
  };
}

/** Possibility against anything else is a shift. Advice against strong necessity is not, because the context is not visible here. */
function modalityShift(source: string, key: string): boolean {
  const left = modalityBands(source);
  const right = modalityBands(key);
  if (left.possibility !== right.possibility) return true;
  const leftObligation = left.strong || left.advice;
  const rightObligation = right.strong || right.advice;
  if (leftObligation === rightObligation) return false;
  const cross = looksTurkish(source) !== looksTurkish(key);
  if (cross && !left.strong && !right.strong && (left.advice || right.advice)) return false;
  return true;
}

function negated(text: string): boolean {
  return /\bnot\b|\bno\b|\bnever\b|n't|\bnone\b|\bdeğil\b|\bdegil\b|\bhiç\b|\bhic\b/i.test(fold(text));
}

function counterfactual(text: string): boolean {
  const folded = fold(text);
  return /\bhad\b.+\bwould\b/.test(folded) || /\bwould have\b/.test(folded);
}

function futureMarked(text: string): boolean {
  return /\bwill\b|\bshall\b/.test(fold(text));
}

function causalMarked(text: string): boolean {
  const folded = fold(text);
  return /\bbecause\b|\btherefore\b/.test(folded) || folded.includes("çünkü") || folded.includes("cunku") || folded.includes("bu yüzden") || folded.includes("bu yuzden") || folded.includes("bu nedenle");
}

function exclusiveMarked(text: string): boolean {
  return /\bonly\b|\bsolely\b|\byalnızca\b|\byalnizca\b|\bsadece\b/.test(fold(text));
}

/**
 * Deterministic shifts that can be seen from the wording.
 * An area with no such shift stays unverified. The function never returns pass.
 */
export function assessMeaningIntegrity(source: string, key: string): MeaningIntegrity {
  const areas = blankAreas();
  const failures: string[] = [];
  const fail = (area: MeaningArea, code: string) => {
    areas[area] = "fail";
    failures.push(code);
  };
  for (const verbs of Object.values(verbFamilies)) {
    const sourceActor = actorOf(source, verbs);
    const keyActor = actorOf(key, verbs);
    if (sourceActor && keyActor && sourceActor !== keyActor) fail("roles", "role_shift");
  }
  const sourceNumbers = numberSet(source);
  const keyNumbers = numberSet(key);
  if ((sourceNumbers.size > 0 && keyNumbers.size === 0) || setsDiffer(sourceNumbers, keyNumbers)) fail("quantity", "quantity_shift");
  const sourceClasses = quantityClasses(source);
  const keyClasses = quantityClasses(key);
  if (setsDiffer(sourceClasses, keyClasses)) fail("quantity", "quantity_shift");
  if (modalityShift(source, key)) fail("modality", "modality_shift");
  const sameScript = looksTurkish(source) === looksTurkish(key);
  if (sameScript && !counterfactual(source) && !counterfactual(key) && negated(source) !== negated(key)) fail("polarity", "polarity_shift");
  if (sameScript && futureMarked(key) !== futureMarked(source)) fail("tense", "tense_shift");
  if (causalMarked(key) && !causalMarked(source) && !counterfactual(source)) fail("cause", "causal_added");
  if (exclusiveMarked(key) && !exclusiveMarked(source)) fail("exclusivity", "exclusive_added");
  return { status: failures.length ? "fail" : "unverified", failures: [...new Set(failures)], areas };
}

function normalizeWords(text: string): string {
  return text.toLocaleLowerCase("en-US").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function contentWords(text: string): string[] {
  const stop = new Set(["the", "a", "an", "of", "in", "on", "to", "and", "is", "are", "was", "were", "that", "this", "for", "with", "from", "by", "as", "be", "or", "its", "their", "into", "at", "it", "when", "which", "who", "what", "how", "does", "did"]);
  return normalizeWords(text).split(" ").filter((word) => word.length > 2 && !stop.has(word));
}

function meaningSignature(value: string): string {
  return contentWords(value).slice().sort().join(" ");
}

/** A key that repeats a passage sentence is a lookup. The label is recorded beside that observation. */
export function assessOperationFit(passage: string, answer: string, labeled: string | null): OperationFit {
  const key = normalizeWords(answer);
  const body = normalizeWords(passage);
  const contained = key.split(" ").length >= 3 && body.includes(key);
  const keyWords = contentWords(answer);
  let best = 0;
  for (const sentence of passage.split(/(?<=[.!?])\s+/)) {
    const words = new Set(contentWords(sentence));
    const shared = keyWords.filter((word) => words.has(word)).length;
    const ratio = keyWords.length ? shared / keyWords.length : 0;
    if (shared >= 6 && ratio > best) best = ratio;
  }
  const direct = contained || best >= 0.8;
  const mismatch = new Set(["inference", "purpose", "main_idea", "title", "author_view"]);
  const lookup = new Set(["detail", "negative_detail", "vocabulary_in_context"]);
  const labelAgrees = !direct || !labeled ? null : mismatch.has(labeled) ? false : lookup.has(labeled) ? true : null;
  return { status: "recorded", labeled, observed: direct ? "direct_lookup" : "unverified", labelAgrees, hardCandidate: direct ? false : "unverified" };
}
