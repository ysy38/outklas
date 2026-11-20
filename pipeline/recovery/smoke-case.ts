import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { contentVersion } from "@/modules/factory/item-model/distractor-strategy";
import { cautiousRepairCeiling } from "../diagnostic-repair/call-contract";
import { repairModel } from "../diagnostic-repair/contract";
import { draftsFixedOptions, draftsRecordPath, draftsRepairTasks, loadDraftsRecord } from "../diagnostic-repair/drafts";
import type { Prices } from "../ai/prices";
import { attachRecovery, recoveryActiveAuthorization, type DiagnosticEvidence, type QualityRecord } from "./attach";

export const recoveryLiveSmokeToken = "recovery-active-live-smoke-v1";
export const recoveryLiveSmokeMaxCalls = 1;
export const recoveryLiveSmokeMaxCostUsd = 0.01;
export const recoveryLiveSmokeRetry = 0 as const;
export const recoveryLiveSmokeOutDir = ".data/analysis/_factory/cognitive-trap/active-recovery-live-smoke-v1";

export const draftsCEditorialFixture: DiagnosticEvidence = {
  scope: "option",
  optionId: "C",
  issueCode: "unsupported_extension",
  evidence: "only afterward",
  provenance: "editorial_fixture",
  verificationStatus: "confirmed",
  repairEligible: true,
};

export function draftsRecordFileHash(file = draftsRecordPath): string {
  return createHash("sha256").update(readFileSync(path.resolve(file))).digest("hex");
}

export function loadDraftsQualityRecord(file = draftsRecordPath): QualityRecord {
  return JSON.parse(readFileSync(path.resolve(file), "utf8")) as QualityRecord;
}

export function draftsCRepairTask() {
  const record = loadDraftsRecord();
  const task = draftsRepairTasks(record).find((item) => item.optionId === "C");
  if (!task) throw new Error("drafts C repair task is missing");
  return { record, task, fixed: { source: record.source, key: record.key, targetLanguage: "en" as const, fixedOptions: draftsFixedOptions(record) } };
}

export type SmokeContract = {
  ok: boolean;
  reasons: string[];
  authorization: typeof recoveryActiveAuthorization;
  maxCalls: typeof recoveryLiveSmokeMaxCalls;
  maxCostUsd: typeof recoveryLiveSmokeMaxCostUsd;
  retry: 0;
  model: typeof repairModel;
  sourceHash: string;
  keyHash: string;
  optionC: string;
  factoryCRepairEligible: false;
  provenance: "editorial_fixture";
  ceilingUsd: number | null;
};

/**
 * Isolated Drafts C smoke. The C defect is an editorial fixture, not a Factory auto-finding.
 * Source, key, and A/B/D/E stay frozen. Only C is a repair candidate.
 */
export function verifyDraftsCSmokeContract(prices: Prices | null): SmokeContract {
  const reasons: string[] = [];
  const quality = loadDraftsQualityRecord();
  const { record, task, fixed } = draftsCRepairTask();
  const factory = attachRecovery(quality, { mode: "dry_run" });
  const factoryC = factory.diagnosticEvidence.filter((item) => item.optionId === "C");
  if (factoryC.some((item) => item.repairEligible)) reasons.push("factory_auto_detected_c");
  if (factory.blocked) reasons.push(`factory_blocked:${factory.blocked}`);
  if (contentVersion(record.source) !== task.sourceHash) reasons.push("source_hash_mismatch");
  if (contentVersion(record.key) !== task.keyHash) reasons.push("key_hash_mismatch");
  if (record.options.A !== record.key) reasons.push("key_option_mismatch");
  if (task.optionId !== "C" || task.issueCode !== "unsupported_extension" || task.evidence !== "only afterward") reasons.push("drafts_c_task_mismatch");
  if (!record.options.C.includes("only afterward")) reasons.push("c_evidence_span_missing");
  if (draftsCEditorialFixture.provenance !== "editorial_fixture") reasons.push("provenance_not_editorial_fixture");
  if (!draftsCEditorialFixture.repairEligible || draftsCEditorialFixture.verificationStatus !== "confirmed") reasons.push("fixture_not_confirmed_eligible");
  const ceiling = cautiousRepairCeiling([task], prices, fixed);
  if (ceiling.model !== repairModel) reasons.push("model_mismatch");
  if (ceiling.retry !== 0) reasons.push("retry_not_zero");
  if (ceiling.calls !== 1) reasons.push("ceiling_calls_not_one");
  if (ceiling.estimatedUsd === null) reasons.push("ceiling_unknown");
  else if (ceiling.estimatedUsd > recoveryLiveSmokeMaxCostUsd) reasons.push("ceiling_exceeds_smoke_cap");
  return {
    ok: reasons.length === 0,
    reasons,
    authorization: recoveryActiveAuthorization,
    maxCalls: recoveryLiveSmokeMaxCalls,
    maxCostUsd: recoveryLiveSmokeMaxCostUsd,
    retry: recoveryLiveSmokeRetry,
    model: repairModel,
    sourceHash: task.sourceHash,
    keyHash: task.keyHash,
    optionC: record.options.C,
    factoryCRepairEligible: false,
    provenance: "editorial_fixture",
    ceilingUsd: ceiling.estimatedUsd,
  };
}

export function smokeActiveInput(prices: Prices | null) {
  return {
    mode: "active" as const,
    authorization: recoveryActiveAuthorization,
    maxCalls: recoveryLiveSmokeMaxCalls,
    maxCostUsd: recoveryLiveSmokeMaxCostUsd,
    maxRegenerations: recoveryLiveSmokeRetry,
    prices,
    injectedEvidence: [draftsCEditorialFixture],
    allowReplacement: false,
    commitCandidates: false,
  };
}
