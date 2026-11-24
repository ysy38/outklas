import { describe, expect, it } from "vitest";
import { ydsBlueprint, type SectionId } from "../exam/blueprint";
import type { PoolItem } from "../exam/select";
import { nextMastery, skillLinkRows, skillUpdates, targetDifficulty, weightedMastery } from "./mastery";
import { buildPlan, mergePreservedPlan, nextStreak, rankWeakErrorClasses, shouldRefreshDailyPlan, type DailyPlan, type PlanBlock } from "./plan";
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

  const item = (id: string, section: SectionId, difficulty: number, slot: number, errorClasses: string[] = []): PoolItem => ({
    id,
    slot,
    section,
    stimulusId: null,
    difficulty,
    skillIds: [],
    errorClasses,
  });

  it("ranks a same-section item that carries the weak error class ahead of an equal-difficulty neighbor", () => {
    const pool = [item("plain", "sentence", 2, 1), item("hit", "sentence", 2, 2, ["discourse_relation"])];
    const mastery = [{ section: "sentence" as SectionId, mastery: 20 }];
    const base = { minutes: 10, mastery, dueQuestionIds: [] as string[], dueVocabIds: [] as string[], pool, seenIds: [] as string[] };
    const before = buildPlan(base);
    const after = buildPlan({ ...base, weakErrors: ["discourse_relation"] });
    expect(before.blocks.find((block) => block.kind === "question")?.id).toBe("plain");
    expect(after.blocks.find((block) => block.kind === "question")?.id).toBe("hit");
    expect(after.weakErrors).toEqual(["discourse_relation"]);
  });

  it("does not change the plan when the learner has no error history", () => {
    const pool = [
      item("a", "sentence", 2, 1, ["scope"]),
      item("b", "sentence", 2, 2, ["discourse_relation"]),
      item("c", "grammar", 2, 3),
    ];
    const mastery = [
      { section: "sentence" as SectionId, mastery: 40 },
      { section: "grammar" as SectionId, mastery: 40 },
    ];
    const base = { minutes: 20, mastery, dueQuestionIds: [] as string[], dueVocabIds: [] as string[], pool, seenIds: [] as string[] };
    const without = buildPlan(base);
    const empty = buildPlan({ ...base, weakErrors: [] });
    expect(empty.blocks).toEqual(without.blocks);
    expect(empty.skipSections).toEqual(without.skipSections);
    expect(empty.weakErrors).toBeUndefined();
  });

  it("does not let a weak error pull an item from a skipped strong section or replace difficulty targeting", () => {
    const pool = [
      item("strong-hit", "reading", 2, 1, ["discourse_relation"]),
      item("weak-easy", "sentence", 1, 2),
      item("weak-hard", "sentence", 5, 3, ["discourse_relation"]),
    ];
    const plan = buildPlan({
      minutes: 10,
      mastery: [
        { section: "reading", mastery: 90 },
        { section: "sentence", mastery: 20 },
      ],
      dueQuestionIds: [],
      dueVocabIds: [],
      pool,
      seenIds: [],
      weakErrors: ["discourse_relation"],
    });
    const questions = plan.blocks.filter((block) => block.kind === "question");
    expect(plan.skipSections).toContain("reading");
    expect(questions.some((block) => block.id === "strong-hit")).toBe(false);
    expect(questions[0]?.id).toBe("weak-easy");
  });

  it("falls back to the ordinary pool when no item carries the weak error class", () => {
    const pool = [item("a", "sentence", 2, 1, ["scope"]), item("b", "sentence", 2, 2, ["added_cause"])];
    const mastery = [{ section: "sentence" as SectionId, mastery: 25 }];
    const base = { minutes: 10, mastery, dueQuestionIds: [] as string[], dueVocabIds: [] as string[], pool, seenIds: [] as string[] };
    const ordinary = buildPlan(base);
    const missing = buildPlan({ ...base, weakErrors: ["modality"] });
    expect(missing.blocks.map((block) => block.id)).toEqual(ordinary.blocks.map((block) => block.id));
    expect(missing.weakErrors).toEqual(["modality"]);
  });

  it("caps repeats of one weak error class when other items can fill the day", () => {
    const hits = [
      ...Array.from({ length: 8 }, (_, index) => item(`s-hit-${index}`, "sentence", 3, 30 + index, ["discourse_relation"])),
      ...Array.from({ length: 8 }, (_, index) => item(`g-hit-${index}`, "grammar", 3, 10 + index, ["discourse_relation"])),
    ];
    const other = Array.from({ length: 8 }, (_, index) => item(`g-scope-${index}`, "grammar", 3, 50 + index, ["scope"]));
    const plan = buildPlan({
      minutes: 40,
      mastery: [
        { section: "sentence", mastery: 30 },
        { section: "grammar", mastery: 30 },
      ],
      dueQuestionIds: [],
      dueVocabIds: [],
      pool: [...hits, ...other],
      seenIds: [],
      weakErrors: ["discourse_relation"],
    });
    const questions = plan.blocks.filter((block) => block.kind === "question");
    const matched = questions.filter((block) => block.id.includes("-hit-")).length;
    expect(questions.length).toBeGreaterThan(4);
    expect(matched).toBeGreaterThan(0);
    expect(matched).toBeLessThan(questions.length);
    expect(questions.some((block) => block.id.startsWith("g-scope-"))).toBe(true);
  });

  it("keeps completed question blocks when a later plan is merged", () => {
    const block = (id: string, extra: Partial<Extract<PlanBlock, { kind: "question" }>> = {}): PlanBlock => ({
      kind: "question",
      id,
      section: "sentence",
      minutes: 2,
      bucket: "weak",
      ...extra,
    });
    const previous: DailyPlan = {
      totalMinutes: 5,
      skipSections: [],
      generatedAt: "2026-04-01T08:00:00.000Z",
      blocks: [{ kind: "vocab", id: "v1", minutes: 1 }, block("done"), block("old")],
    };
    const next: DailyPlan = {
      totalMinutes: 5,
      skipSections: ["reading"],
      weakErrors: ["scope"],
      generatedAt: "2026-04-01T11:00:00.000Z",
      blocks: [{ kind: "vocab", id: "v1", minutes: 1 }, block("fresh", { bucket: "target" }), block("done")],
    };
    const merged = mergePreservedPlan(previous, next, ["done"]);
    const questionIds = merged.blocks.filter((entry) => entry.kind === "question").map((entry) => entry.id);
    expect(merged.blocks.some((entry) => entry.kind === "vocab" && entry.id === "v1")).toBe(true);
    expect(questionIds[0]).toBe("done");
    expect(questionIds).toContain("fresh");
    expect(questionIds).not.toContain("old");
    expect(merged.skipSections).toEqual(["reading"]);
    expect(merged.generatedAt).toBe("2026-04-01T11:00:00.000Z");
  });

  it("refreshes a same-day plan only after a later diagnostic", () => {
    expect(shouldRefreshDailyPlan({ generatedAt: "2026-04-01T08:00:00.000Z", diagnosticSubmittedAt: null })).toBe(false);
    expect(shouldRefreshDailyPlan({ generatedAt: "2026-04-01T08:00:00.000Z", diagnosticSubmittedAt: "2026-04-01T07:00:00.000Z" })).toBe(false);
    expect(shouldRefreshDailyPlan({ generatedAt: "2026-04-01T08:00:00.000Z", diagnosticSubmittedAt: "2026-04-01T10:00:00.000Z" })).toBe(true);
    expect(shouldRefreshDailyPlan({ generatedAt: undefined, diagnosticSubmittedAt: "2026-04-01T10:00:00.000Z" })).toBe(true);
  });

  it("ranks error_mastery rows without inventing a skill mapping or unknown classes", () => {
    expect(
      rankWeakErrorClasses([
        { errorClass: "not_a_class", mastery: 10, attempts: 4 },
        { errorClass: "scope", mastery: 40, attempts: 2 },
        { errorClass: "discourse_relation", mastery: 20, attempts: 3 },
        { errorClass: "modality", mastery: 80, attempts: 5 },
        { errorClass: "negation", mastery: 10, attempts: 0 },
      ]),
    ).toEqual(["discourse_relation", "scope"]);
  });
});
