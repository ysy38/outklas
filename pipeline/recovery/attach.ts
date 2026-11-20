import type { OptionLabel } from "@/modules/analysis/contract";
import { contentVersion } from "@/modules/factory/item-model/distractor-strategy";
import { targetLanguageDiagnostics } from "@/modules/factory/item-model/option-language";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { classifyOption } from "@/modules/factory/item-model/whole-set";

/**
 * Post-quality hook for Cognitive Trap First.
 * off keeps the factory decision untouched. dry_run classifies stored evidence and does not call a provider.
 * active does not run unless a later pilot attaches a caller; this module never starts that call.
 */
export const recoveryActiveAuthorization = "recovery-active-v1";
export type RecoveryMode = "off" | "dry_run" | "active";

export type RecoveryRowDecision = "accept" | "repair" | "replace" | "review" | "insufficient_evidence" | "no_detected_issue";

export type DiagnosticEvidence = {
  scope: "option" | "set" | "key";
  optionId: OptionLabel | null;
  issueCode: string;
  evidence: string;
  provenance: "deterministic" | "judge" | "editorial" | "editorial_fixture";
  verificationStatus: "confirmed" | "unverified";
  repairEligible: boolean;
};

export type RecoveryRow = {
  optionId: OptionLabel;
  decision: RecoveryRowDecision;
  evidence: string | null;
  ignored: string[];
  call: false;
};

export type ActiveRecoveryOptionResult = {
  optionId: OptionLabel;
  action: "repair" | "replace" | "skipped";
  defectCode: string | null;
  evidence: string | null;
  before: string;
  after: string;
  kept: "candidate" | "original";
  calls: number;
  costUsd: number;
  repairSuccess: boolean;
  replacementOutcome: "not_needed" | "replacement_accepted" | "replacement_rejected" | "replacement_unavailable";
  replacementSuccess: boolean;
  technicalFailures: string[];
  validationFailures: string[];
  remainingIssues: string[];
  proposedText: string | null;
};

export type ActiveRecoveryReport = {
  model: string;
  retry: 0;
  calls: number;
  repairCalls: number;
  replaceCalls: number;
  actualCostUsd: number;
  ceilingCostUsd: number | null;
  technicalFailureCount: number;
  repairSuccessCount: number;
  replacementSuccessCount: number;
  replacementUnavailableCount: number;
  remainingIssues: string[];
  sourceHash: string;
  keyHash: string;
  initialOptionHashes: Record<OptionLabel, string>;
  finalOptionHashes: Record<OptionLabel, string>;
  options: Record<OptionLabel, string>;
  wholeSetRechecked: boolean;
  meaningProven: false;
  qualityProven: false;
  editorial: "pending";
  studentBankWrite: false;
  results: ActiveRecoveryOptionResult[];
};

export type RecoveryAttachment = {
  mode: RecoveryMode;
  applied: boolean;
  blocked: null | "hash_mismatch" | "key_review" | "second_answer" | "set_blocked" | "budget" | "retry_not_allowed" | "active_not_authorized" | "active_not_attached";
  providerCalls: number;
  recoveryCostUsd: number;
  productionCostUsd: number | null;
  qualityDecision: "pending" | "fail" | "needs_revision" | null;
  meaningProven: false;
  qualityProven: false;
  editorial: "pending";
  rows: RecoveryRow[];
  diagnosticEvidence: DiagnosticEvidence[];
  unassignedGateEvidence: { code: string; status: "insufficient_evidence" }[];
  ignoredItemSignals: string[];
  activeReport?: ActiveRecoveryReport | null;
};

export type RecoveryRequest = {
  mode?: RecoveryMode;
  authorization?: string;
  maxCalls?: number;
  maxCostUsd?: number;
  maxRegenerations?: number;
  productionCostUsd?: number | null;
  sourceHash?: string;
  keyHash?: string;
};

type Guard = { status: string; mechanismStatus: string; signals: string[]; reason: string };

