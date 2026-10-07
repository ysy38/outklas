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

/** A question number printed on its own line, e.g. "17" or "17.". Common OCR digit confusions are tolerated. */
export function questionNumber(text: string): number | null {
  const compact = text.replace(/\s+/g, "");
  if (!/^[\dlI|OoSB]{1,2}[.)]?$/.test(compact) || !/\d/.test(compact)) return null;
  const value = Number(compact.replace(/[.)]$/, "").replace(/[lI|OoSB]/g, (char) => digitLike[char]));
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** Splits the stream at question numbers that arrive in order; a skipped number is reported, never invented. */
export function segment(stream: StreamLine[], questionCount: number): Segmentation {
  const preamble: StreamLine[] = [];
  const blocks: Block[] = [];
  const missing: number[] = [];
  const warnings: string[] = [];
  let expected = 1;
  for (const line of stream) {
    let number = questionNumber(line.text);
    if (number !== null && number < 10 && expected === number * 11) {
      warnings.push(`question ${expected} printed as ${number} (doubled digit read once)`);
      number = expected;
    }
    if (number !== null && number >= expected && number <= Math.min(questionCount, expected + 2)) {
      for (let skipped = expected; skipped < number; skipped += 1) {
        missing.push(skipped);
        warnings.push(`question ${skipped} not found before ${number}`);
      }
      blocks.push({ number, lines: [], pages: [line.page] });
      expected = number + 1;
      continue;
    }
    const current = blocks[blocks.length - 1];
    if (!current) preamble.push(line);
    else {
      current.lines.push(line);
      if (!current.pages.includes(line.page)) current.pages.push(line.page);
    }
  }
  for (let skipped = expected; skipped <= questionCount; skipped += 1) missing.push(skipped);
  return { preamble, blocks, missing, warnings };
}
