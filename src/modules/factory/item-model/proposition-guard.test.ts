import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publishToStudentBank } from "./review-status";
import { assessProposition, propositionHoldsQuality, qualityAfterJudge } from "./proposition-guard";
import { assessWholeSet } from "./whole-set";

const taxonomy = ".data/analysis/_factory/cognitive-trap/taxonomy-live-v1";
const quality = ".data/analysis/_factory/cognitive-trap/quality-v1";

function saved(file: string): { source: string; key: string; options: Record<string, string>; keyLetter: string } {
  const data = JSON.parse(readFileSync(file, "utf8")) as {
    source: string;
    key: string;
    arms: { B: { keyLetter: string; options: Record<string, string> } };
  };
  return { source: data.source, key: data.key, options: data.arms.B.options, keyLetter: data.arms.B.keyLetter };
}

describe("unsupported proposition guard", () => {
  it("does not prove the three added frames as unsupported clauses", () => {
    const editors = saved(`${taxonomy}/taxonomy-restatement-hard.json`);
    const board = saved(`${taxonomy}/taxonomy-translation-tr_en.json`);
    const ferry = saved(`${quality}/quality-restatement-hard.json`);
    const cases = [
      { name: "editors-b", item: editors, label: "B", mechanismId: "FOCUS_SCOPE" },
      { name: "tr-en-e", item: board, label: "E", mechanismId: "FOCUS_SCOPE" },
      { name: "ferry-b", item: ferry, label: "B", mechanismId: null },
    ];
    for (const entry of cases) {
      const option = entry.item.options[entry.label]!;
      const guard = assessProposition({ source: entry.item.source, key: entry.item.key, option, mechanismId: entry.mechanismId, semanticRisk: "none" });
      expect(guard.status, entry.name).toBe("unverified");
      expect(guard.status, entry.name).not.toBe("unsupported_clause");
      expect(guard.signals.length, entry.name).toBeGreaterThan(0);
      expect(guard.semanticRiskClearsGuard).toBe(false);
      expect(propositionHoldsQuality(guard)).toBe(true);
      expect(option).toBe(entry.item.options[entry.label]);
      const gate = assessWholeSet({
        source: entry.item.source,
        key: entry.item.key,
        options: entry.item.options as never,
        correct: entry.item.keyLetter as "A",
      });
      expect(gate.options.find((row) => row.label === entry.label)?.relation).not.toBe("confirmed_equivalent");
      expect(gate.decision).not.toBe("fail");
    }
    const editorsGuard = assessProposition({ source: editors.source, key: editors.key, option: editors.options.B!, mechanismId: "FOCUS_SCOPE", semanticRisk: "none" });
    expect(editorsGuard.signals).toContain("coordinate_clause");
    expect(editorsGuard.mechanismStatus).toBe("mechanism_unverified");
    const contrast = assessProposition({ source: board.source, key: board.key, option: board.options.E!, mechanismId: "FOCUS_SCOPE", semanticRisk: "none" });
    expect(contrast.signals).toContain("contrast_frame");
    expect(contrast.mechanismStatus).toBe("mechanism_unverified");
    const absolute = assessProposition({ source: ferry.source, key: ferry.key, option: ferry.options.B!, mechanismId: null, semanticRisk: "none" });
    expect(absolute.signals).toContain("with_absolute");
    expect(absolute.mechanismStatus).toBe("not_labeled");
  });

  it("does not mark the registry distractors or a synonym paraphrase as unsupported", () => {
    const registry = saved(`${taxonomy}/taxonomy-restatement-medium.json`);
    const labeled = [
      ["A", "CONCESSION_CAUSE"],
      ["B", "QUANTITY_SCOPE"],
      ["D", "EVIDENCE_CERTAINTY"],
      ["E", "NEGATION_SCOPE"],
    ] as const;
    for (const [label, mechanismId] of labeled) {
      const guard = assessProposition({
        source: registry.source,
        key: registry.key,
        option: registry.options[label]!,
        mechanismId,
        semanticRisk: "none",
      });
      expect(guard.status, label).toBe("clear");
      expect(guard.signals, label).toEqual([]);
      expect(guard.status, label).not.toBe("unsupported_clause");
    }
    expect(assessProposition({ source: registry.source, key: registry.key, option: registry.options.A!, mechanismId: "CONCESSION_CAUSE" }).mechanismStatus).toBe("supported");
    expect(assessProposition({ source: registry.source, key: registry.key, option: registry.options.B!, mechanismId: "QUANTITY_SCOPE" }).mechanismStatus).toBe("supported");
    expect(assessProposition({ source: registry.source, key: registry.key, option: registry.options.D!, mechanismId: "EVIDENCE_CERTAINTY" }).mechanismStatus).toBe("mechanism_unverified");
    expect(assessProposition({ source: registry.source, key: registry.key, option: registry.options.E!, mechanismId: "NEGATION_SCOPE" }).mechanismStatus).toBe("mechanism_unverified");
    const paraphrase = "Although the registry retained every laboratory log from the trial, its archivist uncovered no sign that the two withdrawn samples had been filed with those logs.";
    const natural = assessProposition({ source: registry.source, key: registry.key, option: paraphrase, mechanismId: null, semanticRisk: "none" });
    expect(natural.status).toBe("clear");
    expect(natural.signals).toEqual([]);
    expect(propositionHoldsQuality(natural)).toBe(false);
  });

  it("keeps a judge approval from clearing a proposition hold and does not publish", () => {
    const approved = qualityAfterJudge({ prior: "needs_revision", priorReasons: ["proposition_unverified", "mechanism_unverified"], judgeReasons: [] });
    expect(approved).toEqual({ decision: "needs_revision", reasons: ["proposition_unverified", "mechanism_unverified"] });
    const reviewed = qualityAfterJudge({ prior: "needs_revision", priorReasons: ["proposition_unverified"], judgeReasons: ["judge_review"] });
    expect(reviewed.decision).toBe("needs_revision");
    expect(reviewed.reasons).toEqual(["proposition_unverified", "judge_review"]);
    const clean = qualityAfterJudge({ prior: "pending", priorReasons: [], judgeReasons: [] });
    expect(clean.decision).toBe("pending");
    const failed = qualityAfterJudge({ prior: "fail", priorReasons: ["target_language_mismatch"], judgeReasons: [] });
    expect(failed.decision).toBe("fail");
    expect(() => publishToStudentBank()).toThrow(/student bank/);
  });
});
