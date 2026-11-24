import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  architectureV2Authorization,
  architectureV2FrozenSourceIds,
  architectureV2LiveAuthorized,
  architectureV2OutputDir,
  architectureV2PermanentFlow,
  architectureV2RoleDefaults,
  writeArchitectureV2Plan,
} from "@/modules/factory/item-model/architecture-v2";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import {
  buildSemanticFrame,
  reportTrapPlans,
  validateDistractorPlan,
  writerTask,
  type DistractorPlan,
} from "@/modules/factory/item-model/semantic-preservation";
import {
  architectureV2RoleSettings,
  architectureV2WriterBakeoffCandidates,
  architectureV2WriterBakeoffStage2,
  modelDefaults,
} from "./ai/config";
import { loadPrices } from "./ai/prices";
import { openrouterPrecheckModels } from "./stages/item-precheck";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const gateway = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.gateway.json") });

const presentFrame = buildSemanticFrame({
  source: "If the conservators had sealed the glass plates before the humidity rose, the two earliest negatives would still have been printable.",
  questionType: "restatement",
  slots: {
    actors: { status: "present", statement: "conservators", basis: "source" },
    main_actions: { status: "present", statement: "sealed; remained printable", basis: "source" },
    quantity_scope: { status: "present", statement: "two earliest negatives", basis: "source" },
    time_order: { status: "present", statement: "before the humidity rose", basis: "source" },
    cause: { status: "absent", basis: "no cause" },
    purpose: { status: "absent", basis: "no purpose" },
    condition_counterfactual: { status: "present", statement: "unreal sealing", basis: "source" },
    negation: { status: "absent", basis: "no negation" },
    modality_epistemic: { status: "present", statement: "would still have been", basis: "source" },
    referents: { status: "present", statement: "the glass plates", basis: "source" },
  },
});

function plan(change: DistractorPlan["changeRelation"], extra: Partial<DistractorPlan> = {}): DistractorPlan {
  const preserve = (["actors", "main_actions", "quantity_scope", "time_order", "condition_counterfactual", "modality_epistemic", "referents"] as const).filter((relation) => relation !== change);
  return {
    dominantMisreading: change,
    changeRelation: change,
    preserveRelations: [...preserve],
    forbiddenAdditions: ["new actor", "new event"],
    expectedStudentMisreading: `reader changes ${change}`,
    ...extra,
  };
}

