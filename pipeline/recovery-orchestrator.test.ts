import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { buildDraftsEditorialCandidate, draftsCandidateOptions, draftsCandidateVersion } from "@/modules/factory/item-model/drafts-candidate";
import { recoverAfterQuality, recoveryDefaultEnabled, type RecoveryInput } from "@/modules/factory/item-model/recovery";
import { loadPrices } from "./ai/prices";
import { conservativeRecoveryCeiling } from "./recovery/budget";

const recordPath = path.resolve(".data/analysis/_factory/cognitive-trap/medium-repro-v1/medium-repro-translation-tr_en.json");
const candidatePath = path.resolve(".data/analysis/_factory/cognitive-trap/drafts-editorial-candidate-v1/candidate.json");
const frozenRecord = createHash("sha256").update(readFileSync(recordPath)).digest("hex");
const frozenCandidate = createHash("sha256").update(readFileSync(candidatePath)).digest("hex");
const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

const source = "Tüm taslaklar kurula dağıtıldı, ama onların çoğu sonradan ikinci okumaya alınmadı.";
const key = "All of the drafts were distributed to the board, but most of them were not later taken up for the second reading.";
const five = {
  A: key,
  B: "All of the drafts were distributed to the board, but none of them was later taken up for the second reading.",
  C: "Most of the drafts were taken up for the second reading, but only afterward were all of them distributed to the board.",
  D: "All drafts were approved by the board, but most were not later reviewed for a second reading.",
  E: "All of the drafts were distributed to the board, but most of the board members were not later taken up for a second reading.",
};
const repairedC = "The board received every draft, yet the later second reading left most of those drafts aside.";
const replacedE = "The clerks filed every draft with the board, but most drafts stayed out of the later second reading.";

afterAll(() => {
  expect(createHash("sha256").update(readFileSync(recordPath)).digest("hex")).toBe(frozenRecord);
  expect(createHash("sha256").update(readFileSync(candidatePath)).digest("hex")).toBe(frozenCandidate);
});

function run(extra: Partial<RecoveryInput> & Pick<RecoveryInput, "signals" | "handlers" | "estimatedUsd" | "budgetUsd">) {
  return recoverAfterQuality({
    enabled: true,
    source,
    key,
    sourceHash: "715c2a5757ce",
    keyHash: "d853e50bf4bd",
    options: { ...five },
    productionCostUsd: 0.066904,
    ...extra,
  });
}

