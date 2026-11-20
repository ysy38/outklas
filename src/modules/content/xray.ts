import { errorClassFromFactory, type ErrorClass, type Lesson, type LessonChoice, type Relation, type TextSpan, relations } from "./lesson";

/** An observed diagnosis, never a certainty. Choosing the option does not prove the learner holds the error. */
export const observedDiagnosisConfidence = 0.6;

const connectors = ["even though", "although", "though", "whereas", "because", "unless", "until", "before", "after"] as const;

export function locateSpan(source: string, needle: string): TextSpan | null {
  if (!needle) return null;
  const start = source.indexOf(needle);
  if (start < 0) return null;
  return { text: needle, start, end: start + needle.length };
}

export function spanFits(source: string, span: TextSpan): boolean {
  return Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0 && span.end <= source.length && span.end >= span.start && source.slice(span.start, span.end) === span.text;
}

const complete = (stem: string, option: string) => stem.replace("----", option.trim());

function asRelation(value: string | null): Relation | null {
  return value && (relations as readonly string[]).includes(value) ? (value as Relation) : null;
}

function openingConnector(option: string): string | null {
  const lower = option.trim().toLowerCase();
  return connectors.find((connector) => lower.startsWith(connector)) ?? null;
}

export type SentenceLessonInput = {
  stem: string;
  options: Record<LessonChoice["letter"], string>;
  correct: LessonChoice["letter"];
  relation: string | null;
  explanation: string;
  rationales: { option: LessonChoice["letter"]; distractorType: string; whyPlausible: string; whyWrong: string }[];
};

/**
 * Sentence-completion x-ray built only from spans that occur in the text.
 * A layer that cannot be located is left out. No skill or error label is invented:
 * the error class is the existing factory map, and the relation is the one the spec already fixed.
 */
export function buildSentenceLesson(input: SentenceLessonInput): Lesson {
  const letters = ["A", "B", "C", "D", "E"] as const;
  const relation = asRelation(input.relation);
  const correctText = input.options[input.correct]?.trim() ?? "";
  const sentence = input.stem.includes("----") ? complete(input.stem, correctText) : input.stem;
  const optionSpan = locateSpan(sentence, correctText);
  const connector = openingConnector(correctText);
  const connectorSpan = connector ? locateSpan(sentence, connector) ?? locateSpan(sentence, connector[0].toUpperCase() + connector.slice(1)) : null;
  const trimmedStem = input.stem.trim();
  const mainText = trimmedStem.startsWith("----")
    ? trimmedStem.replace(/^----\s*,\s*/, "").replace(/\.+$/, "").trim()
    : trimmedStem.replace(/\s+----\s*\.?$/, "").trim();
  const mainSpan = mainText ? locateSpan(sentence, mainText) : null;

  const raw = optionSpan && spanFits(sentence, { text: sentence, start: 0, end: sentence.length }) ? [{ text: sentence, role: "core" as const, start: 0, end: sentence.length }] : [];
  const skeleton = [
    ...(connectorSpan && spanFits(sentence, connectorSpan) ? [{ text: connectorSpan.text, kind: "lock" as const, start: connectorSpan.start, end: connectorSpan.end }] : []),
    ...(mainSpan && spanFits(sentence, mainSpan) ? [{ text: mainSpan.text, kind: "core" as const, start: mainSpan.start, end: mainSpan.end }] : []),
  ];
  const syntax = [
    ...(mainSpan && spanFits(sentence, mainSpan) ? [{ text: mainSpan.text, tone: "idea" as const, start: mainSpan.start, end: mainSpan.end }] : []),
    ...(optionSpan && relation === "concession" && spanFits(sentence, optionSpan) ? [{ text: optionSpan.text, tone: "contrast" as const, start: optionSpan.start, end: optionSpan.end }] : []),
  ];
  const diagnosisText = connector && relation === "concession" ? `${connector} bağlacı taviz ilişkisini kurar.` : connector ? `${connector} bağlacı cümlede duruyor.` : "";
  const move = input.explanation.trim().length >= 12 ? input.explanation.trim() : diagnosisText.length >= 12 ? diagnosisText : "";

  const byRationale = new Map(input.rationales.map((entry) => [entry.option, entry]));
  const choices: LessonChoice[] = letters.map((letter) => {
    if (letter === input.correct) {
      const support = optionSpan && spanFits(sentence, optionSpan) ? [optionSpan] : undefined;
      return { letter, error: null, whyWrong: "", ...(support ? { evidence: support } : {}) };
    }
    const option = input.options[letter]?.trim() ?? "";
    const withOption = input.stem.includes("----") ? complete(input.stem, option) : sentence;
    const evidence = locateSpan(withOption, option);
    const rationale = byRationale.get(letter);
    const error = rationale ? errorClassFromFactory(rationale.distractorType) : null;
    const whyWrong = rationale?.whyWrong.trim() ?? "";
    const whyAttractive = rationale?.whyPlausible.trim() ?? "";
    const verified = evidence && spanFits(withOption, evidence) ? evidence : null;
    return {
      letter,
      error,
      whyWrong,
      ...(whyAttractive.length >= 8 ? { whyAttractive } : {}),
      ...(verified ? { evidence: [verified] } : {}),
      ...(error && verified ? { confidence: observedDiagnosisConfidence } : {}),
    };
  });

  return {
    version: 1,
    task: "sentence_completion",
    relation,
    xray:
      raw.length && skeleton.length && syntax.length && diagnosisText.length >= 8
        ? { raw, skeleton, syntax, diagnosis: { raw: diagnosisText, skeleton: diagnosisText, syntax: diagnosisText } }
        : null,
    moves: move.length >= 12 ? [{ title: "İlişki", body: move }] : [],
    choices,
  };
}