describe("question factory architecture v2", () => {
  it("designs the contract, freezes eight sources, and stays off the live path", () => {
    expect(openrouter).not.toBeNull();
    expect(gateway).not.toBeNull();
    expect(architectureV2LiveAuthorized).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(modelDefaults.generator).toBe("anthropic:claude-haiku-5-5");
    expect(modelDefaults.judge).toBe("anthropic:claude-sonnet-5-5");
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(openrouterPrecheckModels).toEqual({ generator: "openrouter:anthropic/claude-haiku-5.5", judge: "openrouter:anthropic/claude-sonnet-5.5" });
    expect(architectureV2RoleSettings).toEqual(architectureV2RoleDefaults);
    expect(architectureV2RoleDefaults.distractorWriterModel).toBe(qualityFirstFrozenModels.writer);
    expect(architectureV2RoleDefaults.blindJudgeModel).toBe(qualityFirstFrozenModels.judge);
    expect(qualityFirstPilotForbiddenDirs).toContain(architectureV2OutputDir);

    expect(validateDistractorPlan(presentFrame, plan("condition_counterfactual", { preserveRelations: ["actors"] }))).toContain("preserve_omits_required_relation");
    expect(validateDistractorPlan(presentFrame, plan("condition_counterfactual", { preserveRelations: [...plan("condition_counterfactual").preserveRelations, "condition_counterfactual"] }))).toContain("preserve_includes_changed_relation");
    expect(reportTrapPlans(presentFrame, [plan("time_order"), plan("condition_counterfactual")])).toMatchObject({
      status: "source_insufficient_traps",
      naturalTrapCount: 2,
      paddedToFour: false,
    });
    expect(reportTrapPlans(presentFrame, [plan("time_order"), plan("condition_counterfactual"), plan("quantity_scope"), plan("actors")]).status).toBe("ok");
    expect(writerTask(plan("time_order")).allowOnlyTargetedRelationChange).toBe(true);
    expect(writerTask(plan("time_order")).writerSelfEvalIsNotProof).toBe(true);

    const livePath = path.join(qualityFirstPilotOutputDir, "summary.json");
    const before = readFileSync(livePath, "utf8");
    const report = writeArchitectureV2Plan({
      openrouterPrices: openrouter!.table,
      gatewayPrices: gateway!.table,
      requestedWriters: architectureV2WriterBakeoffCandidates,
      stage2Writers: architectureV2WriterBakeoffStage2,
    });
    expect(readFileSync(livePath, "utf8")).toBe(before);
    expect(report.version).toBe(architectureV2Authorization);
    expect(report.liveAuthorized).toBe(false);
    expect(report.readyForLiveBakeOff).toBe(false);
    expect(report.providerCalls).toBe(0);
    expect(report.studentBankWrites).toBe(0);
    expect(report.meaningProven).toBe(false);
    expect(report.qualityProven).toBe(false);
    expect(report.observedDifficulty).toBeNull();
    expect(report.productionPathUnchanged).toBe(true);
    expect(report.recoveryDefault).toBe("off");
    expect(report.frozenSources).toHaveLength(8);
    expect(report.frozenSources.filter((row) => row.bucket === "restatement_condition_time_counterfactual")).toHaveLength(2);
    expect(report.frozenSources.filter((row) => row.bucket === "restatement_epistemic_negation_scope")).toHaveLength(2);
    expect(report.frozenSources.filter((row) => row.bucket === "en_tr")).toHaveLength(2);
    expect(report.frozenSources.filter((row) => row.bucket === "tr_en")).toHaveLength(2);
    expect(architectureV2FrozenSourceIds.map((row) => row.id)).toEqual(report.frozenSources.map((row) => row.id));
    expect(report.frozenSources.every((row) => row.sourceImmutable && row.keyImmutable && row.liveEditorial !== "editorially_accepted")).toBe(true);
    expect(architectureV2WriterBakeoffCandidates).not.toContain("openrouter:google/gemini-4-neon");
    expect(architectureV2WriterBakeoffStage2).toContain("openrouter:google/gemini-4-neon");
    expect(report.adapter.eligibleWriters).toEqual([...architectureV2WriterBakeoffCandidates]);
    expect(report.adapter.blockedWriters).toEqual([]);
    expect(report.adapter.noSubstitution).toBe(true);
    expect(report.adapter.hydrogen.priced).toBe(true);
    expect(report.adapter.stage2.some((probe) => probe.setting.endsWith("-neon") && probe.priced)).toBe(true);
    expect(report.adapter.probes.every((probe) => probe.substituted === false && probe.jsonSchemaHonored === "unverified")).toBe(true);
    expect(report.adapter.probes.find((probe) => probe.setting === "openrouter:anthropic/claude-haiku-5.5")?.reasoningOnWire).toBe("openrouter_exclude_true");
    expect(report.bakeoff.sharedPlanner).toBe(true);
    expect(report.bakeoff.varyWriterOnly).toBe(true);
    expect(report.bakeoff.recovery).toBe("off");
    expect(report.bakeoff.judgeDuringComparison).toBe("off");
    expect(report.bakeoff.maxCalls).toBe(40);
    expect(report.budget.bakeoffCeilingUsd).not.toBeNull();
    expect(report.budget.bakeoffCeilingUsd!).toBeGreaterThan(0.71);
    expect(report.budget.bakeoffCeilingUsd!).toBeLessThan(0.73);
    expect(report.budget.unitEconomy.argonOverHaikuPerCall).toBeGreaterThan(10);
    expect(report.budget.totalCostPerAcceptedItem).toBeNull();
    expect(report.budget.liveQualityFirstAccepted).toBe(0);
    expect(report.permanentFlow).toEqual(architectureV2PermanentFlow);
    expect(report.switchCriteria.productionModelsUnchangedUntil).toMatch(/bake-off complete/);
    expect(JSON.parse(before).metrics.firstPassYield).toBe(0.75);
    expect(() => publishToStudentBank()).toThrow(/does not write the student bank/);
    const written = JSON.parse(readFileSync(path.join(architectureV2OutputDir, "summary.json"), "utf8")) as { readyForLiveBakeOff: boolean; providerCalls: number };
    expect(written.readyForLiveBakeOff).toBe(false);
    expect(written.providerCalls).toBe(0);
  });
});
