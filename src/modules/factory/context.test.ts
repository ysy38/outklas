import { describe, expect, it } from "vitest";
import { contextIssues, hasPastPerfect, mainClauseFrame } from "./context";
import { clauseFormFor } from "./distractor-spec";
import { sameScenario, sameScenarioPlan, scenarioFromApproved, scenarioWordOverlap } from "./scenario";
import { acceptableHardWord, assignedStrategy, claimTargetLemma, gateFailureNote, isPreciseTerm, sameTargetLemma, scenarioPlan, skeletonCheckReport, skeletonGateDecision, type SkeletonCheckReport } from "./skeleton";
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

describe("target lemma", () => {
  it("treats inflected and derived forms as one lemma and keeps a second lemma free", () => {
    const used: string[] = [];
    expect(sameTargetLemma("volatility", "volatile")).toBe(true);
    expect(sameTargetLemma("volatility", "volatilities")).toBe(true);
    expect(sameTargetLemma("impede", "impeded")).toBe(true);
    expect(sameTargetLemma("volatility", "impede")).toBe(false);
    expect(claimTargetLemma(used, "volatility")).toBe(true);
    expect(claimTargetLemma(used, "volatility")).toBe(false);
    expect(claimTargetLemma(used, "volatile")).toBe(false);
    expect(claimTargetLemma(used, "volatilities")).toBe(false);
    expect(claimTargetLemma(used, "impede")).toBe(true);
    expect(claimTargetLemma(used, "impeded")).toBe(false);
    expect(used).toEqual(["volatility", "impede"]);
  });

  it("does not treat an unused corner noun as a valid hard word", () => {
    const used: string[] = [];
    expect(claimTargetLemma(used, "curtail")).toBe(true);
    expect(acceptableHardWord("bioturbated")).toBe(false);
    expect(acceptableHardWord("aquifer")).toBe(false);
    expect(acceptableHardWord("curtail")).toBe(true);
  });
});

