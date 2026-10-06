import { describe, expect, it } from "vitest";
import { bandCoverage, diagnosticQuota, ydsBlueprint, ydtBlueprint } from "./blueprint";
import { estimateFromAccuracy, estimateNet, observedDifficulty, scoreSession, weakestSection } from "./score";
import { selectDiagnostic, selectItems, selectMock, studyPool, type PoolItem } from "./select";

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

  it("covers the YDT booklet without copying the YDS slots", () => {
    expect(ydtBlueprint.minutes).toBe(120);
    expect(ydtBlueprint.scoring).toBe("net_penalty");
    expect(bandCoverage(ydtBlueprint).ok).toBe(true);
    expect(ydtBlueprint.bands.find((band) => band.section === "situation")).toMatchObject({ from: 54, to: 58 });
    expect(ydtBlueprint.bands.find((band) => band.section === "reading")).toMatchObject({ from: 29, to: 43 });
    expect(ydtBlueprint.bands.find((band) => band.section === "vocabulary")?.to).toBe(5);
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
    expect(estimateNet(16, 0, 24).point).toBe(53);
    expect(estimateNet(12, 12, 24).point).toBe(30);
    expect(observedDifficulty(0.92)).toBe(1);
    expect(observedDifficulty(0.2)).toBe(5);
  });

  it("names no weakest section when nothing was answered wrong", () => {
    const clean = scoreSession("correct_x_1_25", [
      { section: "vocabulary", slot: 1, correct: true, responseTimeMs: 1 },
      { section: "grammar", slot: 7, correct: null, responseTimeMs: 0 },
    ]);
    expect(weakestSection(clean)).toBeNull();
    const missed = scoreSession("correct_x_1_25", [
      { section: "vocabulary", slot: 1, correct: true, responseTimeMs: 1 },
      { section: "grammar", slot: 7, correct: false, responseTimeMs: 1 },
    ]);
    expect(weakestSection(missed)?.section).toBe("grammar");
  });
});

describe("select", () => {
  it("prefers the original pack over the booklet seed for the same section", () => {
    const seed = pool();
    const pack = seed
      .filter((item) => item.section === "cloze")
      .map((item) => ({ ...item, id: `pack-${item.id}`, slot: item.slot + 200 }));
    const picked = selectDiagnostic([...seed, ...pack]);
    const cloze = picked.filter((item) => item.section === "cloze");
    expect(cloze.length).toBeGreaterThan(0);
    expect(cloze.every((item) => item.id.startsWith("pack-"))).toBe(true);
    expect(studyPool([...seed, ...pack]).some((item) => item.section === "cloze" && !item.id.startsWith("pack-"))).toBe(false);
  });

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
