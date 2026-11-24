import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import {
  refuseWriterBakeoffLive,
  writerBakeoffAuthorization,
  writerBakeoffLiveAuthorized,
  writerBakeoffOutputDir,
  writerBakeoffSmokeSourceId,
} from "@/modules/factory/item-model/writer-bakeoff";
import {
  assessJsonSchemaHonor,
  platesSmokeTask,
  previewOptions,
  reuseDecision,
  smokeCeilingUsd,
  smokeProtectedDirs,
  technicalSmokeSuccess,
  writerBakeoffSmokeAuthorization,
  writerBakeoffSmokeLiveAuthorized,
  writerBakeoffSmokeMaxCalls,
  writerBakeoffSmokeOutputDir,
  writerBakeoffSmokeRetry,
  writerBakeoffSmokeSpendCapUsd,
  writerBakeoffV1Fingerprint,
} from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { architectureV2WriterBakeoffCandidates, modelDefaults } from "./ai/config";
import { loadPrices } from "./ai/prices";
import { writerBakeoffOutput } from "./ai/prompts/writer-bakeoff.v1";
import { runWriterBakeoff } from "./stages/writer-bakeoff";
import { runWriterBakeoffTechnicalSmoke } from "./stages/writer-bakeoff-smoke";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

const weakFour = {
  candidates: [
    { candidateText: "The conservators sealed the plates after the humidity rose.", planId: "p1-COUNTERFACTUAL_FACTUAL", studentMisreading: "sealing happened", semanticRisk: "none" as const },
    { candidateText: "Humidity rose, then the conservators sealed the plates.", planId: "p2-TEMPORAL_ORDER", studentMisreading: "order reversed", semanticRisk: "none" as const },
    { candidateText: "The glass plates sealed the conservators before humidity rose.", planId: "p3-AGENT_ROLE", studentMisreading: "agent swap", semanticRisk: "none" as const },
    { candidateText: "Sealing happened during a later fall in humidity.", planId: "p4-TEMPORAL_SCOPE", studentMisreading: "interval shift", semanticRisk: "none" as const },
  ],
};

describe("writer bake-off technical smoke v1", () => {
  it("authorizes only the four-call plates smoke, keeps the full bake-off closed, and does not treat weak JSON as a technical failure", async () => {
    expect(writerBakeoffSmokeLiveAuthorized).toBe(true);
    expect(writerBakeoffLiveAuthorized).toBe(false);
    expect(writerBakeoffSmokeRetry).toBe(0);
    expect(writerBakeoffSmokeMaxCalls).toBe(4);
    expect(writerBakeoffSmokeSpendCapUsd).toBe(0.1);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(modelDefaults.generator).toBe("anthropic:claude-haiku-5-5");
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffSmokeOutputDir);
    expect(smokeProtectedDirs()).toContain(writerBakeoffOutputDir);
    expect(smokeProtectedDirs()).not.toContain(writerBakeoffSmokeOutputDir);

    const task = platesSmokeTask();
    expect(task.id).toBe(writerBakeoffSmokeSourceId);
    expect(task.role).toBe("scoring");
    expect(task.sourceHash).toBe("86ba6cfe14a3");
    expect(task.keyHash).toBe("1248b62dce8a");
    expect(task.frameHash).toBe("5fa1357a86ae");
    expect(task.planHash).toBe("ef5b0cfa97b5");
    expect(task.plans).toHaveLength(4);

    expect(openrouter).not.toBeNull();
    const ceiling = smokeCeilingUsd(openrouter!.table, architectureV2WriterBakeoffCandidates);
    expect(ceiling.totalUsd!).toBeGreaterThan(0.08);
    expect(ceiling.totalUsd!).toBeLessThan(0.09);
    expect(ceiling.fitsCap).toBe(true);
    expect(smokeCeilingUsd({ "openrouter:anthropic/claude-haiku-5.5": { in: 100, out: 100 } }, ["openrouter:anthropic/claude-haiku-5.5"]).fitsCap).toBe(false);

    const wrapped = `\`\`\`json\n${JSON.stringify(weakFour)}\n\`\`\``;
    expect(assessJsonSchemaHonor({ contentText: JSON.stringify(weakFour), reasoningText: "", combinedText: JSON.stringify(weakFour), planCount: 4 })).toEqual({
      schemaSent: true,
      honored: true,
      path: "content_json",
    });
    expect(assessJsonSchemaHonor({ contentText: "", reasoningText: JSON.stringify(weakFour), combinedText: JSON.stringify(weakFour), planCount: 4 }).honored).toBe(false);
    expect(assessJsonSchemaHonor({ contentText: wrapped, reasoningText: "", combinedText: wrapped, planCount: 4 }).path).toBe("salvaged_extract");
    expect(writerBakeoffOutput(4).safeParse(weakFour).success).toBe(true);
    expect(technicalSmokeSuccess({ providerCallOk: true, fourOptionTexts: true })).toBe(true);
    const preview = previewOptions({
      source: task.source,
      key: task.key,
      targetLanguage: null,
      plans: task.plans,
      candidates: weakFour.candidates,
    });
    expect(preview.writerClaimIsNotProof).toBe(true);
    expect(preview.options.every((row) => row.writerSemanticRisk === "none" && (row.singleDominantMutation === "fail" || row.singleDominantMutation === "unverified"))).toBe(true);
    expect(reuseDecision({
      raw: weakFour,
      planCount: 4,
      source: task.source,
      key: task.key,
      targetLanguage: null,
      expectedPlanIds: task.plans.map((plan) => plan.planId),
      technicalSuccess: true,
    }).weakOptionsDoNotFailTechnicalSmoke).toBe(true);

    const before = writerBakeoffV1Fingerprint();
    const livePath = path.join(qualityFirstPilotOutputDir, "summary.json");
    const qualityBefore = readFileSync(livePath, "utf8");
    expect((await runWriterBakeoffTechnicalSmoke("nope")).started).toBe(false);
    expect((await runWriterBakeoffTechnicalSmoke("nope")).providerCalls).toBe(0);
    const blocked = await runWriterBakeoffTechnicalSmoke(writerBakeoffSmokeAuthorization, writerBakeoffOutputDir);
    expect("reason" in blocked ? blocked.reason : "").toMatch(/overwrite/);
    expect((await runWriterBakeoffTechnicalSmoke(writerBakeoffSmokeAuthorization, qualityFirstPilotForbiddenDirs[2])).started).toBe(false);
    expect(writerBakeoffV1Fingerprint()).toBe(before);
    expect(readFileSync(livePath, "utf8")).toBe(qualityBefore);
    expect(() => publishToStudentBank()).toThrow(/does not write the student bank/);
    const closed = await runWriterBakeoff(writerBakeoffAuthorization);
    expect(closed.started).toBe(false);
    expect(closed.executed).toBe(false);
    expect(refuseWriterBakeoffLive(writerBakeoffAuthorization).reason).toBe("live bake-off is closed");
  });
});
