import { z } from "zod";
import { surfaceEdit } from "@/modules/factory/item-model/cognitive-trap";
import { openrouterBrevity } from "../ai/openrouter";
import { estimateCost, type Prices } from "../ai/prices";
import { responseSchema } from "../ai/prompts/schema";
import { openRouterWriterWire } from "./call-contract";
import { hashText, repairModel, repairOutputSchema, type RepairOutput } from "./contract";
import { readRepairOutput } from "./contract";
import type { DraftsRecord } from "./drafts";

/**
 * Drafts completion contract. It does not call a model and it is not wired into the factory.
 * The v2 repair verdicts stay as they are. Local success does not approve the five.
 */
export const completionPromptVersion = "diagnostic-completion.offline.v1";

/** The v2 C sentence. option_repair_success stays true. */
export const revisedOptionC = "Most of the drafts were not taken up for the second reading, but all of them were later distributed to the board, after that decision.";

/** Recorded beside the v2 success. It does not reverse that success. */
export const revisedOptionCRisk = {
  optionId: "C" as const,
  option_repair_success: true as const,
  changes: ["later repeated by after that decision", "explicit decision absent from the source"],
};

/** The closed reference-shift repair. The replacement task does not reopen it. */
export const closedReferenceRepair = {
  kind: "repair" as const,
  optionId: "E" as const,
  outcome: "repair_not_possible" as const,
  option_repair_success: false as const,
};

export type CompletionTask = {
  kind: "repair" | "replacement";
  optionId: "D" | "E";
  sourceHash: string;
  keyHash: string;
  originalOption: string;
  relation: string;
  preserved: string[];
  forbidden: string[];
};

const replacementOutput = z
  .object({
    optionId: z.string().min(1).max(8),
    text: z.string().min(20).max(400),
    outcome: z.literal("replacement"),
  })
  .strict();

export const replacementOutputSchema = responseSchema(replacementOutput);

