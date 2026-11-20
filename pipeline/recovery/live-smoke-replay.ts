import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { contentVersion } from "@/modules/factory/item-model/distractor-strategy";
import { addedFrames, assessProposition } from "@/modules/factory/item-model/proposition-guard";
import { assessTargetLanguage, targetLanguageDiagnostics } from "@/modules/factory/item-model/option-language";
import { assessWholeSet } from "@/modules/factory/item-model/whole-set";
import { draftsEditorialRisks } from "../diagnostic-repair/drafts";
import { exclusivityAndNegation, repairNearCopyOfKey, revalidateRepair } from "../diagnostic-repair/revalidate";
import { executeActiveRecovery } from "./active";
import {
  draftsCRepairTask,
  draftsRecordFileHash,
  loadDraftsQualityRecord,
  recoveryLiveSmokeOutDir,
  smokeActiveInput,
} from "./smoke-case";
import type { AIProvider, ModelResponse } from "../ai/types";
import { loadPrices } from "../ai/prices";

export const recoveryLiveSmokeReplayVersion = "recovery-active-live-smoke-replay-v1";
export const recoveryLiveSmokeReplayOutDir = ".data/analysis/_factory/cognitive-trap/active-recovery-live-smoke-replay-v1";

type StoredSmoke = {
  version: string;
  proposedC: string;
  originalC: string;
  validationFailures: string[];
  remainingIssues: string[];
  semanticSuccess: boolean;
  localRepairDecision: string;
  qualityDecision: string;
  meaningProven: false;
  qualityProven: false;
  editorial: "pending";
  studentBankWrites: 0;
  optionHashes: Record<OptionLabel, string>;
};

function storedSmokePath(): string {
  return path.resolve(recoveryLiveSmokeOutDir, "summary.json");
}

export function loadStoredLiveSmoke(): StoredSmoke {
  return JSON.parse(readFileSync(storedSmokePath(), "utf8")) as StoredSmoke;
}