export type QualityArm = {
  keyLetter: OptionLabel | null;
  options: Partial<Record<OptionLabel, string>> | null;
  qualityDecision: "pending" | "fail" | "needs_revision";
  qualityReasons: string[];
  failures: string[];
  secondAnswerOptions: OptionLabel[];
  acceptableOptions?: OptionLabel[];
  modelVerdict?: string | null;
  decisionRisks: { key_semantic_risk: string[]; distractor_equivalence_risk: string[]; whole_set_clue_risk: string[] } | null;
  propositionGuards: { label: OptionLabel; guard: Guard }[];
};

export type QualityRecord = {
  id?: string;
  questionType?: string;
  direction?: string | null;
  source: string;
  key: string;
  keyFailures?: string[];
  arms: { B: QualityArm };
};

const optionIds = ["A", "B", "C", "D", "E"] as const;
const ignoredItemCodes = new Set(["mechanism_unverified", "judge_review", "judge_reject", "blind_answer_mismatch", "clue_risk_high", "low_confidence", "proposition_unverified"]);
const ignoredOptionOrder = ["mechanism_unverified", "high_overlap", "discourse_connector_swap", "low_confidence"] as const;
const ignoredOptionCodes = new Set<string>(ignoredOptionOrder);
const reviewOptionCodes = new Set(["second_defensible", "confirmed_equivalent", "proposition_unverified", "language_unverified"]);
const clueCodes = new Set(["key_length_clue", "only_complete_option", "two_sentence_key"]);

function empty(mode: RecoveryMode, qualityDecision: RecoveryAttachment["qualityDecision"], productionCostUsd: number | null): RecoveryAttachment {
  return {
    mode,
    applied: false,
    blocked: null,
    providerCalls: 0,
    recoveryCostUsd: 0,
    productionCostUsd,
    qualityDecision,
    meaningProven: false,
    qualityProven: false,
    editorial: "pending",
    rows: [],
    diagnosticEvidence: [],
    unassignedGateEvidence: [],
    ignoredItemSignals: [],
  };
}

const repairCodes = new Set(["unsupported_extension", "unnatural_option", "incomplete_option", "target_language_mismatch"]);

function evidence(row: Omit<DiagnosticEvidence, "repairEligible"> & { repairEligible?: boolean }): DiagnosticEvidence {
  const repairEligible = row.scope === "option" && row.repairEligible === true && repairCodes.has(row.issueCode);
  return { ...row, repairEligible };
}

function targetLanguageOf(record: QualityRecord): "tr" | "en" | null {
  if (record.direction === "en_tr") return "tr";
  if (record.direction === "tr_en") return "en";
  return null;
}