export function readReplacementOutput(value: unknown): { outcome: "replacement"; optionId: string; text: string } | null {
  const parsed = replacementOutput.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function completionTasks(record: DraftsRecord): CompletionTask[] {
  const sourceHash = hashText(record.source);
  const keyHash = hashText(record.key);
  return [
    {
      kind: "repair",
      optionId: "D",
      sourceHash,
      keyHash,
      originalOption: record.options.D,
      relation: "distributed → approved",
      preserved: [
        "The board approves the drafts instead of receiving them by distribution.",
        "Most of the drafts were not later taken up for a second reading.",
        "The contrast and the two quantities stay.",
      ],
      forbidden: [
        "do not change the source, option A, option B, or the revised option C",
        "do not remove approved",
        "do not keep reviewed",
        "do not change any other word",
        "do not use none, only afterward, after that decision, or a person as the thing taken up",
      ],
    },
    {
      kind: "replacement",
      optionId: "E",
      sourceHash,
      keyHash,
      originalOption: record.options.E,
      relation: "contrast read as cause",
      preserved: [
        "All of the drafts were distributed to the board.",
        "Most of them were not later taken up for the second reading.",
        "The board stays the recipient.",
      ],
      forbidden: [
        "do not change the source, option A, option B, or the revised option C",
        "do not retry the reference shift or an owned set of drafts",
        "do not repeat none, later distributed, after that decision, approved, or reviewed",
        "do not keep the contrast word but",
        "do not add a second misreading",
      ],
    },
  ];
}

export const completionRepairSystem = `DIAGNOSTIC REPAIR
You repair one distractor. You do not write a new question.
Change only the word reviewed to taken up.
Leave every other word as it is.
Return optionId and text, or {"optionId","outcome":"repair_not_possible"} and no text.
A field named semanticRisk is not accepted.
Return JSON only.`;

export const completionReplacementSystem = `DISTRACTOR REPLACEMENT
You replace one distractor. You do not write a new question.
The source contrast is read as a cause.
Use one of these frames: which is why, for the reason that, or on the ground that.
Do not swap only but for because or so.
Keep both events, both quantities, the negation, and the later time on the second reading.
Return optionId, text, and outcome replacement.
Do not return repair_not_possible.
A field named semanticRisk is not accepted.
Return JSON only.`;

export function completionUser(task: CompletionTask, input: { source: string; key: string; optionB: string; optionC: string }): string {
  return `SOURCE:
${input.source}
KEY A:
${input.key}
FIXED B:
${input.optionB}
FIXED C:
${input.optionC}
TASK: ${task.kind}
OPTION ${task.optionId}
CURRENT TEXT:
${task.originalOption}
RELATION:
${task.relation}
PRESERVED:
${task.preserved.map((line) => `- ${line}`).join("\n")}
DO NOT:
${task.forbidden.map((line) => `- ${line}`).join("\n")}`;
}

function norm(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Errors already carried by B, by the revised C, by D, or by the closed reference repair. */
export function repeatedSiblingError(text: string): Array<"B" | "C" | "D" | "closed_reference"> {
  const found: Array<"B" | "C" | "D" | "closed_reference"> = [];
  if (/\bnone\b/i.test(text)) found.push("B");
  if (/\bafter that decision\b/i.test(text) || /\bonly afterward\b/i.test(text) || /\blater distributed\b/i.test(text)) found.push("C");
  if (/\bapproved\b/i.test(text) || /\breviewed\b/i.test(text)) found.push("D");
  if (/\b(?:board members|people|persons|readers|students)\b/i.test(text) || /\b(?:its|their) own\b/i.test(text) || /\bthe board's drafts\b/i.test(text) || /\bthe board’s drafts\b/i.test(text)) found.push("closed_reference");
  return found;
}

export type OptionRepairResult = {
  kind: "repair";
  optionId: "D";
  outcome: "option_repair_success" | "repair_not_possible" | "needs_revision";
  option_repair_success: boolean;
  kept: "candidate" | "original";
  keptText: string;
  sourceHash: string;
  keyHash: string;
  reasons: string[];
  meaningProven: false;
  editorial: "pending";
};

export type ReplacementResult = {
  kind: "replacement";
  optionId: "E";
  outcome: "replacement_accepted" | "replacement_rejected";
  replacement_success: boolean;
  kept: "candidate" | "original";
  keptText: string;
  sourceHash: string;
  keyHash: string;
  reasons: string[];
  meaningProven: false;
  editorial: "pending";
};

function repairBase(task: CompletionTask, reasons: string[]): OptionRepairResult {
  return {
    kind: "repair",
    optionId: "D",
    outcome: "needs_revision",
    option_repair_success: false,
    kept: "original",
    keptText: task.originalOption,
    sourceHash: task.sourceHash,
    keyHash: task.keyHash,
    reasons,
    meaningProven: false,
    editorial: "pending",
  };
}

/** The only successful D edit is reviewed → taken up. Approved stays. */
export function revalidateCompletionRepair(input: { task: CompletionTask; candidate: string; source: string; key: string }): OptionRepairResult {
  if (hashText(input.source) !== input.task.sourceHash || hashText(input.key) !== input.task.keyHash) {
    return repairBase(input.task, ["source_or_key_changed"]);
  }
  const candidate = norm(input.candidate);
  const minimal = norm(input.task.originalOption.replace(/\breviewed\b/, "taken up"));
  if (!candidate || candidate === norm(input.task.originalOption)) return repairBase(input.task, ["no_change"]);
  const reasons: string[] = [];
  if (!/\bapproved\b/i.test(candidate)) reasons.push("misreading_removed");
  if (/\breviewed\b/i.test(candidate)) reasons.push("second_change_remains");
  for (const hit of repeatedSiblingError(candidate)) {
    if (hit !== "D") reasons.push(`repeats_${hit}`);
  }
  if (candidate === norm(input.key) || surfaceEdit(input.key, candidate)) reasons.push("second_defensible");
  if (!/[.]$/.test(candidate) || candidate.split(/\s+/).length < 12) reasons.push("incomplete_option");
  if (candidate !== minimal) reasons.push("not_minimal");
  if (reasons.length) return repairBase(input.task, [...new Set(reasons)]);
  return {
    ...repairBase(input.task, []),
    outcome: "option_repair_success",
    option_repair_success: true,
    kept: "candidate",
    keptText: candidate,
  };
}

function replacementBase(task: CompletionTask, reasons: string[]): ReplacementResult {
  return {
    kind: "replacement",
    optionId: "E",
    outcome: "replacement_rejected",
    replacement_success: false,
    kept: "original",
    keptText: task.originalOption,
    sourceHash: task.sourceHash,
    keyHash: task.keyHash,
    reasons,
    meaningProven: false,
    editorial: "pending",
  };
}

/**
 * A new E distractor may use the source contrast as a cause.
 * It may not repeat B, the revised C, D, or the closed reference shift.
 */
export function revalidateReplacement(input: { task: CompletionTask; candidate: string; source: string; key: string; optionB: string; optionC: string }): ReplacementResult {
  if (hashText(input.source) !== input.task.sourceHash || hashText(input.key) !== input.task.keyHash) {
    return replacementBase(input.task, ["source_or_key_changed"]);
  }
  const candidate = norm(input.candidate);
  const reasons: string[] = [];
  if (!candidate || candidate === norm(input.task.originalOption)) reasons.push("no_change");
  const causeFrames = [/\bbecause\b/i, /\bso\b/i, /\bwhich is why\b/i, /\bfor the reason that\b/i, /\bon the ground that\b/i].filter((frame) => frame.test(candidate));
  if (causeFrames.length !== 1) reasons.push("contrast_cause_missing");
  if (/\bbut\b/i.test(candidate)) reasons.push("contrast_kept");
  if (!/\bdistributed to the board\b/i.test(candidate)) reasons.push("distribution_missing");
  if (!/\bmost\b/i.test(candidate) || !/\bnot later taken up\b/i.test(candidate)) reasons.push("uptake_missing");
  if (!/\bsecond reading\b/i.test(candidate)) reasons.push("incomplete_option");
  for (const hit of repeatedSiblingError(candidate)) reasons.push(`repeats_${hit}`);
  if (candidate === norm(input.key) || candidate === norm(input.optionB) || candidate === norm(input.optionC) || surfaceEdit(input.key, candidate)) reasons.push("second_defensible");
  if (!/[.]$/.test(candidate) || candidate.split(/\s+/).length < 12) reasons.push("incomplete_option");
  if (reasons.length) return replacementBase(input.task, [...new Set(reasons)]);
  return {
    ...replacementBase(input.task, []),
    outcome: "replacement_accepted",
    replacement_success: true,
    kept: "candidate",
    keptText: candidate,
  };
}

export type CompletionMeasurement = {
  repair: OptionRepairResult | null;
  replacement: ReplacementResult | null;
  closedReferenceRepair: typeof closedReferenceRepair;
  revisedOptionC: { option_repair_success: true; editorialRisks: typeof revisedOptionCRisk.changes };
  whole_set_ready_for_review: false;
  meaningProven: false;
  editorial: "pending";
  studentBankWrites: 0;
};

/** Local repair and replacement flags stay separate and do not approve the five. */
export function measureCompletion(input: { repair: OptionRepairResult | null; replacement: ReplacementResult | null }): CompletionMeasurement {
  return {
    repair: input.repair,
    replacement: input.replacement,
    closedReferenceRepair,
    revisedOptionC: { option_repair_success: true, editorialRisks: revisedOptionCRisk.changes },
    whole_set_ready_for_review: false,
    meaningProven: false,
    editorial: "pending",
    studentBankWrites: 0,
  };
}

export function completionSchemas(): { repair: typeof repairOutputSchema; replacement: typeof replacementOutputSchema } {
  return { repair: repairOutputSchema, replacement: replacementOutputSchema };
}

export function completionCeiling(record: DraftsRecord, prices: Prices | null) {
  const tasks = completionTasks(record);
  const fixed = { source: record.source, key: record.key, optionB: record.options.B, optionC: revisedOptionC };
  const schemas = completionSchemas();
  const inputTokens = tasks.reduce((sum, task) => {
    const system = task.kind === "repair" ? completionRepairSystem : completionReplacementSystem;
    const schema = JSON.stringify(task.kind === "repair" ? schemas.repair : schemas.replacement);
    return sum + Math.ceil((system.length + 2 + openrouterBrevity.length + schema.length + completionUser(task, fixed).length) / 2);
  }, 0);
  const outputTokens = tasks.length * openRouterWriterWire.outputFloor;
  const estimated = estimateCost({ [repairModel]: { calls: tasks.length, inputTokens, outputTokens } }, prices);
  return {
    model: repairModel,
    calls: tasks.length,
    retry: 0 as const,
    attemptsPerOption: 1 as const,
    inputTokens,
    outputTokensPerCall: openRouterWriterWire.outputFloor,
    outputTokens,
    estimatedUsd: estimated.usd,
    measuredBill: false as const,
    promptCache: "off" as const,
    liveAuthorized: false as const,
    studentBankWrites: 0 as const,
    factoryIntegrated: false as const,
  };
}

export function refuseCompletionLive(): { started: false; providerCalls: 0; studentBankWrites: 0; reason: string } {
  return { started: false, providerCalls: 0, studentBankWrites: 0, reason: "drafts completion live call is not authorized" };
}

export type { RepairOutput };
