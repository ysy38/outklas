import { describe, expect, it } from "vitest";
import { knowledgeNodes } from "@/modules/knowledge/seed";
import type { NodeRef } from "@/modules/knowledge/graph";
import { calibratedBand, evaluateItemAudit, type CalibrationEvidence, type ItemAuditReport } from "./audit";
import {
  aggregateDiagnoses,
  diagnoseSlot,
  diagnosisCategories,
  diagnosisLabelCodes,
  diagnosisLabels,
  distractorTypeCategory,
  effectiveDiagnosis,
  labelStatus,
  relationConfusion,
  relationGroups,
  renderFeedback,
  type DiagnosisInput,
  type DiagnosisLabel,
  type DiagnosisSelection,
  type DistractorDiagnosis,
} from "./diagnosis";
import { failureModeFor } from "./distractor-spec";

const refs = new Set(knowledgeNodes.map((node) => `${node.type}:${node.slug}`));
const label = (code: string) => diagnosisLabels[code as keyof typeof diagnosisLabels] as DiagnosisLabel;
const sc = "question_type:sentence_completion" as NodeRef;
const slot = (expresses: string | null, distractorType = "wrong_discourse_relation", correct: string | null = "concession", misconception: NodeRef | null = null): DiagnosisInput => {
  const input = { distractorType: `distractor_type:${distractorType}` as NodeRef, expresses: expresses ? (`discourse_relation:${expresses}` as NodeRef) : null };
  return { questionType: sc, correctRelation: correct ? (`discourse_relation:${correct}` as NodeRef) : null, ...input, failureMode: failureModeFor(input), misconception };
};

describe("diagnosis catalog", () => {
  it("uses stable category.slug codes whose prefix is the label's category", () => {
    for (const code of diagnosisLabelCodes) {
      expect(code).toMatch(/^[a-z]+\.[a-z_]+$/);
      expect(code.split(".")[0]).toBe(label(code).category);
      expect(Object.keys(diagnosisCategories)).toContain(label(code).category);
    }
  });

  it("points only at graph nodes that exist", () => {
    for (const code of diagnosisLabelCodes) {
      const entry = label(code);
      for (const ref of [entry.misconception, entry.skill, ...entry.distractorTypes, ...entry.questionTypes].filter(Boolean)) expect(refs.has(ref as string), `${code} → ${ref}`).toBe(true);
    }
    for (const type of Object.keys(distractorTypeCategory)) expect(refs.has(`distractor_type:${type}`)).toBe(true);
    for (const relation of Object.keys(relationGroups)) expect(refs.has(`discourse_relation:${relation}`)).toBe(true);
  });

  it("gives every graph distractor type a category", () => {
    const types = knowledgeNodes.filter((node) => node.type === "distractor_type").map((node) => node.slug);
    for (const type of types) expect(distractorTypeCategory[type], type).toBeDefined();
  });

  it("writes learner feedback in natural Turkish, addressing the learner as sen", () => {
    for (const code of diagnosisLabelCodes) {
      const text = `${label(code).titleTr} ${label(code).feedbackTr}`;
      expect(text, code).not.toMatch(/\b\w*(sınız|siniz|sunuz|sünüz)\b/i);
      expect(text, code).not.toMatch(/\b(bakın|edin|arayın|dikkat edin|bant)\b/i);
      expect(label(code).feedbackTr, code).toMatch(/(yorsun|ıyorsun|iyorsun|uyorsun|üyorsun|\bbak\b|et\.|kontrol et|sor\.|karşılaştır|hatırla|bul)/);
      if (/concession|beklenmedik/i.test(text)) expect(text).toMatch(/beklenmedik sonuç/i);
    }
    expect(label("relation.polarity_reversed").feedbackTr).toMatch(/^Bağlacın yönünü karıştırıyorsun/);
  });
});

describe("relationConfusion", () => {
  const relations = Object.keys(relationGroups);

  it("assigns exactly one relation label to every ordered pair of distinct relations", () => {
    for (const correct of relations) {
      for (const expressed of relations) {
        if (correct === expressed) {
          expect(() => relationConfusion(correct, expressed)).toThrow();
          continue;
        }
        const code = relationConfusion(correct, expressed);
        expect(label(code).category).toBe("relation");
      }
    }
  });

  it("separates confusions inside the opposing group from polarity reversals", () => {
    expect(relationConfusion("concession", "contrast")).toBe("relation.concession_vs_contrast");
    expect(relationConfusion("contrast", "concession")).toBe("relation.concession_vs_contrast");
    expect(relationConfusion("concession", "cause")).toBe("relation.polarity_reversed");
    expect(relationConfusion("cause", "concession")).toBe("relation.polarity_reversed");
    expect(relationConfusion("concession", "condition")).toBe("relation.condition_misapplied");
    expect(relationConfusion("concession", "sequence")).toBe("relation.time_for_logic");
    expect(relationConfusion("condition", "cause")).toBe("relation.frame_missed");
    expect(relationConfusion("cause", "result")).toBe("relation.cause_vs_result");
    expect(relationConfusion("cause", "purpose")).toBe("relation.purpose_vs_cause");
    expect(relationConfusion("cause", "addition")).toBe("relation.explanation_vs_addition");
    expect(relationConfusion("example", "addition")).toBe("relation.addition_example_similarity");
  });

  it("refuses relations without a group instead of guessing", () => {
    expect(() => relationConfusion("concession", "qualification")).toThrow(/no diagnosis group/);
  });
});