/** Copies stored gate fields. It does not invent new semantic verdicts. */
export function collectDiagnosticEvidence(record: QualityRecord): DiagnosticEvidence[] {
  const arm = record.arms?.B;
  if (!arm) return [];
  const found: DiagnosticEvidence[] = [];
  const keyLetter = arm.keyLetter;
  const failures = new Set([...(arm.failures ?? []), ...(arm.qualityReasons ?? [])]);
  const keyRisks = arm.decisionRisks?.key_semantic_risk ?? [];
  const keyUncertain = Boolean(record.keyFailures?.includes("key_equivalence_uncertain") || failures.has("key_equivalence_uncertain"));
  const scopeMissing = failures.has("scope_not_carried");

  if (keyUncertain) {
    found.push(evidence({ scope: "key", optionId: keyLetter, issueCode: "key_equivalence_uncertain", evidence: "key_equivalence_uncertain", provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false }));
  }
  if (scopeMissing) {
    found.push(evidence({ scope: "key", optionId: keyLetter, issueCode: "scope_not_carried", evidence: "scope_not_carried", provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false }));
  }
  for (const code of keyRisks) {
    found.push(evidence({ scope: "key", optionId: keyLetter, issueCode: code, evidence: code, provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false }));
  }
  if (!keyUncertain && !scopeMissing && keyRisks.length === 0) {
    found.push(evidence({ scope: "key", optionId: keyLetter, issueCode: "no_detected_issue", evidence: "key_semantic_risk empty", provenance: "deterministic", verificationStatus: "unverified", repairEligible: false }));
  }

  for (const code of arm.decisionRisks?.whole_set_clue_risk ?? []) {
    found.push(evidence({ scope: "set", optionId: null, issueCode: code, evidence: code, provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false }));
  }
  for (const label of arm.decisionRisks?.distractor_equivalence_risk ?? []) {
    const [rawOption, kind] = label.split(":");
    const named = optionIds.includes(rawOption as OptionLabel) ? (rawOption as OptionLabel) : null;
    const issueCode = kind === "discourse" ? "discourse_connector_swap" : "high_overlap";
    found.push(evidence({ scope: named ? "option" : "set", optionId: named, issueCode, evidence: label, provenance: "deterministic", verificationStatus: "unverified", repairEligible: false }));
  }

  if (failures.has("confirmed_equivalent") && arm.options && keyLetter) {
    let attributed = false;
    for (const optionId of optionIds) {
      if (optionId === keyLetter) continue;
      const text = arm.options[optionId];
      if (!text) continue;
      const classified = classifyOption(record.source, record.key, text);
      if (classified.relation === "confirmed_equivalent") {
        attributed = true;
        found.push(evidence({ scope: "option", optionId, issueCode: "confirmed_equivalent", evidence: classified.evidence ?? "same_wording", provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false }));
      }
    }
    if (!attributed) {
      found.push(evidence({ scope: "set", optionId: null, issueCode: "confirmed_equivalent", evidence: "confirmed_equivalent", provenance: "deterministic", verificationStatus: "confirmed", repairEligible: false }));
    }
  }

  const languageFlagged = failures.has("target_language_mismatch") || failures.has("language_unverified");
  if (languageFlagged) {
    const targetLanguage = targetLanguageOf(record);
    const findings = arm.options && targetLanguage
      ? targetLanguageDiagnostics({ questionType: record.questionType ?? "translation", targetLanguage, options: arm.options })
      : [];
    const matched = findings.filter((item) => failures.has(item.issueCode));
    if (matched.length > 0) {
      for (const item of matched) {
        const isKey = item.optionId === keyLetter;
        const confirmed = item.issueCode === "target_language_mismatch";
        found.push(evidence({
          scope: isKey ? "key" : "option",
          optionId: item.optionId,
          issueCode: item.issueCode,
          evidence: `script=${item.script}, expected=${item.targetLanguage}`,
          provenance: "deterministic",
          verificationStatus: confirmed ? "confirmed" : "unverified",
          repairEligible: !isKey && confirmed,
        }));
      }
    } else {
      for (const code of ["target_language_mismatch", "language_unverified"] as const) {
        if (failures.has(code)) {
          found.push(evidence({ scope: "set", optionId: null, issueCode: code, evidence: code, provenance: "deterministic", verificationStatus: code === "target_language_mismatch" ? "confirmed" : "unverified", repairEligible: false }));
        }
      }
    }
  }

  for (const code of arm.qualityReasons ?? []) {
    if (code === "judge_review" || code === "judge_reject" || code === "clue_risk_high" || code === "blind_answer_mismatch") {
      found.push(evidence({ scope: "set", optionId: null, issueCode: code, evidence: code, provenance: "judge", verificationStatus: "confirmed", repairEligible: false }));
    }
    if (code === "low_confidence") found.push(evidence({ scope: "set", optionId: null, issueCode: code, evidence: code, provenance: "judge", verificationStatus: "unverified", repairEligible: false }));
  }
  if (failures.has("judge_schema")) {
    found.push(evidence({ scope: "set", optionId: null, issueCode: "judge_schema", evidence: "judge_schema", provenance: "judge", verificationStatus: "confirmed", repairEligible: false }));
  }
  if (keyLetter && arm.modelVerdict !== null && arm.modelVerdict !== undefined && arm.acceptableOptions && arm.acceptableOptions.length > 0 && !arm.acceptableOptions.includes(keyLetter)) {
    found.push(evidence({ scope: "key", optionId: keyLetter, issueCode: "key_unacceptable", evidence: "acceptableOptions omits key", provenance: "judge", verificationStatus: "unverified", repairEligible: false }));
  }

  for (const optionId of arm.secondAnswerOptions ?? []) {
    found.push(evidence({ scope: "option", optionId, issueCode: "second_defensible", evidence: "secondAnswerOptions", provenance: "judge", verificationStatus: "confirmed", repairEligible: false }));
  }
  for (const entry of arm.propositionGuards ?? []) {
    const guard = entry.guard;
    if (guard.mechanismStatus === "mechanism_unverified") {
      found.push(evidence({ scope: "option", optionId: entry.label, issueCode: "mechanism_unverified", evidence: guard.reason, provenance: "deterministic", verificationStatus: "unverified", repairEligible: false }));
    }
    if (guard.status === "unverified" && guard.signals.length > 0) {
      found.push(evidence({ scope: "option", optionId: entry.label, issueCode: "proposition_unverified", evidence: `${guard.signals.join(", ")}; ${guard.reason}`, provenance: "deterministic", verificationStatus: "unverified", repairEligible: false }));
    }
    if (guard.status === "unsupported_clause" && guard.signals.length > 0) {
      found.push(evidence({ scope: "option", optionId: entry.label, issueCode: "unsupported_extension", evidence: guard.signals.join(", "), provenance: "deterministic", verificationStatus: "confirmed", repairEligible: true }));
    }
  }
  return found;
}

