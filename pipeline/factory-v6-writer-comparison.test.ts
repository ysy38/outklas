import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { scoringSourceAliases } from "@/modules/factory/item-model/root-cause-audit";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import {
  comparisonCeilingUsd,
  comparisonLiveJobs,
  comparisonProtectedDirs,
  factoryV6WriterComparisonAuthorization,
  factoryV6WriterComparisonLiveAuthorized,
  factoryV6WriterComparisonMaxCalls,
  factoryV6WriterComparisonOutputDir,
  factoryV6WriterComparisonSpendCapUsd,
  highReasoningChallengeArchive,
  missingComparisonJobs,
  parseOpenRouterCatalog,
  reusedComparisonCells,
} from "@/modules/factory/item-model/factory-v6-writer-comparison";
import { factoryV6WriterChallengeOutputDir } from "@/modules/factory/item-model/factory-v6-writer-challenge";
import { runFactoryV6WriterComparison } from "./stages/factory-v6-writer-comparison";
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

describe("factory v6 writer comparison completion", () => {
  it("reuses five cells, names four missing calls, and refuses unauthorized live", async () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(factoryV6WriterComparisonLiveAuthorized).toBe(true);
    expect(factoryV6WriterComparisonMaxCalls).toBe(4);
    expect(factoryV6WriterComparisonSpendCapUsd).toBe(0.03);
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(factoryV6WriterComparisonOutputDir);
    expect(comparisonProtectedDirs()).toContain(factoryV6WriterChallengeOutputDir);
    expect(highReasoningChallengeArchive.mergedIntoNoneComparison).toBe(false);

    const reused = reusedComparisonCells();
    expect(reused).toHaveLength(5);
    expect(reused.filter((cell) => cell.writer === "openrouter:anthropic/claude-haiku-5.5").map((cell) => cell.sourceId)).toEqual([
      scoringSourceAliases.embargo,
      scoringSourceAliases.faculty,
      scoringSourceAliases.board,
    ]);
    expect(reused.filter((cell) => cell.origin === "reasoning-root-cause-effort-none").map((cell) => `${cell.writer}::${cell.sourceId}`)).toEqual([
      `openrouter:tencent/hy4::${scoringSourceAliases.faculty}`,
      `openrouter:deepseek/deepseek-v4.1-flash-1017::${scoringSourceAliases.faculty}`,
    ]);
    expect(missingComparisonJobs()).toEqual([...comparisonLiveJobs]);

    expect(openrouter).not.toBeNull();
    const catalog = parseOpenRouterCatalog(catalogFixture);
    const ceiling = comparisonCeilingUsd({ catalog, localPrices: openrouter!.table });
    expect(ceiling.fourCallUsd).toBeLessThanOrEqual(0.03);
    expect(ceiling.fitsCap).toBe(true);
    expect(ceiling.perCall).toHaveLength(4);

    const v1Before = writerBakeoffV1Fingerprint();
    const compareBefore = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const qualityBefore = qualityFirstPilotFingerprint();
    const freezeBefore = readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8");

    const blocked = await runFactoryV6WriterComparison("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runFactoryV6WriterComparison(factoryV6WriterComparisonAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);

    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compareBefore);
    expect(qualityFirstPilotFingerprint()).toBe(qualityBefore);
    expect(readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8")).toBe(freezeBefore);

    if (existsSync(path.join(factoryV6WriterComparisonOutputDir, "summary.json"))) {
      const summary = JSON.parse(readFileSync(path.join(factoryV6WriterComparisonOutputDir, "summary.json"), "utf8")) as {
        executed?: boolean;
        providerCalls?: number;
        winnerDeclared?: boolean;
      };
      if (summary.executed) {
        expect(summary.providerCalls).toBe(4);
        expect(summary.winnerDeclared).toBe(false);
      }
    }
  });
});
