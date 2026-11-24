import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { frameForFrozenItem } from "@/modules/factory/item-model/architecture-v2";
import { sourceSentence } from "@/modules/factory/item-model/cognitive-trap";
import { qualityFirstFrozenModels, qualityFirstItems, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import {
  agentRoleInfeasible,
  attachPreserveV1,
  factoryRootCauseFixEnabled,
  factoryRootCauseFixVersion,
  fillSemanticSlots,
  frameFromSource,
  independentGroundedMechanisms,
  refereesSecondAnswerRisk,
  selectIndependentPlansV1,
  semanticWriterUser,
} from "@/modules/factory/item-model/root-cause-fix";
import { taxonomyLiveItems } from "@/modules/factory/item-model/taxonomy-live";
import { selectIndependentPlans } from "@/modules/factory/item-model/writer-bakeoff";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffEditorialOutputDir } from "@/modules/factory/item-model/writer-bakeoff-editorial";
import { writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffSmokeOutputDir, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { modelDefaults } from "./ai/config";
import { misreadingOptionsOutput, misreadingOptionsOutputForPlanCount, misreadingOutput, misreadingOutputIndependentParse } from "./ai/prompts/cognitive-trap.v1";

function reading(mechanism: string, studentMisreading: string) {
  return { misreadingMechanism: mechanism, studentMisreading };
}

const plates = qualityFirstItems().find((entry) => entry.item.id === "quality-first-restatement-counterfactual")!;
const faculty = qualityFirstItems().find((entry) => entry.item.id === "quality-first-translation-en_tr")!;
const registry = taxonomyLiveItems().find((entry) => entry.item.id === "taxonomy-restatement-medium")!;
const referees = taxonomyLiveItems().find((entry) => entry.item.id === "taxonomy-translation-en_tr")!;
const board = taxonomyLiveItems().find((entry) => entry.item.id === "taxonomy-translation-tr_en")!;

const platesReadings = JSON.parse(readFileSync(path.join(qualityFirstPilotOutputDir, "quality-first-restatement-counterfactual.json"), "utf8")) as {
  arms: { B: { readings: { misreadingMechanism: string; studentMisreading: string }[] } };
};
const boardReadings = JSON.parse(readFileSync(path.join(".data/analysis/_factory/cognitive-trap/taxonomy-live-v1/taxonomy-translation-tr_en.json"), "utf8")) as {
  arms: { B: { readings: { misreadingMechanism: string; studentMisreading: string }[] } };
};

describe("factory root cause fix v1", () => {
  it("keeps production defaults off and fixes frame, planner, and min-4 on the flagged path", () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(factoryRootCauseFixVersion).toBe("factory-root-cause-fix-v1");
    expect(recoveryDefaultEnabled).toBe(false);
    expect(modelDefaults.generator).toBe("anthropic:claude-haiku-5-5");
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");

    const platesSource = sourceSentence(plates.item);
    const platesKey = plates.item.core.correctAnswer;
    const oldPlates = frameForFrozenItem("quality-first-restatement-counterfactual");
    const oldStatements = Object.values(oldPlates.slots).map((slot) => slot.statement).filter(Boolean);
    expect(new Set(oldStatements).size).toBeLessThan(oldStatements.length);

    const filled = fillSemanticSlots(platesSource, platesKey);
    const presentStatements = Object.values(filled).filter((slot) => slot.status === "present").map((slot) => slot.statement);
    expect(new Set(presentStatements).size).toBe(presentStatements.length);
    expect(filled.cause.status).toBe("absent");
    expect(filled.purpose.status).toBe("absent");
    expect(filled.cause.basis).toBe("not_applicable");
    expect(filled.actors.statement).toMatch(/conservators/i);
    expect(filled.quantity_scope.statement).toMatch(/two earliest negatives/i);
    expect(filled.time_order.statement).toMatch(/before the humidity rose/i);
    expect(filled.modality_epistemic.status).toBe("absent");
    expect(filled.condition_counterfactual.statement).toMatch(/would still have been printable/i);

    const facultySlots = fillSemanticSlots(sourceSentence(faculty.item), faculty.item.core.correctAnswer);
    expect(facultySlots.cause.statement).toMatch(/because last year's figures/i);
    expect(facultySlots.purpose.statement).toMatch(/so that the department would not value/i);
    expect(facultySlots.cause.statement).not.toBe(facultySlots.purpose.statement);

    const registrySlots = fillSemanticSlots(sourceSentence(registry.item), registry.item.core.correctAnswer);
    expect(JSON.stringify(registrySlots)).not.toMatch(/never filed/i);
    expect(registrySlots.modality_epistemic.statement).toMatch(/no trace/i);
    expect(registrySlots.actors.statement).toMatch(/registry/i);
    expect(registrySlots.actors.statement).toMatch(/archivist/i);
    expect(registrySlots.modality_epistemic.statement).not.toMatch(/never/i);

    expect(agentRoleInfeasible(platesSource, "AGENT_ROLE", platesReadings.arms.B.readings[2]!.studentMisreading)).toBe(true);
    expect(agentRoleInfeasible(sourceSentence(faculty.item), "AGENT_ROLE", "The department hired an auditor.")).toBe(false);

    const legacyPlates = selectIndependentPlans(platesReadings.arms.B.readings);
    expect(legacyPlates.status).toBe("ok");
    expect(legacyPlates.plans.map((plan) => plan.mechanismId)).toContain("AGENT_ROLE");
    expect(legacyPlates.plans.map((plan) => plan.mechanismId)).not.toContain("CONDITION_DIRECTION");

    const v1Plates = selectIndependentPlansV1(platesReadings.arms.B.readings, platesSource);
    expect(v1Plates.heldInfeasible.some((row) => row.mechanismId === "AGENT_ROLE")).toBe(true);
    expect(v1Plates.plans.map((plan) => plan.mechanismId)).not.toContain("AGENT_ROLE");
    expect(v1Plates.plans.map((plan) => plan.mechanismId)).toContain("CONDITION_DIRECTION");
    expect(v1Plates.paddedToFour).toBe(false);
    expect(v1Plates.status).toBe("source_insufficient_traps");

    const v1Board = selectIndependentPlansV1(boardReadings.arms.B.readings, sourceSentence(board.item));
    expect(v1Board.plans.map((plan) => plan.mechanismId)).toContain("CONDITION_DIRECTION");
    expect(v1Board.plans.some((plan) => plan.planId === "p2-CONDITION_DIRECTION" || plan.mechanismId === "CONDITION_DIRECTION")).toBe(true);
    expect(v1Board.droppedVariants.some((row) => row.reason === "same_change_relation" && row.mechanismId === "FOCUS_SCOPE")).toBe(true);

    const complaints = "No complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.";
    const v1Complaints = selectIndependentPlansV1(
      [
        reading("QUANTITY_SCOPE", "Some complaints were forwarded to the prosecutor."),
        reading("NEGATION_SCOPE", "Not every complaint was forwarded to the prosecutor."),
        reading("FOCUS_SCOPE", "They were read only at the hearing."),
      ],
      complaints,
    );
    expect(v1Complaints.provenIndependentCount).toBe(1);
    expect(v1Complaints.status).toBe("source_insufficient_traps");
    expect(v1Complaints.paddedToFour).toBe(false);

    const legacyComplaints = selectIndependentPlans([
      reading("QUANTITY_SCOPE", "Some complaints were forwarded."),
      reading("NEGATION_SCOPE", "Not every complaint was forwarded."),
      reading("FOCUS_SCOPE", "They were read only at the hearing."),
    ]);
    expect(legacyComplaints.independentRelationCount).toBe(2);

    const grounded = independentGroundedMechanisms(["PURPOSE_RESULT", "PURPOSE_TIME", "CAUSE_CONCESSION"], sourceSentence(faculty.item));
    expect(grounded.provenIndependentCount).toBe(2);
    expect(grounded.droppedAsSameRelation).toContain("PURPOSE_TIME");

    const candidate = { candidateText: "x", errorMechanism: "quantity_scope" as const, shiftTarget: "quantity" as const, semanticRisk: "none" as const, studentMisreading: "y" };
    expect(misreadingOptionsOutput(["quantity_scope", "scope_widening", "modality_shift", "polarity_reversal"]).safeParse({ candidates: Array(3).fill(candidate) }).success).toBe(false);
    expect(misreadingOptionsOutputForPlanCount(["quantity_scope", "scope_widening", "modality_shift", "polarity_reversal"], 3).safeParse({ candidates: Array(3).fill(candidate) }).success).toBe(true);

    const threeReadings = {
      meaningMap: { roles: "a", quantity: "b", modality: "c", polarity: "d", tense: "e", cause: "f", reference: "g" },
      preservedRelations: ["a", "b"],
      readings: Array(3).fill({
        studentMisreading: "m",
        temptingEvidence: "t",
        actualSemanticDifference: "d",
        whyIncorrect: "w",
        prevalence: "unmeasured",
        misreadingMechanism: "QUANTITY_SCOPE",
      }),
    };
    expect(misreadingOutput.safeParse(threeReadings).success).toBe(false);
    expect(misreadingOutputIndependentParse.safeParse(threeReadings).success).toBe(true);

    const refereesSource = sourceSentence(referees.item);
    const refereesKey = referees.item.core.correctAnswer;
    expect(refereesSecondAnswerRisk(
      refereesSource,
      refereesKey,
      "Hakemler, ekin birincil sonucu değiştirdiğine dair kanıt bulamadılar; ancak iki ikincil ölçütte daha yavaş düşüş ihtimalini açık bıraktılar.",
    )).toBe(true);
    expect(refereesSecondAnswerRisk(
      refereesSource,
      refereesKey,
      "Because the referees found no evidence that the supplement altered the primary outcome, they left open a slower decline in the two secondary measures.",
    )).toBe(false);

    const frame = frameFromSource(platesSource, platesKey, "restatement");
    const preserved = attachPreserveV1(v1Plates.plans, (["actors", "main_actions", "quantity_scope", "time_order", "condition_counterfactual"] as const).filter((relation) => frame.slots[relation].status === "present"));
    const user = semanticWriterUser({ source: platesSource, key: platesKey, targetLanguage: null, frame, plans: preserved });
    expect(user).toMatch(/change: \w+ →/);
    expect(user).toMatch(/preserve:\n  -/);
    expect(user).toMatch(/forbidden: /);
    expect(user).toMatch(/not_applicable/);
    expect(user).toMatch(/Writer self-report of preserved meaning is not proof/);
    const facultyUser = semanticWriterUser({
      source: sourceSentence(faculty.item),
      key: faculty.item.core.correctAnswer,
      targetLanguage: "tr",
      frame: frameFromSource(sourceSentence(faculty.item), faculty.item.core.correctAnswer, "translation", "en_tr"),
      plans: [],
    });
    expect(facultyUser).toMatch(/so that the department would not value/);
    expect(facultyUser).toMatch(/because last year's figures/);

    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffSmokeOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffCompareOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(writerBakeoffEditorialOutputDir);
    expect(() => publishToStudentBank()).toThrow(/does not write the student bank/);
  });

  it("does not rewrite frozen bake-off or quality-first records", () => {
    const v1 = writerBakeoffV1Fingerprint();
    const smoke = fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"]);
    const compare = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const quality = qualityFirstPilotFingerprint();
    expect(writerBakeoffV1Fingerprint()).toBe(v1);
    expect(fingerprintFiles(writerBakeoffSmokeOutputDir, ["summary.json", "prompt.json"])).toBe(smoke);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compare);
    expect(qualityFirstPilotFingerprint()).toBe(quality);
    expect(JSON.parse(readFileSync(path.join(qualityFirstPilotOutputDir, "summary.json"), "utf8")).executed).toBe(true);
  });
});