describe("diagnoseSlot", () => {
  it("labels the concession family's options by what the learner misread", () => {
    expect(diagnoseSlot(slot("contrast", undefined, undefined, "misconception:concession_vs_contrast"))).toMatchObject({ primary: "relation.concession_vs_contrast", secondary: "logic.no_real_opposition" });
    expect(diagnoseSlot(slot("cause"))).toMatchObject({ primary: "relation.polarity_reversed", secondary: "logic.reason_supports_opposite" });
    expect(diagnoseSlot(slot("condition"))).toMatchObject({ primary: "relation.condition_misapplied", secondary: "logic.condition_cannot_restrict" });
    expect(diagnoseSlot(slot("sequence", "logical_incompatibility"))).toMatchObject({ primary: "relation.time_for_logic", secondary: "logic.time_order" });
  });

  it("makes the content failure primary when the connector is the right one", () => {
    expect(diagnoseSlot(slot("concession", "logical_incompatibility"))).toMatchObject({ primary: "logic.no_broken_expectation", secondary: null });
    expect(diagnoseSlot(slot(null, "logical_incompatibility"))).toMatchObject({ primary: "logic.self_contradiction", secondary: null });
  });

  it("covers every relation a wrong-relation option can express in a concession item", () => {
    for (const relation of Object.keys(relationGroups).filter((name) => name !== "concession")) {
      const result = diagnoseSlot(slot(relation));
      expect(label(result.primary).category).toBe("relation");
      expect(label(result.secondary!).category).toBe("logic");
      expect(label(result.primary).distractorTypes).toContain("distractor_type:wrong_discourse_relation");
    }
  });

  it("throws on anything the catalog does not map", () => {
    expect(() => diagnoseSlot(slot("concession"))).toThrow(/other than the item's/);
    expect(() => diagnoseSlot({ ...slot("cause"), failureMode: "no_real_opposition" })).toThrow(/does not belong/);
    expect(() => diagnoseSlot({ ...slot("cause"), questionType: "question_type:cloze" })).toThrow(/No distractor diagnosis/);
    expect(() => diagnoseSlot({ ...slot("cause"), distractorType: "distractor_type:collocation_failure", failureMode: "collocation_breaks" })).toThrow(/has no diagnosis/);
    expect(() => diagnoseSlot(slot("cause", undefined, undefined, "misconception:concession_vs_contrast"))).toThrow(/is not what/);
    expect(() => diagnoseSlot(slot("cause", undefined, null))).toThrow(/no correct relation/);
  });
});

describe("label validation", () => {
  const diagnosis = diagnoseSlot(slot("condition"));
  const logic = diagnoseSlot(slot(null, "logical_incompatibility"));

  it("confirms only a confident, matching blind reading", () => {
    expect(labelStatus(diagnosis, { failure: "logic.condition_cannot_restrict", confidence: 0.8 })).toBe("confirmed");
    expect(labelStatus(diagnosis, { failure: "logic.condition_cannot_restrict", confidence: 0.3 })).toBe("unsure");
    expect(labelStatus(diagnosis, { failure: "implausible_content", confidence: 0.9 })).toBe("disputed");
    expect(labelStatus(diagnosis, { failure: "sentence_works", confidence: 0.9 })).toBe("second_answer");
  });

  it("keeps a relation label on the deterministic connector check but drops an unconfirmed content label", () => {
    expect(effectiveDiagnosis(diagnosis, "confirmed")).toEqual(diagnosis);
    expect(effectiveDiagnosis(diagnosis, "disputed")).toMatchObject({ primary: "relation.condition_misapplied", secondary: null });
    expect(effectiveDiagnosis(logic, "disputed")).toBeNull();
    expect(effectiveDiagnosis(diagnosis, "second_answer")).toBeNull();
  });
});

describe("renderFeedback", () => {
  it("names the needed and the chosen relation without any item text", () => {
    const text = renderFeedback("relation.concession_vs_contrast", { correctRelation: "discourse_relation:concession", expresses: "discourse_relation:contrast", connector: "connector:whereas" });
    expect(text).toMatch(/^Bu cümle beklenmedik sonuç \(-e rağmen\) ilişkisi istiyor, seçtiğin whereas ise zıtlık bildiriyor\. Zıtlık ile beklenmedik sonucu/);
    expect(renderFeedback("logic.time_order")).toBe(label("logic.time_order").feedbackTr);
  });
});

describe("aggregateDiagnoses", () => {
  const polarity = { version: "distractor-diagnosis.v1" as const, primary: "relation.polarity_reversed" as const, secondary: "logic.reason_supports_opposite" as const };
  const contrast = { version: "distractor-diagnosis.v1" as const, primary: "relation.concession_vs_contrast" as const, secondary: "logic.no_real_opposition" as const };
  const pick = (itemId: string, at: string, diagnosis: DistractorDiagnosis = polarity, laterCorrect = false): DiagnosisSelection => ({ itemId, at, diagnosis, laterCorrect });
  const three = [pick("i1", "2026-10-01T10:00:00Z"), pick("i2", "2026-10-03T10:00:00Z"), pick("i3", "2026-10-05T10:00:00Z")];

  it("reports a weakness only after the same trap in three different items", () => {
    expect(aggregateDiagnoses(three.slice(0, 2)).labels).toEqual([]);
    expect(aggregateDiagnoses([...three.slice(0, 2), pick("i1", "2026-10-04T10:00:00Z")]).labels).toEqual([]);
    const report = aggregateDiagnoses(three);
    expect(report.labels.map((entry) => entry.code)).toEqual(["relation.polarity_reversed"]);
    expect(report.labels[0]).toMatchObject({ items: 3, selections: 3, primarySelections: 3, skill: "grammar:conjunction", errorCategory: "CONNECTOR_ERROR" });
    expect(report.labels[0].summaryTr).toMatch(/^Son 56 günde 3 farklı soruda aynı tuzağa düştün\. Bağlacın yönünü karıştırıyorsun/);
    expect(report.categories.map((entry) => entry.category)).toEqual(["relation"]);
  });

  it("is a pure function of its input: order does not matter and the clock is never read", () => {
    const a = aggregateDiagnoses(three);
    expect(aggregateDiagnoses([...three].reverse())).toEqual(a);
    expect(a.now).toBe("2026-10-05T10:00:00.000Z");
  });

  it("decays old evidence, discounts later-correct items and secondary labels, and drops what is outside the window", () => {
    const fresh = aggregateDiagnoses(three).labels[0].score;
    const stale = aggregateDiagnoses(three, { now: "2026-11-01T10:00:00Z" }).labels;
    expect(stale.length === 0 || stale[0].score < fresh).toBe(true);
    const later = aggregateDiagnoses(three.map((row) => ({ ...row, laterCorrect: true })), { minScore: 0 }).labels[0];
    expect(later.score).toBeLessThan(fresh);
    const secondary = aggregateDiagnoses(three, { minScore: 0 }).labels.find((entry) => entry.code === "logic.reason_supports_opposite")!;
    expect(secondary.primarySelections).toBe(0);
    expect(secondary.score).toBeCloseTo(fresh / 2, 3);
    expect(aggregateDiagnoses(three, { now: "2027-01-01T10:00:00Z" }).labels).toEqual([]);
    expect(() => aggregateDiagnoses(three, { now: "2026-10-02T10:00:00Z" })).toThrow(/after/);
  });

  it("rolls different labels of one category up into a category weakness", () => {
    const mixed = [pick("i1", "2026-10-01T10:00:00Z"), pick("i2", "2026-10-02T10:00:00Z", contrast), pick("i3", "2026-10-03T10:00:00Z", contrast)];
    const report = aggregateDiagnoses(mixed);
    expect(report.labels).toEqual([]);
    expect(report.categories[0]).toMatchObject({ category: "relation", items: 3 });
    expect(report.categories[0].labels[0]).toBe("relation.concession_vs_contrast");
  });
});

describe("item audit", () => {
  const valid: CalibrationEvidence = {
    blindAgrees: true,
    answerConfidence: 0.9,
    keyAcceptable: true,
    keyNatural: true,
    unresolved: 0,
    cheaplyEliminable: 0,
    relationLogic: 4,
    functional: 3,
    wrong: 4,
    answerFoundWithoutTarget: false,
    keyRelationUnique: true,
  };

  it("labels an ambiguous item defective, never hard", () => {
    const ambiguous = { ...valid, unresolved: 1, functional: 3, keyRelationUnique: false };
    expect(calibratedBand(ambiguous).band).toBe("defective");
    expect(calibratedBand({ ...valid, blindAgrees: false }).band).toBe("defective");
  });

  it("labels an invalid key defective", () => {
    expect(calibratedBand({ ...valid, keyAcceptable: false }).band).toBe("defective");
    expect(calibratedBand({ ...valid, keyNatural: false }).band).toBe("defective");
  });

  it("does not calibrate when the blind solve agrees only weakly", () => {
    expect(calibratedBand({ ...valid, answerConfidence: 0.4 }).band).toBeNull();
  });

  it("labels an item easy when wrong options fall without the target relation", () => {
    expect(calibratedBand({ ...valid, cheaplyEliminable: 3, relationLogic: 1, functional: 1 }).band).toBe("easy");
    expect(calibratedBand({ ...valid, answerFoundWithoutTarget: true }).band).toBe("easy");
  });

  it("labels a valid item that needs the relation medium, and stays medium without evidence of subtlety", () => {
    expect(calibratedBand(valid).band).toBe("medium");
    expect(calibratedBand({ ...valid, functional: 4 }).band).toBe("medium");
    expect(calibratedBand({ ...valid, keyRelationUnique: false }).band).toBe("medium");
  });

  it("labels a valid subtle item hard only when every wrong option is functional within the key's relation", () => {
    expect(calibratedBand({ ...valid, functional: 4, keyRelationUnique: false }).band).toBe("hard");
  });

  it("separates distractor quality from difficulty and validates labels blind", () => {
    const options = { A: "although the trial was short", B: "whereas the trial ran for years", C: "because the drug failed", D: "provided that the dose was halved", E: "as soon as the funding stopped" };
    const seen = (option: "A" | "B" | "C" | "D" | "E", overrides: Partial<ItemAuditReport["options"][number]> = {}): ItemAuditReport["options"][number] => ({
      option,
      note: "n",
      acceptable: false,
      natural: true,
      eliminatedBy: "relation_logic",
      clue: "none",
      implausibleScenario: false,
      tenseClash: false,
      negatesStem: false,
      restatesStem: false,
      contentFailure: "logic.no_real_opposition",
      contentConfidence: 0.9,
      ...overrides,
    });
    const report: ItemAuditReport = {
      reasons: [],
      answer: "A",
      answerConfidence: 0.9,
      options: [
        seen("A", { acceptable: true, eliminatedBy: "cannot_eliminate", contentFailure: "sentence_works" }),
        seen("B"),
        seen("C", { eliminatedBy: "at_a_glance", negatesStem: true, contentFailure: "contradicts_stem" }),
        seen("D", { contentFailure: "logic.condition_cannot_restrict" }),
        seen("E", { contentFailure: "logic.time_order" }),
      ],
      answerFoundWithoutTarget: false,
      whyWithoutTarget: "w",
    };
    const diagnoses = (["B", "C", "D", "E"] as const).map((option, index) => ({ option, role: "r", diagnosis: diagnoseSlot([slot("contrast"), slot("cause"), slot("condition"), slot("sequence", "logical_incompatibility")][index]) }));
    const audit = evaluateItemAudit({ specId: "s", stem: "----, the drug was approved.", options, key: "A", targetRelation: "discourse_relation:concession", roles: {}, diagnoses, original: "easy", requested: "medium", report });
    expect(audit.calibrated.band).toBe("medium");
    expect(audit.original).toBe("easy");
    expect(audit.requested).toBe("medium");
    expect(audit.distractorQuality).toEqual({ functional: 3, of: 4 });
    expect(audit.options.map((entry) => entry.label?.status)).toEqual(["confirmed", "disputed", "confirmed", "confirmed"]);
    expect(audit.options[1].label?.effective).toMatchObject({ primary: "relation.polarity_reversed", secondary: null });

    const unnaturalKey = { ...report, options: report.options.map((entry) => (entry.option === "A" ? { ...entry, natural: false } : entry)) };
    expect(evaluateItemAudit({ specId: "s", stem: "----, the drug was approved.", options, key: "A", targetRelation: "discourse_relation:concession", roles: {}, diagnoses, original: "hard", report: unnaturalKey }).calibrated.band).toBe("defective");
    const unnaturalWrong = { ...report, options: report.options.map((entry) => (entry.option === "B" ? { ...entry, natural: false } : entry)) };
    expect(evaluateItemAudit({ specId: "s", stem: "----, the drug was approved.", options, key: "A", targetRelation: "discourse_relation:concession", roles: {}, diagnoses, original: "medium", report: unnaturalWrong }).distractorQuality).toEqual({ functional: 2, of: 4 });
  });
});