function row(optionId: OptionLabel, decision: RecoveryRowDecision, detail: string | null, ignored: string[]): RecoveryRow {
  return { optionId, decision, evidence: detail, ignored, call: false };
}

/** Reads only fields the quality gate stored. It does not infer a defect from option wording. */
export function attachRecovery(record: QualityRecord, request: RecoveryRequest = {}): RecoveryAttachment {
  const mode = request.mode ?? (recoveryDefaultEnabled ? "dry_run" : "off");
  const arm = record.arms.B;
  const productionCostUsd = request.productionCostUsd ?? null;
  if (mode === "off") return empty("off", arm?.qualityDecision ?? null, productionCostUsd);
  if (mode === "active") {
    const report = empty("active", arm?.qualityDecision ?? null, productionCostUsd);
    if (request.maxRegenerations !== undefined && request.maxRegenerations > 0) {
      report.blocked = "retry_not_allowed";
      return report;
    }
    const authorized =
      request.authorization === recoveryActiveAuthorization &&
      typeof request.maxCalls === "number" &&
      Number.isInteger(request.maxCalls) &&
      request.maxCalls > 0 &&
      typeof request.maxCostUsd === "number" &&
      Number.isFinite(request.maxCostUsd) &&
      request.maxCostUsd > 0;
    report.blocked = authorized ? "active_not_attached" : "active_not_authorized";
    return report;
  }

  const report = empty("dry_run", arm?.qualityDecision ?? null, productionCostUsd);
  if (!arm?.options || !arm.keyLetter || arm.options[arm.keyLetter] !== record.key) {
    report.blocked = "hash_mismatch";
    report.rows = optionIds.map((optionId) => row(optionId, "insufficient_evidence", null, []));
    return report;
  }
  if (request.sourceHash && request.sourceHash !== contentVersion(record.source)) {
    report.blocked = "hash_mismatch";
    report.rows = optionIds.map((optionId) => row(optionId, "insufficient_evidence", null, []));
    return report;
  }
  if (request.keyHash && request.keyHash !== contentVersion(record.key)) {
    report.blocked = "hash_mismatch";
    report.rows = optionIds.map((optionId) => row(optionId, "insufficient_evidence", null, []));
    return report;
  }

  const reasons = arm.qualityReasons ?? [];
  report.ignoredItemSignals = reasons.filter((code) => ignoredItemCodes.has(code));
  const diagnostic = collectDiagnosticEvidence(record);
  report.diagnosticEvidence = diagnostic;

  const keyIssues = diagnostic.filter((item) => item.scope === "key" && item.issueCode !== "no_detected_issue");
  const keyBlocked = keyIssues.some((item) => item.issueCode === "key_equivalence_uncertain" || item.issueCode === "scope_not_carried");
  if (keyBlocked) {
    report.blocked = "key_review";
    const keyEvidence = keyIssues.map((item) => item.issueCode).join(", ");
    report.rows = optionIds.map((optionId) => row(optionId, "review", keyEvidence, []));
    return report;
  }

  const hasSecondAnswer = diagnostic.some((item) => item.issueCode === "second_defensible" || item.issueCode === "confirmed_equivalent");
  if (hasSecondAnswer || reasons.includes("second_defensible")) {
    report.blocked = "second_answer";
  }

  for (const item of diagnostic) {
    if (item.scope === "set" && (clueCodes.has(item.issueCode) || item.issueCode === "target_language_mismatch" || item.issueCode === "language_unverified")) {
      report.unassignedGateEvidence.push({ code: item.issueCode, status: "insufficient_evidence" });
    }
  }

  for (const optionId of optionIds) {
    if (optionId === arm.keyLetter) {
      if (keyIssues.length > 0) {
        report.rows.push(row(optionId, "review", keyIssues.map((item) => item.issueCode).join(", "), []));
      } else {
        report.rows.push(row(optionId, "no_detected_issue", null, []));
      }
      continue;
    }
    const own = diagnostic.filter((item) => item.scope === "option" && item.optionId === optionId);
    const presentIgnored = new Set(own.filter((item) => ignoredOptionCodes.has(item.issueCode)).map((item) => item.issueCode));
    if (reasons.includes("low_confidence")) presentIgnored.add("low_confidence");
    const ignored = ignoredOptionOrder.filter((code) => presentIgnored.has(code));

    const reviewItems = own.filter((item) => reviewOptionCodes.has(item.issueCode));
    if (reviewItems.length > 0) {
      const reviewEvidence = reviewItems.map((item) => item.issueCode === "proposition_unverified" ? item.evidence.split(";")[0]!.trim() : item.evidence).join(", ");
      report.rows.push(row(optionId, "review", reviewEvidence, ignored));
      continue;
    }

    const repairItems = own.filter((item) => item.repairEligible);
    if (repairItems.length > 0) {
      const repairEvidence = repairItems.map((item) => item.evidence).join(", ");
      report.rows.push(row(optionId, report.blocked ? "review" : "repair", repairEvidence, ignored));
      continue;
    }

    if (ignored.length > 0) {
      report.rows.push(row(optionId, "insufficient_evidence", null, ignored));
      continue;
    }
    report.rows.push(row(optionId, "accept", null, []));
  }
  return report;
}