describe("scenario duplication", () => {
  const item207 = "The nurses' recall of the word lists in the morning session was unexpectedly accurate although the speaker's output had been erratic from one trial to the next";
  const item349 = "The volunteers in the memory study recalled the word lists with remarkable accuracy although they had been deprived of sleep for nearly two consecutive nights before the test";
  const item208 = "Although the guilds' record of insolvency across earlier loans from the same fund was well documented, the council approved a long-term loan to rebuild the district granary.";
  const item358 = "Although the plot, which sat on waterlogged alluvium vulnerable to liquefaction, had been surveyed three times before, the council approved the reconstruction of the granary on its original site.";
  const item209 = "The regional lender kept extending credit to small dairy cooperatives at fixed rates although its deposit base had grown more volatile than its regulators expected";
  const item379 = "A regional development bank expanded its lending to small manufacturers, although the export prices on which most of its borrowers depended had shown considerable volatility.";
  const item380 = "Although the water supply feeding the unit had shown considerable volatility in pressure and purity, the dialysis unit completed every scheduled session without a single cancellation.";

  it("flags the three bank collisions and leaves a different event alone", () => {
    expect(sameScenario(item207, item349)).toBe(true);
    expect(sameScenario(item208, item358)).toBe(true);
    expect(sameScenario(item209, item379)).toBe(true);
    expect(sameScenario(item379, item380)).toBe(false);
    expect(sameScenario("The hospital hired more nurses although the night-shift budget had been curtailed", "The hospital replaced its scanner although the ward remained full throughout the winter")).toBe(false);
  });

  const item212 = "Although the dome shutter jammed open for the entire night and dew settled on the mirror, the light curve she recorded that night was the cleanest of the whole series.";
  const item365 = "Although the spectrograph drew its light through a fiber that had been coated with a hygroscopic film before the run, the team recorded a usable spectrum of the faint companion star throughout the night.";
  const item215 = "The migrant families in the district kept their informal lending circles running for a generation although municipal planners had long marginalized the neighborhood in their official reports.";
  const item340 = "The regional bank raised its lending rates sharply during the recession, and the number of small business loans fell to a record low even though the central bank had cut its benchmark interest rate three times in the same period.";
  const item217 = "Mussel larvae settled on the reef in record numbers during the survey although warm bottom water had impeded larval survival for six weeks.";
  const item218fridge = "Although the cold-chain refrigerator at the district health post was switched off for three consecutive nights, the proportion of enrolled infants who received every scheduled dose on time reached a five-year high.";
  const item331 = "The volunteers stayed calm throughout the simulated emergency and completed every task on time even though they had received only ten minutes of training before the exercise began.";
  const item337 = "Even though the rural clinic had lost two of its three physicians during the previous winter, the district's emergency response times improved steadily over the following year.";
  const item219 = "The participants in the vigilance task recalled the full sequence of targets with striking accuracy although their working memory was highly susceptible to interference from the distracting tones.";
  const item361 = "Although the contractor's log listed an impeller that was riddled with cavitation damage, the pumping station was returned to full service by the same afternoon.";
  const item214 = "Although the site lay beneath unstable clay that had collapsed twice during the excavation, the team recovered a complete ceramic bowl from the lowest level.";
  const item341 = "Although the site had been submerged by seasonal floodwater for most of the last two thousand years, the excavators recovered an unusually complete assemblage of pottery from the lowest strata of the site.";
  const item218dialysis = "Although the water treatment unit had failed its scheduled inspection and was not replaced until the following week, infection rates among the clinic's dialysis patients fell to their lowest level on record.";

  it("does not reject a shared domain or a handful of ordinary words", () => {
    expect(sameScenario(item212, item365)).toBe(false);
    expect(scenarioWordOverlap(item212, item365)).toEqual(expect.arrayContaining(["light", "night", "recorded"]));
    expect(sameScenario(item215, item340)).toBe(false);
    expect(sameScenario(item215, item379)).toBe(false);
    expect(sameScenario(item217, item340)).toBe(false);
    expect(scenarioWordOverlap(item217, item340)).toEqual(expect.arrayContaining(["during", "record"]));
    expect(sameScenario(item218fridge, item331)).toBe(false);
    expect(sameScenario(item218fridge, item337)).toBe(false);
    expect(sameScenario(item219, item361)).toBe(false);
  });

  it("still rejects the excavation, dialysis, and memory plots", () => {
    expect(sameScenario(item214, item341)).toBe(true);
    expect(sameScenario(item218dialysis, item380)).toBe(true);
    expect(sameScenario(item219, item349)).toBe(true);
  });

  const marsh = {
    actor: "a restored salt marsh behind a seawall",
    obstacle: "the seawall blocks most tidal sediment from reaching the marsh",
    outcome: "the marsh has gained elevation and kept pace with sea-level rise",
  };
  const meteors = {
    actor: "a volunteer observing team",
    obstacle: "a jammed roof shutter lets moonlight into the observing dome",
    outcome: "the team logs more faint meteors per hour than any earlier campaign",
  };

  it("keeps an approved plan and ignores a rejected one", () => {
    const approved = scenarioFromApproved({
      status: "approved",
      generation: {
        skeleton: {
          stem: "----, the restored marsh has kept pace with sea-level rise over the past decade.",
          correctAnswer: "Although the seawall behind it blocks most tidal sediment from reaching the marsh",
          scenario: { ...marsh, domain: "coastal wetland restoration", expected: "the marsh would lose elevation and drown as sea level rises", relation: "concession" },
        },
      },
    });
    expect(approved?.plan).toEqual(marsh);
    expect(approved?.sentence).toContain("seawall");
    expect(scenarioFromApproved({ status: "judge_rejected", generation: { skeleton: { stem: "----, meteors.", correctAnswer: "Although a shutter jammed", scenario: meteors } } })).toBeNull();
    expect(sameScenarioPlan(marsh, marsh)).toBe(true);
    expect(sameScenarioPlan(marsh, meteors)).toBe(false);
    expect(sameScenarioPlan(marsh, { ...marsh, outcome: meteors.outcome })).toBe(false);
  });

  it("lets a relation label run past forty characters", () => {
    const relation = "concession: blocked intake should cut output, yet delivery held";
    expect(relation.length).toBeGreaterThan(40);
    expect(scenarioPlan.safeParse({ domain: "hydraulics", actor: "operators", obstacle: "silt in the intake", expected: "less water", outcome: "design rate held", relation }).success).toBe(true);
    expect(scenarioPlan.safeParse({ domain: "hydraulics", actor: "operators", obstacle: "silt in the intake", expected: "less water", outcome: "design rate held", relation: "x".repeat(121) }).success).toBe(false);
  });
});

