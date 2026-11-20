import type { DraftsRecord } from "./drafts";
import { draftsEditorialRisks } from "./drafts";
import type { RepairTask } from "./contract";
import type { RepairVerdict } from "./revalidate";

export type EditorialRisk = { optionId: string; changes: readonly string[] };

export type OptionRepairReport = {
  optionId: string;
  option_repair_success: boolean;
  outcome: RepairVerdict["outcome"];
  keptText: string;
  sourceHash: string;
  keyHash: string;
};

export type RepairMeasurement = {
  eligibleDefects: number;
  unnaturalOptions: number;
  secondDefensible: number;
  unsupportedClaims: number;
  formClues: number;
  options: OptionRepairReport[];
  /** Independent of whole_set_ready_for_review. One repaired option does not clear the five. */
  option_repair_success: boolean;
  whole_set_ready_for_review: boolean;
  editorialRisks: EditorialRisk[];
  meaningProven: false;
  editorial: "pending";
  studentBankWrites: 0;
};

/**
 * The set is ready only when every repaired option succeeded and no separate editorial risk remains.
 * A true option result does not set this flag.
 */
export function wholeSetReady(options: readonly { option_repair_success: boolean }[], risks: readonly EditorialRisk[]): boolean {
  return risks.length === 0 && options.length > 0 && options.every((option) => option.option_repair_success);
}

/** Counts shown eligible defects. mechanism_unverified and overlap are not counted. D stays an editorial risk. */
export function measureBefore(record: DraftsRecord, tasks: readonly RepairTask[], risks: readonly EditorialRisk[] = draftsEditorialRisks): RepairMeasurement {
  return {
    eligibleDefects: tasks.length,
    unnaturalOptions: tasks.filter((task) => task.issueCode === "unnatural_option").length,
    secondDefensible: record.secondAnswerOptions.length,
    unsupportedClaims: tasks.filter((task) => task.issueCode === "unsupported_extension").length,
    formClues: record.formClues.length,
    options: [],
    option_repair_success: false,
    whole_set_ready_for_review: wholeSetReady([], risks),
    editorialRisks: [...risks],
    meaningProven: false,
    editorial: "pending",
    studentBankWrites: 0,
  };
}

/**
 * Applies offline verdicts. A rejected repair leaves the original text in keptText.
 * This does not call a model and does not approve the item.
 */
export function measureAfter(
  before: RepairMeasurement,
  verdicts: readonly { task: RepairTask; verdict: RepairVerdict }[],
  risks: readonly EditorialRisk[] = before.editorialRisks,
): RepairMeasurement {
  const options = verdicts.map(({ task, verdict }) => ({
    optionId: task.optionId,
    option_repair_success: verdict.option_repair_success,
    outcome: verdict.outcome,
    keptText: verdict.keptText,
    sourceHash: verdict.sourceHash,
    keyHash: verdict.keyHash,
  }));
  const failed = options.filter((option) => !option.option_repair_success);
  const option_repair_success = options.length > 0 && options.every((option) => option.option_repair_success);
  return {
    eligibleDefects: failed.length,
    unnaturalOptions: failed.filter((option) => verdicts.find((row) => row.task.optionId === option.optionId)?.task.issueCode === "unnatural_option").length,
    secondDefensible: before.secondDefensible,
    unsupportedClaims: failed.filter((option) => verdicts.find((row) => row.task.optionId === option.optionId)?.task.issueCode === "unsupported_extension").length,
    formClues: before.formClues,
    options,
    option_repair_success,
    whole_set_ready_for_review: wholeSetReady(options, risks),
    editorialRisks: [...risks],
    meaningProven: false,
    editorial: "pending",
    studentBankWrites: 0,
  };
}
