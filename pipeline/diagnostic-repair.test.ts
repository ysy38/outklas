import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { loadPrices } from "./ai/prices";
import { buildRepairTasks, itemRepairBlocked, readRepairOutput, refuseLiveRepair, repairEligible, repairSystem, repairUser } from "./diagnostic-repair/contract";
import { repairCost } from "./diagnostic-repair/cost";
import { draftsFixedOptions, draftsRecordPath, draftsRepairTasks, loadDraftsRecord } from "./diagnostic-repair/drafts";
import { draftsEditorialRisks } from "./diagnostic-repair/drafts";
import { measureAfter, measureBefore, wholeSetReady } from "./diagnostic-repair/measure";
import { cautiousRepairCeiling, classifyRepairTransport, openRouterWriterWire, refuseRepairLive, repairLiveAuthorized } from "./diagnostic-repair/call-contract";
import { exclusivityAndNegation, repairNearCopyOfKey, revalidateRepair } from "./diagnostic-repair/revalidate";
import { draftsCandidateOptions } from "@/modules/factory/item-model/drafts-candidate";
import { surfaceEdit } from "@/modules/factory/item-model/cognitive-trap";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const recordFile = path.resolve(draftsRecordPath);
const frozen = createHash("sha256").update(readFileSync(recordFile)).digest("hex");

const repairedC = "Most of the drafts were not taken up for the second reading, but all of the drafts were distributed to the board afterwards.";
const repairedE = "All of the drafts were distributed to the board, but most of its own drafts were not later taken up for the second reading.";

afterAll(() => {
  expect(createHash("sha256").update(readFileSync(recordFile)).digest("hex")).toBe(frozen);
});

