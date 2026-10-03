import { describe, expect, it } from "vitest";
import { ydsBlueprint, type SectionId } from "../exam/blueprint";
import type { PoolItem } from "../exam/select";
import { nextMastery } from "./mastery";
import { buildPlan } from "./plan";
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
  });
});
