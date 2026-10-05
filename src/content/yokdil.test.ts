import { describe, expect, it } from "vitest";
import { yokdilBands } from "./yokdil";
import { ydsBlueprint } from "@/modules/exam/blueprint";

describe("score sections", () => {
  it("keeps both papers at 80 questions", () => {
    const yds = ydsBlueprint.bands.reduce((sum, band) => sum + (band.to - band.from + 1), 0);
    const yokdil = yokdilBands.reduce((sum, band) => sum + band.count, 0);
    expect(yds).toBe(80);
    expect(yokdil).toBe(80);
  });
});
