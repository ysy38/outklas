import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import {
  challengeCeilingUsd,
  factoryV6WriterChallengeAuthorization,
  factoryV6WriterChallengeLiveAuthorized,
  factoryV6WriterChallengeMaxCalls,
  factoryV6WriterChallengeModels,
  factoryV6WriterChallengeOutputDir,
  factoryV6WriterChallengeSpendCapUsd,
  frozenHashesUnchanged,
  parseOpenRouterCatalog,
  refuseFactoryV6WriterChallenge,
} from "@/modules/factory/item-model/factory-v6-writer-challenge";
import { runFactoryV6WriterChallenge } from "./stages/factory-v6-writer-challenge";
import { loadPrices } from "./ai/prices";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

const catalogFixture = {
  data: [
    {
      id: "tencent/hy4",
      name: "Tencent: Hy4",
      pricing: { prompt: "0.000000417", completion: "0.0000012505", input_cache_read: "0.000000021" },
      supported_parameters: ["response_format", "structured_outputs", "reasoning", "max_tokens", "reasoning_effort"],
    },
    {
      id: "deepseek/deepseek-v4.1-flash-1017",
      name: "DeepSeek: DeepSeek V4.1 Flash 1017",
      pricing: { prompt: "0.000000036", completion: "0.0000005", input_cache_read: "0.00000001" },
      supported_parameters: ["response_format", "structured_outputs", "reasoning", "max_tokens", "reasoning_effort"],
    },
  ],
};

describe("factory v6 writer model challenge v1", () => {
  it("passes catalog/adapter pre-flight guardrails without recalling Haiku", async () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(factoryV6WriterChallengeLiveAuthorized).toBe(true);
    expect(factoryV6WriterChallengeMaxCalls).toBe(6);
    expect(factoryV6WriterChallengeSpendCapUsd).toBe(0.05);
    expect([...factoryV6WriterChallengeModels]).toEqual([
      "openrouter:deepseek/deepseek-v4.1-flash-1017",
      "openrouter:tencent/hy4",
    ]);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(factoryV6WriterChallengeOutputDir);

    const catalog = parseOpenRouterCatalog(catalogFixture);
    expect(catalog.every((row) => row.present && row.adapterCompatible && row.substituted === false)).toBe(true);
    expect(openrouter).not.toBeNull();
    const ceiling = challengeCeilingUsd({ catalog, localPrices: openrouter!.table });
    expect(ceiling.sixCallUsd).not.toBeNull();
    expect(ceiling.sixCallUsd!).toBeLessThanOrEqual(0.05);
    expect(ceiling.fitsCap).toBe(true);
    expect(frozenHashesUnchanged().ok).toBe(true);

    const v1Before = writerBakeoffV1Fingerprint();
    const compareBefore = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const qualityBefore = qualityFirstPilotFingerprint();
    const freezeBefore = readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8");

    const blocked = await runFactoryV6WriterChallenge("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runFactoryV6WriterChallenge(factoryV6WriterChallengeAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(refuseFactoryV6WriterChallenge("x", "y").providerCalls).toBe(0);

    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compareBefore);
    expect(qualityFirstPilotFingerprint()).toBe(qualityBefore);
    expect(readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8")).toBe(freezeBefore);
    if (existsSync(path.join(factoryV6WriterChallengeOutputDir, "summary.json"))) {
      const summary = JSON.parse(readFileSync(path.join(factoryV6WriterChallengeOutputDir, "summary.json"), "utf8")) as { executed?: boolean; providerCalls?: number };
      expect(summary.executed).toBe(true);
      expect(summary.providerCalls).toBe(6);
    }
  });
});
