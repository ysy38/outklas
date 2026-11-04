import { ydsBlueprint } from "@/modules/exam/blueprint";
import { YDS_QUESTIONS, correctsForScore, ydsLevel } from "@/modules/exam/yds-points";
import { yokdilBands } from "./yokdil";

export const targets = [70, 80, 90] as const;

/** Example corrects per section for 70 / 80 / 90. Illustrative, not a prescription. */
export const targetSplit = {
  yds: {
    vocabulary: [4, 5, 5],
    grammar: [7, 8, 9],
    cloze: [7, 8, 9],
    sentence: [7, 8, 9],
    translation: [4, 5, 6],
    reading: [14, 16, 18],
    dialogue: [4, 4, 5],
    restatement: [3, 3, 4],
    paragraph: [3, 3, 3],
    irrelevant: [3, 4, 4],
  },
  yokdil: {
    vocabulary: [4, 5, 5],
    grammar: [10, 11, 13],
    cloze: [7, 8, 9],
    sentence: [8, 9, 10],
    translation: [9, 10, 11],
    reading: [10, 12, 13],
    paragraph: [4, 5, 6],
    irrelevant: [4, 4, 5],
  },
} as const;

export type Paper = keyof typeof targetSplit;

export function paperBands(paper: Paper) {
  return paper === "yds"
    ? ydsBlueprint.bands.map((band) => ({ id: band.section as string, title: band.title, count: band.to - band.from + 1 }))
    : yokdilBands.map((band) => ({ id: band.id as string, title: band.title, count: band.count }));
}

export function splitRows(paper: Paper): string[][] {
  const split = targetSplit[paper] as Record<string, readonly number[]>;
  const rows = paperBands(paper).map((band) => {
    const values = split[band.id] ?? [];
    return [`${band.title} (${band.count})`, ...values.map((value) => `${value}`)];
  });
  const totals = targets.map((_, index) => paperBands(paper).reduce((sum, band) => sum + (split[band.id]?.[index] ?? 0), 0));
  return [...rows, ["Toplam doğru", ...totals.map((total) => `${total}`)]];
}

export function allowanceRows(scores: readonly number[] = [50, 60, 65, 70, 75, 80, 85, 90]): string[][] {
  return scores.map((score) => {
    const correct = correctsForScore(score);
    return [`${score}`, `${correct}`, `${YDS_QUESTIONS - correct}`, ydsLevel(score) ?? "—"];
  });
}
