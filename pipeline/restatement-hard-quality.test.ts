import { describe, expect, it } from "vitest";
import { assembleQualityAuthoring, qualityAuthoringLiveAuthorized, qualityAuthoringTrapEnabled } from "@/modules/factory/item-model/quality-authoring";
import { fourOfSixFixture } from "@/modules/factory/item-model/quality-authoring-fixtures";
import { qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import {
  computedRestatementHardStrength,
  evaluateRestatementHardQuality,
  restatementHardQualityContract,
  restatementHardQualityInScope,
  restatementHardQualityOutputDir,
  type RestatementHardDistractorRating,
} from "@/modules/factory/item-model/restatement-hard-quality";

function valid(id: string, strength: "strong" | "moderate"): RestatementHardDistractorRating {
  return {
    id,
    strength,
    natural: true,
    grammaticallyCorrect: true,
    semanticallyWrong: true,
    sourceHostedMisreading: true,
    filler: false,
    artificial: false,
    multipleIndependentShifts: false,
    secondAnswer: false,
    internalInconsistency: false,
    inventedEventOrAssumption: false,
  };
}

describe("restatement HARD quality contract", () => {
  it("stays restatement-hard-only and does not loosen production locks", () => {
    expect(restatementHardQualityInScope({ questionType: "restatement", designTarget: "hard" })).toBe(true);
    expect(restatementHardQualityInScope({ questionType: "translation", designTarget: "hard" })).toBe(false);
    expect(restatementHardQualityInScope({ questionType: "restatement", designTarget: "medium" })).toBe(false);
    expect(restatementHardQualityContract.fourStrongNotRequired).toBe(true);
    expect(restatementHardQualityContract.minStrongDistractors).toBe(2);
    expect(restatementHardQualityContract.structurallyCompleteIsNotQualityAccepted).toBe(true);
    expect(restatementHardQualityContract.editorialRevisionIsNotQualityAccepted).toBe(true);
    expect(restatementHardQualityContract.hardLabelRequiresBlindSolveAndCalibration).toBe(true);
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityFirstPilotForbiddenDirs).toContain(restatementHardQualityOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-c1-naturalness-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-blind-validation-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-source-feasibility-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-plan-to-wording-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-semantic-validity-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-semantic-acceptance-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-stage-a-planning-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-four-relation-brief-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-plan-pool-v1");
    expect(qualityFirstPilotForbiddenDirs).toContain(".data/analysis/_factory/cognitive-trap/restatement-hard-stage-0-source-key-v1");
    const assembled = assembleQualityAuthoring(fourOfSixFixture);
    expect(assembled.structurallyComplete).toBe(true);
    expect(assembled.qualityAccepted).toBe(false);
    expect(assembled.editoriallyAccepted).toBe(false);
  });

  it("accepts two strong plus two moderate valid distractors as the construction bar, not as qualityAccepted", () => {
    const report = evaluateRestatementHardQuality({
      questionType: "restatement",
      designTarget: "hard",
      structurallyComplete: true,
      keyMeaningEquivalent: true,
      singleCorrectAnswer: true,
      distractors: [valid("C1", "strong"), valid("C2", "strong"), valid("C3", "moderate"), valid("C4", "moderate")],
      humanEditorialApproved: false,
      editorialRevisionApplied: true,
      blindSolve: { ran: false },
      calibration: { ran: false },
    });
    expect(report.constructionBarMet).toBe(true);
    expect(report.strongDistractorCount).toBe(2);
    expect(report.moderateDistractorCount).toBe(2);
    expect(report.invalidDistractorCount).toBe(0);
    expect(report.qualityAccepted).toBe(false);
    expect(report.hardCalibrationStatus).toBe("not_run");
    expect(report.reasons).toEqual(
      expect.arrayContaining([
        "human_editorial_not_approved",
        "blind_solve_not_run_or_not_agreed",
        "hard_calibration_not_run",
        "editorial_revision_is_not_quality_accepted",
        "structurally_complete_is_not_quality_accepted",
      ]),
    );
  });

  it("rejects one strong, a second answer, multiple shifts, and filler even if labeled strong", () => {
    const oneStrong = evaluateRestatementHardQuality({
      questionType: "restatement",
      designTarget: "hard",
      structurallyComplete: true,
      keyMeaningEquivalent: true,
      singleCorrectAnswer: true,
      distractors: [valid("C1", "strong"), valid("C2", "moderate"), valid("C3", "moderate"), valid("C4", "moderate")],
      humanEditorialApproved: false,
      editorialRevisionApplied: false,
    });
    expect(oneStrong.constructionBarMet).toBe(false);
    expect(oneStrong.qualityAccepted).toBe(false);
    expect(oneStrong.reasons).toContain("fewer_than_two_strong");

    expect(computedRestatementHardStrength({ ...valid("C1", "strong"), secondAnswer: true })).toBe("invalid");
    expect(computedRestatementHardStrength({ ...valid("C1", "strong"), multipleIndependentShifts: true })).toBe("invalid");
    expect(computedRestatementHardStrength({ ...valid("C1", "strong"), filler: true })).toBe("invalid");
    expect(computedRestatementHardStrength({ ...valid("C1", "strong"), internalInconsistency: true })).toBe("invalid");
    expect(computedRestatementHardStrength({ ...valid("C1", "strong"), inventedEventOrAssumption: true })).toBe("invalid");
    expect(computedRestatementHardStrength({ ...valid("C1", "moderate"), natural: false, artificial: true })).toBe("invalid");

    const relabeled = evaluateRestatementHardQuality({
      questionType: "restatement",
      designTarget: "hard",
      structurallyComplete: true,
      keyMeaningEquivalent: true,
      singleCorrectAnswer: true,
      distractors: [
        { ...valid("C1", "strong"), multipleIndependentShifts: true, inventedEventOrAssumption: true },
        valid("C2", "strong"),
        valid("C3", "strong"),
        { ...valid("C4", "strong"), internalInconsistency: true, multipleIndependentShifts: true },
      ],
      humanEditorialApproved: false,
      editorialRevisionApplied: false,
    });
    expect(relabeled.invalidDistractorCount).toBe(2);
    expect(relabeled.constructionBarMet).toBe(false);
    expect(relabeled.qualityAccepted).toBe(false);
  });

  it("does not print HARD from four strong distractors without blind solve and calibration", () => {
    const fourStrong = evaluateRestatementHardQuality({
      questionType: "restatement",
      designTarget: "hard",
      structurallyComplete: true,
      keyMeaningEquivalent: true,
      singleCorrectAnswer: true,
      distractors: [valid("C1", "strong"), valid("C2", "strong"), valid("C3", "strong"), valid("C4", "strong")],
      humanEditorialApproved: true,
      editorialRevisionApplied: true,
      blindSolve: { ran: false },
      calibration: { ran: false },
    });
    expect(fourStrong.constructionBarMet).toBe(true);
    expect(fourStrong.strongDistractorCount).toBe(4);
    expect(fourStrong.hardCalibrationStatus).toBe("not_run");
    expect(fourStrong.qualityAccepted).toBe(false);
    expect(fourStrong.reasons).toContain("four_strong_is_not_hard_label");
    expect(fourStrong.reasons).toContain("editorial_revision_is_not_quality_accepted");

    const calibrated = evaluateRestatementHardQuality({
      questionType: "restatement",
      designTarget: "hard",
      structurallyComplete: true,
      keyMeaningEquivalent: true,
      singleCorrectAnswer: true,
      distractors: [valid("C1", "strong"), valid("C2", "strong"), valid("C3", "moderate"), valid("C4", "moderate")],
      humanEditorialApproved: true,
      editorialRevisionApplied: true,
      blindSolve: { ran: true, agrees: true, confidence: 0.8 },
      calibration: { ran: true, band: "hard" },
    });
    expect(calibrated.qualityAccepted).toBe(true);
    expect(calibrated.hardCalibrationStatus).toBe("hard");
    expect(calibrated.editoriallyAccepted).toBe(false);
    expect(calibrated.studentBankWrites).toBe(0);
  });

  it("leaves translation HARD outside the contract", () => {
    const report = evaluateRestatementHardQuality({
      questionType: "translation",
      designTarget: "hard",
      structurallyComplete: true,
      keyMeaningEquivalent: true,
      singleCorrectAnswer: true,
      distractors: [valid("C1", "strong"), valid("C2", "strong"), valid("C3", "strong"), valid("C4", "strong")],
      humanEditorialApproved: true,
      editorialRevisionApplied: false,
      blindSolve: { ran: true, agrees: true, confidence: 0.9 },
      calibration: { ran: true, band: "hard" },
    });
    expect(report.inScope).toBe(false);
    expect(report.constructionBarMet).toBe(false);
    expect(report.qualityAccepted).toBe(false);
    expect(report.reasons).toContain("out_of_scope_not_restatement_hard");
  });
});
