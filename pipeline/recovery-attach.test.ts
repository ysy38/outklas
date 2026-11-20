import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDraftsEditorialCandidate } from "@/modules/factory/item-model/drafts-candidate";
import { attachRecovery, recoveryActiveAuthorization, replayCandidate, type QualityRecord } from "./recovery/attach";

const pilotDir = path.resolve(".data/analysis/_factory/cognitive-trap/medium-repro-v1");
const candidatePath = path.resolve(".data/analysis/_factory/cognitive-trap/drafts-editorial-candidate-v1/candidate.json");

function loadPilot(): QualityRecord[] {
  return readdirSync(pilotDir)
    .filter((name) => name.endsWith(".json") && name !== "summary.json" && name !== "catalog.json")
    .sort()
    .map((name) => JSON.parse(readFileSync(path.join(pilotDir, name), "utf8")) as QualityRecord & { id: string });
}

describe("recovery dry-run on stored factory output", () => {
  const records = loadPilot();
  const byId = new Map(records.map((record) => [(record as QualityRecord & { id: string }).id, record]));

  it("does not repair the four pilot items or the frozen Drafts candidate", () => {
    const drafts = byId.get("medium-repro-translation-tr_en")!;
    const draftsRun = attachRecovery(drafts, { mode: "dry_run", productionCostUsd: 0.066904 });
    expect(draftsRun.blocked).toBeNull();
    expect(draftsRun.providerCalls).toBe(0);
    expect(draftsRun.recoveryCostUsd).toBe(0);
    expect(draftsRun.productionCostUsd).toBe(0.066904);
    expect(draftsRun.qualityDecision).toBe("needs_revision");
    expect(draftsRun.meaningProven).toBe(false);
    expect(draftsRun.qualityProven).toBe(false);
    expect(draftsRun.editorial).toBe("pending");
    expect(draftsRun.rows.map((row) => [row.optionId, row.decision, row.call, row.ignored])).toEqual([
      ["A", "no_detected_issue", false, []],
      ["B", "insufficient_evidence", false, ["mechanism_unverified"]],
      ["C", "insufficient_evidence", false, ["mechanism_unverified"]],
      ["D", "insufficient_evidence", false, ["mechanism_unverified", "high_overlap"]],
      ["E", "insufficient_evidence", false, ["mechanism_unverified", "high_overlap"]],
    ]);
    expect(draftsRun.diagnosticEvidence.every((item) => item.repairEligible === false && item.provenance === "deterministic")).toBe(true);
    expect(draftsRun.diagnosticEvidence.find((item) => item.scope === "key")).toMatchObject({
      optionId: "A",
      issueCode: "no_detected_issue",
      verificationStatus: "unverified",
      repairEligible: false,
    });

    const reviewers = attachRecovery(byId.get("medium-repro-restatement-1")!, { mode: "dry_run" });
    expect(reviewers.providerCalls).toBe(0);
    expect(reviewers.ignoredItemSignals).toEqual(["mechanism_unverified", "judge_review"]);
    expect(reviewers.rows.map((row) => [row.optionId, row.decision, row.call])).toEqual([
      ["A", "insufficient_evidence", false],
      ["B", "insufficient_evidence", false],
      ["C", "no_detected_issue", false],
      ["D", "insufficient_evidence", false],
      ["E", "insufficient_evidence", false],
    ]);
    expect(reviewers.diagnosticEvidence).toContainEqual({
      scope: "set",
      optionId: null,
      issueCode: "judge_review",
      evidence: "judge_review",
      provenance: "judge",
      verificationStatus: "confirmed",
      repairEligible: false,
    });

    const samples = attachRecovery(byId.get("medium-repro-restatement-2")!, { mode: "dry_run" });
    expect(samples.blocked).toBe("second_answer");
    expect(samples.providerCalls).toBe(0);
    expect(samples.unassignedGateEvidence).toEqual([{ code: "key_length_clue", status: "insufficient_evidence" }]);
    expect(samples.rows.map((row) => [row.optionId, row.decision, row.evidence, row.call])).toEqual([
      ["A", "insufficient_evidence", null, false],
      ["B", "accept", null, false],
      ["C", "review", "secondAnswerOptions", false],
      ["D", "no_detected_issue", null, false],
      ["E", "review", "coordinate_clause", false],
    ]);
    expect(samples.diagnosticEvidence).toEqual(
      expect.arrayContaining([
        { scope: "set", optionId: null, issueCode: "key_length_clue", evidence: "key_length_clue", provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false },
        { scope: "option", optionId: "C", issueCode: "second_defensible", evidence: "secondAnswerOptions", provenance: "judge", verificationStatus: "confirmed", repairEligible: false },
        { scope: "option", optionId: "E", issueCode: "proposition_unverified", evidence: "coordinate_clause; added_coordinate_clause_not_proven", provenance: "deterministic", verificationStatus: "unverified", repairEligible: false },
      ]),
    );

    const editor = attachRecovery(byId.get("medium-repro-translation-en_tr")!, { mode: "dry_run" });
    expect(editor.providerCalls).toBe(0);
    expect(editor.unassignedGateEvidence).toEqual([{ code: "only_complete_option", status: "insufficient_evidence" }]);
    expect(editor.rows.filter((row) => row.decision === "repair" || row.decision === "replace")).toEqual([]);
    expect(editor.rows.map((row) => [row.optionId, row.decision, row.call])).toEqual([
      ["A", "insufficient_evidence", false],
      ["B", "insufficient_evidence", false],
      ["C", "insufficient_evidence", false],
      ["D", "insufficient_evidence", false],
      ["E", "no_detected_issue", false],
    ]);
    expect(editor.diagnosticEvidence).toContainEqual({
      scope: "set",
      optionId: null,
      issueCode: "only_complete_option",
      evidence: "only_complete_option",
      provenance: "deterministic",
      verificationStatus: "confirmed",
      repairEligible: false,
    });

    const saved = JSON.parse(readFileSync(path.join(pilotDir, "medium-repro-translation-tr_en.json"), "utf8")) as { id: string; source: string; key: string; arms: { B: { options: { B: string } } } };
    const candidate = buildDraftsEditorialCandidate({ id: saved.id, source: saved.source, key: saved.key, optionB: saved.arms.B.options.B });
    const stored = JSON.parse(readFileSync(candidatePath, "utf8")) as typeof candidate;
    const candidateRun = replayCandidate({
      ...stored,
      editorialRisks: stored.distractors.map((item) => ({ optionId: item.optionId, changes: item.editorialRisks })),
      overlapLabels: stored.recordedGate.overlapLabels,
    });
    expect(candidateRun.blocked).toBeNull();
    expect(candidateRun.providerCalls).toBe(0);
    expect(candidateRun.rows.map((row) => [row.optionId, row.decision, row.call])).toEqual([
      ["A", "no_detected_issue", false],
      ["B", "insufficient_evidence", false],
      ["C", "insufficient_evidence", false],
      ["D", "insufficient_evidence", false],
      ["E", "insufficient_evidence", false],
    ]);
    expect(candidateRun.ignoredItemSignals).toEqual(["editorial_candidate_has_no_quality_gate"]);
    expect(candidateRun.diagnosticEvidence.filter((item) => item.provenance === "editorial").map((item) => [item.optionId, item.issueCode, item.repairEligible])).toEqual([
      ["A", "no_detected_issue", false],
      ["C", "surface_edit_of_key", false],
      ["C", "relation_unresolved", false],
      ["D", "relation_unresolved", false],
      ["E", "relation_unresolved", false],
    ]);
    expect(candidateRun.diagnosticEvidence.filter((item) => item.provenance === "deterministic").map((item) => [item.optionId, item.issueCode, item.repairEligible])).toEqual([
      ["C", "high_overlap", false],
      ["D", "high_overlap", false],
      ["E", "high_overlap", false],
    ]);
  });

  it("pins deterministic option-level defects without inventing new semantic judgments", () => {
    const langItem: QualityRecord = {
      questionType: "translation",
      direction: "en_tr",
      source: "The board approved the revised draft before noon.",
      key: "Kurul, gözden geçirilmiş taslağı öğleden önce onayladı.",
      arms: {
        B: {
          keyLetter: "A",
          options: {
            A: "Kurul, gözden geçirilmiş taslağı öğleden önce onayladı.",
            B: "The board approved the revised draft after noon.",
            C: "Kurul ilk taslağı öğleden sonra reddetti.",
            D: "Kurul gözden geçirilmiş taslağı öğleye kadar bekletti.",
            E: "Kurul taslakları öğleden önce dağıtmadı.",
          },
          qualityDecision: "fail",
          qualityReasons: ["target_language_mismatch"],
          failures: ["target_language_mismatch"],
          secondAnswerOptions: [],
          decisionRisks: null,
          propositionGuards: [],
        },
      },
    };
    const langRun = attachRecovery(langItem, { mode: "dry_run" });
    expect(langRun.unassignedGateEvidence).toEqual([]);
    expect(langRun.diagnosticEvidence).toContainEqual({
      scope: "option",
      optionId: "B",
      issueCode: "target_language_mismatch",
      evidence: "script=en, expected=tr",
      provenance: "deterministic",
      verificationStatus: "confirmed",
      repairEligible: true,
    });
    expect(langRun.rows.map((row) => [row.optionId, row.decision, row.evidence])).toEqual([
      ["A", "no_detected_issue", null],
      ["B", "repair", "script=en, expected=tr"],
      ["C", "accept", null],
      ["D", "accept", null],
      ["E", "accept", null],
    ]);

    const withoutDirection = attachRecovery({ ...langItem, direction: null }, { mode: "dry_run" });
    expect(withoutDirection.unassignedGateEvidence).toEqual([{ code: "target_language_mismatch", status: "insufficient_evidence" }]);
    expect(withoutDirection.diagnosticEvidence).toContainEqual({
      scope: "set",
      optionId: null,
      issueCode: "target_language_mismatch",
      evidence: "target_language_mismatch",
      provenance: "deterministic",
      verificationStatus: "confirmed",
      repairEligible: false,
    });

    const equivalentItem: QualityRecord = {
      questionType: "restatement",
      direction: null,
      source: "All of the drafts were distributed to the board.",
      key: "Every draft was distributed to the board.",
      arms: {
        B: {
          keyLetter: "A",
          options: {
            A: "Every draft was distributed to the board.",
            B: "Every draft was distributed to the board.",
            C: "None of the drafts reached the board.",
            D: "Only half of the drafts were signed.",
            E: "All drafts were delayed although approved.",
          },
          qualityDecision: "fail",
          qualityReasons: ["confirmed_equivalent"],
          failures: ["confirmed_equivalent"],
          secondAnswerOptions: [],
          decisionRisks: {
            key_semantic_risk: ["key_near_copy"],
            distractor_equivalence_risk: ["E:discourse"],
            whole_set_clue_risk: [],
          },
          propositionGuards: [
            {
              label: "D",
              guard: { status: "unsupported_clause", mechanismStatus: "supported", signals: ["with_absolute"], reason: "added_with_absolute" },
            },
          ],
        },
      },
    };
    const eqRun = attachRecovery(equivalentItem, { mode: "dry_run" });
    expect(eqRun.blocked).toBe("second_answer");
    expect(eqRun.diagnosticEvidence).toEqual(
      expect.arrayContaining([
        { scope: "key", optionId: "A", issueCode: "key_near_copy", evidence: "key_near_copy", provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false },
        { scope: "option", optionId: "B", issueCode: "confirmed_equivalent", evidence: "same_wording", provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false },
        { scope: "option", optionId: "E", issueCode: "discourse_connector_swap", evidence: "E:discourse", provenance: "deterministic", verificationStatus: "unverified", repairEligible: false },
        { scope: "option", optionId: "D", issueCode: "unsupported_extension", evidence: "with_absolute", provenance: "deterministic", verificationStatus: "confirmed", repairEligible: true },
      ]),
    );
    expect(eqRun.rows.map((row) => [row.optionId, row.decision])).toEqual([
      ["A", "review"],
      ["B", "review"],
      ["C", "accept"],
      ["D", "review"],
      ["E", "insufficient_evidence"],
    ]);
  });

  it("keeps off identical in effect and refuses active without a caller", () => {
    const drafts = byId.get("medium-repro-translation-tr_en")!;
    const off = attachRecovery(drafts);
    expect(off.mode).toBe("off");
    expect(off.rows).toEqual([]);
    expect(off.providerCalls).toBe(0);
    expect(off.recoveryCostUsd).toBe(0);
    expect(off.qualityDecision).toBe(drafts.arms.B.qualityDecision);
    const options = { ...drafts.arms.B.options };
    expect(drafts.arms.B.options).toEqual(options);
    const missing = attachRecovery(drafts, { mode: "active" });
    expect(missing.blocked).toBe("active_not_authorized");
    expect(missing.providerCalls).toBe(0);
    expect(missing.rows).toEqual([]);
    const named = attachRecovery(drafts, { mode: "active", authorization: recoveryActiveAuthorization, maxCalls: 2, maxCostUsd: 0.02 });
    expect(named.blocked).toBe("active_not_attached");
    expect(named.providerCalls).toBe(0);
    const uncertain = attachRecovery({ ...drafts, keyFailures: ["key_equivalence_uncertain"] }, { mode: "dry_run" });
    expect(uncertain.blocked).toBe("key_review");
    expect(uncertain.providerCalls).toBe(0);
    expect(uncertain.rows.every((row) => row.decision === "review" && row.call === false)).toBe(true);
    const mismatched = attachRecovery({ ...drafts, key: `${drafts.key} extra` }, { mode: "dry_run" });
    expect(mismatched.blocked).toBe("hash_mismatch");
    expect(mismatched.providerCalls).toBe(0);
    expect(mismatched.rows.every((row) => row.decision === "insufficient_evidence")).toBe(true);
  });
});
