import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { loadPrices } from "./ai/prices";
import type { AIProvider, ModelRequest } from "./ai/types";
import { openRouterWriterWire } from "./diagnostic-repair/call-contract";
import { repairModel, repairSystem } from "./diagnostic-repair/contract";
import { draftsRecordPath } from "./diagnostic-repair/drafts";
import { executeActiveRecovery } from "./recovery/active";
import { attachRecovery, recoveryActiveAuthorization } from "./recovery/attach";
import {
  draftsCEditorialFixture,
  loadDraftsQualityRecord,
  recoveryLiveSmokeMaxCalls,
  recoveryLiveSmokeMaxCostUsd,
  recoveryLiveSmokeOutDir,
  smokeActiveInput,
  verifyDraftsCSmokeContract,
} from "./recovery/smoke-case";
import { replayRecordedLiveSmokeC, recoveryLiveSmokeReplayVersion } from "./recovery/live-smoke-replay";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const recordFile = path.resolve(draftsRecordPath);
const smokeFile = path.resolve(recoveryLiveSmokeOutDir, "summary.json");
const frozen = createHash("sha256").update(readFileSync(recordFile)).digest("hex");
const frozenSmoke = createHash("sha256").update(readFileSync(smokeFile)).digest("hex");
const knownC = "Most of the drafts were not taken up for the second reading, but all of the drafts were distributed to the board afterwards.";

afterAll(() => {
  expect(createHash("sha256").update(readFileSync(recordFile)).digest("hex")).toBe(frozen);
  expect(createHash("sha256").update(readFileSync(smokeFile)).digest("hex")).toBe(frozenSmoke);
});

function mockProvider(handler: (req: ModelRequest) => { text: string }): AIProvider & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  return {
    name: "mock-openrouter",
    calls,
    async generate(request) {
      calls.push(request);
      return {
        text: handler(request).text,
        model: request.model,
        usage: { inputTokens: 480, outputTokens: 70, totalTokens: 550 },
      };
    },
  };
}

