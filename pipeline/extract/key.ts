import type { OptionLabel } from "@/modules/analysis/contract";

export type AnswerKey = { answers: Record<number, OptionLabel>; warnings: string[] };

/**
 * Reads an answer key printed as rows of "n X" pairs, e.g. "1 E   21 C   41 C   61 C".
 * Letters are placed by row and column position, so a misread number ("1" for "11") does not move a letter.
 */
export function parseAnswerKey(lines: string[], questionCount: number): AnswerKey {
  const warnings: string[] = [];
  const answers: Record<number, OptionLabel> = {};
  const rows = lines
    .map((line) => [...line.matchAll(/(\d{1,2})\s*[.)]?\s*([A-E])\b/g)].map((match) => ({ number: Number(match[1]), letter: match[2] as OptionLabel })))
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
  for (let number = 1; number <= questionCount; number += 1) if (!answers[number]) warnings.push(`no key for ${number}`);
  return { answers, warnings };
}
