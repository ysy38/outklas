export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function nextMastery(previous: number, correct: boolean, difficulty: number): number {
  const safeDifficulty = clamp(Math.round(difficulty), 1, 5);
  const performance = correct
    ? clamp(55 + safeDifficulty * 9, 0, 100)
    : clamp(45 - safeDifficulty * 9, 0, 100);
  const blended = 0.7 * performance + 0.3 * previous;
  const delta = clamp(blended - previous, -12, 12);
  return Math.round(clamp(previous + delta, 0, 100) * 10) / 10;
}

export function initialMastery(): number {
  return 50;
}
