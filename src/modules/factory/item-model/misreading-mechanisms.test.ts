import { describe, expect, it } from "vitest";
import { sourceSentence, trapItems } from "./cognitive-trap";
import { pilotItems } from "./cognitive-trap-pilot";
import { defaultDistractorStrategy, resolveDistractorStrategy, selectCognitiveDistractors } from "./distractor-strategy";
import {
  classifyMisreading,
  errorMechanismHint,
  incompleteOption,
  misreadingMechanisms,
  openSemanticRisks,
  reviewSemanticSet,
  selectMisreadingMechanisms,
} from "./misreading-mechanisms";
import { qualityItems } from "./quality-profile";
import { selectDistractors } from "./pool";
import { readingModel, restatementModel, translationModel } from "./registry";

const door = "The night clerk kept the side door locked until the two late drivers had signed the log, even though the yard could hold every truck.";
const doorOption = "The night clerk locked the side door only after the two late drivers had signed the log, even though the yard could hold every truck.";
const wards = "Although the clinic could have opened all four wards, the director asked that the two damaged wards be repaired first so that patients would not move twice.";
const ferry = "Had the ferry left before the fog, only the two island clinics would have received the morning serum.";
const tonic = "Although the researchers found no trace that the tonic improved memory, they did not exclude a slower loss of attention among older patients.";

function candidate(text: string, misreading = "A reader swaps the order of the two events.") {
  return {
    candidateText: text,
    errorMechanism: "tense_shift",
    shiftTarget: "tense" as const,
    whyPlausible: "The two events are both in the sentence, so their order can look reversed.",
    whyInferior: "The source keeps the original order.",
    sourceEvidence: "until the drivers had signed",
    semanticRisk: "none" as const,
    studentMisreading: misreading,
    temptingEvidence: "Both events are visible.",
    actualSemanticDifference: "The order of the events changes.",
    whyIncorrect: "The source keeps the original order.",
  };
}

