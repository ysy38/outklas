import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { linkMisreadingCandidates } from "@/modules/factory/item-model/candidate-lifecycle";
import { selectCognitiveDistractors } from "@/modules/factory/item-model/distractor-strategy";
import { selectDistractors } from "@/modules/factory/item-model/pool";
import { qualityFirstActualCallOrder, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "@/modules/factory/item-model/quality-first-pilot";
import { restatementModel, translationModel } from "@/modules/factory/item-model/registry";
import {
  assessCandidateRetention,
  candidateRetentionCache,
  candidateRetentionLiveSourceDir,
  candidateRetentionOutputDir,
  writeCandidateRetentionReport,
} from "@/modules/factory/item-model/candidate-retention";

function reading(text: string, mechanism: string) {
  return {
    studentMisreading: text,
    temptingEvidence: "The nearby wording invites that reading.",
    actualSemanticDifference: "The source keeps a different relation.",
    whyIncorrect: "The source does not say that.",
    misreadingMechanism: mechanism,
  };
}

function option(text: string, misreading: string, mechanism = "quantity_shift") {
  return {
    candidateText: text,
    errorMechanism: mechanism,
    shiftTarget: "quantity" as const,
    semanticRisk: "none" as const,
    studentMisreading: misreading,
  };
}

describe("candidate retention and writer yield v1", () => {
  it("links on exact studentMisreading and records misses without guessing", () => {
    const readings = [reading("Some complaints were forwarded.", "QUANTITY_SCOPE"), reading("Records were submitted.", "ACTION_SUBSTITUTION")];
    const linked = linkMisreadingCandidates({
      readings,
      candidates: [
        option("Some complaints have been forwarded to the office.", "Some complaints were forwarded."),
        option("Two records were filed at the hearing.", "Records were filed at the hearing."),
      ],
    });
    expect(linked.rows.map((row) => row.status)).toEqual(["linked", "unmatched_misreading", "missing_option"]);
    expect(linked.linked).toHaveLength(1);
    expect(linked.dropped[0]?.reason).toBe("unmatched_misreading");
    expect(linked.dropped[0]?.candidate.candidateText).toBe("Two records were filed at the hearing.");
    const duplicate = linkMisreadingCandidates({
      readings,
      candidates: [
        option("First option for some.", "Some complaints were forwarded."),
        option("Second option for some.", "Some complaints were forwarded."),
      ],
    });
    expect(duplicate.rows.map((row) => row.status)).toContain("duplicate_mapping");
    const near = linkMisreadingCandidates({
      readings,
      candidates: [option("Some complaints have been forwarded to the office.", "Some complaints were forwarded")],
    });
    expect(near.rows.map((row) => row.status)).toEqual(["unmatched_misreading", "missing_option", "missing_option"]);
  });

  it("records a short pool instead of deleting the passing texts", () => {
    const three = [0, 1, 2].map((index) => ({
      candidateText: `A full distractor that changes quantity ${index}.`,
      errorMechanism: "quantity_shift" as const,
      shiftTarget: "quantity" as const,
      whyPlausible: "A reader can widen the set.",
      whyInferior: "The source keeps the original quantity.",
      sourceEvidence: "source",
      semanticRisk: "none" as const,
    }));
    const pool = selectDistractors({ candidates: three, keyText: "The key statement.", allowedMechanisms: translationModel.errorMechanisms });
    expect(pool.status).toBe("insufficient");
    expect(pool.selected).toEqual([]);
    expect(pool.rejected.filter((row) => row.reason === "insufficient_pool")).toHaveLength(3);
    expect(pool.rejected.map((row) => row.candidate.candidateText)).toEqual(expect.arrayContaining(three.map((row) => row.candidateText)));
  });

  it("replays the frozen TR→EN writer options to four distractors and does not rewrite the live pilot", () => {
    expect(qualityFirstActualCallOrder).toContain("linkMisreadingCandidates_exact_studentMisreading_records_unmatched");
    expect(qualityFirstPilotForbiddenDirs).toContain(candidateRetentionOutputDir);
    expect(candidateRetentionLiveSourceDir).toBe(qualityFirstPilotOutputDir);
    const livePath = path.join(qualityFirstPilotOutputDir, "summary.json");
    const before = readFileSync(livePath, "utf8");
    const report = writeCandidateRetentionReport();
    expect(readFileSync(livePath, "utf8")).toBe(before);
    expect(report.providerCalls).toBe(0);
    expect(report.rootCause.writerOptionTexts).toBe(4);
    expect(report.before.trEn.silentUnrecorded).toBe(3);
    expect(report.before.trEn.recordedDropReasons).toEqual(["surface_edit"]);
    expect(report.after.trEn.optionTextsGenerated).toBe(4);
    expect(report.after.trEn.linkedCount).toBe(4);
    expect(report.after.trEn.selectorKept).toBe(4);
    expect(report.after.trEn.fourOptionsAfterReplay).toBe(true);
    expect(report.after.trEn.countedAsQuality).toBe(false);
    expect(report.after.trEn.secondAnswerRisk).toEqual([]);
    expect(report.after.wholeSetAfterReplay?.meaningProven).toBe(false);
    expect(report.after.wholeSetAfterReplay?.approvesTarget).toBe(false);
    expect(report.platesReplay.fourOptionsAfterReplay).toBe(true);
    expect(report.facultyReplay.fourOptionsAfterReplay).toBe(true);
    expect(report.platesCompleteness.options[0]?.singleIntendedDifference).toBe(false);
    expect(report.facultyCompleteness.options[0]?.singleIntendedDifference).toBe(false);
    expect(report.metrics.byItem["quality-first-translation-tr_en"]).toMatchObject({
      misreadingsGenerated: 4,
      optionTextsGenerated: 4,
      linkingSuccessRate: 1,
      selectorRetentionRate: 1,
      structuralCompletion: 1,
      onlyCompleteOptionRate: "unverified",
    });
    expect(report.metrics.meaningProven).toBe(false);
    const cache = JSON.parse(readFileSync(path.join(".data/analysis/cache/ai", `${candidateRetentionCache.trEnOptions}.json`), "utf8")) as { response: { text: string } };
    const generated = JSON.parse(cache.response.text) as { candidates: { studentMisreading: string; candidateText: string }[] };
    const live = JSON.parse(readFileSync(path.join(qualityFirstPilotOutputDir, "quality-first-translation-tr_en.json"), "utf8")) as { arms: { B: { readings: { studentMisreading: string }[] } }; key: string; source: string };
    expect(generated.candidates).toHaveLength(4);
    const join = linkMisreadingCandidates({ readings: live.arms.B.readings, candidates: generated.candidates as never });
    expect(join.rows.every((row) => row.status === "linked")).toBe(true);
    const selected = selectCognitiveDistractors({
      candidates: join.linked,
      keyText: live.key,
      sourceText: live.source,
      allowedMechanisms: translationModel.errorMechanisms,
    });
    expect(selected.status).toBe("selected");
    expect(selected.selected).toHaveLength(4);
    expect(assessCandidateRetention().after.trEn.cacheHash).toBe(candidateRetentionCache.trEnOptions);
  });
});

describe("candidate retention does not alter restatement gate behavior", () => {
  it("still keeps four Registry-style restatement distractors", () => {
    const key = "Although the registry kept every laboratory log from the trial, its archivist discovered no trace that the two withdrawn samples had been filed with those logs.";
    const source = "Although the registry held every laboratory log from the trial, the archivist found no trace that the two withdrawn samples had been filed with them.";
    const selected = selectCognitiveDistractors({
      candidates: [
        { candidateText: "Because the registry held every laboratory log, the archivist filed the two withdrawn samples with them.", errorMechanism: "causal_direction", shiftTarget: "cause", whyPlausible: "p", whyInferior: "i", sourceEvidence: "s", semanticRisk: "none", studentMisreading: "concession is read as cause", temptingEvidence: "t", actualSemanticDifference: "d", whyIncorrect: "w" },
        { candidateText: "Although the registry kept only some laboratory logs, the archivist discovered no trace of the two withdrawn samples.", errorMechanism: "quantity_scope", shiftTarget: "quantity", whyPlausible: "p", whyInferior: "i", sourceEvidence: "s", semanticRisk: "none", studentMisreading: "every is read as some", temptingEvidence: "t", actualSemanticDifference: "d", whyIncorrect: "w" },
        { candidateText: "Although the registry kept every laboratory log, the archivist established that the two withdrawn samples had never been filed.", errorMechanism: "polarity_reversal", shiftTarget: "polarity", whyPlausible: "p", whyInferior: "i", sourceEvidence: "s", semanticRisk: "none", studentMisreading: "absence of a trace is read as a finding", temptingEvidence: "t", actualSemanticDifference: "d", whyIncorrect: "w" },
        { candidateText: "Although the registry kept every laboratory log, the archivist discovered a trace that the samples were absent.", errorMechanism: "predicate_meaning", shiftTarget: "predicate", whyPlausible: "p", whyInferior: "i", sourceEvidence: "s", semanticRisk: "none", studentMisreading: "no trace is read as a trace", temptingEvidence: "t", actualSemanticDifference: "d", whyIncorrect: "w" },
      ],
      keyText: key,
      sourceText: source,
      allowedMechanisms: restatementModel.errorMechanisms,
    });
    expect(selected.status).toBe("selected");
  });
});