function recordedOutputProvider(proposedC: string): AIProvider {
  return {
    name: "recorded-output",
    async generate(): Promise<ModelResponse> {
      return {
        text: JSON.stringify({ optionId: "C", text: proposedC }),
        model: "recorded",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
    },
  };
}

/**
 * Re-scores the frozen live smoke proposedC with the corrected time_order and near-copy checks.
 * Does not call a provider. Does not rewrite the v1 smoke file, the Drafts five, or Factory quality.
 */
export async function replayRecordedLiveSmokeC(): Promise<Record<string, unknown>> {
  const previousHash = createHash("sha256").update(readFileSync(storedSmokePath())).digest("hex");
  const previous = loadStoredLiveSmoke();
  if (previous.version !== "recovery-active-live-smoke-v1") throw new Error("expected recovery-active-live-smoke-v1");
  const proposedC = previous.proposedC;
  if (proposedC !== "Most of the drafts were not taken up for the second reading, but all of them were distributed to the board afterward.") {
    throw new Error("recorded proposedC does not match the frozen live output");
  }

  const draftsHashBefore = draftsRecordFileHash();
  const quality = loadDraftsQualityRecord();
  const frozenOptions = {
    A: quality.arms.B.options!.A!,
    B: quality.arms.B.options!.B!,
    C: quality.arms.B.options!.C!,
    D: quality.arms.B.options!.D!,
    E: quality.arms.B.options!.E!,
  };
  const { record, task } = draftsCRepairTask();
  if (frozenOptions.C !== previous.originalC) throw new Error("original C drifted from the live smoke record");

  const timeOrderReasons = exclusivityAndNegation(proposedC);
  const nearCopy = repairNearCopyOfKey(record.key, proposedC);
  const exactKey = proposedC.trim() === record.key.trim();
  const language = assessTargetLanguage({ questionType: "translation", targetLanguage: "en", options: { ...frozenOptions, C: proposedC } });
  const languageDiags = targetLanguageDiagnostics({ questionType: "translation", targetLanguage: "en", options: { ...frozenOptions, C: proposedC } });
  const prop = assessProposition({ source: record.source, key: record.key, option: proposedC });
  const frames = addedFrames(record.source, record.key, proposedC);
  const originalGate = assessWholeSet({ source: record.source, key: record.key, options: frozenOptions, correct: "A" });
  const hypotheticalGate = assessWholeSet({ source: record.source, key: record.key, options: { ...frozenOptions, C: proposedC }, correct: "A" });
  const classified = hypotheticalGate.options.find((row) => row.label === "C");
  const duplicate = optionLabels.some((label) => label !== "C" && frozenOptions[label] === proposedC);
  const verdict = revalidateRepair({
    task,
    candidate: proposedC,
    source: record.source,
    key: record.key,
    options: frozenOptions,
    targetLanguage: "en",
    questionType: "translation",
    correct: "A",
  });

  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  const active = await executeActiveRecovery(quality, {
    ...smokeActiveInput(prices),
    provider: recordedOutputProvider(proposedC),
  });
  const rowC = active.activeReport?.results.find((row) => row.optionId === "C");

  const checks = {
    time_order_not_repaired: timeOrderReasons.includes("time_order_not_repaired"),
    second_defensible_near_copy: nearCopy,
    second_defensible_exact_key: exactKey,
    second_defensible_confirmed_equivalent: classified?.relation === "confirmed_equivalent",
    exclusivity_remains: timeOrderReasons.includes("exclusivity_remains"),
    negation_missing: timeOrderReasons.includes("negation_missing"),
    distribution_missing: timeOrderReasons.includes("distribution_missing"),
    no_change: proposedC === frozenOptions.C,
    duplicate_option: duplicate,
    target_language_mismatch: language.status === "fail" || languageDiags.some((item) => item.optionId === "C" && item.issueCode === "target_language_mismatch"),
    unsupported_clause: prop.status === "unsupported_clause",
    unsupported_extension_remains: frames.length > 0,
    new_whole_set_clues: hypotheticalGate.risks.whole_set_clue_risk.filter((clue) => !originalGate.risks.whole_set_clue_risk.includes(clue)),
    new_key_semantic_risks: hypotheticalGate.risks.key_semantic_risk.filter((risk) => !originalGate.risks.key_semantic_risk.includes(risk)),
  };
  const newFailures = [
    checks.time_order_not_repaired ? "time_order_not_repaired" : null,
    checks.second_defensible_near_copy || checks.second_defensible_exact_key || checks.second_defensible_confirmed_equivalent ? "second_defensible" : null,
    ...timeOrderReasons.filter((code) => code !== "time_order_not_repaired"),
    checks.no_change ? "no_change" : null,
    checks.duplicate_option ? "duplicate_option" : null,
    checks.target_language_mismatch ? "target_language_mismatch" : null,
    checks.unsupported_clause ? "unsupported_clause" : null,
    checks.unsupported_extension_remains ? "unsupported_extension_remains" : null,
    ...checks.new_whole_set_clues,
    ...checks.new_key_semantic_risks,
    ...(rowC?.validationFailures ?? []),
    ...verdict.reasons,
  ].filter((code, index, list): code is string => Boolean(code) && list.indexOf(code) === index);

  const optionRepairSuccess = verdict.option_repair_success === true && (rowC?.repairSuccess ?? false) === true && newFailures.length === 0;

  if (quality.arms.B.options!.C !== frozenOptions.C) throw new Error("option C was mutated");
  if (quality.arms.B.qualityDecision !== "needs_revision") throw new Error("factory qualityDecision changed");
  if (draftsRecordFileHash() !== draftsHashBefore) throw new Error("the recorded Drafts file changed");
  if (createHash("sha256").update(readFileSync(storedSmokePath())).digest("hex") !== previousHash) throw new Error("the live smoke v1 record changed");

  const report = {
    executed: true,
    version: recoveryLiveSmokeReplayVersion,
    replayOf: previous.version,
    liveCall: false,
    providerCalls: 0,
    proposedC,
    originalC: previous.originalC,
    proposedCUnchangedFromRecord: proposedC === previous.proposedC,
    checks,
    revalidate: {
      outcome: verdict.outcome,
      option_repair_success: verdict.option_repair_success,
      reasons: verdict.reasons,
      ignored: verdict.ignored,
      kept: verdict.kept,
      keptText: verdict.keptText,
      qualityDecision: verdict.qualityDecision,
      editorial: verdict.editorial,
      meaningProven: verdict.meaningProven,
    },
    activePath: {
      repairSuccess: rowC?.repairSuccess ?? false,
      validationFailures: rowC?.validationFailures ?? [],
      remainingIssues: rowC?.remainingIssues ?? [],
      kept: rowC?.kept ?? "original",
      after: rowC?.after ?? frozenOptions.C,
    },
    option_repair_success: optionRepairSuccess,
    newFailures,
    comparison: {
      previousValidationFailures: previous.validationFailures,
      previousSemanticSuccess: previous.semanticSuccess,
      previousLocalRepairDecision: previous.localRepairDecision,
      previousOptionRepairSuccess: false,
      replayTimeOrderNotRepaired: checks.time_order_not_repaired,
      replaySecondDefensible: checks.second_defensible_near_copy || checks.second_defensible_exact_key || checks.second_defensible_confirmed_equivalent,
      replayOptionRepairSuccess: optionRepairSuccess,
      cleared: previous.validationFailures.filter((code) => !newFailures.includes(code)),
      stillPresent: previous.validationFailures.filter((code) => newFailures.includes(code)),
      newlyIntroduced: newFailures.filter((code) => !previous.validationFailures.includes(code)),
    },
    remainingWholeSetRisks: originalGate.risks,
    hypotheticalWholeSetRisks: hypotheticalGate.risks,
    editorialRisks: draftsEditorialRisks,
    factoryQualityDecision: quality.arms.B.qualityDecision,
    meaningProven: false as const,
    qualityProven: false as const,
    editorial: "pending" as const,
    studentBankWrites: 0 as const,
    sourceUnchanged: true,
    keyUnchanged: true,
    recordedFiveUnchanged: true,
    previousSmokeUnchanged: true,
    optionHashes: {
      A: contentVersion(frozenOptions.A),
      B: contentVersion(frozenOptions.B),
      C: contentVersion(frozenOptions.C),
      D: contentVersion(frozenOptions.D),
      E: contentVersion(frozenOptions.E),
    },
  };

  const outDir = path.resolve(recoveryLiveSmokeReplayOutDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