describe("semantic misreading mechanisms", () => {
  it("keeps the sixteen mechanisms out of the existing error enums", () => {
    expect(misreadingMechanisms.map((item) => item.id)).toEqual([
      "TEMPORAL_ORDER",
      "TEMPORAL_SCOPE",
      "CONCESSION_CAUSE",
      "CAUSE_CONCESSION",
      "QUANTITY_SCOPE",
      "FOCUS_SCOPE",
      "AGENT_ROLE",
      "ACTION_SUBSTITUTION",
      "CONDITION_DIRECTION",
      "COUNTERFACTUAL_FACTUAL",
      "MODALITY_STRENGTH",
      "EVIDENCE_CERTAINTY",
      "PURPOSE_RESULT",
      "PURPOSE_TIME",
      "NEGATION_SCOPE",
      "REFERENCE_SHIFT",
    ]);
    for (const item of misreadingMechanisms) {
      expect(item.requiredSemanticRelation.length).toBeGreaterThan(0);
      expect(item.preservedMeaning.length).toBeGreaterThan(0);
      expect(item.applicableQuestionTypes).toEqual(["restatement", "translation"]);
      expect(restatementModel.errorMechanisms).not.toContain(item.id);
      expect(translationModel.errorMechanisms).not.toContain(item.id);
      expect(readingModel.errorMechanisms).not.toContain(item.id);
    }
    const rejected = selectDistractors({
      candidates: [{
        candidateText: doorOption,
        errorMechanism: "TEMPORAL_ORDER",
        shiftTarget: "tense",
        whyPlausible: "The two events are both in the sentence, so their order can look reversed.",
        whyInferior: "The source keeps the original order.",
        sourceEvidence: "until the drivers had signed",
        semanticRisk: "none",
      }],
      keyText: door,
      allowedMechanisms: restatementModel.errorMechanisms,
    });
    expect(rejected.rejected.map((item) => item.reason)).toContain("unknown_mechanism");
    expect(errorMechanismHint.TEMPORAL_ORDER).toBe("tense_shift");
    expect(restatementModel.errorMechanisms).not.toContain("TEMPORAL_ORDER");
  });

  it("selects from the source relation and refuses a connector-only or unsupported source", () => {
    const selected = selectMisreadingMechanisms(door, "restatement");
    expect(selected.status).toBe("selected");
    expect(selected.mechanisms.map((item) => item.id)).toContain("TEMPORAL_ORDER");
    expect(selected.mechanisms.map((item) => item.id)).toContain("CONCESSION_CAUSE");
    expect(selected.mechanisms.map((item) => item.id)).not.toContain("COUNTERFACTUAL_FACTUAL");
    expect(selected.evaluations.find((item) => item.relation === "concession")?.connectorOnly).toBe(false);
    expect(selected.catalogIsNotAQuota).toBe(true);

    const ferrySelection = selectMisreadingMechanisms(ferry, "restatement");
    expect(ferrySelection.mechanisms.map((item) => item.id)).not.toContain("CONCESSION_CAUSE");
    expect(ferrySelection.mechanisms.map((item) => item.id)).toContain("COUNTERFACTUAL_FACTUAL");

    const could = selectMisreadingMechanisms("The clinic could have opened all four wards.", "restatement");
    expect(could.status).toBe("fail");
    expect(could.failure).toBe("insufficient_source_relations");
    expect(could.mechanisms.map((item) => item.id)).not.toContain("COUNTERFACTUAL_FACTUAL");
    expect(could.evaluations.find((item) => item.relation === "counterfactual")?.status).toBe("unresolved");

    const coordinator = selectMisreadingMechanisms("The team finished the survey and the harbor closed.", "restatement");
    expect(coordinator.status).toBe("fail");
    expect(coordinator.mechanisms.map((item) => item.id)).not.toContain("CONCESSION_CAUSE");
    expect(coordinator.mechanisms.map((item) => item.id)).not.toContain("CAUSE_CONCESSION");
    expect(coordinator.evaluations.find((item) => item.relation === "discourse_coordinator")).toMatchObject({ status: "unresolved", connectorOnly: true, selectedMechanism: null });

    const reviewers = "Hakem kurulu taslağı arşive girmeden önce okumuş olsaydı, yalnızca iki itirazlı tablo dış değerlendiricilere gidecekti.";
    const reviewerSelection = selectMisreadingMechanisms(reviewers, "translation");
    expect(reviewerSelection.mechanisms.map((item) => item.id)).toContain("COUNTERFACTUAL_FACTUAL");
    expect(reviewerSelection.mechanisms.map((item) => item.id)).toContain("CONDITION_DIRECTION");
    expect(selectMisreadingMechanisms("Dış değerlendiriciler raporu okudu.", "translation").mechanisms.map((item) => item.id)).not.toContain("CONDITION_DIRECTION");
    const issue = "While a few editors called the timeline unrealistic, the printed issue still reached shops on the promised day.";
    expect(selectMisreadingMechanisms(issue, "restatement").mechanisms.map((item) => item.id)).not.toContain("MODALITY_STRENGTH");
    expect(selectMisreadingMechanisms(door, "reading_comprehension").failure).toBe("reading_unchanged");
    for (const item of [...trapItems(), ...pilotItems(), ...qualityItems().map((entry) => entry.item)]) {
      expect(selectMisreadingMechanisms(sourceSentence(item), item.questionType).status, item.id).toBe("selected");
    }
  });

  it("classifies the human examples without treating a label as proof", () => {
    const temporal = classifyMisreading(door, doorOption);
    expect(temporal.mechanisms).toEqual(["TEMPORAL_ORDER"]);
    expect(temporal.notes).toContain("maintained_lock_versus_new_locking_act");
    expect(temporal.notes).toContain("concession_preserved");
    expect(temporal.actualDifference).toMatch(/new act/i);
    expect(temporal.mechanismIsNotProof).toBe(true);
    expect(temporal.approved).toBe(false);

    const bare = classifyMisreading("The clinic could have opened all four wards.", "dört koğuşun tamamını açmış olmasına rağmen");
    expect(bare.status).toBe("unresolved");
    expect(bare.mechanisms).toEqual([]);
    expect(bare.notes).toContain("context_not_examined");

    const factual = classifyMisreading(wards, "dört koğuşun tamamını açmış olmasına rağmen");
    expect(factual.mechanisms).toEqual(["COUNTERFACTUAL_FACTUAL"]);
    expect(factual.notes).toContain("context_examined");

    const purpose = classifyMisreading(wards, "hastalar iki kez taşındıktan sonra");
    expect(purpose.mechanisms).toEqual(["PURPOSE_TIME", "PURPOSE_RESULT"]);
    expect(purpose.relatedChanges).toBe(2);
    expect(purpose.notes).toContain("two_related_changes");

    expect(classifyMisreading("The yard stayed open even though the door was locked.", "The yard stayed open, so the door was locked.").mechanisms).toEqual(["CONCESSION_CAUSE"]);
    expect(classifyMisreading("Before the snow, every shepherd counted their own flock.", "During the snow, every shepherd counted their own flock.").mechanisms).toEqual(["TEMPORAL_SCOPE"]);
    expect(classifyMisreading("Before the snow, every shepherd counted their own flock.", "Before the snow, only two shepherds counted their own flock.").mechanisms).toEqual(["QUANTITY_SCOPE"]);
    expect(classifyMisreading(ferry, "Had the ferry left before the fog, only the two island clinics would have sent the morning serum.").mechanisms).toEqual(["AGENT_ROLE"]);
    const evidence = classifyMisreading(tonic, "The researchers found evidence that the tonic had no effect on memory, although they did not exclude a slower loss of attention.");
    expect(evidence.mechanisms).toEqual(["EVIDENCE_CERTAINTY"]);
    expect(evidence.notes).toContain("not_from_the_word_no_alone");
    expect(classifyMisreading(ferry, "Because the ferry left before the fog, only the two island clinics received the morning serum.").mechanisms).toEqual(["COUNTERFACTUAL_FACTUAL"]);

    const discourse = classifyMisreading(
      "Before the meeting, every participant read their own note, but only two participants asked a question.",
      "Before the meeting, every participant read their own note, and only two participants asked a question.",
    );
    expect(discourse.status).toBe("unresolved");
    expect(discourse.mechanisms).toEqual([]);
    expect(discourse.notes).toContain("but_and_unresolved");
    expect(openSemanticRisks).toContain("but_and_unresolved");

    const same = classifyMisreading(door, door);
    expect(same.status).toBe("equivalent");
    expect(same.approved).toBe(false);
  });

  it("drops an equivalent or incomplete option and does not score mechanism variety", () => {
    expect(incompleteOption("only after")).toBe(true);
    const pool = selectCognitiveDistractors({
      sourceText: door,
      keyText: "Despite the yard having room for every truck, the night clerk left the side door locked until the two late drivers had signed the log.",
      allowedMechanisms: restatementModel.errorMechanisms,
      candidates: [
        candidate(door),
        candidate("only after"),
        candidate(doorOption, "A reader thinks the lock starts after the signatures."),
        candidate("The night clerk kept the gate shut until the two late drivers had signed the log, even though the yard could hold every truck.", "A reader changes the door into a gate."),
      ],
    });
    expect(pool.removed.map((item) => item.reason)).toEqual(expect.arrayContaining(["equivalent_to_source", "incomplete_option"]));
    expect(pool.selected.map((item) => item.candidateText)).not.toContain(door);

    const review = reviewSemanticSet({
      source: ferry,
      key: "Only the two clinics on the island stood to be given the morning serum, a handover that would have happened once the ferry had sailed earlier than the fog.",
      correct: "A",
      options: {
        A: "Only the two clinics on the island stood to be given the morning serum, a handover that would have happened once the ferry had sailed earlier than the fog.",
        B: ferry,
        C: "Because the ferry left before the fog, only the two island clinics received the morning serum.",
        D: "Had the ferry left before the fog, the morning serum would have reached clinics on every island.",
        E: "Had the ferry left before the fog, only the two island clinics would have sent the morning serum.",
      },
      misreadings: [
        { option: "C", studentMisreading: "The sailing happened and caused the delivery." },
        { option: "D", studentMisreading: "The sailing happened and caused the delivery." },
      ],
    });
    expect(review.approvesTarget).toBe(false);
    expect(review.meaningProven).toBe(false);
    expect(review.mechanismVarietyScore).toBeNull();
    expect(review.diversityIsNotQuality).toBe(true);
    expect(review.lexicalOverlapIsNotEquivalence).toBe(true);
    expect(review.equivalentOptions).toContain("B");
    expect(review.decision).toBe("fail");
    expect(review.sameMisreading).toEqual(["the sailing happened and caused the delivery."]);
    expect(review.keyRisks).toEqual(expect.arrayContaining(["stood_to_prospective", "once_may_be_temporal"]));
  });

  it("leaves the baseline strategy and the reading path unchanged", () => {
    expect(defaultDistractorStrategy).toBe("baseline_v34");
    expect(resolveDistractorStrategy({ questionType: "restatement" }).strategy).toBe("baseline_v34");
    expect(resolveDistractorStrategy({ questionType: "reading_comprehension", requested: "cognitive_trap_first", authorization: "cognitive-trap-strategy-v1" }).strategy).toBe("baseline_v34");
    const doorSelection = selectMisreadingMechanisms(door, "restatement");
    expect(doorSelection.mechanisms.length).toBeGreaterThan(0);
    expect(doorSelection.mechanisms.length).toBeLessThan(16);
    expect(doorSelection.mechanisms.map((item) => item.id)).not.toContain("COUNTERFACTUAL_FACTUAL");
  });
});