export function replayCandidate(input: {
  source: string;
  key: string;
  sourceHash: string;
  keyHash: string;
  options: Record<OptionLabel, string>;
  editorialRisks?: readonly { optionId: OptionLabel; changes: readonly string[] }[];
  overlapLabels?: readonly string[];
}): RecoveryAttachment {
  const report = empty("dry_run", null, null);
  if (contentVersion(input.source) !== input.sourceHash || contentVersion(input.key) !== input.keyHash || input.options.A !== input.key) {
    report.blocked = "hash_mismatch";
  }
  report.rows = optionIds.map((optionId) =>
    optionId === "A" && !report.blocked
      ? row(optionId, "no_detected_issue", null, [])
      : row(optionId, "insufficient_evidence", null, []),
  );
  report.ignoredItemSignals = ["editorial_candidate_has_no_quality_gate"];
  const overlapDiagnostics = (input.overlapLabels ?? []).map((label) => {
    const rawOption = label.split(":")[0];
    const named = optionIds.includes(rawOption as OptionLabel) ? (rawOption as OptionLabel) : null;
    return evidence({ scope: named ? "option" : "set", optionId: named, issueCode: "high_overlap", evidence: label, provenance: "deterministic", verificationStatus: "unverified", repairEligible: false });
  });
  report.diagnosticEvidence = [
    evidence({ scope: "key", optionId: "A", issueCode: "no_detected_issue", evidence: "editorial candidate records no key defect", provenance: "editorial", verificationStatus: "unverified", repairEligible: false }),
    ...overlapDiagnostics,
    ...(input.editorialRisks ?? []).flatMap((risk) => risk.changes.map((change) => evidence({
      scope: "option" as const,
      optionId: risk.optionId,
      issueCode: change,
      evidence: change,
      provenance: "editorial" as const,
      verificationStatus: "unverified" as const,
      repairEligible: false,
    }))),
  ];
  return report;
}
