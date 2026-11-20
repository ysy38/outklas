export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Band the next item should sit in. 50, the unmeasured start, stays on medium. */
export function targetDifficulty(mastery: number): number {
  const level = clamp(mastery, 0, 100);
  if (level < 35) return 1;
  if (level < 50) return 2;
  if (level < 65) return 3;
  if (level < 80) return 4;
  return 5;
}

export function nextMastery(previous: number, correct: boolean, difficulty: number): number {
  const safeDifficulty = clamp(Math.round(difficulty), 1, 5);
  // A hard success is strong evidence of ability. An easy miss is strong evidence of a gap. The reverse is weak.
  const performance = correct
    ? clamp(50 + safeDifficulty * 10, 0, 100)
    : clamp(50 - (6 - safeDifficulty) * 10, 0, 100);
  const blended = 0.7 * performance + 0.3 * previous;
  const delta = clamp(blended - previous, -12, 12);
  return Math.round(clamp(previous + delta, 0, 100) * 10) / 10;
}

export function initialMastery(): number {
  return 50;
}

export type SkillRole = "primary" | "secondary";

/** One item–skill link. Weight is how much the item measures the skill, not how well the learner knows it. */
export type SkillLink = { skillId: string; weight: number; role: SkillRole };

/**
 * Correct evidence reaches every linked skill, scaled later by weight.
 * A miss moves only the primary skill. The chosen option's error class carries the diagnosis,
 * so a secondary skill is not treated as failed.
 */
export function skillUpdates(input: { correct: boolean; links: SkillLink[] }): SkillLink[] {
  const linked = input.links.filter((link) => link.weight > 0 && (link.role === "primary" || link.role === "secondary"));
  if (input.correct) return linked;
  return linked.filter((link) => link.role === "primary");
}

/** Same step as nextMastery, scaled by how much this item measures the skill. Weight 1 leaves the step unchanged. */
export function weightedMastery(previous: number, correct: boolean, difficulty: number, weight: number): number {
  const full = nextMastery(previous, correct, difficulty);
  const scaled = previous + (full - previous) * clamp(weight, 0, 1);
  return Math.round(clamp(scaled, 0, 100) * 10) / 10;
}

/** First listed skill is what the item is for. The rest are supporting and must not take an equal penalty. */
export function skillLinkRows(itemId: string, skillIds: string[]) {
  return skillIds.map((skillId, index) => ({
    itemId,
    skillId,
    weight: index === 0 ? 1 : 0.4,
    role: (index === 0 ? "primary" : "secondary") as SkillRole,
  }));
}
