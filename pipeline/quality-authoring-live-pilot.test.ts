import path from "node:path";
import { describe, expect, it } from "vitest";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { qualityAuthoringLiveAuthorized, qualityAuthoringModels } from "@/modules/factory/item-model/quality-authoring";
import {
  qualityAuthoringCodesignAuthorization,
  qualityAuthoringCodesignCeiling,
  qualityAuthoringCodesignMaxCalls,
  qualityAuthoringCodesignOutputDir,
  qualityAuthoringCodesignSpendCapUsd,
  qualityAuthoringCodesignTask,
  qualityAuthoringKnownDefects,
  qualityAuthoringLivePilotAuthorization,
  qualityAuthoringLivePilotCeiling,
  qualityAuthoringLivePilotJudgeCalls,
  qualityAuthoringLivePilotLiveAuthorized,
  qualityAuthoringLivePilotMaxCalls,
  qualityAuthoringLivePilotOutputDir,
  qualityAuthoringLivePilotProtectedDirs,
  qualityAuthoringLivePilotRetry,
  qualityAuthoringLivePilotSpendCapUsd,
  qualityAuthoringLivePilotTasks,
  qualityAuthoringLivePilotWriter,
  qualityAuthoringGenerationExperimentAuthorization,
  qualityAuthoringGenerationExperimentCeiling,
  qualityAuthoringGenerationExperimentMaxCalls,
  qualityAuthoringGenerationExperimentOutputDir,
  qualityAuthoringGenerationExperimentSpendCapUsd,
  qualityAuthoringGenerationExperimentTask,
  generationExperimentBriefAvoidsFrozenPhrases,
  restatementHardBenchmark5Authorization,
  restatementHardBenchmark5BriefsAvoidFrozen,
  restatementHardBenchmark5Ceiling,
  restatementHardBenchmark5MaxCalls,
  restatementHardBenchmark5OutputDir,
  restatementHardBenchmark5SpendCapUsd,
  restatementHardBenchmark5Tasks,
  seedsAvoidFrozenBenchmarks,
} from "@/modules/factory/item-model/quality-authoring-live-pilot";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { qualityAuthoringSystem, qualityAuthoringUser } from "./ai/prompts/quality-authoring.v1";
import { loadPrices } from "./ai/prices";
import { runQualityAuthoringCodesignRestatement, runQualityAuthoringGenerationExperiment, runQualityAuthoringLivePilot, runRestatementHardBenchmark5 } from "./stages/quality-authoring-live-pilot";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

