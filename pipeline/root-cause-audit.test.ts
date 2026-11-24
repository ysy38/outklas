import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { architectureV2RoleDefaults } from "@/modules/factory/item-model/architecture-v2";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import {
  architectureV2SourceContainsGemini4ModelId,
  refuseRootCauseAuditLive,
  rootCauseAuditLiveAuthorized,
  rootCauseAuditOutputDir,
  writerBakeoffEditorialFingerprint,
  writeRootCauseAudit,
} from "@/modules/factory/item-model/root-cause-audit";
import { writerBakeoffAuthorization, writerBakeoffLiveAuthorized, writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffEditorialOutputDir } from "@/modules/factory/item-model/writer-bakeoff-editorial";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffSmokeOutputDir, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { modelDefaults } from "./ai/config";
import { loadPrices } from "./ai/prices";
import { runWriterBakeoff } from "./stages/writer-bakeoff";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

describe("cognitive trap root-cause audit v1", () => {
  it("writes an offline pack, keeps frozen fingerprints, and does not declare a winner", async () => {
    expect(openrouter).not.toBeNull();
    expect(rootCauseAuditLiveAuthorized).toBe(false);
    expect(writerBakeoffLiveAuthorized).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(modelDefaults.generator).toBe("anthropic:claude-haiku-5-5");
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(architectureV2RoleDefaults.distractorWriterModel).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(architectureV2RoleDefaults.blindJudgeModel).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(rootCauseAuditOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffSmokeOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffCompareOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffEditorialOutputDir);

    const v1Before = writerBakeoffV1Fingerprint();
    const smokeBefore = fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]);
    const compareBefore = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const editorialBefore = writerBakeoffEditorialFingerprint();
    const qualityBefore = qualityFirstPilotFingerprint();
    const freezeBefore = readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8");
    const qualitySummaryBefore = readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8");

    const report = writeRootCauseAudit({ openrouterPrices: openrouter!.table });
    expect(report.version).toBe("cognitive-trap-root-cause-audit-v1");
    expect(report.providerCalls).toBe(0);
    expect(report.liveAuthorized).toBe(false);
    expect(report.winnerDeclared).toBe(false);
    expect(report.humanEditorial).toBe("pending");
    expect(report.meaningProven).toBe(false);
    expect(report.qualityProven).toBe(false);
    expect(report.observedDifficulty).toBeNull();
    expect(report.editorialAcceptance).toBe(false);
    expect(report.plansEditoriallyVerified).toBe(false);
    expect(report.recoveryDefault).toBe("off");
    expect(report.productionWriterUnchanged).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(report.productionJudgeUnchanged).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(report.feasibility).toHaveLength(24);
    expect(report.feasibilityCounts).toEqual({ feasible: 16, questionable: 7, infeasible: 1 });
    expect(report.agreesWithEditorialV1).toBe(true);
    expect(report.feasibility.every((row) => row.humanEditorial === "pending" && row.frozenUnchanged && row.automaticClassificationIsNotSemanticProof)).toBe(true);
    expect(report.feasibility.find((row) => row.sourceId.endsWith("counterfactual") && row.planId === "p3-AGENT_ROLE")).toMatchObject({
      feasibility: "infeasible",
      impossibleWithoutBreakingOntology: true,
    });
    expect(report.matrix).toHaveLength(6);
    expect(report.matrix.every((row) => row.writerPrompt.rulesReachWriter)).toBe(true);
    expect(report.defects.map((row) => row.id)).toEqual([
      "plates_artificial_agent_role",
      "referees_deepseek_near_key",
      "faculty_purpose_cause",
      "registry_absence_vs_proof_of_absence",
      "board_condition_direction",
      "hydrogen_empty_response_reasoning_consumption",
    ]);
    expect(report.catalog.generateCalls).toBe(0);
    expect(report.catalog.addedToProductionConfig).toBe(false);
    expect(report.catalog.architectureV2ContainsGemini4ModelId).toBe(false);
    expect(report.catalog.catalogStructuredOutputsIsNotHonor).toBe(true);
    expect(report.catalog.candidates["tencent/hy4"].jsonSchemaHonor).toBe("unverified");
    expect(report.catalog.candidates["deepseek/deepseek-v4.1-flash-1017"].jsonSchemaHonor).toBe("unverified");
    expect(report.experiment.runThisRound).toBe(false);
    expect(report.experiment.winnerDeclared).toBe(false);
    expect(report.experiment.smallLiveBudget.proposedCapUsd).toBeLessThan(0.62);
    expect(report.approaches.B.rows?.every((row) => row.editorially_verified === false && row.status === "proposed_unreviewed")).toBe(true);
    expect(report.approaches.D.rows?.every((row) => row.editorially_verified === false && row.status === "proposed_unreviewed")).toBe(true);

    const proposedB = JSON.parse(readFileSync(path.join(rootCauseAuditOutputDir, "proposed-plans-b.json"), "utf8")) as {
      editorially_verified: boolean;
      status: string;
      rows: { sourceHash: string; keyHash: string; paddedToFour: boolean }[];
    };
    const proposedD = JSON.parse(readFileSync(path.join(rootCauseAuditOutputDir, "proposed-plans-d.json"), "utf8")) as {
      editorially_verified: boolean;
      status: string;
    };
    expect(proposedB.editorially_verified).toBe(false);
    expect(proposedB.status).toBe("proposed_unreviewed");
    expect(proposedD.editorially_verified).toBe(false);
    expect(proposedD.status).toBe("proposed_unreviewed");
    expect(proposedB.rows.every((row) => row.paddedToFour === false)).toBe(true);

    const architectureSrc = readFileSync(path.resolve("src/modules/factory/item-model/architecture-v2.ts"), "utf8");
    expect(architectureV2SourceContainsGemini4ModelId(architectureSrc)).toBe(false);
    expect(architectureSrc).not.toMatch(/tencent\/hy4|deepseek-v4\.1-flash-1017/);

    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"])).toBe(smokeBefore);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compareBefore);
    expect(writerBakeoffEditorialFingerprint()).toBe(editorialBefore);
    expect(qualityFirstPilotFingerprint()).toBe(qualityBefore);
    expect(readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8")).toBe(freezeBefore);
    expect(readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8")).toBe(qualitySummaryBefore);
    expect(report.recordsImmutable).toEqual({
      writerBakeoffV1Unchanged: true,
      platesSmokeUnchanged: true,
      compareUnchanged: true,
      editorialUnchanged: true,
      qualityFirstUnchanged: true,
    });
    expect(report.forbiddenDirsIncludeOutput).toBe(true);

    expect(refuseRootCauseAuditLive().providerCalls).toBe(0);
    expect((await runWriterBakeoff(writerBakeoffAuthorization)).started).toBe(false);
    expect(() => publishToStudentBank()).toThrow(/does not write the student bank/);
  });
});
