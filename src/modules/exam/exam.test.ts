import { describe, expect, it } from "vitest";
import { bandCoverage, diagnosticQuota, ydsBlueprint, ydtBlueprint } from "./blueprint";
import { estimateFromAccuracy, observedDifficulty, scoreSession } from "./score";
import { selectDiagnostic, selectItems, selectMock, type PoolItem } from "./select";

function pool(): PoolItem[] {
  const items: PoolItem[] = [];
  for (const band of ydsBlueprint.bands) {
    for (let slot = band.from; slot <= band.to; slot += 1) {
      let stimulusId: string | null = null;
      if (band.section === "cloze") stimulusId = slot <= 21 ? "cloze-a" : "cloze-b";
      if (band.section === "reading") stimulusId = `read-${Math.floor((slot - 43) / 4)}`;
      items.push({
        id: `q${slot}`,
        slot,
        section: band.section,
        stimulusId,
        difficulty: (slot % 5) + 1,
        skillIds: [band.section],
      });
    }
  }
  return items;
}

describe("blueprint", () => {
  it("covers slots 1–80 once", () => {
    expect(bandCoverage().ok).toBe(true);
    expect(bandCoverage().gaps).toEqual([]);
  });

  it("keeps YDT as a scoring blueprint without a learner surface", () => {
    expect(ydtBlueprint.minutes).toBe(120);
    expect(ydtBlueprint.scoring).toBe("net_penalty");
    expect(ydtBlueprint.bands).toEqual([]);
  });

  it("asks for 24 diagnostic items", () => {
    const total = Object.values(diagnosticQuota).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(24);
  });
});

describe("score", () => {
  it("gives 100 for 80 correct answers and ignores wrong answers", () => {
    const perfect = scoreSession(
      "correct_x_1_25",
      Array.from({ length: 80 }, (_, index) => ({
        section: "vocabulary" as const,
        slot: index + 1,
        correct: true,
        responseTimeMs: 1000,
      })),
    );
    expect(perfect.score).toBe(100);
    const mixed = scoreSession("correct_x_1_25", [
      { section: "vocabulary", slot: 1, correct: true, responseTimeMs: 1 },
      { section: "vocabulary", slot: 2, correct: false, responseTimeMs: 1 },
      { section: "vocabulary", slot: 3, correct: null, responseTimeMs: 0 },
    ]);
    expect(mixed.score).toBe(1.25);
    expect(mixed.wrong).toBe(1);
    expect(mixed.blank).toBe(1);
  });

  it("applies the YDT net rule", () => {
    const report = scoreSession("net_penalty", [
      { section: "vocabulary", slot: 1, correct: true, responseTimeMs: 1 },
      { section: "vocabulary", slot: 2, correct: true, responseTimeMs: 1 },
      { section: "vocabulary", slot: 3, correct: false, responseTimeMs: 1 },
      { section: "vocabulary", slot: 4, correct: false, responseTimeMs: 1 },
      { section: "vocabulary", slot: 5, correct: false, responseTimeMs: 1 },
      { section: "vocabulary", slot: 6, correct: false, responseTimeMs: 1 },
      { section: "vocabulary", slot: 7, correct: null, responseTimeMs: 0 },
    ]);
    expect(report.score).toBe(1);
  });

  it("estimates a range rather than an official score", () => {
    expect(estimateFromAccuracy(16, 24)).toEqual({ point: 67, low: 59, high: 75 });
    expect(observedDifficulty(0.92)).toBe(1);
    expect(observedDifficulty(0.2)).toBe(5);
  });
});

describe("select", () => {
  it("builds a 24-item diagnostic with shared passages", () => {
    const picked = selectDiagnostic(pool());
    expect(picked).toHaveLength(24);
    const cloze = picked.filter((item) => item.section === "cloze");
    expect(new Set(cloze.map((item) => item.stimulusId)).size).toBe(1);
    expect(cloze).toHaveLength(3);
    const reading = picked.filter((item) => item.section === "reading");
    expect(reading).toHaveLength(6);
    expect(new Set(reading.map((item) => item.stimulusId)).size).toBe(2);
  });

  it("requires a complete 1–80 mock", () => {
    expect(selectMock(pool())).toHaveLength(80);
    expect(selectMock(pool().filter((item) => item.slot !== 80))).toEqual([]);
  });

  it("caps a single section at 40 percent", () => {
    const items = pool();
    const picked = selectItems({
      pool: items,
      count: 10,
      seenIds: [],
      preferredSections: ["cloze"],
      difficulty: 3,
    });
    const cloze = picked.filter((item) => item.section === "cloze").length;
    expect(cloze).toBeLessThanOrEqual(4);
    expect(picked).toHaveLength(10);
  });
});
