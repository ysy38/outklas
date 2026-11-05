import { describe, expect, it } from "vitest";
import { contextIssues, hasPastPerfect, mainClauseFrame } from "./context";
import { clauseFormFor } from "./distractor-spec";
import { skeletonGateDecision, type SkeletonCheckReport } from "./skeleton";
import { defaultFactoryThresholds } from "./thresholds";
import { keyOverlap, stemOverlap } from "./validator";

const condition = "discourse_relation:condition" as const;
const sequence = "discourse_relation:sequence" as const;

describe("main clause frame", () => {
  it("reads the time frame of generated benchmark stems", () => {
    const stems: [string, string][] = [
      ["The desert lizard remained active throughout the entire afternoon ----.", "past_ongoing"],
      ["----, the regional health board approved the new heart medication for general use this spring.", "past_event"],
      ["The volunteers in the memory experiment recalled almost every word on the list ----.", "past_event"],
      ["The small bakery in the town saw its profits rise steadily throughout the entire year ----.", "past_ongoing"],
      ["----, the research team continued its nightly survey of distant galaxies without any interruption.", "past_ongoing"],
      ["----, the city council approved the bridge for heavy freight traffic within a month.", "past_event"],
    ];
    for (const [stem, frame] of stems) expect(mainClauseFrame(stem), stem).toBe(frame);
  });

  it("recognises counterfactual, future and present main clauses and stays unknown on mixed tenses", () => {
    expect(mainClauseFrame("The old bridge would have collapsed under the weight of the trucks ----.")).toBe("counterfactual");
    expect(mainClauseFrame("----, the council will open the new bridge to heavy traffic next year.")).toBe("future");
    expect(mainClauseFrame("----, many desert plants survive long periods without any rain at all.")).toBe("present_general");
    expect(mainClauseFrame("----, the committee has now approved the plan that it rejected last year.")).toBe("unknown");
  });

  it("does not read adjectival -ed words as past verbs", () => {
    expect(mainClauseFrame("----, many patients continue to take the prescribed medicine for several months.")).toBe("present_general");
    expect(hasPastPerfect("Although the clinic had limited funds")).toBe(false);
    expect(hasPastPerfect("If the pilings had already shown signs of corrosion")).toBe(true);
  });
});

describe("context compatibility", () => {
  const council = mainClauseFrame("----, the city council approved the bridge for heavy freight traffic within a month.");
  const lizard = mainClauseFrame("The desert lizard remained active throughout the entire afternoon ----.");

  it("rejects a past perfect condition on a single completed past event", () => {
    expect(contextIssues({ expresses: condition, frame: council, text: "If the pilings had shown corrosion during the spring inspection" })).toEqual([
      { code: "condition_tense_clash", severity: "critical", detail: "past perfect condition on a completed past event" },
    ]);
  });

  it("allows a counterfactual condition and a plausible standing condition", () => {
    const counterfactual = mainClauseFrame("The old bridge would have collapsed under the weight of the trucks ----.");
    expect(contextIssues({ expresses: condition, frame: counterfactual, text: "if the engineers had found cracks in the steel" })).toEqual([]);
    expect(contextIssues({ expresses: condition, frame: lizard, text: "as long as the sand around its burrow stayed cool" })).toEqual([]);
  });

  it("leaves a natural but wrong conditional to the semantic judge", () => {
    expect(contextIssues({ expresses: condition, frame: lizard, text: "provided that the afternoon temperature never rose above freezing" })).toEqual([]);
  });

  it("allows a coherent time clause, past perfect included", () => {
    expect(contextIssues({ expresses: sequence, frame: council, text: "after the engineers had finished the final load test" })).toEqual([]);
  });

  it("rejects a time clause with will, and only warns on will in a condition", () => {
    expect(contextIssues({ expresses: sequence, frame: council, text: "until the inspectors will close the bridge for repairs" }).map((issue) => issue.code)).toEqual(["future_in_time_clause"]);
    expect(contextIssues({ expresses: condition, frame: "present_general", text: "if the drivers will accept a lower speed limit" })).toEqual([{ code: "future_in_condition", severity: "warn" }]);
  });

  it("asks for a clause form that fits the frame", () => {
    expect(clauseFormFor("condition", "past_ongoing")).toBe("standing_past_condition");
    expect(clauseFormFor("condition", "past_event")).toBe("standing_past_condition");
    expect(clauseFormFor("condition", "counterfactual")).toBe("counterfactual_condition");
    expect(clauseFormFor("condition", "present_general")).toBe("present_condition");
    expect(clauseFormFor("sequence", "past_event")).toBe("past_time_clause");
    expect(clauseFormFor("purpose", "past_event")).toBe("purpose_with_modal");
    expect(clauseFormFor("cause", "past_event")).toBeNull();
  });
});

describe("lexical overlap", () => {
  const medicine = "----, many patients continue to take the prescribed medicine for several months without complaint.";
  const council = "----, the city council approved the bridge for heavy freight traffic within a month.";

  it("flags a genuine stem echo as copied", () => {
    expect(stemOverlap(medicine, "Whereas many patients take the prescribed medicine for only a few months").level).toBe("copied");
    expect(stemOverlap(council, "Because the city council approved the bridge for freight").level).toBe("copied");
  });

  it("treats necessary topic words as natural overlap", () => {
    expect(stemOverlap(council, "Because the city council had banned heavy freight traffic on all river crossings after a fatal collision").level).toBe("topic");
    expect(stemOverlap(council, "Unless the engineers measured the load on each steel beam").level).toBe("none");
  });

  it("keeps wording shared with the key, beyond the stem's own words, as copied", () => {
    const key = "Although the steel batches had shown measurable fatigue cracks during the initial inspection";
    expect(keyOverlap(council, key, "Because the steel batches showed fatigue cracks during inspection", defaultFactoryThresholds).level).toBe("copied");
    expect(keyOverlap(council, key, "Because the city council wanted heavy freight traffic off the old roads", defaultFactoryThresholds).level).not.toBe("copied");
  });
});

describe("skeleton gate", () => {
  const sound: SkeletonCheckReport = { reasons: ["clear concession"], grammatical: true, natural: 0.9, keyTrue: true, targetRelation: 0.9, keyAmbiguous: 0.1, confidence: 0.9 };

  it("accepts a sound skeleton", () => {
    expect(skeletonGateDecision(sound, 0.5)).toMatchObject({ decision: "ACCEPT", failures: [], concerns: [], version: "skeleton-gate.v1" });
  });

  it("rejects an invalid or ambiguous key before any distractor exists", () => {
    expect(skeletonGateDecision({ ...sound, keyTrue: false }, 0.5).failures).toEqual(["key_not_true"]);
    expect(skeletonGateDecision({ ...sound, targetRelation: 0.3 }, 0.5).failures).toEqual(["key_relation_weak"]);
    expect(skeletonGateDecision({ ...sound, keyAmbiguous: 0.6 }, 0.5).failures).toEqual(["key_ambiguous"]);
    expect(skeletonGateDecision({ ...sound, grammatical: false, natural: 0.2 }, 0.5).failures).toEqual(["skeleton_ungrammatical", "skeleton_unnatural"]);
  });

  it("turns an unsure reviewer's yes/no findings into concerns", () => {
    expect(skeletonGateDecision({ ...sound, keyTrue: false, confidence: 0.3 }, 0.5)).toMatchObject({ decision: "ACCEPT", failures: [], concerns: ["key_not_true", "low_confidence"] });
  });
});
