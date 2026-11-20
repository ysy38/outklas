import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { loadPrices } from "./ai/prices";
import { readRepairOutput } from "./diagnostic-repair/contract";
import {
  closedReferenceRepair,
  completionCeiling,
  completionRepairSystem,
  completionReplacementSystem,
  completionTasks,
  completionUser,
  measureCompletion,
  readReplacementOutput,
  refuseCompletionLive,
  repeatedSiblingError,
  revalidateCompletionRepair,
  revalidateReplacement,
  revisedOptionC,
  revisedOptionCRisk,
} from "./diagnostic-repair/completion";
import { draftsRecordPath, loadDraftsRecord } from "./diagnostic-repair/drafts";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const recordFile = path.resolve(draftsRecordPath);
const v2File = path.resolve(".data/analysis/_factory/cognitive-trap/diagnostic-repair-v2/summary.json");
const frozenRecord = createHash("sha256").update(readFileSync(recordFile)).digest("hex");
const frozenV2 = createHash("sha256").update(readFileSync(v2File)).digest("hex");

const minimalD = "All drafts were approved by the board, but most were not later taken up for a second reading.";
const causalE = "Most of the drafts were not later taken up for the second reading, which is why all of them were distributed to the board.";
const nearCopyE = "All of the drafts were distributed to the board because most of them were not later taken up for the second reading.";

afterAll(() => {
  expect(createHash("sha256").update(readFileSync(recordFile)).digest("hex")).toBe(frozenRecord);
  expect(createHash("sha256").update(readFileSync(v2File)).digest("hex")).toBe(frozenV2);
});

