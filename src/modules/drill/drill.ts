import { connectors, connectorSentences, kindRule, relationHint, relationLabel, type Connector, type Relation } from "@/content/drill-connectors";
import { drillWords, type DrillWord } from "@/content/drill-words";

export type DrillKind = "word" | "connector";

export type DrillQuestion = {
  id: string;
  kind: DrillKind;
  targetId: string;
  prompt: string;
  note: string | null;
  choices: string[];
  answerIndex: number;
};

export type DrillFeedback = { correct: boolean; answerIndex: number; explanation: string };

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function byHash<T>(list: T[], key: (item: T) => string, seed: string): T[] {
  return [...list].sort((a, b) => hash(`${seed}:${key(a)}`) - hash(`${seed}:${key(b)}`));
}

function place(answer: string, wrong: string[], seed: string): { choices: string[]; answerIndex: number } {
  const choices = byHash([answer, ...wrong], (text) => text, seed);
  return { choices, answerIndex: choices.indexOf(answer) };
}

const wordById = new Map(drillWords.map((word) => [word.id, word]));
const connectorById = new Map(connectors.map((item) => [item.id, item]));
const sentenceById = new Map(connectorSentences.map((item) => [item.id, item]));

/** Direction alternates by day so a word is asked both ways over time. */
export function wordDirection(wordId: string, dayKey: string): "en" | "tr" {
  return hash(`${wordId}:${dayKey}`) % 2 === 0 ? "en" : "tr";
}

function wordDistractors(word: DrillWord): DrillWord[] {
  const pool = drillWords.filter(
    (other) => other.id !== word.id && other.pos === word.pos && other.word !== word.word && (!word.sense || other.sense !== word.sense),
  );
  return byHash(pool, (other) => other.id, word.id).slice(0, 4);
}

export function wordQuestion(wordId: string, direction: "en" | "tr"): DrillQuestion | null {
  const word = wordById.get(wordId);
  if (!word) return null;
  const wrong = wordDistractors(word);
  const id = `word:${word.id}:${direction}`;
  if (direction === "en") {
    const placed = place(word.meaning, wrong.map((other) => other.meaning), id);
    return { id, kind: "word", targetId: word.id, prompt: word.word, note: word.example, ...placed };
  }
  const placed = place(word.word, wrong.map((other) => other.word), id);
  return { id, kind: "word", targetId: word.id, prompt: word.meaning, note: null, ...placed };
}

const family: Record<Relation, Relation> = {
  contrast: "contrast",
  concession: "contrast",
  cause: "cause",
  result: "result",
  addition: "addition",
  similarity: "addition",
  condition: "condition",
  purpose: "purpose",
  example: "example",
  time: "time",
};

/** Families whose connectors could also read naturally in each other's sentences; never used as each other's wrong choices. */
const clashes: [Relation, Relation][] = [
  ["contrast", "time"],
  ["cause", "time"],
  ["cause", "result"],
  ["cause", "condition"],
  ["result", "addition"],
  ["result", "example"],
  ["result", "purpose"],
  ["addition", "example"],
  ["condition", "time"],
];

function clash(a: Relation, b: Relation): boolean {
  const left = family[a];
  const right = family[b];
  if (left === right) return true;
  return clashes.some(([x, y]) => (x === left && y === right) || (x === right && y === left));
}

function connectorDistractors(answer: Connector, sentenceId: string, trap: Connector | undefined): Connector[] {
  const allowed = connectors.filter((item) => !clash(item.relation, answer.relation));
  const sameKind = byHash(
    allowed.filter((item) => item.kind === answer.kind),
    (item) => item.id,
    sentenceId,
  );
  const otherKind = byHash(
    allowed.filter((item) => item.kind !== answer.kind),
    (item) => item.id,
    sentenceId,
  );
  const wanted = trap ? 3 : 4;
  const ordered = [...sameKind, ...otherKind];
  const picked: Connector[] = [];
  for (const item of ordered) {
    if (picked.length < wanted && !picked.some((other) => family[other.relation] === family[item.relation])) picked.push(item);
  }
  for (const item of ordered) {
    if (picked.length < wanted && !picked.includes(item)) picked.push(item);
  }
  return trap ? [trap, ...picked] : picked;
}

