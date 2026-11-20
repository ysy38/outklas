import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { contentVersion } from "@/modules/factory/item-model/distractor-strategy";
import { recordedDraftsKey, recordedDraftsSource } from "@/modules/factory/item-model/drafts-candidate";
import { targetLanguageDiagnostics } from "@/modules/factory/item-model/option-language";
import { addedFrames, assessProposition } from "@/modules/factory/item-model/proposition-guard";
import { assessWholeSet } from "@/modules/factory/item-model/whole-set";
import { loadAIConfig, parseModel } from "../ai/config";
import { openrouterBrevity, OpenRouterProvider } from "../ai/openrouter";
import { estimateCost, type Prices } from "../ai/prices";
import { extractJsonText } from "../ai/service";
import type { AIProvider } from "../ai/types";
import { classifyRepairTransport, openRouterWriterWire } from "../diagnostic-repair/call-contract";
import {
  completionReplacementSystem,
  completionTasks,
  completionUser,
  readReplacementOutput,
  repeatedSiblingError,
  replacementOutputSchema,
  revalidateReplacement,
} from "../diagnostic-repair/completion";
import {
  readRepairOutput,
  repairModel,
  repairOutputSchema,
  repairSystem,
  repairUser,
  type RepairIssueCode,
  type RepairTask,
} from "../diagnostic-repair/contract";
import { draftsRepairTasks } from "../diagnostic-repair/drafts";
import { repairNearCopyOfKey, revalidateRepair } from "../diagnostic-repair/revalidate";
import {
  attachRecovery,
  recoveryActiveAuthorization,
  type ActiveRecoveryOptionResult,
  type ActiveRecoveryReport,
  type DiagnosticEvidence,
  type QualityRecord,
  type RecoveryAttachment,
  type RecoveryRequest,
} from "./attach";

export type ActiveRecoveryInput = RecoveryRequest & {
  provider?: AIProvider | null;
  prices?: Prices | null;
  allowLiveOpenRouter?: boolean;
  spentCallsBefore?: number;
  spentCostUsdBefore?: number;
  /** Explicit editorial fixtures. These are never Factory-detected defects. */
  injectedEvidence?: DiagnosticEvidence[];
  allowReplacement?: boolean;
  /** When false, a passing candidate is reported but not written onto working options. */
  commitCandidates?: boolean;
};

export function createOpenRouterRecoveryProvider(): OpenRouterProvider {
  const config = loadAIConfig();
  if (!config.keys.openrouter) throw new Error("missing openrouter API key");
  return new OpenRouterProvider({
    apiKey: config.keys.openrouter,
    baseUrl: config.openrouterBaseUrl,
    promptCache: "off",
    dataCollection: config.openrouterDataCollection,
    title: "tomo-factory",
    maxRetries: 0,
    minOutputTokens: openRouterWriterWire.outputFloor,
  });
}

function hashMap(options: Partial<Record<OptionLabel, string>>): Record<OptionLabel, string> {
  return {
    A: contentVersion(options.A ?? ""),
    B: contentVersion(options.B ?? ""),
    C: contentVersion(options.C ?? ""),
    D: contentVersion(options.D ?? ""),
    E: contentVersion(options.E ?? ""),
  };
}

function copyFullOptions(options: Partial<Record<OptionLabel, string>>): Record<OptionLabel, string> {
  return {
    A: options.A ?? "",
    B: options.B ?? "",
    C: options.C ?? "",
    D: options.D ?? "",
    E: options.E ?? "",
  };
}

function targetLanguageFor(record: QualityRecord): "tr" | "en" {
  return record.direction === "en_tr" ? "tr" : "en";
}

function isDraftsRecord(sourceHash: string, keyHash: string): boolean {
  return sourceHash === contentVersion(recordedDraftsSource) && keyHash === contentVersion(recordedDraftsKey);
}

function canRunCompletionReplacement(sourceHash: string, keyHash: string, optionId: OptionLabel): boolean {
  return isDraftsRecord(sourceHash, keyHash) && optionId === "E";
}

function projectCallUsd(prices: Prices | null, system: string, schema: unknown, userPrompt: string): number | null {
  const inputTokens = Math.ceil((system.length + 2 + openrouterBrevity.length + JSON.stringify(schema).length + userPrompt.length) / 2);
  return estimateCost({ [repairModel]: { calls: 1, inputTokens, outputTokens: openRouterWriterWire.outputFloor } }, prices).usd;
}