describe("hard strategies", () => {
  const sound: SkeletonCheckReport = { reasons: ["clear concession"], grammatical: true, natural: 0.9, keyTrue: true, targetRelation: 0.9, keyAmbiguous: 0.1, confidence: 0.9 };
  const curtail = "Although the new tax was expected to curtail small enterprise transactions that form the backbone of the local economy, revenue rose";

  it("assigns lexical pivot and relational inference on alternate hard ordinals", () => {
    expect(assignedStrategy({ id: "sentence_completion.concession.hard.203", difficulty: { band: "hard" } })).toBe("lexical_pivot");
    expect(assignedStrategy({ id: "sentence_completion.concession.hard.202", difficulty: { band: "hard" } })).toBe("relational_inference");
    expect(assignedStrategy({ id: "sentence_completion.concession.medium.042", difficulty: { band: "medium" } })).toBeNull();
    const pilot = Array.from({ length: 10 }, (_, index) => assignedStrategy({ id: `sentence_completion.concession.hard.${212 + index}`, difficulty: { band: "hard" } }));
    expect(pilot.filter((strategy) => strategy === "lexical_pivot")).toHaveLength(5);
    expect(pilot.filter((strategy) => strategy === "relational_inference")).toHaveLength(5);
    expect(pilot[0]).toBe("relational_inference");
  });

  it("keeps the neutralization test for a lexical pivot and does not use it to reject a relational item", () => {
    const weakened = { ...sound, embedding: "expected to curtail small enterprise transactions", preciseTerm: "curtail", clauseCarriesClash: false as const };
    expect(skeletonGateDecision(weakened, 0.5, { band: "hard", sentence: curtail, strategy: "lexical_pivot" }).failures).toContain("hard_decorative_clause");
    expect(skeletonGateDecision(weakened, 0.5, { band: "hard", sentence: curtail, strategy: "relational_inference" }).failures).not.toContain("hard_decorative_clause");
    expect(skeletonGateDecision({ ...weakened, preciseTerm: "aquifer" }, 0.5, { band: "hard", sentence: curtail, strategy: "relational_inference" }).failures).toContain("hard_no_term");
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

  it("keeps the first word when the reviewer returns a phrase as the precise term", () => {
    const parsed = skeletonCheckReport.parse({ ...sound, preciseTerm: "cadmium in the estuary sediment that had been dumped near the outfall", embedding: "that was laced with cadmium", clauseCarriesClash: true });
    expect(parsed.preciseTerm).toBe("cadmium");
  });

  it("accepts an academic verb whose replacement collapses the concession", () => {
    const carrying = "Although the new tax was expected to curtail small enterprise transactions that form the backbone of the local economy, revenue rose";
    const carried = { ...sound, embedding: "expected to curtail small enterprise transactions", preciseTerm: "curtail", clauseCarriesClash: true };
    expect(skeletonGateDecision(carried, 0.5, { band: "hard", sentence: carrying }).failures).toEqual([]);
    const depleted = "Although the region relies on an aquifer which has been severely depleted, output rose";
    expect(skeletonGateDecision({ ...sound, embedding: "which has been severely depleted", preciseTerm: "aquifer", clauseCarriesClash: false }, 0.5, { band: "hard", sentence: depleted }).failures).toEqual(
      expect.arrayContaining(["hard_no_term", "hard_decorative_clause"]),
    );
    expect(skeletonGateDecision(carried, 0.5, { band: "medium", sentence: carrying }).decision).toBe("ACCEPT");
  });

  it("counts only a specialist word as the hard term", () => {
    for (const word of ["allocation", "commissioning", "liquidity", "calibrated", "fouled", "interference", "sediment", "contamination", "phonics", "consolidation", "eligibility"]) {
      expect(isPreciseTerm(word), word).toBe(false);
    }
    for (const word of ["cadmium", "anoxic", "hypoxic", "cavitation", "alluvium", "hyperglycemia", "liquefaction"]) {
      expect(isPreciseTerm(word), word).toBe(true);
    }
    for (const word of ["lacunary", "deliquescent", "bioturbated", "hygroscopic", "prosopagnosia", "erstwhile", "unconsolidated"]) {
      expect(isPreciseTerm(word), word).toBe(false);
    }
    for (const word of ["corrosion", "aquifer", "subsidence", "insolvency"]) {
      expect(isPreciseTerm(word), word).toBe(true);
    }
  });

  it("rejects a time stamp outside the clause and keeps one inside it", () => {
    const stamp = "Although the new rule was expected to curtail small enterprise transactions, the council approved it in March";
    const stamped = { ...sound, embedding: "expected to curtail small enterprise transactions", preciseTerm: "curtail", clauseCarriesClash: true };
    expect(skeletonGateDecision(stamped, 0.5, { band: "hard", sentence: stamp }).failures).toContain("hard_calendar_stamp");
    const clean = "Although the new rule was expected to curtail small enterprise transactions that form the backbone of the local economy, revenue rose";
    expect(skeletonGateDecision(stamped, 0.5, { band: "hard", sentence: clean }).failures).toEqual([]);
    const datedClause = "Although the scheme that had silted up after the 1998 flood still carried barge traffic, trade rose";
    const inside = { ...sound, embedding: "silted up after the 1998 flood", preciseTerm: "silted", clauseCarriesClash: true };
    expect(skeletonGateDecision(inside, 0.5, { band: "hard", sentence: datedClause }).failures).not.toContain("hard_calendar_stamp");
  });

  it("tells the writer how to repair a hard clause", () => {
    expect(gateFailureNote("hard_decorative_clause")).toMatch(/plain verb such as affect/);
    expect(gateFailureNote("hard_calendar_stamp")).toMatch(/different clause shape/);
    expect(gateFailureNote("hard_no_term")).toMatch(/academic verb/);
    expect(gateFailureNote("hard_no_term")).toMatch(/archaic word/);
    expect(gateFailureNote("hard_no_embedding")).toMatch(/whose does not count/);
    expect(gateFailureNote("hard_term_outside_clause")).toMatch(/Move that word into the clause/);
    expect(gateFailureNote("key_relation_weak")).toBe("key_relation_weak");
  });

  it("turns an unsure reviewer's yes/no findings into concerns", () => {
    expect(skeletonGateDecision({ ...sound, keyTrue: false, confidence: 0.3 }, 0.5)).toMatchObject({ decision: "ACCEPT", failures: [], concerns: ["key_not_true", "low_confidence"] });
  });

  it("flags a planned second answer and keeps an open stem", () => {
    const groundFloor = "Because the ground floor was reopened to shops and offices";
    const missingOrnament = "While reviewers had expected the missing ornament to be rebuilt";
    const shown = skeletonGateDecision(
      {
        ...sound,
        reasons: [groundFloor, missingOrnament],
        otherContinuationsPossible: true,
        plannedReviews: [
          { option: "A", secondAnswerRisk: "shown", propositionStatus: "undetermined", presentedAsInference: false, anchorGrounding: "quoted" },
          { option: "B", secondAnswerRisk: "shown", propositionStatus: "undetermined", presentedAsInference: false, anchorGrounding: "quoted" },
        ],
      },
      0.5,
    );
    expect(shown.decision).toBe("REGENERATE");
    expect(shown.failures).toEqual(["planned_second_answer"]);
    expect(shown.concerns).toEqual(["other_continuations_open"]);
    const unsure = skeletonGateDecision(
      {
        ...sound,
        plannedReviews: [{ option: "A", secondAnswerRisk: "uncertain", propositionStatus: "undetermined", presentedAsInference: false, anchorGrounding: "quoted" }],
      },
      0.5,
    );
    expect(unsure.decision).toBe("ACCEPT");
    expect(unsure.failures).toEqual([]);
    expect(unsure.concerns).toEqual(["planned_second_answer_uncertain"]);
    const catalogue = skeletonGateDecision(
      {
        ...sound,
        otherContinuationsPossible: true,
        plannedReviews: [{ option: "A", secondAnswerRisk: "none", propositionStatus: "not_entailed", presentedAsInference: true, anchorGrounding: "quoted" }],
      },
      0.5,
    );
    expect(catalogue.decision).toBe("ACCEPT");
    expect(catalogue.failures).toEqual([]);
    expect(catalogue.concerns).toEqual(["other_continuations_open"]);
    const repeated = skeletonGateDecision(
      {
        ...sound,
        plannedReviews: [{ option: "A", secondAnswerRisk: "none", propositionStatus: "restatement", presentedAsInference: true, anchorGrounding: "quoted" }],
      },
      0.5,
    );
    expect(repeated.decision).toBe("REGENERATE");
    expect(repeated.failures).toEqual(["plan_restatement_as_inference"]);
  });

  it("records a missing plan review as a concern and does not ask for another call", () => {
    const sentence = "Although the catalogue lists every box acquired since 1950, the hall stayed open";
    const omitted = skeletonGateDecision(sound, 0.5, { band: "medium", sentence, plansShown: 4 });
    expect(omitted.decision).toBe("ACCEPT");
    expect(omitted.failures).toEqual([]);
    expect(omitted.concerns).toEqual(["review_missing"]);
    const empty = skeletonGateDecision({ ...sound, plannedReviews: [] }, 0.5, { band: "medium", sentence, plansShown: 4 });
    expect(empty.decision).toBe("ACCEPT");
    expect(empty.failures).toEqual([]);
    expect(empty.concerns).toEqual(["review_missing"]);
    const covered = skeletonGateDecision(
      {
        ...sound,
        plannedReviews: [{ option: "A", secondAnswerRisk: "none", propositionStatus: "not_entailed", presentedAsInference: true, anchorGrounding: "quoted" }],
      },
      0.5,
      { band: "medium", sentence, plansShown: 1 },
    );
    expect(covered.decision).toBe("ACCEPT");
    expect(covered.failures).toEqual([]);
    expect(covered.concerns).toEqual([]);
    expect(skeletonGateDecision(sound, 0.5).concerns).toEqual([]);
  });

  it("reads a later plan review without reopening the accepted stem", () => {
    const sentence = "Although the catalogue lists every box acquired since 1950, the hall stayed open";
    const row = { option: "A" as const, secondAnswerRisk: "none" as const, propositionStatus: "not_entailed" as const, presentedAsInference: true, anchorGrounding: "quoted" as const };
    const plans = skeletonGateDecision({ ...sound, keyTrue: false, grammatical: false, plannedReviews: [row] }, 0.5, { band: "hard", sentence, strategy: "relational_inference", plansShown: 1, focus: "plans" });
    expect(plans).toMatchObject({ decision: "ACCEPT", failures: [], concerns: [] });
    const reopened = skeletonGateDecision({ ...sound, keyTrue: false }, 0.5, { band: "hard", sentence, strategy: "relational_inference", plansShown: 0 });
    expect(reopened.failures).toContain("key_not_true");
    expect(reopened.decision).toBe("REGENERATE");
  });
});