describe("active recovery live smoke (offline mock)", () => {
  it("keeps Drafts C as an editorial fixture and does not treat Factory output as the defect", () => {
    const quality = loadDraftsQualityRecord();
    const factory = attachRecovery(quality, { mode: "dry_run" });
    expect(factory.diagnosticEvidence.filter((item) => item.optionId === "C").every((item) => item.repairEligible === false)).toBe(true);
    expect(factory.rows.find((row) => row.optionId === "C")?.decision).not.toBe("repair");
    expect(draftsCEditorialFixture).toMatchObject({
      optionId: "C",
      issueCode: "unsupported_extension",
      evidence: "only afterward",
      provenance: "editorial_fixture",
      verificationStatus: "confirmed",
      repairEligible: true,
    });
    const contract = verifyDraftsCSmokeContract(prices);
    expect(contract.ok).toBe(true);
    expect(contract.reasons).toEqual([]);
    expect(contract.authorization).toBe(recoveryActiveAuthorization);
    expect(contract.maxCalls).toBe(recoveryLiveSmokeMaxCalls);
    expect(contract.maxCostUsd).toBe(recoveryLiveSmokeMaxCostUsd);
    expect(contract.retry).toBe(0);
    expect(contract.model).toBe(repairModel);
    expect(contract.factoryCRepairEligible).toBe(false);
    expect(contract.ceilingUsd).not.toBeNull();
    expect(contract.ceilingUsd!).toBeGreaterThan(0);
    expect(contract.ceilingUsd!).toBeLessThanOrEqual(0.01);
    expect(quality.arms.B.qualityDecision).toBe("needs_revision");
    expect((quality.arms.B as { editorial?: string }).editorial).toBe("pending");
  });

  it("routes only C through Diagnostic Repair v2 and does not call replacement", async () => {
    const quality = loadDraftsQualityRecord();
    const originalC = quality.arms.B.options!.C!;
    const factoryOnly = mockProvider(() => {
      throw new Error("factory-only drafts C must not call a provider");
    });
    const skipped = await executeActiveRecovery(quality, {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 1,
      maxCostUsd: 0.01,
      provider: factoryOnly,
      prices,
    });
    expect(skipped.providerCalls).toBe(0);
    expect(skipped.activeReport?.results.find((row) => row.optionId === "C")?.action).toBe("skipped");

    const provider = mockProvider(() => ({ text: JSON.stringify({ optionId: "C", text: knownC }) }));
    const routed = await executeActiveRecovery(quality, { ...smokeActiveInput(prices), provider });
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.system).toBe(repairSystem);
    expect(provider.calls[0]?.maxOutputTokens).toBe(openRouterWriterWire.outputFloor);
    expect(provider.calls[0]?.temperature).toBe(0);
    expect(routed.providerCalls).toBe(1);
    expect(routed.activeReport?.repairCalls).toBe(1);
    expect(routed.activeReport?.replaceCalls).toBe(0);
    expect(routed.applied).toBe(false);
    expect(routed.meaningProven).toBe(false);
    expect(routed.qualityProven).toBe(false);
    expect(routed.editorial).toBe("pending");
    expect(routed.qualityDecision).toBe("needs_revision");
    const rowC = routed.activeReport?.results.find((row) => row.optionId === "C");
    expect(rowC).toMatchObject({
      action: "repair",
      defectCode: "unsupported_extension",
      evidence: "only afterward",
      before: originalC,
      after: originalC,
      kept: "original",
      proposedText: knownC,
      replacementOutcome: "not_needed",
    });
    expect(rowC?.repairSuccess).toBe(true);
    expect(quality.arms.B.options!.C).toBe(originalC);
    expect(routed.activeReport?.options.C).toBe(originalC);
    expect(routed.diagnosticEvidence).toContainEqual(draftsCEditorialFixture);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
  });

  it("stops before a live path when authorization or fixture provenance is wrong", async () => {
    const quality = loadDraftsQualityRecord();
    const provider = mockProvider(() => {
      throw new Error("should not call");
    });
    const unauth = await executeActiveRecovery(quality, {
      ...smokeActiveInput(prices),
      authorization: "not-the-token",
      provider,
    });
    expect(unauth.blocked).toBe("active_not_authorized");
    expect(unauth.providerCalls).toBe(0);

    const wrongProvenance = await executeActiveRecovery(quality, {
      ...smokeActiveInput(prices),
      injectedEvidence: [{ ...draftsCEditorialFixture, provenance: "deterministic" }],
      provider,
    });
    expect(wrongProvenance.providerCalls).toBe(0);
    expect(wrongProvenance.activeReport?.results.find((row) => row.optionId === "C")?.action).toBe("skipped");
  });

  it("re-evaluates the stored live C candidate without calling a provider and does not carry old judge second_defensible", async () => {
    const quality = loadDraftsQualityRecord();
    expect(quality.arms.B.secondAnswerOptions).toEqual([]);
    const liveC = "Most of the drafts were not taken up for the second reading, but all of them were distributed to the board afterward.";
    const provider = mockProvider(() => ({ text: JSON.stringify({ optionId: "C", text: liveC }) }));
    const replay = await executeActiveRecovery(quality, { ...smokeActiveInput(prices), provider });
    const rowC = replay.activeReport?.results.find((row) => row.optionId === "C");
    expect(provider.calls).toHaveLength(1);
    expect(rowC?.proposedText).toBe(liveC);
    expect(rowC?.after).toBe(quality.arms.B.options!.C);
    expect(rowC?.technicalFailures).toEqual([]);
    expect(rowC?.validationFailures).toEqual([]);
    expect(rowC?.repairSuccess).toBe(true);
    expect(rowC?.remainingIssues).toEqual([]);
    expect(replay.meaningProven).toBe(false);
    expect(replay.qualityProven).toBe(false);
    expect(replay.editorial).toBe("pending");
    expect(replay.qualityDecision).toBe("needs_revision");
  });

  it("replays the recorded live proposedC offline into a separate version without changing v1", async () => {
    expect(recoveryDefaultEnabled).toBe(false);
    const previous = JSON.parse(readFileSync(smokeFile, "utf8")) as {
      version: string;
      proposedC: string;
      originalC: string;
      validationFailures: string[];
      semanticSuccess: boolean;
      localRepairDecision: string;
      qualityDecision: string;
    };
    expect(previous.version).toBe("recovery-active-live-smoke-v1");
    expect(previous.validationFailures).toEqual(["second_defensible", "time_order_not_repaired"]);
    expect(previous.semanticSuccess).toBe(false);
    expect(previous.localRepairDecision).toBe("needs_revision");

    const qualityBefore = loadDraftsQualityRecord();
    const report = await replayRecordedLiveSmokeC();
    const saved = JSON.parse(readFileSync(path.resolve(".data/analysis/_factory/cognitive-trap/active-recovery-live-smoke-replay-v1/summary.json"), "utf8"));
    const qualityAfter = loadDraftsQualityRecord();

    expect(report).toEqual(saved);
    expect(saved.version).toBe(recoveryLiveSmokeReplayVersion);
    expect(saved.liveCall).toBe(false);
    expect(saved.providerCalls).toBe(0);
    expect(saved.proposedC).toBe(previous.proposedC);
    expect(saved.originalC).toBe(previous.originalC);
    expect(saved.checks.time_order_not_repaired).toBe(false);
    expect(saved.checks.second_defensible_near_copy).toBe(false);
    expect(saved.checks.second_defensible_exact_key).toBe(false);
    expect(saved.checks.second_defensible_confirmed_equivalent).toBe(false);
    expect(saved.newFailures).toEqual([]);
    expect(saved.option_repair_success).toBe(true);
    expect(saved.revalidate.option_repair_success).toBe(true);
    expect(saved.revalidate.outcome).toBe("option_repair_success");
    expect(saved.revalidate.meaningProven).toBe(false);
    expect(saved.revalidate.editorial).toBe("pending");
    expect(saved.meaningProven).toBe(false);
    expect(saved.qualityProven).toBe(false);
    expect(saved.editorial).toBe("pending");
    expect(saved.factoryQualityDecision).toBe("needs_revision");
    expect(saved.studentBankWrites).toBe(0);
    expect(saved.comparison).toMatchObject({
      previousValidationFailures: ["second_defensible", "time_order_not_repaired"],
      previousOptionRepairSuccess: false,
      replayTimeOrderNotRepaired: false,
      replaySecondDefensible: false,
      replayOptionRepairSuccess: true,
      cleared: ["second_defensible", "time_order_not_repaired"],
      stillPresent: [],
      newlyIntroduced: [],
    });
    expect(qualityAfter.arms.B.options).toEqual(qualityBefore.arms.B.options);
    expect(qualityAfter.arms.B.qualityDecision).toBe(previous.qualityDecision);
    expect(JSON.parse(readFileSync(smokeFile, "utf8")).validationFailures).toEqual(["second_defensible", "time_order_not_repaired"]);
  });
});
