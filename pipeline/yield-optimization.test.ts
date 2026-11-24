import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { surfaceEdit } from "@/modules/factory/item-model/cognitive-trap";
import { assessMeaningIntegrity } from "@/modules/factory/item-model/core";
import { draftsCandidateOptions, recordedDraftsKey } from "@/modules/factory/item-model/drafts-candidate";
import { selectCognitiveDistractors } from "@/modules/factory/item-model/distractor-strategy";
import { qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { restatementModel, translationModel } from "@/modules/factory/item-model/registry";
import { classifyOption } from "@/modules/factory/item-model/whole-set";
import {
  writeYieldOptimizationReport,
  yieldOptimizationLiveSourceDir,
  yieldOptimizationOutputDir,
} from "@/modules/factory/item-model/yield-optimization";

const source = "Hiçbir şikâyet savcılığa iletilmiş değil; yalnızca iki tutanak duruşmada okundu.";
const key = "No complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.";
const some = "Some complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.";

function cognitive(text: string, mechanism: string, reading: string) {
  return {
    candidateText: text,
    errorMechanism: mechanism,
    shiftTarget: "quantity" as const,
    whyPlausible: "A reader can attach the nearby wording to the wrong relation.",
    whyInferior: "The source keeps the original relation.",
    sourceEvidence: "source",
    semanticRisk: "none" as const,
    studentMisreading: reading,
    temptingEvidence: "Both parts of the sentence are visible.",
    actualSemanticDifference: "The relation between the parts changes.",
    whyIncorrect: "The source does not say that.",
  };
}

describe("factory yield optimization v1", () => {
  it("keeps a proven No→Some quantity shift and still drops an unverified near copy", () => {
    expect(surfaceEdit(key, some)).toBe(true);
    const sourceMeaning = assessMeaningIntegrity(source, some);
    const keyMeaning = assessMeaningIntegrity(key, some);
    expect(sourceMeaning.status).toBe("fail");
    expect(sourceMeaning.failures).toContain("quantity_shift");
    expect(keyMeaning.status).toBe("fail");
    expect(keyMeaning.failures).toEqual(expect.arrayContaining(["quantity_shift", "polarity_shift"]));
    expect(assessMeaningIntegrity(source, key).status).not.toBe("fail");
    expect(assessMeaningIntegrity(source, key).status).not.toBe("pass");

    const synonym = "No complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the session.";
    expect(surfaceEdit(key, synonym)).toBe(true);
    expect(assessMeaningIntegrity(key, synonym).status).toBe("unverified");

    const pool = selectCognitiveDistractors({
      candidates: [
        cognitive(some, "quantity_shift", "Some complaints were forwarded."),
        cognitive(synonym, "scope_shift", "The hearing is retold as a session."),
        cognitive("Two records were read only at the hearing and nowhere else.", "scope_shift", "Only moves onto the venue."),
        cognitive("No complaints have been forwarded to the prosecutor's office; only two official records were submitted at the hearing.", "scope_shift", "Read aloud is retold as submitted."),
        cognitive("Not every complaint was forwarded to the prosecutor's office; only two official records were read aloud at the hearing.", "polarity_reversal", "None is retold as not every."),
      ],
      keyText: key,
      sourceText: source,
      allowedMechanisms: translationModel.errorMechanisms,
    });
    expect(pool.selected.map((row) => row.candidateText)).toContain(some);
    expect(pool.selected.map((row) => row.candidateText)).not.toContain(synonym);
    expect(pool.removed.find((row) => row.candidate.candidateText === synonym)?.reason).toBe("surface_edit");
    expect(classifyOption(source, key, some).relation).toBe("confirmed_difference");
    expect(pool.selected.every((row) => row.semanticRisk !== "second_answer")).toBe(true);
    expect(pool.status).toBe("selected");
  });

  it("does not regress Drafts B/D/E or a Registry synonym drop", () => {
    const drafts = selectCognitiveDistractors({
      candidates: [
        cognitive(draftsCandidateOptions.B, "quantity_scope", "most is read as none"),
        cognitive(draftsCandidateOptions.C, "tense_shift", "afterwards attaches to distribution"),
        cognitive(draftsCandidateOptions.D, "predicate_meaning", "distributed is read as approved"),
        cognitive(draftsCandidateOptions.E, "causal_direction", "contrast is read as cause"),
      ],
      keyText: recordedDraftsKey,
      sourceText: "Tüm taslaklar kurula dağıtıldı, ama onların çoğu sonradan ikinci okumaya alınmadı.",
      allowedMechanisms: restatementModel.errorMechanisms,
    });
    const droppedDrafts = drafts.removed.map((row) => row.candidate.candidateText);
    expect(droppedDrafts).toContain(draftsCandidateOptions.C);
    expect(droppedDrafts).not.toContain(draftsCandidateOptions.B);
    expect(droppedDrafts).not.toContain(draftsCandidateOptions.D);
    expect(droppedDrafts).not.toContain(draftsCandidateOptions.E);
    expect(surfaceEdit(recordedDraftsKey, draftsCandidateOptions.C)).toBe(true);
    expect(assessMeaningIntegrity(recordedDraftsKey, draftsCandidateOptions.C).status).toBe("unverified");
    expect(drafts.removed.find((row) => row.candidate.candidateText === draftsCandidateOptions.C)?.reason).toBe("surface_edit");

    const registryKey = "Although the registry kept every laboratory log from the trial, its archivist discovered no trace that the two withdrawn samples had been filed with those logs.";
    const registrySource = "Although the registry held every laboratory log from the trial, the archivist found no trace that the two withdrawn samples had been filed with them.";
    const near = registryKey.replace("kept", "held");
    const registry = selectCognitiveDistractors({
      candidates: [
        cognitive(near, "scope_widening", "kept is retold as held"),
        cognitive("Because the registry held every laboratory log, the archivist filed the two withdrawn samples with them.", "causal_direction", "concession is read as cause"),
        cognitive("Although the registry kept only some laboratory logs, the archivist discovered no trace of the two withdrawn samples.", "quantity_scope", "every is read as some"),
        cognitive("Although the registry kept every laboratory log, the archivist established that the two withdrawn samples had never been filed.", "polarity_reversal", "absence of a trace is read as a finding"),
        cognitive("Although the registry kept every laboratory log, the archivist discovered a trace that the samples were absent.", "predicate_meaning", "no trace is read as a trace"),
      ],
      keyText: registryKey,
      sourceText: registrySource,
      allowedMechanisms: restatementModel.errorMechanisms,
    });
    expect(registry.selected.map((row) => row.candidateText)).not.toContain(near);
    expect(registry.removed.find((row) => row.candidate.candidateText === near)?.reason).toBe("surface_edit");
    expect(registry.status).toBe("selected");
    expect(registry.selected).toHaveLength(4);
  });

  it("reports corrected metrics from the frozen live records and does not rewrite them", () => {
    expect(yieldOptimizationLiveSourceDir).toBe(qualityFirstPilotOutputDir);
    expect(qualityFirstPilotForbiddenDirs).toContain(yieldOptimizationOutputDir);
    const liveSummaryPath = path.join(qualityFirstPilotOutputDir, "summary.json");
    const before = readFileSync(liveSummaryPath, "utf8");
    const report = writeYieldOptimizationReport();
    expect(readFileSync(liveSummaryPath, "utf8")).toBe(before);
    expect(report.providerCalls).toBe(0);
    expect(report.meaningProven).toBe(false);
    expect(report.metrics.firstPassReviewable).toBe("retired");
    expect(report.metrics.meaningProven).toBe(false);
    expect(report.metrics.observedDifficulty).toBeNull();
    expect(report.metrics.structuralCompletion).toBe(0.75);
    expect(report.metrics.gateEligible).toBe(0.75);
    expect(report.metrics.judgeApproved).toBe(0.75);
    expect(report.metrics.reviewCandidate).toBe(0);
    expect(report.metrics.editoriallyAccepted).toBe(0);
    expect(report.selectorComparison.complaints.rescued).toBe(1);
    expect(report.selectorComparison.complaints.newKept).toBe(1);
    expect(report.selectorComparison.complaints.fourOptionsOffline).toBe(false);
    expect(report.selectorComparison.complaints.countedAsQuality).toBe(false);
    expect(report.selectorComparison.complaints.secondAnswerRisk).toEqual([]);
    expect(report.onlyCompleteOption.selectorChanged).toBe(false);
    expect(report.onlyCompleteOption.plates.clue).toContain("only_complete_option");
    expect(report.onlyCompleteOption.faculty.droppedReasons).toContain("pool_surplus");
    expect(report.nextLiveRun.requiredNow).toBe(false);
    expect(report.liveFirstPassYieldUnchanged).toBe(0.75);
    const written = JSON.parse(readFileSync(path.join(yieldOptimizationOutputDir, "metrics.json"), "utf8")) as { reviewCandidate: number; firstPassReviewable: string };
    expect(written.reviewCandidate).toBe(0);
    expect(written.firstPassReviewable).toBe("retired");
    const frozen = JSON.parse(before) as { metrics: { firstPassYield: number } };
    expect(frozen.metrics.firstPassYield).toBe(0.75);
  });
});