function buildTask(record: QualityRecord, optionId: OptionLabel, finding: DiagnosticEvidence, sourceHash: string, keyHash: string, currentText: string): RepairTask {
  if (isDraftsRecord(sourceHash, keyHash)) {
    const draftsTask = draftsRepairTasks().find((task) => task.optionId === optionId && task.issueCode === finding.issueCode);
    if (draftsTask) return { ...draftsTask, originalOption: currentText };
  }
  return {
    sourceId: record.id ?? "cognitive-trap-item",
    sourceHash,
    keyHash,
    optionId,
    originalOption: currentText,
    issueCode: finding.issueCode as RepairIssueCode,
    evidence: finding.evidence,
    preservedMeaning: [record.source, record.key],
    targetMisreading: `Repair only ${finding.issueCode} (${finding.evidence}) while keeping one distinct plausible distractor`,
    forbiddenChanges: [
      "do not change the source, the key, or the fixed options",
      "do not add an actor, event, or claim absent from the source",
      "do not produce a second correct answer",
    ],
  };
}

function validateCandidate(input: {
  mode: "repair" | "replace";
  record: QualityRecord;
  optionId: OptionLabel;
  before: string;
  candidate: string;
  task: RepairTask;
  workingOptions: Record<OptionLabel, string>;
  sourceHash: string;
  keyHash: string;
  initialHashes: Record<OptionLabel, string>;
  finalHashes: Record<OptionLabel, string>;
}): string[] {
  const reasons: string[] = [];
  const candidate = input.candidate.trim();
  if (contentVersion(input.record.source) !== input.sourceHash || contentVersion(input.record.key) !== input.keyHash) {
    reasons.push("source_or_key_changed");
    return reasons;
  }
  for (const label of optionLabels) {
    if (label === input.optionId) continue;
    if (contentVersion(input.workingOptions[label]) !== input.finalHashes[label]) {
      reasons.push(`fixed_option_${label}_changed`);
    }
  }
  if (!candidate || candidate === input.before.trim()) reasons.push("no_change");
  if (candidate === input.record.key.trim() || repairNearCopyOfKey(input.record.key, candidate)) reasons.push("second_defensible");
  for (const label of optionLabels) {
    if (label !== input.optionId && input.workingOptions[label].trim() === candidate) reasons.push("duplicate_option");
  }
  const next = { ...input.workingOptions, [input.optionId]: candidate };
  if (input.record.questionType === "translation" && (input.record.direction === "en_tr" || input.record.direction === "tr_en")) {
    const diags = targetLanguageDiagnostics({
      questionType: "translation",
      targetLanguage: targetLanguageFor(input.record),
      options: next,
    });
    for (const diag of diags) {
      if (diag.optionId === input.optionId) reasons.push(diag.issueCode);
    }
  }
  const correct = input.record.arms.B.keyLetter ?? "A";
  const beforeGate = assessWholeSet({ source: input.record.source, key: input.record.key, options: input.workingOptions, correct });
  const afterGate = assessWholeSet({ source: input.record.source, key: input.record.key, options: next, correct });
  if (afterGate.failure) reasons.push(afterGate.failure);
  for (const clue of afterGate.risks.whole_set_clue_risk) {
    if (!beforeGate.risks.whole_set_clue_risk.includes(clue)) reasons.push(clue);
  }
  for (const risk of afterGate.risks.key_semantic_risk) {
    if (!beforeGate.risks.key_semantic_risk.includes(risk)) reasons.push(risk);
  }
  const prop = assessProposition({ source: input.record.source, key: input.record.key, option: candidate });
  if (prop.status === "unsupported_clause") reasons.push("unsupported_clause");
  if (input.task.issueCode === "unsupported_extension" && addedFrames(input.record.source, input.record.key, candidate).length > 0) {
    reasons.push("unsupported_extension_remains");
  }
  if (input.mode === "repair" && isDraftsRecord(input.sourceHash, input.keyHash) && (input.optionId === "C" || input.optionId === "E")) {
    const draftsVerdict = revalidateRepair({
      task: input.task,
      candidate,
      source: input.record.source,
      key: input.record.key,
      options: input.workingOptions,
      targetLanguage: targetLanguageFor(input.record),
      questionType: input.record.questionType === "restatement" ? "restatement" : "translation",
      correct,
    });
    if (!draftsVerdict.option_repair_success) reasons.push(...draftsVerdict.reasons);
  }
  return [...new Set(reasons)];
}

