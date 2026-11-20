import { z } from "zod";
import { contentVersion } from "@/modules/factory/item-model/distractor-strategy";
import { responseSchema } from "../ai/prompts/schema";
import { openrouterPrecheckModels } from "../stages/item-precheck";

/**
 * Offline repair contract. It is not wired into Cognitive Trap First or the factory CLI.
 * A parsed repair is a candidate sentence, not a meaning proof and not an approval.
 */
export const diagnosticRepairPromptVersion = "diagnostic-repair.offline.v1";

export const repairIssueCodes = [
  "target_language_mismatch",
  "unnatural_option",
  "incomplete_option",
  "only_complete_option",
  "key_length_clue",
  "unsupported_extension",
  "second_defensible",
] as const;

export type RepairIssueCode = (typeof repairIssueCodes)[number];

/** These signals never start a repair, even when a model also reports low confidence. */
export const nonRepairSignals = [
  "mechanism_unverified",
  "unresolved",
  "high_overlap",
  "low_confidence",
  "key_equivalence_uncertain",
] as const;

export type RepairTask = {
  sourceId: string;
  sourceHash: string;
  keyHash: string;
  optionId: string;
  originalOption: string;
  issueCode: RepairIssueCode;
  evidence: string;
  preservedMeaning: string[];
  targetMisreading: string;
  forbiddenChanges: string[];
};

export type RepairFinding = {
  optionId: string;
  issueCode: string;
  evidence: string;
  /** The rival letter, required before second_defensible can start a repair. */
  rivalOptionId?: string;
  preservedMeaning: string[];
  targetMisreading: string;
  forbiddenChanges: string[];
};

const repairReplacement = z
  .object({
    optionId: z.string().min(1).max(8),
    text: z.string().min(20).max(400),
    outcome: z.literal("replacement").optional(),
  })
  .strict();

const repairImpossible = z
  .object({
    optionId: z.string().min(1).max(8),
    outcome: z.literal("repair_not_possible"),
  })
  .strict();

export type RepairOutput =
  | { outcome: "replacement"; optionId: string; text: string }
  | { outcome: "repair_not_possible"; optionId: string };

export const repairOutputSchema = responseSchema(z.union([repairReplacement, repairImpossible]));

export function hashText(text: string): string {
  return contentVersion(text);
}

/** An uncertain key blocks the whole item. Unverified is not that block. */
export function itemRepairBlocked(itemSignals: readonly string[]): boolean {
  return itemSignals.includes("key_equivalence_uncertain");
}

/**
 * One shown, local defect can start a repair.
 * mechanism_unverified, unresolved, overlap and low confidence cannot.
 * unsupported_extension needs a concrete span. second_defensible needs a named rival.
 */
export function repairEligible(finding: Pick<RepairFinding, "issueCode" | "evidence" | "rivalOptionId">): finding is RepairFinding & { issueCode: RepairIssueCode } {
  if ((nonRepairSignals as readonly string[]).includes(finding.issueCode)) return false;
  if (!(repairIssueCodes as readonly string[]).includes(finding.issueCode)) return false;
  const evidence = finding.evidence.trim();
  if (!evidence || evidence === finding.issueCode) return false;
  if (finding.issueCode === "unsupported_extension" && evidence.split(/\s+/).length < 2) return false;
  if (finding.issueCode === "second_defensible" && !finding.rivalOptionId?.trim()) return false;
  return true;
}

export function buildRepairTasks(input: {
  sourceId: string;
  source: string;
  key: string;
  options: Readonly<Record<string, string>>;
  itemSignals: readonly string[];
  findings: readonly RepairFinding[];
}): RepairTask[] {
  if (itemRepairBlocked(input.itemSignals)) return [];
  const tasks: RepairTask[] = [];
  for (const finding of input.findings) {
    if (!repairEligible(finding)) continue;
    const original = input.options[finding.optionId];
    if (!original || !original.includes(finding.evidence)) continue;
    if (finding.rivalOptionId && finding.rivalOptionId === finding.optionId) continue;
    tasks.push({
      sourceId: input.sourceId,
      sourceHash: hashText(input.source),
      keyHash: hashText(input.key),
      optionId: finding.optionId,
      originalOption: original,
      issueCode: finding.issueCode,
      evidence: finding.evidence,
      preservedMeaning: [...finding.preservedMeaning],
      targetMisreading: finding.targetMisreading,
      forbiddenChanges: [...finding.forbiddenChanges],
    });
  }
  return tasks;
}

export const repairSystem = `DIAGNOSTIC REPAIR
You repair one distractor. You do not write a new question.
A replacement returns optionId and text for that one option.
Do not return the source, the key, or the other options.
Keep the source propositions named under preserved meaning.
Make only the misreading named under target misreading.
Do not add another misreading in the same sentence.
Do not add an actor, an event, a recipient, or a new owner that the source does not already contain.
Deleting the word only is not a repair while a required negation is still missing.
The result must be a complete, natural academic sentence in the target language.
It must not be a second correct answer.
If the named misreading cannot be written naturally without a new claim, return {"optionId","outcome":"repair_not_possible"} and no text.
A field named semanticRisk is not accepted and is not evidence.
Return JSON only.`;

export function repairUser(task: RepairTask, input: { source: string; key: string; targetLanguage: "tr" | "en"; fixedOptions: readonly string[] }): string {
  return `SOURCE ID: ${task.sourceId}
TARGET LANGUAGE: ${input.targetLanguage}
SOURCE:
${input.source}
KEY:
${input.key}
FIXED OPTIONS:
${input.fixedOptions.join("\n")}
REPAIR ONLY OPTION ${task.optionId}
CURRENT TEXT:
${task.originalOption}
ISSUE: ${task.issueCode}
EVIDENCE:
${task.evidence}
PRESERVED MEANING:
${task.preservedMeaning.map((line) => `- ${line}`).join("\n")}
TARGET MISREADING:
${task.targetMisreading}
DO NOT:
${task.forbiddenChanges.map((line) => `- ${line}`).join("\n")}`;
}

export function readRepairOutput(value: unknown): RepairOutput | null {
  const impossible = repairImpossible.safeParse(value);
  if (impossible.success) return impossible.data;
  const replacement = repairReplacement.safeParse(value);
  if (!replacement.success) return null;
  return { outcome: "replacement", optionId: replacement.data.optionId, text: replacement.data.text };
}

export const repairModel = openrouterPrecheckModels.generator;

export function refuseLiveRepair(): { started: false; providerCalls: 0; studentBankWrites: 0; reason: string } {
  return { started: false, providerCalls: 0, studentBankWrites: 0, reason: "diagnostic repair live call is not authorized" };
}
