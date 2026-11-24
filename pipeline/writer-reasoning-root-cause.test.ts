import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import {
  assessOfflineWriterReasoningRootCause,
  documentedRootCause,
  productionAdapterPayload,
  technicalSuccess,
  visibleOutputTokens,
  writerReasoningRootCauseAuthorization,
  writerReasoningRootCauseLiveAuthorized,
  writerReasoningRootCauseMaxCalls,
  writerReasoningRootCauseOutputDir,
  writerReasoningRootCauseSpendCapUsd,
} from "@/modules/factory/item-model/writer-reasoning-root-cause";
import { runWriterReasoningRootCause } from "./stages/writer-reasoning-root-cause";
import { loadPrices } from "./ai/prices";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

describe("writer reasoning configuration root cause v1", () => {
  it("documents exclude-vs-disable offline and refuses unauthorized live", async () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(writerReasoningRootCauseLiveAuthorized).toBe(true);
    expect(writerReasoningRootCauseMaxCalls).toBe(2);
    expect(writerReasoningRootCauseSpendCapUsd).toBe(0.03);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(writerReasoningRootCauseOutputDir);
    expect(productionAdapterPayload.reasoning).toEqual({ exclude: true });
    expect(documentedRootCause.excludeHidesNotDisables).toMatch(/still uses reasoning/);

    expect(openrouter).not.toBeNull();
    const offline = assessOfflineWriterReasoningRootCause(openrouter!.table);
    expect(offline.liveReady).toBe(true);
    expect(offline.hashes.ok).toBe(true);
    expect(offline.ceiling.fitsCap).toBe(true);
    expect(offline.matrix.every((row) => row.reasoningDisableDocumented === "reasoning.effort=none")).toBe(true);
    expect(offline.matrix.every((row) => row.reasoningBudgetDocumented === "not_documented")).toBe(true);
    expect(offline.matrix.every((row) => row.adapterExcludeWouldStillReason)).toBe(true);
    expect(visibleOutputTokens({ outputTokens: 4096, reasoningTokens: 4096 })).toBe(0);
    expect(technicalSuccess({ providerCallOk: true, jsonHonored: true, optionCount: 4 })).toBe(true);
    expect(technicalSuccess({ providerCallOk: true, jsonHonored: false, optionCount: 0 })).toBe(false);

    const v1Before = writerBakeoffV1Fingerprint();
    const compareBefore = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const qualityBefore = qualityFirstPilotFingerprint();
    const freezeBefore = readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8");

    const blocked = await runWriterReasoningRootCause("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runWriterReasoningRootCause(writerReasoningRootCauseAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);

    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compareBefore);
    expect(qualityFirstPilotFingerprint()).toBe(qualityBefore);
    expect(readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8")).toBe(freezeBefore);
  });
});
