import type { ScoringRule, SectionId } from "./blueprint";

export type ScoreItem = {
  section: SectionId;
  slot: number;
  correct: boolean | null;
  responseTimeMs: number;
};

export type SectionScore = {
  section: SectionId;
  correct: number;
  wrong: number;
  blank: number;
  timeMs: number;
};

export type ScoreReport = {
  correct: number;
  wrong: number;
  blank: number;
  score: number;
  bySection: SectionScore[];
};

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scoreSession(rule: ScoringRule, items: ScoreItem[]): ScoreReport {
  const bySection = new Map<SectionId, SectionScore>();
  for (const item of items) {
    const row = bySection.get(item.section) ?? {
      section: item.section,
      correct: 0,
      wrong: 0,
      blank: 0,
      timeMs: 0,
    };
    if (item.correct === true) row.correct += 1;
    else if (item.correct === false) row.wrong += 1;
    else row.blank += 1;
    row.timeMs += item.responseTimeMs;
    bySection.set(item.section, row);
  }
  const rows = [...bySection.values()];
  const correct = rows.reduce((sum, row) => sum + row.correct, 0);
  const wrong = rows.reduce((sum, row) => sum + row.wrong, 0);
  const blank = rows.reduce((sum, row) => sum + row.blank, 0);
  const score = rule === "correct_x_1_25" ? roundScore(correct * 1.25) : roundScore(correct - wrong / 4);
  return { correct, wrong, blank, score, bySection: rows };
}

/** Projects a short YDT sitting onto an 80-question net. Not a YKS placement score. */
export function estimateNet(correct: number, wrong: number, answered: number, full = 80): { low: number; high: number; point: number } {
  if (answered <= 0) return { low: 0, high: 0, point: 0 };
  const point = Math.round((correct / answered) * full - (wrong / answered) * (full / 4));
  return {
    point: Math.max(0, Math.min(full, point)),
    low: Math.max(0, point - 6),
    high: Math.min(full, point + 6),
  };
}

export function estimateFromAccuracy(correct: number, answered: number): { low: number; high: number; point: number } {
  if (answered <= 0) return { low: 0, high: 0, point: 0 };
  const point = Math.round((correct / answered) * 100);
  return {
    point,
    low: Math.max(0, point - 8),
    high: Math.min(100, point + 8),
  };
}

/** Maps a correct-rate to the 1–5 band. Not stored; derived when attempts exist. */
export function observedDifficulty(correctRate: number): number {
  if (correctRate >= 0.85) return 1;
  if (correctRate >= 0.7) return 2;
  if (correctRate >= 0.5) return 3;
  if (correctRate >= 0.3) return 4;
  return 5;
}

export function slowestSection(report: ScoreReport): SectionScore | null {
  const timed = report.bySection.filter((row) => row.correct + row.wrong + row.blank > 0 && row.timeMs > 0);
  if (timed.length === 0) return null;
  return timed.reduce((slow, row) => {
    const slowAvg = slow.timeMs / (slow.correct + slow.wrong + slow.blank);
    const rowAvg = row.timeMs / (row.correct + row.wrong + row.blank);
    return rowAvg > slowAvg ? row : slow;
  });
}

export function weakestSection(report: ScoreReport): SectionScore | null {
  const missed = report.bySection.filter((row) => row.wrong > 0);
  if (missed.length === 0) return null;
  return missed.reduce((weak, row) => {
    const weakRate = weak.correct / (weak.correct + weak.wrong);
    const rowRate = row.correct / (row.correct + row.wrong);
    return rowRate < weakRate ? row : weak;
  });
}
