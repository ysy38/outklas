import { describe, expect, it } from "vitest";
import { ydsBlueprint, type SectionId } from "../exam/blueprint";
import type { PoolItem } from "../exam/select";
import { nextMastery, skillLinkRows, skillUpdates, targetDifficulty, weightedMastery } from "./mastery";
import { buildPlan, nextStreak } from "./plan";
import { nextReview } from "./review";

describe("mastery", () => {
  it("moves toward the latest answer without a jump larger than 12", () => {
    const up = nextMastery(50, true, 5);
    const down = nextMastery(50, false, 5);
    expect(up).toBeGreaterThan(50);
    expect(up - 50).toBeLessThanOrEqual(12);
    expect(down).toBeLessThan(50);
    expect(50 - down).toBeLessThanOrEqual(12);
    expect(nextMastery(up, true, 3)).not.toBe(up);
  });

  it("treats an easy miss as stronger evidence than a hard miss, and a hard success as stronger than an easy one", () => {
    const easyMiss = 50 - nextMastery(50, false, 1);
    const hardMiss = 50 - nextMastery(50, false, 5);
    expect(easyMiss).toBeGreaterThan(hardMiss);
    const hardHit = nextMastery(50, true, 5) - 50;
    const easyHit = nextMastery(50, true, 1) - 50;
    expect(hardHit).toBeGreaterThan(easyHit);
  });

  it("scales a correct answer by skill weight and leaves a secondary skill untouched on a miss", () => {
    const links = skillLinkRows("item", ["sentence-link", "restatement-shift"]);
    expect(links.map((link) => link.role)).toEqual(["primary", "secondary"]);
    const hit = skillUpdates({ correct: true, links });
    expect(hit.map((link) => link.skillId)).toEqual(["sentence-link", "restatement-shift"]);
    expect(weightedMastery(50, true, 4, 1)).toBe(nextMastery(50, true, 4));
    expect(weightedMastery(50, true, 4, 0.4) - 50).toBeLessThan(nextMastery(50, true, 4) - 50);
    const miss = skillUpdates({ correct: false, links });
    expect(miss.map((link) => link.skillId)).toEqual(["sentence-link"]);
    expect(weightedMastery(50, false, 4, 1)).toBeLessThan(50);
  });

  it("starts an unmeasured learner on medium and steps the band as mastery moves", () => {
    expect(targetDifficulty(50)).toBe(3);
    expect(targetDifficulty(30)).toBe(1);
    expect(targetDifficulty(90)).toBe(5);
  });
});

describe("review", () => {
  const now = new Date("2026-04-01T09:00:00Z");

  it("follows the short mistake ladder and the correct-day ladder", () => {
    const firstMiss = nextReview({ step: 0, lapses: 0 }, false, now);
    expect(firstMiss.dueAt.getTime() - now.getTime()).toBe(10 * 60_000);
    const secondMiss = nextReview(firstMiss, false, now);
    expect(secondMiss.dueAt.getTime() - now.getTime()).toBe(24 * 60 * 60_000);
    const firstCorrect = nextReview({ step: 0, lapses: 0 }, true, now);
    expect(firstCorrect.stabilityDays).toBe(3);
    const later = [3, 7, 21, 45].reduce<{ step: number; lapses: number }>(
      (state) => nextReview(state, true, now),
      { step: 0, lapses: 0 },
    );
    expect(later.step).toBe(4);
    expect(nextReview(later, true, now).stabilityDays).toBe(45);
  });
});

describe("plan", () => {
  it("does not let the weakest section take over the day", () => {
    const pool: PoolItem[] = ydsBlueprint.bands.flatMap((band) =>
      Array.from({ length: band.to - band.from + 1 }, (_, index) => ({
        id: `${band.section}-${index}`,
        slot: band.from + index,
        section: band.section,
        stimulusId: null,
        difficulty: 3,
        skillIds: [],
        errorClasses: [],
      })),
    );
    const mastery = ydsBlueprint.bands.map((band, index) => ({
      section: band.section as SectionId,
      mastery: band.section === "cloze" ? 20 : 70 + index,
    }));
    const plan = buildPlan({
      minutes: 40,
      mastery,
      dueQuestionIds: [pool[0]!.id],
      dueVocabIds: ["v1", "v2"],
      pool,
      seenIds: [],
      targetSection: "reading",
    });
    const questions = plan.blocks.filter((block) => block.kind === "question");
    const cloze = questions.filter((block) => block.section === "cloze").length;
    expect(questions.length).toBeGreaterThan(4);
    expect(cloze / questions.length).toBeLessThanOrEqual(0.4);
    expect(plan.blocks.some((block) => block.kind === "vocab")).toBe(true);
    expect(plan.totalMinutes).toBeGreaterThan(0);
    expect(plan.skipSections.length).toBeGreaterThan(0);
    expect(plan.blocks.some((block) => block.kind === "question" && plan.skipSections.includes(block.section))).toBe(false);
  });

  it("gives a weak section the easier item and a strong section the harder one", () => {
    const item = (id: string, section: SectionId, difficulty: number, slot: number): PoolItem => ({
      id,
      slot,
      section,
      stimulusId: null,
      difficulty,
      skillIds: [],
      errorClasses: [],
    });
    const weak = buildPlan({
      minutes: 10,
      mastery: [{ section: "sentence", mastery: 20 }],
      dueQuestionIds: [],
      dueVocabIds: [],
      pool: [item("hard", "sentence", 4, 1), item("easy", "sentence", 1, 2)],
      seenIds: [],
    });
    const rising = buildPlan({
      minutes: 10,
      mastery: [{ section: "sentence", mastery: 70 }],
      dueQuestionIds: [],
      dueVocabIds: [],
      pool: [item("hard", "sentence", 4, 1), item("easy", "sentence", 1, 2)],
      seenIds: [],
    });
    expect(weak.blocks.find((block) => block.kind === "question")?.id).toBe("easy");
    expect(rising.blocks.find((block) => block.kind === "question")?.id).toBe("hard");
  });

  it("keeps a streak only across consecutive days", () => {
    expect(nextStreak(4, "2026-04-01", "2026-04-01")).toBe(4);
    expect(nextStreak(4, "2026-04-01", "2026-04-02")).toBe(5);
    expect(nextStreak(4, "2026-04-01", "2026-04-04")).toBe(1);
    expect(nextStreak(0, null, "2026-04-01")).toBe(1);
  });
});
