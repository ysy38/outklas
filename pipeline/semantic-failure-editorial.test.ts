import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import {
  classifyOptionLegacy,
  flashEmbargoOptions,
  flashEmbargoRootCause,
  semanticFailureEditorialOutputDir,
  verifyFlashEmbargoSemanticGate,
  verifyValidDistractorsNotRejected,
  writeSemanticFailureEditorial,
} from "@/modules/factory/item-model/semantic-failure-editorial";
import { classifyOption, shownDifference } from "@/modules/factory/item-model/whole-set";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { auditChallengeOption } from "@/modules/factory/item-model/factory-v6-writer-challenge";
import { buildV6PilotTask } from "@/modules/factory/item-model/factory-v6-live-pilot";
import { scoringSourceAliases } from "@/modules/factory/item-model/root-cause-audit";

const source =
  "Had the editors completed the citation check before the embargo, only the two contested appendices would have been released to the preprint server.";
const key =
  "Only the two contested appendices would have been released to the preprint server if the editors had finished checking the citations ahead of the embargo.";

describe("semantic failure root cause and editorial decision v1", () => {
  it("catches Flash embargo near-copies without calling them a shown mutation", () => {
    expect(classifyOption(source, key, flashEmbargoOptions.COUNTERFACTUAL_FACTUAL).relation).toBe("confirmed_equivalent");
    expect(classifyOption(source, key, flashEmbargoOptions.COUNTERFACTUAL_FACTUAL).evidence).toBe("near_copy_sequence");
    expect(classifyOption(source, key, flashEmbargoOptions.TEMPORAL_ORDER).relation).toBe("confirmed_equivalent");
    expect(classifyOption(source, key, flashEmbargoOptions.QUANTITY_SCOPE).relation).toBe("unresolved");
    expect(classifyOption(source, key, flashEmbargoOptions.CONDITION_DIRECTION).relation).toBe("unresolved");

    const haikuCondition =
      "Had only the two contested appendices been released to the preprint server, the editors would have completed the citation check before the embargo.";
    expect(classifyOption(source, key, haikuCondition).relation).not.toBe("confirmed_equivalent");
    expect(shownDifference(source, "Had the editors completed the citation check after the embargo, only the two contested appendices would have been released to the preprint server.")).toBe(
      "before_to_after",
    );
    expect(
      shownDifference(
        source,
        "The editors completed the citation check before the embargo, and only the two contested appendices were released to the preprint server.",
      ),
    ).toBe("counterfactual_to_factual");
    expect(
      shownDifference(source, "Had the editors completed the citation check before the embargo, at least the two contested appendices would have been released to the preprint server."),
    ).toBe("only_to_at_least");

    const task = buildV6PilotTask(scoringSourceAliases.embargo);
    const quantityPlan = task.plans.find((plan) => plan.mechanismId === "QUANTITY_SCOPE")!;
    const quantityAudit = auditChallengeOption({
      writer: "openrouter:deepseek/deepseek-v4.1-flash-1017",
      task,
      plan: quantityPlan,
      candidate: {
        candidateText: flashEmbargoOptions.QUANTITY_SCOPE,
        planId: quantityPlan.planId,
        studentMisreading: "x",
        semanticRisk: "none",
      },
    });
    expect(quantityAudit.targetedChange).toBe("fail");
    expect(quantityAudit.notes).toContain("embargo_quantity_not_applied");

    const cause = flashEmbargoRootCause();
    expect(cause.rows).toHaveLength(4);
    expect(cause.notANewValidator).toBe(true);

    expect(classifyOptionLegacy(source, key, flashEmbargoOptions.COUNTERFACTUAL_FACTUAL).relation).toBe("unresolved");
    expect(classifyOptionLegacy(source, key, flashEmbargoOptions.TEMPORAL_ORDER).relation).toBe("unresolved");
    expect(classifyOptionLegacy(source, key, flashEmbargoOptions.CONDITION_DIRECTION).relation).toBe("unresolved");
    expect(classifyOptionLegacy(source, key, flashEmbargoOptions.QUANTITY_SCOPE).relation).toBe("unresolved");

    const gate = verifyFlashEmbargoSemanticGate();
    expect(gate.wholeSet.oldDecision).toBe("review");
    expect(gate.wholeSet.newDecision).toBe("fail");
    expect(gate.wholeSet.falseNegativeFixed).toBe(true);
    expect(gate.remainingUnverified).toEqual(["CONDITION_DIRECTION", "QUANTITY_SCOPE"]);
    expect(gate.rows.find((row) => row.planId === "COUNTERFACTUAL_FACTUAL")?.concreteFalseNegativeFixed).toBe(true);
    expect(gate.rows.find((row) => row.planId === "TEMPORAL_ORDER")?.concreteFalseNegativeFixed).toBe(true);
    expect(gate.rows.find((row) => row.planId === "CONDITION_DIRECTION")?.concreteFalseNegativeFixed).toBe(false);
    const boardKey =
      "Only the two disputed tables would have gone to the external reviewers if the board had read the draft before it entered the archive.";
    const boardQuantityDrop =
      "The disputed tables would have gone to the external reviewers if the board had read the draft before it entered the archive.";
    expect(classifyOption(source, key, flashEmbargoOptions.COUNTERFACTUAL_FACTUAL).relation).toBe("confirmed_equivalent");
    expect(classifyOption(boardKey, boardKey, boardQuantityDrop).relation).not.toBe("confirmed_equivalent");
    const facultyKey =
      "Fakülte, geçen yılki rakamları aynı kadronun hazırlamış olması nedeniyle, bölümün kendi donanımını değerlememesi için dışarıdan bir denetçi tuttu.";
    const facultyPurposeResult =
      "Fakülte, geçen yılki rakamları aynı kadronun hazırlamış olması nedeniyle, bölüm kendi donanımını değerlemediği için dışarıdan bir denetçi tuttu.";
    expect(classifyOption(facultyKey, facultyKey, facultyPurposeResult).relation).not.toBe("confirmed_equivalent");

    const rejected = verifyValidDistractorsNotRejected();
    expect(rejected.appliedMutationMarkedEquivalent).toEqual([]);
    expect(rejected.validDistractorsWronglyRejected).toBe(false);
    expect(rejected.haikuEmbargoWholeSetDecision).toBe("review");
  });

  it("writes nine blind A-E sets and keeps production defaults", () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstPilotForbiddenDirs).toContain(semanticFailureEditorialOutputDir);

    const v1Before = writerBakeoffV1Fingerprint();
    const compareBefore = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const qualityBefore = qualityFirstPilotFingerprint();
    const freezeBefore = readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8");

    const report = writeSemanticFailureEditorial();
    expect(report.liveGenerate).toBe(0);
    expect(report.blind.setCount).toBe(9);
    expect(report.blind.modelNameHidden).toBe(true);
    expect(report.winnerDeclared).toBe(false);
    expect(report.technicalCompletionIsNotEditorialAcceptance).toBe(true);
    expect(report.decisionTable.every((row) => row.editorialAcceptance === "pending")).toBe(true);
    expect(report.scorecards.every((row) => row.editorialAcceptance === "pending")).toBe(true);
    expect(JSON.stringify(report.blind.forms)).not.toMatch(/claude-haiku|deepseek|tencent\/hy4|openrouter:/i);
    expect(report.facultyNegationAndBoardQuantityPlans.facultyNegation?.feasibility).toBe("strained");
    expect(report.facultyNegationAndBoardQuantityPlans.boardQuantity?.feasibility).toBe("strained");
    expect(report.blind.completeSetCount).toBe(9);
    expect(report.validDistractorCheck.validDistractorsWronglyRejected).toBe(false);
    expect(report.flashEmbargoGateVerification.wholeSet.falseNegativeFixed).toBe(true);
    expect(report.decisionReport.answers.q7_enoughEvidenceToChangeProductionWriter.answer).toBe(false);
    expect(report.decisionReport.editorialAcceptance).toBe("pending");
    expect(report.namedDefects.find((row) => row.id === "faculty_negation_plan")?.origin).toBe("planner_origin");
    expect(report.namedDefects.find((row) => row.id === "flash_embargo_mutations_not_applied")?.origin).toBe("writer_execution");
    const sample = report.blind.forms[0]!.optionRatings!.B;
    expect(sample.decision).toBeNull();
    expect(sample.targetSemanticChangeApplied).toBeNull();
    expect(sample.humanEditorial).toBe("pending");
    expect(JSON.stringify(report.blind.forms)).not.toMatch(/analyst-notes/);

    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compareBefore);
    expect(qualityFirstPilotFingerprint()).toBe(qualityBefore);
    expect(readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8")).toBe(freezeBefore);
  });
});
