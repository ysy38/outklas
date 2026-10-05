import { describe, expect, it } from "vitest";
import { countdownText, daysUntil, finishedFamilies, upcomingSittings } from "./exam-calendar";

const fifth = new Date("2026-10-05T12:00:00+03:00");

describe("exam calendar", () => {
  it("counts Istanbul calendar days to the ÖSYM dates", () => {
    expect(daysUntil("2026-10-17", fifth)).toBe(12);
    expect(daysUntil("2026-11-22", fifth)).toBe(48);
    expect(daysUntil("2026-12-19", fifth)).toBe(75);
    expect(daysUntil("2026-10-17", new Date("2026-10-05T22:00:00Z"))).toBe(11);
  });

  it("lists only sittings that have not passed", () => {
    const names = upcomingSittings(fifth).map((sitting) => sitting.name);
    expect(names).toEqual(["e-YDS 2026/11", "YDS 2026/2", "e-YDS 2026/12"]);
    expect(finishedFamilies(fifth).map((row) => row.family)).toEqual(["yokdil", "eyokdil"]);
    expect(countdownText(0)).toBe("bugün");
    expect(countdownText(12)).toBe("12 gün kaldı");
  });
});
