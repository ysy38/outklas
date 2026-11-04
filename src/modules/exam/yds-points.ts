/** YDS / YÖKDİL / e-YDS / e-YÖKDİL: only correct answers count. Not the YDT net. */

export const YDS_QUESTIONS = 80;

export type YdsLevel = "A" | "B" | "C" | "D" | "E";

export const ydsLevels: readonly { id: YdsLevel; min: number; correct: number; range: string }[] = [
  { id: "A", min: 90, correct: 72, range: "90–100" },
  { id: "B", min: 80, correct: 64, range: "80–89" },
  { id: "C", min: 70, correct: 56, range: "70–79" },
  { id: "D", min: 60, correct: 48, range: "60–69" },
  { id: "E", min: 50, correct: 40, range: "50–59" },
];

export function ydsPoints(correct: number, valid = YDS_QUESTIONS): number {
  if (valid <= 0) return 0;
  const counted = Math.max(0, Math.min(valid, Math.floor(correct)));
  return Math.round((counted * 10000) / valid) / 100;
}

export function ydsLevel(score: number): YdsLevel | null {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score >= 50) return "E";
  return null;
}

/** Smallest correct-count that reaches `minScore` when `valid` questions remain. */
export function correctsForScore(minScore: number, valid = YDS_QUESTIONS): number {
  if (valid <= 0) return 0;
  return Math.ceil((minScore * valid) / 100 - 1e-9);
}

export function nextYdsLevel(correct: number, valid = YDS_QUESTIONS): { id: YdsLevel; score: number; need: number } | null {
  const score = ydsPoints(correct, valid);
  const next = [...ydsLevels].reverse().find((level) => score < level.min);
  if (!next) return null;
  const target = correctsForScore(next.min, valid);
  return { id: next.id, score: next.min, need: Math.max(0, target - Math.floor(correct)) };
}

export function scoreTable(from = 40, to = YDS_QUESTIONS, valid = YDS_QUESTIONS) {
  return Array.from({ length: to - from + 1 }, (_, index) => {
    const correct = from + index;
    const score = ydsPoints(correct, valid);
    return { correct, score, level: ydsLevel(score) };
  });
}