describe("drafts editorial candidate", () => {
  it("freezes a separate copy and keeps the recorded five", () => {
    const saved = JSON.parse(readFileSync(recordPath, "utf8")) as { id: string; source: string; key: string; arms: { B: { options: typeof five } } };
    const candidate = buildDraftsEditorialCandidate({ id: saved.id, source: saved.source, key: saved.key, optionB: saved.arms.B.options.B });
    const stored = JSON.parse(readFileSync(candidatePath, "utf8"));
    expect(stored).toEqual(candidate);
    expect(candidate.version).toBe(draftsCandidateVersion);
    expect(candidate.sourceHash).toBe("715c2a5757ce");
    expect(candidate.keyHash).toBe("d853e50bf4bd");
    expect(candidate.candidateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(candidate.options).toEqual(draftsCandidateOptions);
    expect(saved.arms.B.options.C).not.toBe(candidate.options.C);
    expect(candidate.distractors.map((row) => [row.optionId, row.dominantDifference, row.editorialRisks])).toEqual([
      ["B", "most → none", []],
      ["C", "afterwards attaches to distribution", ["surface_edit_of_key", "relation_unresolved"]],
      ["D", "distributed → approved", ["relation_unresolved"]],
      ["E", "contrast read as cause", ["relation_unresolved"]],
    ]);
    expect(candidate).toMatchObject({ meaningProven: false, qualityProven: false, observedDifficulty: null, editorial: "pending", studentBankWrite: false, humanApproval: false, benchmarkStarted: false });
    expect(() => buildDraftsEditorialCandidate({ id: saved.id, source: `${saved.source} x`, key: saved.key, optionB: saved.arms.B.options.B })).toThrow(/source/);
  });
});

describe("recovery orchestrator", () => {
  it("stays off and keeps a sound option without a call", () => {
    expect(recoveryDefaultEnabled).toBe(false);
    const off = recoverAfterQuality({ enabled: false, source, key, sourceHash: "715c2a5757ce", keyHash: "d853e50bf4bd", options: five, handlers: { repair: () => { throw new Error("called"); } } });
    expect(off.blocked).toBe("disabled");
    expect(off.providerCalls).toBe(0);
    expect(off.options).toEqual(five);
    const accepted = run({ signals: [], estimatedUsd: 0.001, budgetUsd: 0.02, handlers: {} });
    expect(accepted.rows.every((row) => row.decision === "accept" && row.executed === false)).toBe(true);
    expect(accepted.options.B).toBe(five.B);
    expect(accepted.meaningProven).toBe(false);
    expect(accepted.studentBankWrite).toBe(false);
    expect(accepted.productionCostUsd).toBe(0.066904);
    expect(accepted.recoveryCostUsd).toBe(0);
  });

  it("repairs a local defect, routes repair_not_possible to one replacement, and stops the listed risks", () => {
    let repairs = 0;
    let replacements = 0;
    const repaired = run({
      estimatedUsd: 0.001,
      budgetUsd: 0.02,
      signals: [{ optionId: "C", code: "unsupported_extension", evidence: "only afterward", mechanismId: "temporal_order", targetMisreading: "afterwards applies to distribution" }],
      handlers: {
        repair: () => {
          repairs += 1;
          return { outcome: "replacement", text: repairedC, modelOutput: repairedC, costUsd: 0.0004 };
        },
      },
    });
    expect(repairs).toBe(1);
    expect(repaired.repairCalls).toBe(1);
    expect(repaired.replaceCalls).toBe(0);
    expect(repaired.options.C).toBe(repairedC);
    expect(repaired.options.B).toBe(five.B);
    expect(repaired.wholeSetRechecked).toBe(true);
    expect(repaired.repair.succeeded).toBe(1);
    expect(repaired.rows.find((row) => row.optionId === "C")?.semanticFailure).toBeNull();

    const replaced = run({
      estimatedUsd: 0.001,
      budgetUsd: 0.02,
      signals: [{ optionId: "E", code: "unnatural_option", evidence: "board members were not later taken up", mechanismId: "reference_shift", mechanismSustainable: true }],
      handlers: {
        repair: () => {
          repairs += 1;
          return { outcome: "repair_not_possible", modelOutput: null, costUsd: 0.0002 };
        },
        replace: ({ forbiddenMechanismIds }) => {
          replacements += 1;
          expect(forbiddenMechanismIds).toContain("reference_shift");
          return { outcome: "replacement", text: replacedE, mechanismId: "contrast_cause", modelOutput: replacedE, costUsd: 0.0003 };
        },
      },
    });
    expect(replacements).toBe(1);
    expect(replaced.repairCalls).toBe(1);
    expect(replaced.replaceCalls).toBe(1);
    expect(replaced.options.E).toBe(replacedE);
    expect(replaced.repair.notPossible).toBe(1);
    expect(replaced.replace.succeeded).toBe(1);
    expect(replaced.recoveryCostUsd).toBeCloseTo(0.0005);
    expect(replaced.productionCostUsd).toBe(0.066904);

    const repeated = run({
      estimatedUsd: 0.001,
      budgetUsd: 0.02,
      signals: [{ optionId: "E", code: "repair_not_possible", evidence: "reference shift", mechanismId: "reference_shift" }],
      handlers: { replace: () => ({ outcome: "replacement", text: replacedE, mechanismId: "reference_shift" }) },
    });
    expect(repeated.options.E).toBe(five.E);
    expect(repeated.rows.find((row) => row.decision === "replace")?.semanticFailure).toBe("mechanism_repeated");

    const review = run({ estimatedUsd: 0.001, budgetUsd: 0.02, signals: [{ optionId: "A", code: "key_equivalence_uncertain", evidence: "key" }], handlers: { repair: () => { throw new Error("called"); } } });
    expect(review.blocked).toBe("key_review");
    expect(review.providerCalls).toBe(0);
    expect(review.options).toEqual(five);

    const unverified = run({
      estimatedUsd: 0.001,
      budgetUsd: 0.02,
      signals: [{ optionId: "D", code: "mechanism_unverified", evidence: "unverified" }],
      handlers: { repair: () => { throw new Error("called"); }, replace: () => { throw new Error("called"); } },
    });
    expect(unverified.providerCalls).toBe(0);
    expect(unverified.options.D).toBe(five.D);
    expect(unverified.rows.find((row) => row.optionId === "D")?.decision).toBe("accept");
    expect(unverified.rows.find((row) => row.optionId === "D")?.validation).toContain("mechanism_unverified_ignored");

    const second = run({ estimatedUsd: 0.001, budgetUsd: 0.02, signals: [{ optionId: "C", code: "second_defensible", evidence: "option C" }], handlers: { repair: () => { throw new Error("called"); } } });
    expect(second.blocked).toBe("second_answer");
    expect(second.providerCalls).toBe(0);
    expect(second.options).toEqual(five);
  });

  it("keeps the original on hash mismatch, budget failure, a bad repair, and a technical failure", () => {
    const mismatch = run({ sourceHash: "000000000000", estimatedUsd: 0.001, budgetUsd: 0.02, signals: [{ optionId: "C", code: "unsupported_extension", evidence: "only afterward" }], handlers: { repair: () => { throw new Error("called"); } } });
    expect(mismatch.blocked).toBe("hash_mismatch");
    expect(mismatch.providerCalls).toBe(0);
    expect(mismatch.options).toEqual(five);

    const over = run({ estimatedUsd: 0.03, budgetUsd: 0.02, signals: [{ optionId: "C", code: "unsupported_extension", evidence: "only afterward" }], handlers: { repair: () => { throw new Error("called"); } } });
    expect(over.blocked).toBe("budget");
    expect(over.providerCalls).toBe(0);
    expect(over.options).toEqual(five);

    const failed = run({
      estimatedUsd: 0.001,
      budgetUsd: 0.02,
      signals: [{ optionId: "C", code: "unsupported_extension", evidence: "only afterward" }],
      handlers: { repair: () => ({ outcome: "replacement", text: key, introducesNewMeaningError: true }) },
    });
    expect(failed.options.C).toBe(five.C);
    expect(failed.rows.find((row) => row.optionId === "C")?.semanticFailure).toBe("new_meaning_error");
    expect(failed.rows.find((row) => row.optionId === "C")?.technicalFailure).toBeNull();

    const technical = run({
      estimatedUsd: 0.001,
      budgetUsd: 0.02,
      signals: [{ optionId: "C", code: "unsupported_extension", evidence: "only afterward" }],
      handlers: {
        repair: () => ({ outcome: "technical_failure", technicalCodes: ["no_visible_output", "output_budget_exhausted"], costUsd: 0.0001 }),
        replace: () => { throw new Error("technical failure is not a replacement"); },
      },
    });
    expect(technical.options.C).toBe(five.C);
    expect(technical.replaceCalls).toBe(0);
    expect(technical.rows.find((row) => row.optionId === "C")?.technicalFailure).toEqual(["no_visible_output", "output_budget_exhausted"]);
    expect(technical.rows.find((row) => row.optionId === "C")?.semanticFailure).toBeNull();
    expect(technical.repair.technicalFailures).toBe(1);
    expect(technical.replace.attempted).toBe(0);

    const ceiling = conservativeRecoveryCeiling(prices, [{ chars: 2000 }, { chars: 2200 }]);
    expect(ceiling.provider).toBe("openrouter");
    expect(ceiling.model).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(ceiling.calls).toBe(2);
    expect(ceiling.retry).toBe(0);
    expect(ceiling.maxRepairPerOption).toBe(1);
    expect(ceiling.maxReplacePerOption).toBe(1);
    expect(ceiling.outputTokensPerCall).toBe(4096);
    expect(ceiling.estimatedUsd).not.toBeNull();
    expect(ceiling.estimatedUsd!).toBeGreaterThan(0);
    expect(ceiling.estimatedUsd!).toBeLessThanOrEqual(0.02);
    expect(ceiling.separateFromProduction).toBe(true);
    expect(ceiling.liveAuthorized).toBe(false);
    const stage = readFileSync("pipeline/stages/cognitive-trap.ts", "utf8");
    expect(stage).toContain("attachRecovery");
    expect(stage).toContain('recovery?.mode ?? "off"');
    expect(stage).not.toContain("diagnostic-repair");
    expect(readFileSync("src/modules/factory/item-model/recovery.ts", "utf8")).not.toContain("publishToStudentBank");
    expect(() => publishToStudentBank()).toThrow(/student bank/);
  });
});