describe("quality authoring live pilot v1", () => {
  it("estimates under the cap, keeps production locks, and refuses unauthorized runs", async () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityAuthoringLivePilotLiveAuthorized).toBe(true);
    expect(qualityAuthoringLivePilotRetry).toBe(0);
    expect(qualityAuthoringLivePilotMaxCalls).toBe(3);
    expect(qualityAuthoringLivePilotJudgeCalls).toBe(0);
    expect(qualityAuthoringLivePilotSpendCapUsd).toBe(0.02);
    expect(qualityAuthoringLivePilotWriter).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityAuthoringModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(qualityAuthoringLivePilotOutputDir);
    expect(qualityAuthoringLivePilotProtectedDirs()).toContain(writerBakeoffCompareOutputDir);
    expect(qualityAuthoringLivePilotProtectedDirs()).not.toContain(qualityAuthoringLivePilotOutputDir);
    expect(seedsAvoidFrozenBenchmarks().ok).toBe(true);
    expect(qualityAuthoringLivePilotTasks.map((task) => task.questionType)).toEqual(["restatement", "translation", "translation"]);
    expect(qualityAuthoringLivePilotTasks.map((task) => task.direction)).toEqual(["none", "en_tr", "tr_en"]);

    expect(openrouter).not.toBeNull();
    const ceiling = qualityAuthoringLivePilotCeiling(openrouter!.table);
    expect(ceiling.perCallUsd).not.toBeNull();
    expect(ceiling.threeCallUsd).not.toBeNull();
    expect(ceiling.fitsCap).toBe(true);
    expect(ceiling.threeCallUsd!).toBeLessThanOrEqual(0.02);

    const blocked = await runQualityAuthoringLivePilot("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    expect(blocked.judgeCalls).toBe(0);
    expect(blocked.studentBankWrites).toBe(0);

    const overwrite = await runQualityAuthoringLivePilot(qualityAuthoringLivePilotAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(overwrite.providerCalls).toBe(0);
  });

  it("uses a situation brief, one-call ceiling under $0.005, and refuses unauthorized codesign", async () => {
    const user = qualityAuthoringUser({
      questionType: "restatement",
      direction: "none",
      situationBrief: qualityAuthoringCodesignTask.situationBrief,
    });
    expect(user).toMatch(/Situation brief/);
    expect(user).not.toMatch(/Academic seed/);
    expect(qualityAuthoringCodesignTask.situationBrief).not.toMatch(/delayed the dredging contract/);
    expect(qualityAuthoringCodesignTask.situationBrief).not.toMatch(/ice-core laboratory/);
    expect(qualityAuthoringCodesignTask.situationBrief).not.toMatch(/contested appendices/);
    expect(qualityAuthoringCodesignMaxCalls).toBe(1);
    expect(qualityAuthoringCodesignSpendCapUsd).toBe(0.005);
    expect(qualityFirstPilotForbiddenDirs).toContain(qualityAuthoringCodesignOutputDir);
    expect(qualityAuthoringKnownDefects.map((row) => row.id)).toEqual([
      "en_tr_could_not_possibility_token",
      "tr_en_already_not_yet_near_copy",
    ]);
    const ceiling = qualityAuthoringCodesignCeiling(openrouter!.table);
    expect(ceiling.fitsCap).toBe(true);
    expect(ceiling.oneCallUsd!).toBeLessThanOrEqual(0.005);
    const blocked = await runQualityAuthoringCodesignRestatement("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runQualityAuthoringCodesignRestatement(qualityAuthoringCodesignAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(overwrite.providerCalls).toBe(0);
  });

  it("design-then-write prompt, one-call generation experiment ceiling, and refuses unauthorized generate", async () => {
    expect(qualityAuthoringSystem).toMatch(/STAGE A — ITEM DESIGN/);
    expect(qualityAuthoringSystem).toMatch(/STAGE B — DISTRACTOR WRITING/);
    expect(qualityAuthoringSystem).toMatch(/source_insufficient_quality_opportunities/);
    expect(qualityAuthoringSystem).not.toMatch(/exactly six/);
    expect(qualityAuthoringSystem).not.toMatch(/lexical or grammar traps/);
    expect(qualityAuthoringGenerationExperimentMaxCalls).toBe(1);
    expect(qualityAuthoringGenerationExperimentSpendCapUsd).toBe(0.005);
    expect(qualityAuthoringGenerationExperimentTask.questionType).toBe("restatement");
    expect(generationExperimentBriefAvoidsFrozenPhrases().ok).toBe(true);
    expect(qualityAuthoringGenerationExperimentTask.situationBrief).not.toMatch(/delayed the dredging contract/);
    expect(qualityAuthoringGenerationExperimentTask.situationBrief).not.toMatch(/ice-core laboratory/);
    expect(qualityAuthoringGenerationExperimentTask.situationBrief).not.toMatch(/north-shaft/);
    expect(qualityAuthoringGenerationExperimentTask.situationBrief).not.toMatch(/contested appendices/);
    expect(qualityFirstPilotForbiddenDirs).toContain(qualityAuthoringGenerationExperimentOutputDir);
    const ceiling = qualityAuthoringGenerationExperimentCeiling(openrouter!.table);
    expect(ceiling.fitsCap).toBe(true);
    expect(ceiling.oneCallUsd!).toBeLessThanOrEqual(0.005);
    const blocked = await runQualityAuthoringGenerationExperiment("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runQualityAuthoringGenerationExperiment(qualityAuthoringGenerationExperimentAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(overwrite.providerCalls).toBe(0);
  });

  it("restatement HARD 5-brief ceiling fits $0.02 and refuses unauthorized generate", async () => {
    expect(restatementHardBenchmark5MaxCalls).toBe(5);
    expect(restatementHardBenchmark5SpendCapUsd).toBe(0.02);
    expect(restatementHardBenchmark5Tasks).toHaveLength(5);
    expect(restatementHardBenchmark5Tasks.every((task) => task.questionType === "restatement")).toBe(true);
    expect(restatementHardBenchmark5Tasks.map((task) => task.id).join(" ")).not.toMatch(/delta-survey|dredging|north-shaft/);
    expect(restatementHardBenchmark5BriefsAvoidFrozen().ok).toBe(true);
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardBenchmark5OutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-source-feasibility-v1");
    const ceiling = restatementHardBenchmark5Ceiling(openrouter!.table);
    expect(ceiling.fitsCap).toBe(true);
    expect(ceiling.fiveCallUsd!).toBeLessThanOrEqual(0.02);
    const blocked = await runRestatementHardBenchmark5("nope");
    expect(blocked.started).toBe(false);
    expect(blocked.providerCalls).toBe(0);
    const overwrite = await runRestatementHardBenchmark5(restatementHardBenchmark5Authorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);
    expect(overwrite.providerCalls).toBe(0);
  });
});
