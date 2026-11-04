import { describe, expect, it } from "vitest";
import { correctsForScore, nextYdsLevel, ydsLevel, ydsPoints } from "./yds-points";

describe("yds points", () => {
  it("scores a full paper at 1.25 per correct", () => {
    expect(ydsPoints(0)).toBe(0);
    expect(ydsPoints(40)).toBe(50);
    expect(ydsPoints(56)).toBe(70);
    expect(ydsPoints(64)).toBe(80);
    expect(ydsPoints(72)).toBe(90);
    expect(ydsPoints(80)).toBe(100);
  });

  it("reweights when a question is cancelled", () => {
    expect(ydsPoints(1, 79)).toBe(1.27);
    expect(ydsPoints(56, 79)).toBe(70.89);
    expect(ydsPoints(90, 79)).toBe(100);
  });

  it("assigns A–E from the score, not the raw correct count", () => {
    expect(ydsLevel(49.99)).toBeNull();
    expect(ydsLevel(50)).toBe("E");
    expect(ydsLevel(88.75)).toBe("B");
    expect(ydsLevel(90)).toBe("A");
  });

  it("counts how many more corrects the next level needs", () => {
    expect(correctsForScore(70)).toBe(56);
    expect(correctsForScore(90, 79)).toBe(72);
    expect(nextYdsLevel(55)).toEqual({ id: "C", score: 70, need: 1 });
    expect(nextYdsLevel(72)).toBeNull();
  });
});