describe("diagnostic repair contract", () => {
  const record = loadDraftsRecord();
  const tasks = draftsRepairTasks(record);
  const fixed = { source: record.source, key: record.key, targetLanguage: "en" as const, fixedOptions: draftsFixedOptions(record) };

  it("prepares only the two shown Drafts defects", () => {
    expect(record.meaning).toBe("unverified");
    expect(itemRepairBlocked(["unverified"])).toBe(false);
    expect(itemRepairBlocked(["key_equivalence_uncertain"])).toBe(true);
    expect(tasks.map((task) => task.optionId)).toEqual(["C", "E"]);
    expect(tasks.map((task) => task.issueCode)).toEqual(["unsupported_extension", "unnatural_option"]);
    expect(tasks[0]?.originalOption).toBe(record.options.C);
    expect(tasks[1]?.originalOption).toBe(record.options.E);
    expect(tasks.every((task) => task.sourceHash.length === 12 && task.keyHash.length === 12)).toBe(true);
    expect(new Set(tasks.map((task) => task.sourceHash)).size).toBe(1);
  });

  it("does not start a repair from an unverified mechanism, overlap, or low confidence", () => {
    for (const issueCode of ["mechanism_unverified", "unresolved", "high_overlap", "low_confidence", "key_equivalence_uncertain"]) {
      expect(repairEligible({ issueCode, evidence: "a shown span" })).toBe(false);
    }
    expect(repairEligible({ issueCode: "unsupported_extension", evidence: "only" })).toBe(false);
    expect(repairEligible({ issueCode: "second_defensible", evidence: "option C is also defensible" })).toBe(false);
    expect(buildRepairTasks({
      sourceId: record.id,
      source: record.source,
      key: record.key,
      options: record.options,
      itemSignals: ["key_equivalence_uncertain", "unnatural_option"],
      findings: [{ optionId: "E", issueCode: "unnatural_option", evidence: "board members were not later taken up for a second reading", preservedMeaning: ["x"], targetMisreading: "y", forbiddenChanges: ["z"] }],
    })).toEqual([]);
    expect(buildRepairTasks({
      sourceId: record.id,
      source: record.source,
      key: record.key,
      options: record.options,
      itemSignals: ["mechanism_unverified", "high_overlap"],
      findings: [
        { optionId: "D", issueCode: "high_overlap", evidence: "D:overlap", preservedMeaning: ["x"], targetMisreading: "y", forbiddenChanges: ["z"] },
        { optionId: "E", issueCode: "unnatural_option", evidence: "board members were not later taken up for a second reading", preservedMeaning: ["The drafts stay drafts."], targetMisreading: "The pronoun moves to the board's drafts.", forbiddenChanges: ["do not add an event"] },
      ],
    }).map((task) => task.optionId)).toEqual(["E"]);
  });

  it("asks for one option and does not contain a prepared replacement", () => {
    const user = tasks.map((task) => repairUser(task, fixed)).join("\n");
    const prompt = `${repairSystem}\n${user}`;
    expect(prompt).toContain("optionId and text");
    expect(prompt).toContain("repair_not_possible");
    expect(prompt).toContain("Deleting the word only is not a repair");
    expect(prompt).not.toContain(repairedC);
    expect(prompt).not.toContain(repairedE);
    expect(readRepairOutput({ optionId: "E", text: repairedE, semanticRisk: "none" })).toBeNull();
    expect(readRepairOutput({ optionId: "E", text: repairedE })).toEqual({ outcome: "replacement", optionId: "E", text: repairedE });
    expect(readRepairOutput({ optionId: "E", outcome: "repair_not_possible" })).toEqual({ outcome: "repair_not_possible", optionId: "E" });
    expect(readRepairOutput({ optionId: "E", outcome: "repair_not_possible", text: repairedE })).toBeNull();
  });

  it("keeps a worse candidate and does not treat semanticRisk as proof", () => {
    const taskE = tasks.find((task) => task.optionId === "E")!;
    const taskC = tasks.find((task) => task.optionId === "C")!;
    const common = { source: record.source, key: record.key, options: record.options, targetLanguage: "en" as const, questionType: "translation" as const, correct: "A" as const };
    const droppedOnly = record.options.C.replace("only ", "");
    const rejected = revalidateRepair({ ...common, task: taskC, candidate: droppedOnly, semanticRisk: "none" });
    expect(rejected.option_repair_success).toBe(false);
    expect(rejected.outcome).toBe("needs_revision");
    expect(rejected.keptText).toBe(record.options.C);
    expect(rejected.sourceHash).toBe(taskC.sourceHash);
    expect(rejected.keyHash).toBe(taskC.keyHash);
    expect(rejected.reasons).toContain("negation_missing");
    expect(rejected.reasons).not.toContain("exclusivity_remains");
    expect(rejected.ignored).toContain("semanticRisk");
    const bothDefects = record.options.C.replace("distributed", "then distributed");
    const both = revalidateRepair({ ...common, task: taskC, candidate: bothDefects });
    expect(both.reasons).toEqual(expect.arrayContaining(["exclusivity_remains", "negation_missing"]));
    expect(both.keptText).toBe(record.options.C);
    const unnatural = revalidateRepair({ ...common, task: taskE, candidate: record.options.E.replace("board members", "people") });
    expect(unnatural.keptText).toBe(record.options.E);
    expect(unnatural.reasons).toContain("unnatural_option");
    const owned = revalidateRepair({ ...common, task: taskE, candidate: repairedE });
    expect(owned.outcome).toBe("repair_not_possible");
    expect(owned.option_repair_success).toBe(false);
    expect(owned.keptText).toBe(record.options.E);
    expect(owned.sourceHash).toBe(taskE.sourceHash);
    expect(owned.keyHash).toBe(taskE.keyHash);
    const acceptedC = revalidateRepair({ ...common, task: taskC, candidate: repairedC });
    expect(acceptedC.outcome).toBe("option_repair_success");
    expect(acceptedC.option_repair_success).toBe(true);
    expect(acceptedC.keptText).toBe(repairedC);
    expect(acceptedC.editorial).toBe("pending");
    expect(acceptedC.meaningProven).toBe(false);
    const liveC = "Most of the drafts were not taken up for the second reading, but all of them were distributed to the board afterward.";
    expect(exclusivityAndNegation(liveC)).toEqual([]);
    expect(exclusivityAndNegation(record.options.C)).toEqual(expect.arrayContaining(["exclusivity_remains", "negation_missing"]));
    expect(surfaceEdit(record.key, liveC)).toBe(true);
    expect(surfaceEdit(record.key, draftsCandidateOptions.C)).toBe(true);
    expect(repairNearCopyOfKey(record.key, liveC)).toBe(false);
    expect(repairNearCopyOfKey(record.key, draftsCandidateOptions.C)).toBe(false);
    expect(repairNearCopyOfKey(record.key, record.key.replace("later", "then"))).toBe(true);
    const liveVerdict = revalidateRepair({ ...common, task: taskC, candidate: liveC });
    expect(liveVerdict.outcome).toBe("option_repair_success");
    expect(liveVerdict.reasons).toEqual([]);
    expect(liveVerdict.keptText).toBe(liveC);
    expect(liveVerdict.editorial).toBe("pending");
    expect(liveVerdict.meaningProven).toBe(false);
    const keyCopy = revalidateRepair({ ...common, task: taskC, candidate: record.key });
    expect(keyCopy.reasons).toContain("second_defensible");
    expect(keyCopy.option_repair_success).toBe(false);
    const changedKey = revalidateRepair({ ...common, key: `${record.key} extra`, task: taskE, candidate: repairedE });
    expect(changedKey.reasons).toContain("source_or_key_changed");
    expect(changedKey.keptText).toBe(record.options.E);
    expect(changedKey.keyHash).toBe(taskE.keyHash);
  });

  it("compares the recorded five with an offline fixture and does not call a provider", () => {
    const before = measureBefore(record, tasks);
    expect(before).toMatchObject({
      eligibleDefects: 2,
      unnaturalOptions: 1,
      secondDefensible: 0,
      unsupportedClaims: 1,
      formClues: 0,
      option_repair_success: false,
      whole_set_ready_for_review: false,
      meaningProven: false,
      editorial: "pending",
      studentBankWrites: 0,
    });
    expect(before.editorialRisks).toEqual(draftsEditorialRisks);
    expect(draftsEditorialRisks[0]?.changes).toEqual(["distributed → approved", "taken up → reviewed"]);
    const common = { source: record.source, key: record.key, options: record.options, targetLanguage: "en" as const, questionType: "translation" as const, correct: "A" as const };
    const verdicts = tasks.map((task) => ({
      task,
      verdict: revalidateRepair({ ...common, task, candidate: task.optionId === "C" ? repairedC : repairedE }),
    }));
    const after = measureAfter(before, verdicts);
    expect(after.options.find((option) => option.optionId === "C")?.option_repair_success).toBe(true);
    expect(after.options.find((option) => option.optionId === "E")?.outcome).toBe("repair_not_possible");
    expect(after.options.find((option) => option.optionId === "E")?.keptText).toBe(record.options.E);
    expect(after.option_repair_success).toBe(false);
    expect(after.whole_set_ready_for_review).toBe(false);
    expect(after.meaningProven).toBe(false);
    const cleared = [{ option_repair_success: true }, { option_repair_success: true }];
    expect(wholeSetReady(cleared, draftsEditorialRisks)).toBe(false);
    expect(wholeSetReady(cleared, [])).toBe(true);
    const cost = repairCost(tasks, prices, fixed);
    expect(cost.calls).toBe(2);
    expect(cost.retry).toBe(0);
    expect(cost.attemptsPerOption).toBe(1);
    expect(cost.withinBudget).toBe(true);
    expect(cost.estimatedUsd).not.toBeNull();
    expect(cost.estimatedUsd!).toBeLessThanOrEqual(0.02);
    expect(cost.measuredBill).toBe(false);
    expect(refuseLiveRepair()).toEqual({ started: false, providerCalls: 0, studentBankWrites: 0, reason: "diagnostic repair live call is not authorized" });
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    expect(readFileSync("pipeline/stages/cognitive-trap.ts", "utf8")).not.toContain("diagnostic-repair");
  });

  it("classifies the exhausted pilot as a technical failure and does not authorize another call", () => {
    const writer = readFileSync("pipeline/ai/openrouter.ts", "utf8");
    const generate = writer.slice(writer.indexOf("async generate"), writer.indexOf("batch()"));
    expect(generate).toContain("reasoning: { exclude: true }");
    expect(generate).not.toContain("effort");
    expect(generate).toContain("response_format");
    expect(generate).toContain("minOutputTokens ?? 4096");
    const oneCall = readFileSync("pipeline/stages/cognitive-trap.ts", "utf8");
    expect(oneCall).toContain("jsonSchema: request.jsonSchema");
    expect(oneCall).toContain("maxOutputTokens: request.maxOutputTokens");
    expect(classifyRepairTransport({ text: "", outputTokens: 180, reasoningTokens: 180 })).toEqual(["no_visible_output", "output_budget_exhausted"]);
    expect(classifyRepairTransport({ text: "", outputTokens: 180, reasoningTokens: 180 })).not.toContain("repair_not_possible");
    const ceiling = cautiousRepairCeiling(tasks, prices, fixed);
    expect(ceiling.outputTokensPerCall).toBe(openRouterWriterWire.outputFloor);
    expect(ceiling.outputTokensPerCall).toBe(4096);
    expect(ceiling.calls).toBe(2);
    expect(ceiling.estimatedUsd).not.toBeNull();
    expect(ceiling.estimatedUsd!).toBeGreaterThan(0.000425);
    expect(ceiling.liveAuthorized).toBe(false);
    expect(repairLiveAuthorized).toBe(false);
    expect(refuseRepairLive()).toEqual({ started: false, providerCalls: 0, studentBankWrites: 0, reason: "the completed repair pilot is not a new live authorization" });
  });
});
