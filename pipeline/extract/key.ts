import type { OptionLabel } from "@/modules/analysis/contract";

export type AnswerKey = { answers: Record<number, OptionLabel>; warnings: string[] };

const pairRe = /(\d{1,2})\s*[.)]?\s*([A-E])\b/g;

/**
 * Reads an answer key printed as rows of "n X" pairs, e.g. "1 E   21 C   41 C   61 C".
 * Letters are placed by row and column position, so a misread number ("1" for "11") does not move a letter.
 * Compilations sometimes print keys as a flat 1..n sequence; that is used only when the grid is incomplete.
 */
export function parseAnswerKey(lines: string[], questionCount: number): AnswerKey {
  const warnings: string[] = [];
  const answers: Record<number, OptionLabel> = {};
  const rows = lines
    .map((line) => [...line.matchAll(pairRe)].map((match) => ({ number: Number(match[1]), letter: match[2] as OptionLabel })))
    .filter((pairs) => pairs.length >= 2);
  const perRow = Math.max(0, ...rows.map((pairs) => pairs.length));
  const rowCount = perRow ? Math.ceil(questionCount / perRow) : 0;
  if (rows.length !== rowCount) warnings.push(`expected ${rowCount} key rows, found ${rows.length}`);
  rows.slice(0, rowCount).forEach((pairs, row) => {
    if (pairs.length !== perRow) warnings.push(`key row ${row + 1} has ${pairs.length} entries`);
    pairs.forEach((pair, column) => {
      const number = row + 1 + column * rowCount;
      if (pair.number !== number) warnings.push(`key position ${number} printed as ${pair.number}`);
      answers[number] = pair.letter;
    });
  });
  const missing = Array.from({ length: questionCount }, (_, index) => index + 1).filter((number) => !answers[number]);
  if (missing.length) {
    const sequential: Record<number, OptionLabel> = {};
    for (const line of lines) {
      for (const match of line.matchAll(pairRe)) {
        const number = Number(match[1]);
        if (number >= 1 && number <= questionCount) sequential[number] = match[2] as OptionLabel;
      }
    }
    if (Object.keys(sequential).length > Object.keys(answers).length) {
      warnings.push("used sequential key pairing because the grid was incomplete");
      for (const [number, letter] of Object.entries(sequential)) answers[Number(number)] = letter;
    }
  }
  for (let number = 1; number <= questionCount; number += 1) if (!answers[number]) warnings.push(`no key for ${number}`);
  return { answers, warnings };
}