/**
 * Executes active recovery using the Diagnostic Repair v2 provider contract.
 * Keeps Factory arm options, qualityDecision, meaningProven: false, qualityProven: false, and editorial: "pending" untouched.
 */
export async function executeActiveRecovery(record: QualityRecord, input: ActiveRecoveryInput): Promise<RecoveryAttachment> {
  if (input.mode !== "active") return attachRecovery(record, input);
  const arm = record.arms.B;
  const productionCostUsd = input.productionCostUsd ?? null;

  if (input.maxRegenerations !== undefined && input.maxRegenerations > 0) {
    return { ...attachRecovery(record, input), blocked: "retry_not_allowed" };
  }
  const hasValidCaps =
    input.authorization === recoveryActiveAuthorization &&
    typeof input.maxCalls === "number" &&
    Number.isInteger(input.maxCalls) &&
    input.maxCalls > 0 &&
    typeof input.maxCostUsd === "number" &&
    Number.isFinite(input.maxCostUsd) &&
    input.maxCostUsd > 0;
  if (!hasValidCaps) {
    return { ...attachRecovery(record, input), blocked: "active_not_authorized" };
  }
  if (!input.prices) {
    return { ...attachRecovery(record, input), blocked: "budget" };
  }

  let provider: AIProvider | null = input.provider ?? null;
  if (!provider && input.allowLiveOpenRouter) {
    try {
      provider = createOpenRouterRecoveryProvider();
    } catch {
      provider = null;
    }
  }
  if (!provider) {
    return attachRecovery(record, input);
  }

  const dry = attachRecovery(record, { ...input, mode: "dry_run" });
  const fixtureEvidence = (input.injectedEvidence ?? []).filter((item) => item.provenance === "editorial_fixture");
  const baseAttachment: RecoveryAttachment = {
    ...dry,
    mode: "active",
    applied: false,
    providerCalls: 0,
    recoveryCostUsd: 0,
    productionCostUsd,
    meaningProven: false,
    qualityProven: false,
    editorial: "pending",
    diagnosticEvidence: [...fixtureEvidence, ...dry.diagnosticEvidence],
    activeReport: null,
  };

  if (dry.blocked === "hash_mismatch" || !arm.options || !arm.keyLetter) {
    return { ...baseAttachment, blocked: "hash_mismatch" };
  }
  const hasKeyDefect = dry.diagnosticEvidence.some((item) => item.scope === "key" && item.issueCode !== "no_detected_issue");
  if (dry.blocked === "key_review" || hasKeyDefect) {
    return { ...baseAttachment, blocked: "key_review" };
  }
  const hasSecondAnswer = dry.diagnosticEvidence.some((item) => item.issueCode === "second_defensible" || item.issueCode === "confirmed_equivalent");
  if (dry.blocked === "second_answer" || hasSecondAnswer) {
    return { ...baseAttachment, blocked: "second_answer" };
  }
  const hasSetBlock = dry.diagnosticEvidence.some((item) => item.scope === "set");
  if (hasSetBlock) {
    return { ...baseAttachment, blocked: "set_blocked" };
  }

  const sourceHash = contentVersion(record.source);
  const keyHash = contentVersion(record.key);
  const initialOptionHashes = hashMap(arm.options);
  const finalOptionHashes = { ...initialOptionHashes };
  const workingOptions = copyFullOptions(arm.options);

  const modelId = parseModel(repairModel, "openrouter").model;
  const maxCalls = input.maxCalls!;
  const maxCostUsd = input.maxCostUsd!;
  const spentCallsBefore = input.spentCallsBefore ?? 0;
  const spentCostUsdBefore = input.spentCostUsdBefore ?? 0;

  let calls = 0;
  let repairCalls = 0;
  let replaceCalls = 0;
  let actualCostUsd = 0;
  let technicalFailureCount = 0;
  let repairSuccessCount = 0;
  let replacementSuccessCount = 0;
  let replacementUnavailableCount = 0;
  let wholeSetRechecked = false;
  let applied = false;
  let blocked: RecoveryAttachment["blocked"] = null;
  const results: ActiveRecoveryOptionResult[] = [];

  for (const optionId of optionLabels) {
    if (optionId === arm.keyLetter) continue;
    const ownEvidence = [
      ...fixtureEvidence.filter((item) => item.scope === "option" && item.optionId === optionId),
      ...dry.diagnosticEvidence.filter((item) => item.scope === "option" && item.optionId === optionId),
    ];
    const eligible = ownEvidence.find((item) => item.verificationStatus === "confirmed" && item.repairEligible && (item.provenance === "editorial_fixture" || fixtureEvidence.length === 0));
    const before = workingOptions[optionId];

    if (!eligible) {
      const remaining = ownEvidence.map((item) => item.issueCode);
      results.push({
        optionId,
        action: "skipped",
        defectCode: ownEvidence[0]?.issueCode ?? null,
        evidence: ownEvidence[0]?.evidence ?? null,
        before,
        after: before,
        kept: "original",
        calls: 0,
        costUsd: 0,
        repairSuccess: false,
        replacementOutcome: "not_needed",
        replacementSuccess: false,
        technicalFailures: [],
        validationFailures: [],
        remainingIssues: remaining,
        proposedText: null,
      });
      continue;
    }

    const task = buildTask(record, optionId, eligible, sourceHash, keyHash, before);
    const fixedOptions = optionLabels.filter((id) => id !== optionId).map((id) => workingOptions[id]);
    const userPrompt = repairUser(task, { source: record.source, key: record.key, targetLanguage: targetLanguageFor(record), fixedOptions });
    const projectedRepairUsd = projectCallUsd(input.prices, repairSystem, repairOutputSchema, userPrompt);

    if (spentCallsBefore + calls + 1 > maxCalls || projectedRepairUsd === null || spentCostUsdBefore + actualCostUsd + projectedRepairUsd > maxCostUsd) {
      blocked = "budget";
      results.push({
        optionId,
        action: "skipped",
        defectCode: eligible.issueCode,
        evidence: eligible.evidence,
        before,
        after: before,
        kept: "original",
        calls: 0,
        costUsd: 0,
        repairSuccess: false,
        replacementOutcome: "not_needed",
        replacementSuccess: false,
        technicalFailures: [],
        validationFailures: ["budget_exceeded"],
        remainingIssues: [eligible.issueCode],
        proposedText: null,
      });
      break;
    }

    let optionCalls = 0;
    let optionCost = 0;
    const technicalFailures: string[] = [];
    const validationFailures: string[] = [];
    let repairSuccess = false;
    let replacementOutcome: ActiveRecoveryOptionResult["replacementOutcome"] = "not_needed";
    let replacementSuccess = false;
    let action: ActiveRecoveryOptionResult["action"] = "repair";

    let parsedRepair: ReturnType<typeof readRepairOutput> = null;
    try {
      const response = await provider.generate({
        model: modelId,
        system: repairSystem,
        parts: [{ text: userPrompt }],
        jsonSchema: repairOutputSchema,
        temperature: 0,
        maxOutputTokens: openRouterWriterWire.outputFloor,
      });
      optionCalls += 1;
      calls += 1;
      repairCalls += 1;
      const callUsd = estimateCost({ [repairModel]: { calls: 1, inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens } }, input.prices).usd ?? 0;
      optionCost += callUsd;
      actualCostUsd += callUsd;

      const transport = classifyRepairTransport({ text: response.text, outputTokens: response.usage.outputTokens, reasoningTokens: response.usage.reasoningTokens });
      if (transport.length) technicalFailures.push(...transport);
      try {
        const candidateJson = JSON.parse(extractJsonText(response.text));
        parsedRepair = readRepairOutput(candidateJson);
        if (!parsedRepair) technicalFailures.push("schema_mismatch");
        else if (parsedRepair.optionId !== optionId) {
          parsedRepair = null;
          technicalFailures.push("option_id_mismatch");
        }
      } catch {
        technicalFailures.push("invalid_json");
      }
    } catch {
      optionCalls += 1;
      calls += 1;
      repairCalls += 1;
      technicalFailures.push("provider_call_error");
    }

    if (technicalFailures.length > 0 || !parsedRepair) {
      technicalFailureCount += 1;
      results.push({
        optionId,
        action: "repair",
        defectCode: eligible.issueCode,
        evidence: eligible.evidence,
        before,
        after: workingOptions[optionId],
        kept: "original",
        calls: optionCalls,
        costUsd: optionCost,
        repairSuccess: false,
        replacementOutcome: "not_needed",
        replacementSuccess: false,
        technicalFailures: [...new Set(technicalFailures)],
        validationFailures: [],
        remainingIssues: [eligible.issueCode],
        proposedText: null,
      });
      continue;
    }

    if (parsedRepair.outcome === "replacement") {
      wholeSetRechecked = true;
      const reasons = validateCandidate({
        mode: "repair",
        record,
        optionId,
        before,
        candidate: parsedRepair.text,
        task,
        workingOptions,
        sourceHash,
        keyHash,
        initialHashes: initialOptionHashes,
        finalHashes: finalOptionHashes,
      });
      if (reasons.length === 0) {
        const nextText = parsedRepair.text.trim();
        repairSuccess = true;
        repairSuccessCount += 1;
        if (input.commitCandidates !== false) {
          workingOptions[optionId] = nextText;
          finalOptionHashes[optionId] = contentVersion(nextText);
          applied = true;
        }
      } else {
        validationFailures.push(...reasons);
      }
      results.push({
        optionId,
        action: "repair",
        defectCode: eligible.issueCode,
        evidence: eligible.evidence,
        before,
        after: workingOptions[optionId],
        kept: input.commitCandidates !== false && repairSuccess ? "candidate" : "original",
        calls: optionCalls,
        costUsd: optionCost,
        repairSuccess,
        replacementOutcome: "not_needed",
        replacementSuccess: false,
        technicalFailures: [],
        validationFailures,
        remainingIssues: repairSuccess ? [] : [eligible.issueCode, ...validationFailures],
        proposedText: parsedRepair.text.trim(),
      });
      continue;
    }

    // parsedRepair.outcome === "repair_not_possible"
    if (input.allowReplacement === false || !canRunCompletionReplacement(sourceHash, keyHash, optionId)) {
      replacementOutcome = "replacement_unavailable";
      replacementUnavailableCount += 1;
      results.push({
        optionId,
        action: "repair",
        defectCode: eligible.issueCode,
        evidence: eligible.evidence,
        before,
        after: workingOptions[optionId],
        kept: "original",
        calls: optionCalls,
        costUsd: optionCost,
        repairSuccess: false,
        replacementOutcome,
        replacementSuccess: false,
        technicalFailures: [],
        validationFailures: ["repair_not_possible"],
        remainingIssues: [eligible.issueCode, "replacement_unavailable"],
        proposedText: null,
      });
      continue;
    }

    // Existing completion.ts replacement contract is applicable (Drafts E)
    action = "replace";
    const eTask = completionTasks({
      id: record.id ?? "drafts",
      source: record.source,
      key: record.key,
      meaning: "unverified",
      options: workingOptions,
      secondAnswerOptions: arm.secondAnswerOptions,
      formClues: arm.decisionRisks?.whole_set_clue_risk ?? [],
      qualityReasons: arm.qualityReasons,
    }).find((t) => t.optionId === "E")!;
    const replacePrompt = completionUser(eTask, { source: record.source, key: record.key, optionB: workingOptions.B, optionC: workingOptions.C });
    const projectedReplaceUsd = projectCallUsd(input.prices, completionReplacementSystem, replacementOutputSchema, replacePrompt);

    if (spentCallsBefore + calls + 1 > maxCalls || projectedReplaceUsd === null || spentCostUsdBefore + actualCostUsd + projectedReplaceUsd > maxCostUsd) {
      blocked = "budget";
      results.push({
        optionId,
        action: "replace",
        defectCode: eligible.issueCode,
        evidence: eligible.evidence,
        before,
        after: workingOptions[optionId],
        kept: "original",
        calls: optionCalls,
        costUsd: optionCost,
        repairSuccess: false,
        replacementOutcome: "replacement_rejected",
        replacementSuccess: false,
        technicalFailures: [],
        validationFailures: ["repair_not_possible", "budget_exceeded"],
        remainingIssues: [eligible.issueCode],
        proposedText: null,
      });
      break;
    }

    let parsedReplace: ReturnType<typeof readReplacementOutput> = null;
    try {
      const replaceResp = await provider.generate({
        model: modelId,
        system: completionReplacementSystem,
        parts: [{ text: replacePrompt }],
        jsonSchema: replacementOutputSchema,
        temperature: 0,
        maxOutputTokens: openRouterWriterWire.outputFloor,
      });
      optionCalls += 1;
      calls += 1;
      replaceCalls += 1;
      const callUsd = estimateCost({ [repairModel]: { calls: 1, inputTokens: replaceResp.usage.inputTokens, outputTokens: replaceResp.usage.outputTokens } }, input.prices).usd ?? 0;
      optionCost += callUsd;
      actualCostUsd += callUsd;

      const transport = classifyRepairTransport({ text: replaceResp.text, outputTokens: replaceResp.usage.outputTokens, reasoningTokens: replaceResp.usage.reasoningTokens });
      if (transport.length) technicalFailures.push(...transport);
      try {
        const candidateJson = JSON.parse(extractJsonText(replaceResp.text));
        parsedReplace = readReplacementOutput(candidateJson);
        if (!parsedReplace) technicalFailures.push("schema_mismatch");
        else if (parsedReplace.optionId !== optionId) {
          parsedReplace = null;
          technicalFailures.push("option_id_mismatch");
        }
      } catch {
        technicalFailures.push("invalid_json");
      }
    } catch {
      optionCalls += 1;
      calls += 1;
      replaceCalls += 1;
      technicalFailures.push("provider_call_error");
    }

    if (technicalFailures.length > 0 || !parsedReplace) {
      technicalFailureCount += 1;
      replacementOutcome = "replacement_rejected";
      results.push({
        optionId,
        action,
        defectCode: eligible.issueCode,
        evidence: eligible.evidence,
        before,
        after: workingOptions[optionId],
        kept: "original",
        calls: optionCalls,
        costUsd: optionCost,
        repairSuccess: false,
        replacementOutcome,
        replacementSuccess: false,
        technicalFailures: [...new Set(technicalFailures)],
        validationFailures: ["repair_not_possible"],
        remainingIssues: [eligible.issueCode],
        proposedText: null,
      });
      continue;
    }

    wholeSetRechecked = true;
    const candidate = parsedReplace.text.trim();
    const verdict = revalidateReplacement({
      task: eTask,
      candidate,
      source: record.source,
      key: record.key,
      optionB: workingOptions.B,
      optionC: workingOptions.C,
    });
    const wholeSetReasons = validateCandidate({
      mode: "replace",
      record,
      optionId,
      before,
      candidate,
      task,
      workingOptions,
      sourceHash,
      keyHash,
      initialHashes: initialOptionHashes,
      finalHashes: finalOptionHashes,
    });
    const combinedReasons = [...new Set([...verdict.reasons, ...wholeSetReasons])];
    if (verdict.replacement_success && combinedReasons.length === 0) {
      replacementOutcome = "replacement_accepted";
      replacementSuccess = true;
      replacementSuccessCount += 1;
      if (input.commitCandidates !== false) {
        workingOptions[optionId] = candidate;
        finalOptionHashes[optionId] = contentVersion(candidate);
        applied = true;
      }
    } else {
      replacementOutcome = "replacement_rejected";
      validationFailures.push(...combinedReasons);
    }

    results.push({
      optionId,
      action,
      defectCode: eligible.issueCode,
      evidence: eligible.evidence,
      before,
      after: workingOptions[optionId],
      kept: input.commitCandidates !== false && replacementSuccess ? "candidate" : "original",
      calls: optionCalls,
      costUsd: optionCost,
      repairSuccess: false,
      replacementOutcome,
      replacementSuccess,
      technicalFailures: [],
      validationFailures,
      remainingIssues: replacementSuccess ? [] : [eligible.issueCode],
      proposedText: candidate,
    });
  }

  const remainingIssues = [...new Set(results.flatMap((entry) => entry.remainingIssues.map((code) => `${entry.optionId}:${code}`)))];
  const activeReport: ActiveRecoveryReport = {
    model: repairModel,
    retry: 0,
    calls,
    repairCalls,
    replaceCalls,
    actualCostUsd: Number(actualCostUsd.toFixed(8)),
    ceilingCostUsd: maxCostUsd,
    technicalFailureCount,
    repairSuccessCount,
    replacementSuccessCount,
    replacementUnavailableCount,
    remainingIssues,
    sourceHash,
    keyHash,
    initialOptionHashes,
    finalOptionHashes,
    options: workingOptions,
    wholeSetRechecked,
    meaningProven: false,
    qualityProven: false,
    editorial: "pending",
    studentBankWrite: false,
    results,
  };

  return {
    ...baseAttachment,
    applied,
    blocked,
    providerCalls: calls,
    recoveryCostUsd: Number(actualCostUsd.toFixed(8)),
    activeReport,
  };
}
