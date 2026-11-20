/**
 * One question, three axes. They must not be collapsed into a single tag.
 *
 * section / layout  — which exam task the screen renders
 * skill             — what a correct answer trains (item_skills → mastery)
 * error class       — what a wrong choice reveals (choices.error_class → error_mastery)
 *
 * `lesson` is the teaching document: x-ray layers, solution moves, and why each
 * option fails. The selector never reads the prose. It reads the columns.
 */

export const errorClasses = [
  "discourse_relation",
  "scope",
  "added_cause",
  "time_shift",
  "modality",
  "negation",
  "added_fact",
  "function_mismatch",
  "grammar_mismatch",
  "unsupported_inference",
] as const;

export type ErrorClass = (typeof errorClasses)[number];

export const errorClassLabel: Record<ErrorClass, string> = {
  discourse_relation: "söylem ilişkisi yanlış kurulmuş",
  scope: "kapsam ya da niceleyici kaymış",
  added_cause: "metinde olmayan bir neden eklenmiş",
  time_shift: "zaman ilişkisi kaymış",
  modality: "kip kaymış (zorunluluk, olasılık)",
  negation: "olumsuzlama ters dönmüş",
  added_fact: "metinde olmayan bilgi eklenmiş",
  function_mismatch: "konuya değiniyor ama gereken işi yapmıyor",
  grammar_mismatch: "dil bilgisi bağlama uymuyor",
  unsupported_inference: "çıkarım metinden desteklenmiyor",
};

const errorClassSet = new Set<string>(errorClasses);

export function isErrorClass(value: string | null | undefined): value is ErrorClass {
  return Boolean(value && errorClassSet.has(value));
}

export const relations = [
  "concession",
  "contrast",
  "cause",
  "condition",
  "time",
  "purpose",
  "paraphrase",
  "suggestion",
  "problem_response",
] as const;

export type Relation = (typeof relations)[number];

export const lessonTasks = ["sentence_completion", "closest_meaning", "dialogue"] as const;
export type LessonTask = (typeof lessonTasks)[number];

export type TextSpan = { text: string; start: number; end: number };
export type XraySpan = { text: string; role: "filler" | "core" | "verb"; start?: number; end?: number };
export type XraySkeleton = { text: string; kind: "filler" | "core" | "lock"; start?: number; end?: number };
export type XraySyntax = { text: string; tone: "contrast" | "mute" | "subject" | "idea" | "condition" | "time"; start?: number; end?: number };

export type Xray = {
  raw: XraySpan[];
  skeleton: XraySkeleton[];
  syntax: XraySyntax[];
  diagnosis: { raw: string; skeleton: string; syntax: string };
};

export type LessonChoice = {
  letter: "A" | "B" | "C" | "D" | "E";
  error: ErrorClass | null;
  whyWrong: string;
  /** Why the wrong option tempts. Omitted when the text does not say. */
  whyAttractive?: string;
  /** Spans checked against the sentence the learner reads with this option. */
  evidence?: TextSpan[];
  /** Diagnosis confidence, strictly below 1. Choosing the option is not proof of the error. */
  confidence?: number;
};

export type Lesson = {
  version: 1;
  task: LessonTask;
  relation: Relation | null;
  xray: Xray | null;
  moves: { title: string; body: string }[];
  choices: LessonChoice[];
};

const letters = ["A", "B", "C", "D", "E"] as const;

/** What is still missing before a surface can use the item. Filter and x-ray are separate. */
export function lessonGaps(lesson: Lesson): { filter: string[]; xray: string[] } {
  const filter: string[] = [];
  const xray: string[] = [];
  const keys = lesson.choices.filter((choice) => choice.error == null);
  if (lesson.choices.length !== 5 || keys.length !== 1) filter.push("tek doğru şık yok");
  if (letters.some((letter, index) => lesson.choices[index]?.letter !== letter)) filter.push("şık sırası A–E değil");
  for (const choice of lesson.choices) {
    if (choice.error && choice.whyWrong.trim().length < 8) filter.push(`${choice.letter} gerekçesi yok`);
  }
  if (lesson.moves.length === 0 || lesson.moves.some((move) => move.body.trim().length < 12)) filter.push("çözüm adımı yok");
  if (lesson.task !== "sentence_completion") return { filter, xray };
  if (!lesson.xray) xray.push("röntgen katmanı yok");
  else {
    if (lesson.xray.raw.length === 0) xray.push("ham cümle yok");
    if (lesson.xray.skeleton.length === 0) xray.push("dolgu silme yok");
    if (lesson.xray.syntax.length === 0) xray.push("sözdizimi yok");
    if (lesson.xray.diagnosis.raw.trim().length < 8) xray.push("röntgen tanısı yok");
    const source = lesson.xray.raw[0]?.text ?? "";
    for (const span of [...lesson.xray.raw, ...lesson.xray.skeleton, ...lesson.xray.syntax]) {
      if (span.start == null || span.end == null) xray.push("kanıt aralığı yok");
      else if (source.slice(span.start, span.end) !== span.text) xray.push("kanıt aralığı metinle uyuşmuyor");
    }
  }
  return { filter, xray };
}

/** A wrong choice yields a diagnosis only when its confidence is an observation, not a certainty. */
export function diagnosisConfidence(lesson: Lesson | null | undefined, letter: string, correct: boolean): number | null {
  if (correct || !lesson) return null;
  const value = lesson.choices.find((choice) => choice.letter === letter)?.confidence;
  if (typeof value !== "number" || !(value > 0 && value < 1)) return null;
  return value;
}

/** Map a factory distractor node or a restatement flaw onto the closed error class. */
export function errorClassFromFactory(code: string): ErrorClass | null {
  const slug = code.split(":").pop() ?? code;
  const table: Record<string, ErrorClass | null> = {
    wrong_discourse_relation: "discourse_relation",
    logical_incompatibility: "discourse_relation",
    CONNECTOR_ERROR: "discourse_relation",
    quantifier: "scope",
    scope: "scope",
    scope_change: "scope",
    causal: "added_cause",
    temporal: "time_shift",
    modality: "modality",
    negation_flip: "negation",
    added_fact: "added_fact",
    partial: "added_fact",
    meaning_shift: "unsupported_inference",
    function_mismatch: "function_mismatch",
    grammar_mismatch: "grammar_mismatch",
    LOGICAL_ERROR: "unsupported_inference",
    CONTEXT_MISMATCH: "added_fact",
    faithful: null,
  };
  return table[slug] ?? null;
}

/**
 * A wrong choice is the only observed error. A correct answer does not show which traps the learner rejected,
 * so those classes stay where they are and the skill mastery carries the success.
 */
export function errorUpdates(input: { correct: boolean; chosen: string | null; present: string[] }): { errorClass: ErrorClass; correct: boolean }[] {
  if (input.correct || !isErrorClass(input.chosen)) return [];
  return [{ errorClass: input.chosen, correct: false }];
}
