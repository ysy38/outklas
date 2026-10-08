import type { StreamLine } from "./types";

export type Block = { number: number; lines: StreamLine[]; pages: number[] };

export type Segmentation = {
  /** Lines before the first question number. */
  preamble: StreamLine[];
  blocks: Block[];
  missing: number[];
  warnings: string[];
};

const digitLike: Record<string, string> = { l: "1", I: "1", "|": "1", O: "0", o: "0", S: "5", B: "8" };

function parseDigits(raw: string): number | null {
  const value = Number(raw.replace(/[lI|OoSB]/g, (char) => digitLike[char]));
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** A question number printed on its own line, e.g. "17" or "17.". Common OCR digit confusions are tolerated. */
export function questionNumber(text: string): number | null {
  const compact = text.replace(/\s+/g, "");
  if (!/^[\dlI|OoSB]{1,2}[.)]?$/.test(compact) || !/\d/.test(compact)) return null;
  return parseDigits(compact.replace(/[.)]$/, ""));
}

const instructionRange = /^\d{1,2}\s*[.)]?\s*[-–—]\s*\d{1,2}\s*[.)]/;
const keyPair = /^\d{1,2}\s*[.)]\s*[A-E]\b/;

/** Third-party retypesets print "Soru No: 17" instead of a bare "17."; a line may carry two column labels. */
export function soruNoNumbers(text: string): number[] {
  return [...text.matchAll(/soru\s*no\s*[:.]?\s*(\d{1,2})/gi)]
    .map((match) => Number(match[1]))
    .filter((number) => Number.isInteger(number) && number > 0);
}

/** Option lines such as "B) although" must never be read as question 8 (OCR digit map B→8). */
export function leadingQuestionNumber(text: string): number | null {
  const trimmed = text.trim();
  if (/^[A-E]\)/.test(trimmed)) return null;
  if (instructionRange.test(trimmed) || keyPair.test(trimmed)) return null;
  const match = /^([\dlI|OoSB]{1,2})[.)]\s+\S/.exec(trimmed);
  if (!match || !/\d/.test(match[1])) return null;
  return parseDigits(match[1]);
}

export function splitLeadingNumber(line: StreamLine): { number: number; rest: StreamLine } | null {
  const number = leadingQuestionNumber(line.text);
  if (number == null) return null;
  const rest = line.text.replace(/^[\dlI|OoSB]{1,2}[.)]\s+/, "");
  return { number, rest: { ...line, text: rest } };
}

/** Splits the stream at unused question numbers. Out-of-order numbers are kept; skipped numbers are reported, never invented. */
export function segment(stream: StreamLine[], questionCount: number): Segmentation {
  const preamble: StreamLine[] = [];
  const blocks: Block[] = [];
  const warnings: string[] = [];
  const used = new Set<number>();
  let expected = 1;
  for (const line of stream) {
    const markers = soruNoNumbers(line.text).filter((number) => number <= questionCount && !used.has(number));
    if (markers.length) {
      for (const number of markers) {
        if (number !== expected) warnings.push(`question ${number} opened before ${expected}`);
        blocks.push({ number, lines: [], pages: [line.page] });
        used.add(number);
        expected = number + 1;
        while (used.has(expected) && expected <= questionCount) expected += 1;
      }
      continue;
    }
    const leading = splitLeadingNumber(line);
    let number = leading?.number ?? questionNumber(line.text);
    const body = leading?.rest ?? null;
    if (number !== null && number < 10 && expected === number * 11 && !used.has(expected)) {
      warnings.push(`question ${expected} printed as ${number} (doubled digit read once)`);
      number = expected;
    }
    if (number !== null && number >= 1 && number <= questionCount && !used.has(number)) {
      if (number !== expected) warnings.push(`question ${number} opened before ${expected}`);
      blocks.push({ number, lines: body && body.text ? [body] : [], pages: [line.page] });
      used.add(number);
      expected = number + 1;
      while (used.has(expected) && expected <= questionCount) expected += 1;
      continue;
    }
    const current = blocks[blocks.length - 1];
    if (!current) preamble.push(line);
    else {
      current.lines.push(line);
      if (!current.pages.includes(line.page)) current.pages.push(line.page);
    }
  }
  const missing = Array.from({ length: questionCount }, (_, index) => index + 1).filter((number) => !used.has(number));
  return { preamble, blocks, missing, warnings };
}