export function connectorQuestion(sentenceId: string): DrillQuestion | null {
  const sentence = sentenceById.get(sentenceId);
  const answer = sentence ? connectorById.get(sentence.answer) : undefined;
  if (!sentence || !answer) return null;
  const trap = sentence.trap ? connectorById.get(sentence.trap) : undefined;
  const wrong = connectorDistractors(answer, sentence.id, trap);
  const id = `connector:${sentence.id}`;
  const placed = place(answer.text, wrong.map((item) => item.text), id);
  return { id, kind: "connector", targetId: sentence.id, prompt: sentence.text, note: null, ...placed };
}

export function questionById(id: string): DrillQuestion | null {
  const [kind, targetId, direction] = id.split(":");
  if (kind === "word" && (direction === "en" || direction === "tr")) return wordQuestion(targetId, direction);
  if (kind === "connector") return connectorQuestion(targetId);
  return null;
}

export function connectorRelation(sentenceId: string): Relation | null {
  const sentence = sentenceById.get(sentenceId);
  return sentence ? (connectorById.get(sentence.answer)?.relation ?? null) : null;
}

export function feedback(question: DrillQuestion, choiceIndex: number): DrillFeedback {
  const correct = choiceIndex === question.answerIndex;
  const answerText = question.choices[question.answerIndex];
  const picked = question.choices[choiceIndex];
  if (question.kind === "word") {
    const word = wordById.get(question.targetId);
    const base = word ? `${word.word}: ${word.meaning}.` : answerText;
    const example = word ? ` Örnek: “${word.example}”` : "";
    return { correct, answerIndex: question.answerIndex, explanation: `${base}${example}` };
  }
  const answer = connectors.find((item) => item.text === answerText);
  const chosen = connectors.find((item) => item.text === picked);
  if (!answer) return { correct, answerIndex: question.answerIndex, explanation: "" };
  const why = `Burada ${relationHint[answer.relation]}; “${answer.text}” ${relationLabel[answer.relation]} bildirir ve ${kindRule[answer.kind]}.`;
  if (correct || !chosen) return { correct, answerIndex: question.answerIndex, explanation: why };
  const miss =
    family[chosen.relation] === family[answer.relation]
      ? `“${chosen.text}” anlam olarak yakın ama ${kindRule[chosen.kind]}.`
      : `“${chosen.text}” ${relationLabel[chosen.relation]} bildirir; bu cümlede o ilişki yok.`;
  return { correct, answerIndex: question.answerIndex, explanation: `${miss} ${why}` };
}

/** Due reviews first, then targets never seen in list order, then the rest by earliest due date. Today's answers are skipped. */
export function pickDaily(input: {
  targets: string[];
  due: Map<string, Date>;
  seen: Set<string>;
  doneToday: Set<string>;
  now: Date;
  count: number;
}): string[] {
  const open = input.targets.filter((id) => !input.doneToday.has(id));
  const dueNow = open
    .filter((id) => {
      const at = input.due.get(id);
      return at != null && at.getTime() <= input.now.getTime();
    })
    .sort((a, b) => (input.due.get(a)?.getTime() ?? 0) - (input.due.get(b)?.getTime() ?? 0));
  const fresh = open.filter((id) => !input.seen.has(id));
  const later = open
    .filter((id) => input.seen.has(id) && !dueNow.includes(id))
    .sort((a, b) => (input.due.get(a)?.getTime() ?? 0) - (input.due.get(b)?.getTime() ?? 0));
  return [...new Set([...dueNow, ...fresh, ...later])].slice(0, input.count);
}

export const drillTargets: Record<DrillKind, string[]> = {
  word: drillWords.map((word) => word.id),
  connector: connectorSentences.map((sentence) => sentence.id),
};
