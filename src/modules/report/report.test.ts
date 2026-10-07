import { describe, expect, it } from "vitest";
import { ydsBlueprint, type SectionId } from "@/modules/exam/blueprint";
import { buildReport, type ReportItem } from "./report";

function item(section: SectionId, correct: boolean | null, extra: Partial<ReportItem> = {}): ReportItem {
  return { section, skills: [section], correct, timeMs: correct === null ? 0 : 30_000, distractor: null, ...extra };
}

describe("diagnostic report", () => {
  const items: ReportItem[] = [
    item("vocabulary", true),
    item("vocabulary", false, { skills: ["vocabulary", "collocation"], distractor: "COLLOCATION_ERROR" }),
    item("vocabulary", false, { skills: ["vocabulary", "collocation"], distractor: "COLLOCATION_ERROR" }),
    ...Array.from({ length: 10 }, (_, index) => item("reading", index < 4, { timeMs: 90_000, skills: ["reading", "inference"] })),
    ...Array.from({ length: 5 }, () => item("grammar", true)),
    item("sentence", null),
    item("sentence", null),
    item("sentence", null),
  ];
  const report = buildReport({ exam: "yds", bands: ydsBlueprint.bands, items, targetScore: null });

  it("counts blanks as missed and orders areas by the points they cost in the real exam", () => {
    expect(report.total).toBe(21);
    expect(report.blank).toBe(3);
    expect(report.areas[0].section).toBe("reading");
    expect(report.areas[0].loss).toBe(15);
    expect(report.areas.find((area) => area.section === "grammar")?.level).toBe("İyi");
  });

  it("aims for the next score step above the estimate and keeps the scenario a range", () => {
    expect(report.firstTarget).toBeGreaterThan(report.estimate.point);
    expect(report.scenario?.low).toBeLessThanOrEqual(report.scenario?.high ?? 0);
    expect(report.scenario?.sections[0]).toBe("reading");
  });

  it("only states findings the answers support", () => {
    const ids = report.findings.map((finding) => finding.id);
    expect(ids[0]).toBe("biggest-loss");
    expect(ids).toContain("vocabulary");
    expect(ids).toContain("time");
    expect(ids).toContain("trap");
    expect(ids).toContain("blanks");
    expect(ids).toContain("reading");
    expect(ids).toContain("strength");
    expect(ids).not.toContain("connectors");
    expect(report.findings.find((finding) => finding.id === "vocabulary")?.title).toContain("kelime kalıpları");
  });
});
