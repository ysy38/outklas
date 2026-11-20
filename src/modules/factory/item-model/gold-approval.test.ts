import { describe, expect, it } from "vitest";
import { benchmarkCeilings, runItemBenchmark, benchmarkAuthorization, freezeBenchmarkPlan } from "./benchmark";
import { goldContentIdentity, goldCriteria, goldReferenceRules, loadGoldReview, submitGoldReview, approvalApplies, type GoldCriteria } from "./gold-approval";
import { publishToStudentBank } from "./review-status";

const allTrue = Object.fromEntries(goldCriteria.map((key) => [key, true])) as GoldCriteria;

describe("editorial gold approval", () => {
  it("presents the three pending items and keeps the two revisions unchanged", () => {
    const review = loadGoldReview();
    expect(review.pending.map((item) => item.candidateId)).toEqual(["door", "snow", "clinic"]);
    expect(review.held.map((item) => [item.candidateId, item.editorialReview, item.editorialStatus])).toEqual([
      ["ferry", "revision_required", "revision_required"],
      ["harbor", "revision_required", "revision_required"],
    ]);
    for (const item of review.pending) {
      expect(item.humanApproval).toBe("pending");
      expect(item.editorialStatus).not.toBe("editorially_accepted");
      expect(item.observedDifficulty).toBeNull();
      expect(item.publishState).toBe("unpublished");
      expect(item.approval).toBeNull();
      expect(item.contentHash).toHaveLength(64);
      expect(item.questionVersion).toContain(item.contentHash.slice(0, 12));
      expect(Object.keys(item.options)).toEqual(["A", "B", "C", "D", "E"]);
      expect(item.options[item.correctOption]).toBe(item.targetKey);
    }
    expect(review.pending[0]?.source).toContain("side door");
    expect(review.held[0]?.blockingDefect).toContain("Had-to-if");
    expect(review.held[1]?.blockingDefect).toContain("absence of need");
  });

  it("accepts only an explicit human pass of all six criteria and does not publish", () => {
    const door = loadGoldReview().pending[0]!;
    const { no_form_clue: _omitted, ...missing } = allTrue;
    expect(() => submitGoldReview(door, { reviewerId: "editor-1", reviewerKind: "human", reviewedAt: "2026-11-17T08:00:00.000Z", criteria: missing, decision: "accept", reason: "checked" })).toThrow(/missing criteria/);
    expect(() => submitGoldReview(door, { reviewerId: "editor-1", reviewerKind: "human", reviewedAt: "2026-11-17T08:00:00.000Z", criteria: { ...allTrue, no_second_answer: false }, decision: "accept", reason: "B is defensible" })).toThrow(/all six/);
    expect(() => submitGoldReview(door, { reviewerId: "claude-sonnet", reviewerKind: "human", reviewedAt: "2026-11-17T08:00:00.000Z", criteria: allTrue, decision: "accept", reason: "model said approve" })).toThrow(/not human approval/);
    const withheld = submitGoldReview(door, { reviewerId: "editor-1", reviewerKind: "human", reviewedAt: "2026-11-17T08:00:00.000Z", criteria: { ...allTrue, measures_construct: false }, decision: "withhold", reason: "The concession is not what the item tests." });
    expect(withheld.editorialStatus).toBe("ready_for_human_approval");
    expect(withheld.humanApproval).toBe("withheld");
    expect(withheld.approval?.reason).toContain("concession");
    const accepted = submitGoldReview(door, { reviewerId: "editor-1", reviewerKind: "human", reviewedAt: "2026-11-17T08:00:00.000Z", criteria: allTrue, decision: "accept", reason: "All six criteria hold on this wording." });
    expect(accepted.editorialStatus).toBe("editorially_accepted");
    expect(accepted.publishState).toBe("unpublished");
    expect(accepted.observedDifficulty).toBeNull();
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    expect(() => submitGoldReview(loadGoldReview().held[0]!, { reviewerId: "editor-1", reviewerKind: "human", reviewedAt: "2026-11-17T08:00:00.000Z", criteria: allTrue, decision: "accept", reason: "rewrite" })).toThrow(/revision_required/);
  });

  it("drops an approval when the wording changes and does not treat unaccepted drafts as proof", () => {
    const door = loadGoldReview().pending[0]!;
    const accepted = submitGoldReview(door, { reviewerId: "editor-1", reviewerKind: "human", reviewedAt: "2026-11-17T08:00:00.000Z", criteria: allTrue, decision: "accept", reason: "All six criteria hold on this wording." });
    expect(approvalApplies(door, accepted.approval!)).toBe(true);
    const edited = { ...door, targetKey: `${door.targetKey} today`, options: { ...door.options, C: `${door.targetKey} today` } };
    expect(goldContentIdentity(edited).contentHash).not.toBe(door.contentHash);
    expect(approvalApplies(edited, accepted.approval!)).toBe(false);
    const unproven = goldReferenceRules(loadGoldReview().pending);
    expect(unproven.qualityProof).toBe(false);
    expect(unproven.rules).toEqual([]);
    const proven = goldReferenceRules([accepted]);
    expect(proven.qualityProof).toBe(true);
    expect(JSON.stringify(proven.rules)).not.toContain(door.source);
    expect(JSON.stringify(proven.rules)).not.toContain(door.targetKey);
    expect(proven.rules[0]?.cognitiveOperation).toBe("hold_a_concession_against_a_false_cause");
    const plan = freezeBenchmarkPlan({ generator: "writer-test", judge: "judge-test" });
    expect(runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: benchmarkCeilings.maxCalls, maxRegenerations: 0, maxCostUsd: benchmarkCeilings.totalUsdCap }, plan }).started).toBe(false);
  });
});