describe("drafts completion contract", () => {
  const record = loadDraftsRecord();
  const tasks = completionTasks(record);
  const repair = tasks.find((task) => task.kind === "repair")!;
  const replacement = tasks.find((task) => task.kind === "replacement")!;
  const fixed = { source: record.source, key: record.key, optionB: record.options.B, optionC: revisedOptionC };
  const v2 = JSON.parse(readFileSync(v2File, "utf8")) as {
    rows: { optionId: string; proposed: string | null; verdict: { option_repair_success: boolean; outcome: string; keptText: string } }[];
    whole_set_ready_for_review: boolean;
  };

  it("keeps the v2 C success and records the decision wording as an editorial risk", () => {
    const rowC = v2.rows.find((row) => row.optionId === "C")!;
    expect(rowC.verdict.option_repair_success).toBe(true);
    expect(rowC.proposed).toBe(revisedOptionC);
    expect(revisedOptionCRisk.option_repair_success).toBe(true);
    expect(revisedOptionCRisk.changes).toEqual(["later repeated by after that decision", "explicit decision absent from the source"]);
    expect(rowC.verdict.keptText).toContain("later");
    expect(rowC.verdict.keptText).toContain("after that decision");
    expect(record.source.toLowerCase()).not.toContain("karar");
    expect(record.key.toLowerCase()).not.toContain("decision");
  });

  it("prepares a minimal D repair and a separate E replacement", () => {
    expect(tasks.map((task) => [task.kind, task.optionId])).toEqual([["repair", "D"], ["replacement", "E"]]);
    expect(repair.originalOption).toBe(record.options.D);
    expect(repair.relation).toBe("distributed → approved");
    expect(replacement.relation).toBe("contrast read as cause");
    expect(closedReferenceRepair).toEqual({ kind: "repair", optionId: "E", outcome: "repair_not_possible", option_repair_success: false });
    expect(v2.rows.find((row) => row.optionId === "E")?.verdict.outcome).toBe("repair_not_possible");
    expect(v2.rows.find((row) => row.optionId === "E")?.verdict.keptText).toBe(record.options.E);
    const prompt = `${completionRepairSystem}\n${completionReplacementSystem}\n${tasks.map((task) => completionUser(task, fixed)).join("\n")}`;
    expect(prompt).toContain(record.options.B);
    expect(prompt).toContain(revisedOptionC);
    expect(prompt).not.toContain(minimalD);
    expect(prompt).not.toContain(causalE);
    expect(prompt).not.toContain("its own drafts");
    expect(readRepairOutput({ optionId: "D", text: minimalD })).toEqual({ outcome: "replacement", optionId: "D", text: minimalD });
    expect(readReplacementOutput({ optionId: "E", outcome: "repair_not_possible" })).toBeNull();
    expect(readReplacementOutput({ optionId: "E", outcome: "replacement", text: causalE })).toEqual({ outcome: "replacement", optionId: "E", text: causalE });
  });

  it("accepts only the one-word D repair and rejects copies of B, C, and the closed reference", () => {
    const common = { task: repair, source: record.source, key: record.key };
    const accepted = revalidateCompletionRepair({ ...common, candidate: minimalD });
    expect(accepted.outcome).toBe("option_repair_success");
    expect(accepted.option_repair_success).toBe(true);
    expect(accepted.keptText).toBe(minimalD);
    expect(accepted.meaningProven).toBe(false);
    const stillReviewed = revalidateCompletionRepair({ ...common, candidate: record.options.D });
    expect(stillReviewed.option_repair_success).toBe(false);
    expect(stillReviewed.reasons).toContain("no_change");
    expect(stillReviewed.keptText).toBe(record.options.D);
    const dropsApproved = revalidateCompletionRepair({ ...common, candidate: minimalD.replace("approved", "distributed") });
    expect(dropsApproved.reasons).toEqual(expect.arrayContaining(["misreading_removed", "not_minimal"]));
    const repeatsB = revalidateCompletionRepair({ ...common, candidate: minimalD.replace("most", "none") });
    expect(repeatsB.reasons).toContain("repeats_B");
    const repeatsC = revalidateCompletionRepair({ ...common, candidate: `${minimalD.replace(/\.$/, "")}, after that decision.` });
    expect(repeatsC.reasons).toContain("repeats_C");
    const people = revalidateCompletionRepair({ ...common, candidate: "All drafts were approved by the board, but most people were not later taken up for a second reading." });
    expect(people.reasons).toContain("repeats_closed_reference");
    expect(people.keptText).toBe(record.options.D);
  });

  it("accepts a causal E sentence and rejects B, C, D, and the closed reference shift", () => {
    const common = { task: replacement, source: record.source, key: record.key, optionB: record.options.B, optionC: revisedOptionC };
    const accepted = revalidateReplacement({ ...common, candidate: causalE });
    expect(accepted.outcome).toBe("replacement_accepted");
    expect(accepted.replacement_success).toBe(true);
    expect(accepted.kind).toBe("replacement");
    expect(repeatedSiblingError(causalE)).toEqual([]);
    const none = revalidateReplacement({ ...common, candidate: causalE.replace(/most/i, "none") });
    expect(none.reasons).toContain("repeats_B");
    const decision = revalidateReplacement({ ...common, candidate: causalE.replace(/\.$/, " after that decision.") });
    expect(decision.reasons).toContain("repeats_C");
    const approved = revalidateReplacement({ ...common, candidate: causalE.replace("distributed", "approved") });
    expect(approved.reasons).toEqual(expect.arrayContaining(["repeats_D", "distribution_missing"]));
    const owned = revalidateReplacement({ ...common, candidate: "All of the drafts were distributed to the board because most of its own drafts were not later taken up for the second reading." });
    expect(owned.reasons).toContain("repeats_closed_reference");
    const nearCopy = revalidateReplacement({ ...common, candidate: nearCopyE });
    expect(nearCopy.reasons).toContain("second_defensible");
    const contrast = revalidateReplacement({ ...common, candidate: record.key });
    expect(contrast.reasons).toContain("contrast_kept");
    expect(contrast.replacement_success).toBe(false);
    expect(contrast.keptText).toBe(record.options.E);
    for (const failed of [none, decision, approved, owned, nearCopy, contrast]) expect(failed.outcome).toBe("replacement_rejected");
  });

  it("keeps repair, replacement, and the five separate, and does not authorize a call", () => {
    const repairResult = revalidateCompletionRepair({ task: repair, source: record.source, key: record.key, candidate: minimalD });
    const replacementResult = revalidateReplacement({ task: replacement, source: record.source, key: record.key, optionB: record.options.B, optionC: revisedOptionC, candidate: causalE });
    const measured = measureCompletion({ repair: repairResult, replacement: replacementResult });
    expect(measured.repair?.option_repair_success).toBe(true);
    expect(measured.replacement?.replacement_success).toBe(true);
    expect(measured.closedReferenceRepair.outcome).toBe("repair_not_possible");
    expect(measured.revisedOptionC.option_repair_success).toBe(true);
    expect(measured.whole_set_ready_for_review).toBe(false);
    expect(measured.meaningProven).toBe(false);
    expect(measured.editorial).toBe("pending");
    expect(measured.studentBankWrites).toBe(0);
    expect(v2.whole_set_ready_for_review).toBe(false);
    const ceiling = completionCeiling(record, prices);
    expect(ceiling.calls).toBe(2);
    expect(ceiling.retry).toBe(0);
    expect(ceiling.outputTokensPerCall).toBe(4096);
    expect(ceiling.estimatedUsd).not.toBeNull();
    expect(ceiling.estimatedUsd!).toBeGreaterThan(0.000933);
    expect(ceiling.estimatedUsd!).toBeLessThanOrEqual(0.02);
    expect(ceiling.liveAuthorized).toBe(false);
    expect(ceiling.factoryIntegrated).toBe(false);
    expect(refuseCompletionLive()).toEqual({ started: false, providerCalls: 0, studentBankWrites: 0, reason: "drafts completion live call is not authorized" });
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    expect(readFileSync("pipeline/stages/cognitive-trap.ts", "utf8")).not.toContain("diagnostic-repair");
  });
});
