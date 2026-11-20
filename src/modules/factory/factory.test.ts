import { describe, expect, it } from "vitest";
import { analysisDraft, optionLabels, type AnalysisDraft } from "@/modules/analysis/contract";
import { toDnaQuestion, type DnaQuestion } from "@/modules/analysis/dna";
import { ydsDnaV1 } from "@/modules/analysis/corpus";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import type { NodeRef } from "@/modules/knowledge/graph";
import { completedSentences, generatedQuestionCandidate, type GeneratedQuestionCandidate } from "./candidate";
import { connectorsFor, familyBlueprints } from "./families";
import { distractorDecision, reportFromVerdict } from "./distractor";
import type { DistractorSpec } from "./distractor-spec";
import { judgeDecision, judgeReport, planReviewConcerns, type JudgeReport, type OptionAcceptability } from "./judge";
import { claimGrounds, concessionAlignment, declineJustified, inferenceReward, reasonLicensed, undemonstratedExempt } from "./plan-logic";
import { skeletonGateDecision } from "./skeleton";
import { defaultFactoryThresholds } from "./thresholds";
import { buildDistractorSpecs } from "./distractor-spec";
import { buildExamProfile, consistentMisconception, evidenceLevel, familyConcept } from "./profile";
import { generatorJudgeIndependent, provenance } from "./provenance";
import { applyReview, engineAdmission, initialStatus, type CandidateRecord } from "./review";
import { buildQuestionSpec, pickTarget } from "./spec-engine";
import { questionSpec } from "./spec";
import { leadingConnector, originalityIndex, validateCandidate } from "./validator";
import { factoryVersions } from "./versions";

const item: ReconstructedQuestion = {
  number: 30,
  section: "sentence",
  layout: "blank",
  stimulusKey: null,
  stimulus: null,
  stem: "An invented fixture stem that is long enough to look like a sentence completion item ----.",
  options: {
    A: "although one two three four five six seven eight nine ten eleven twelve thirteen fourteen",
    B: "because one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen",
    C: "unless one two three four five six seven eight nine ten",
    D: "whereas one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty",
    E: "until one two three four five six seven eight nine ten eleven twelve",
  },
  translationDirection: null,
};

const draft = (patch: Partial<AnalysisDraft> = {}): AnalysisDraft =>
  analysisDraft.parse({
    question_number: 30,
    question_type: "question_type:sentence_completion",
    correct_option: "A",
    knowledge: { primary_concepts: ["discourse_relation:concession", "grammar:adverbial_clause"], secondary_concepts: [], grammar: ["grammar_pattern:clause_connector"], vocabulary: [], discourse_relations: ["discourse_relation:concession"] },
    skills: { primary: "skill:coherence", secondary: [], cognitive: ["cognitive_skill:logical_relationship"] },
    difficulty: { overall: 0.55, lexical: 0.3, syntactic: 0.4, semantic: 0.5, inference: 0.5, distractor_similarity: 0.6, context_dependency: 0.4 },
    answer_expresses: ["connector:although", "discourse_relation:concession"],
    distractors: [
      { label: "B", type: "distractor_type:wrong_discourse_relation", expresses: "connector:because", targeted_concept: null, misconception: "misconception:concession_vs_contrast", why_plausible: "x", why_wrong: "y" },
      { label: "C", type: "distractor_type:wrong_discourse_relation", expresses: "connector:unless", targeted_concept: null, misconception: null, why_plausible: "x", why_wrong: "y" },
      { label: "D", type: "distractor_type:wrong_discourse_relation", expresses: "connector:whereas", targeted_concept: null, misconception: "misconception:concession_vs_contrast", why_plausible: "x", why_wrong: "y" },
      { label: "E", type: "distractor_type:logical_incompatibility", expresses: "connector:until", targeted_concept: null, misconception: null, why_plausible: "x", why_wrong: "y" },
    ],
    misconceptions: ["misconception:concession_vs_contrast"],
    prerequisites: [],
    learning_objective: "tell concession from contrast",
    pedagogy: { cognitive_demand: "analyze", transfer_requirement: "medium" },
    proposals: [],
    ambiguities: [],
    confidence: 0.9,
    needs_review: false,
    ...patch,
  });

const row = (document: string, number: number, patch: Partial<AnalysisDraft> = {}): DnaQuestion =>
  toDnaQuestion({ document, question: { ...item, number }, analysis: draft(patch), answer: "A", textSha256: "0".repeat(64), proposals: [] });

const rows: DnaQuestion[] = [row("yds-2018", 31), row("yds-2018-2", 32), row("yds-2023-10", 33), row("yds-2024-11", 34)];
const profile = buildExamProfile(rows);
const family = familyBlueprints["sentence_completion.concession"];
const spec = buildQuestionSpec({ profile, family, ordinal: 1 });

const good = (patch: Partial<GeneratedQuestionCandidate> = {}): GeneratedQuestionCandidate =>
  generatedQuestionCandidate.parse({
    question: {
      stem: "Many desert plants survive long periods without any rain at all ----.",
      options: {
        A: "although their thin roots reach only a few centimetres below the dry surface",
        B: "whereas most forest trees depend on deep roots to collect underground water",
        C: "because their leaves lose large amounts of water during the hottest hours",
        D: "unless scientists measure the exact amount of water stored in each stem",
        E: "until the first seeds appear several weeks before the plants themselves grow",
      },
    },
    correctOption: "A",
    explanation:
      "Doğru cevap A. 'although' ile kurulan yan cümle beklentinin tersine bir durumu anlatır: kökler kısa olduğu halde bitkiler hayatta kalır. B iki grubu karşılaştırır, C sebep verir ama sonuçla çelişir, D koşulu ilgisizdir, E zaman sırası uymaz.",
    distractorRationales: [
      { option: "B", distractorType: "distractor_type:wrong_discourse_relation", misconception: "misconception:concession_vs_contrast", whyPlausible: "Karşıtlık var gibi görünür.", whyWrong: "Beklenmedik sonuç yok, yalnızca karşılaştırma var." },
      { option: "C", distractorType: "distractor_type:wrong_discourse_relation", misconception: null, whyPlausible: "Sebep bildirir.", whyWrong: "Su kaybı hayatta kalmayı açıklamaz." },
      { option: "D", distractorType: "distractor_type:wrong_discourse_relation", misconception: null, whyPlausible: "Koşul bağlacı akıcı durur.", whyWrong: "Ölçüm hayatta kalmayı koşullamaz." },
      { option: "E", distractorType: "distractor_type:logical_incompatibility", misconception: null, whyPlausible: "Zaman bildirir.", whyWrong: "Olay sırası mantıksız." },
    ],
    targetConcept: "discourse_relation:concession",
    targetSkill: "skill:coherence",
    metadata: { connectorByOption: { A: "although", B: "whereas", C: "because", D: "unless", E: "until" }, selfRatedDifficulty: "medium" },
    ...patch,
  });

const codes = (candidate: GeneratedQuestionCandidate, extra: Parameters<typeof validateCandidate>[0] extends infer T ? Partial<T> : never = {}) =>
  validateCandidate({ spec, candidate, ...extra }).issues.map((issue) => issue.code);

const withOption = (label: "A" | "B" | "C" | "D" | "E", text: string) => {
  const base = good();
  return { ...base, question: { ...base.question, options: { ...base.question.options, [label]: text } } };
};

describe("exam profile", () => {
  it("grades evidence by volume and breadth across exams", () => {
    expect(evidenceLevel(0, 0)).toBe("unsupported");
    expect(evidenceLevel(12, 2)).toBe("observed");
    expect(evidenceLevel(10, 3)).toBe("frequent");
    expect(evidenceLevel(2, 2)).toBe("rare");
  });

  it("puts each question in exactly one family, preferring the answer relation", () => {
    expect(familyConcept(rows[0])).toBe("discourse_relation:concession");
    const family = profile.families.find((entry) => entry.id === "sentence_completion.concession");
    expect(family).toMatchObject({ questions: 4, documents: 4, level: "observed" });
    expect(profile.families.reduce((sum, entry) => sum + entry.questions, 0)).toBe(rows.length);
  });

  it("checks misconception labels against the relations the graph says they confuse", () => {
    const [question] = rows;
    const byLabel = Object.fromEntries(question.distractors.map((entry) => [entry.position, entry]));
    expect(consistentMisconception(question, byLabel.D)).toBe(true);
    expect(consistentMisconception(question, byLabel.B)).toBe(false);
    const evidence = profile.misconceptions.find((entry) => entry.ref === "misconception:concession_vs_contrast");
    expect(evidence).toMatchObject({ labelled: 8, consistent: 4, confusedRelations: ["discourse_relation:concession", "discourse_relation:contrast"] });
  });

  it("lists canonical nodes without DNA evidence and graph gaps without changing the graph", () => {
    expect(profile.unsupported).toContain("discourse_relation:emphasis");
    expect(profile.unsupported).not.toContain("discourse_relation:concession");
    expect(profile.evidenceScope).toBe("exam_distribution");
    expect(profile.graphGaps.measures.some((gap) => gap.ref === "skill:coherence")).toBe(true);
  });

  it("ignores topic slices", () => {
    const slice = { ...row("e-yds-topic-conj", 1), sourceClass: "topic_slice" as const };
    expect(buildExamProfile([...rows, slice]).questions).toBe(rows.length);
  });
});

describe("QuestionSpec engine", () => {
  it("picks the type the bank lacks most and a misconception tied to the concept", () => {
    const dna = ydsDnaV1({ questions: [row("yds-2018", 1), row("yds-2018", 2, { question_type: "question_type:cloze", knowledge: { ...draft().knowledge, primary_concepts: ["discourse_relation:contrast"] } })] }).dna;
    const target = pickTarget({ dna, productionTypeCounts: [{ key: "question_type:cloze", count: 10 }] });
    expect(target).toEqual({ questionType: "question_type:sentence_completion", primaryConcept: "discourse_relation:concession", misconception: "misconception:concession_vs_contrast", band: "medium" });
  });

  it("builds a valid, deterministic spec from the profile and the graph", () => {
    expect(questionSpec.parse(spec)).toEqual(spec);
    expect(buildQuestionSpec({ profile, family, ordinal: 1 })).toEqual(spec);
    expect(spec).toMatchObject({
      version: factoryVersions.questionSpec,
      id: "sentence_completion.concession.medium.001",
      exam: "yds",
      questionType: "question_type:sentence_completion",
      primaryConcept: "discourse_relation:concession",
      grammarPattern: "grammar_pattern:clause_connector",
      targetMisconception: "misconception:concession_vs_contrast",
      targetSkill: "skill:coherence",
      cognitiveSkill: "cognitive_skill:logical_relationship",
      difficulty: { band: "medium", cefr: "B2" },
      answerConstraints: { correctOption: "A", connectors: ["connector:although", "connector:even_though"] },
      originalityConstraints: { historicalTextInPrompt: false, fewShotFromHistory: false },
    });
    expect(spec.requiredKnowledge).toEqual(expect.arrayContaining(["grammar_pattern:clause_connector", "discourse_relation:contrast"]));
    expect(spec.distractorPlan.map((slot) => [slot.option, slot.expresses])).toEqual([
      ["B", "discourse_relation:contrast"],
      ["C", "discourse_relation:cause"],
      ["D", "discourse_relation:condition"],
      ["E", "discourse_relation:sequence"],
    ]);
    expect(spec.vocabularyConstraints.forbiddenInDistractors).toEqual(expect.arrayContaining(["although", "even though", "despite", "nevertheless", "though"]));
  });

  it("resolves connectors through the graph and keeps 'but' out of the contrast trap", () => {
    expect(connectorsFor("discourse_relation:contrast", "grammar_pattern:clause_connector", family.excludedConnectors)).toEqual(["connector:whereas"]);
    expect(connectorsFor("discourse_relation:cause", "grammar_pattern:clause_connector")).toEqual(["connector:because"]);
  });

  it("rotates the key and distractor positions and the context across a slice", () => {
    const specs = Array.from({ length: 10 }, (_, index) => buildQuestionSpec({ profile, family, ordinal: index + 1 }));
    const keys = specs.map((entry) => entry.answerConstraints.correctOption);
    expect(new Set(keys).size).toBe(5);
    expect(keys.filter((key) => key === "A")).toHaveLength(2);
    expect(new Set(specs.map((entry) => entry.contextConstraints.domain)).size).toBe(10);
    expect(new Set(specs.map((entry) => entry.contextConstraints.blankPosition))).toEqual(new Set(["start", "end"]));
    expect(new Set(specs.map((entry) => entry.distractorPlan.find((slot) => slot.misconception)?.option)).size).toBeGreaterThan(1);
  });

  it("refuses families without DNA evidence and bad ordinals", () => {
    expect(() => buildQuestionSpec({ profile: buildExamProfile([]), family, ordinal: 1 })).toThrow(/no DNA evidence/);
    expect(() => buildQuestionSpec({ profile, family, ordinal: 0 })).toThrow();
  });
});

describe("candidate validator", () => {
  it("passes a well-formed candidate", () => {
    const result = validateCandidate({ spec, candidate: good() });
    expect(result.issues).toEqual([]);
    expect(result.status).toBe("pass");
    expect(result.metrics.connectors).toEqual({ A: "connector:although", B: "connector:whereas", C: "connector:because", D: "connector:unless", E: "connector:until" });
  });

  it("reads the leading connector, longest surface first", () => {
    expect(leadingConnector("Even though it rained")).toBe("connector:even_though");
    expect(leadingConnector("as long as it rains")).toBe("connector:as_long_as");
    expect(leadingConnector("since it rained")).toBeNull();
  });

  it.each([
    ["moved answer", good({ correctOption: "B" }), "correct_option_mismatch"],
    ["changed concept", good({ targetConcept: "discourse_relation:contrast" }), "spec_drift"],
    ["duplicate options", withOption("C", "whereas most forest trees depend on deep roots to collect underground water"), "option_duplicate"],
    ["no blank", good({ question: { ...good().question, stem: "Many desert plants survive long periods without any rain at all." } }), "blank_count"],
    ["blank in the middle", good({ question: { ...good().question, stem: "Many desert plants ---- survive long periods without any rain at all." } }), "blank_position"],
    ["concessive word in a distractor", withOption("C", "because their leaves stay green even though water is very scarce"), "forbidden_marker_in_distractor"],
    ["concessive connector as distractor", withOption("B", "even though most forest trees depend on deep roots to collect water"), "distractor_has_target_relation"],
    ["wrong relation in a slot", withOption("D", "after scientists measure the exact amount of water stored in each stem"), "distractor_connector_mismatch"],
    ["unrecognised connector", withOption("E", "since the first seeds appear several weeks before the plants grow tall"), "connector_unrecognised"],
    ["answer connector outside the spec", withOption("A", "despite their thin roots reaching only a few centimetres below the dry surface"), "answer_connector_not_allowed"],
    ["option label leak", withOption("B", "B) whereas most forest trees depend on deep roots to collect underground water"), "text_integrity"],
    ["Turkish in an option", withOption("E", "until the first seeds appear several weeks before the plants büyür quickly"), "non_english_text"],
    ["far too long", withOption("C", `because ${"very ".repeat(40)}hot`), "length_far_out"],
    ["explanation names another key", good({ explanation: "Doğru cevap B çünkü 'although' burada uymaz." }), "explanation_names_other_answer"],
    ["rationale for the key", good({ distractorRationales: good().distractorRationales.map((entry, index) => (index === 0 ? { ...entry, option: "A" as const } : entry)) }), "rationale_options"],
    ["changed distractor type", good({ distractorRationales: good().distractorRationales.map((entry, index) => (index === 3 ? { ...entry, distractorType: "distractor_type:semantic_mismatch" as NodeRef } : entry)) }), "distractor_type_mismatch"],
    ["a connector swap over the answer's clause", withOption("C", "because their thin roots reach only a few centimetres below the dry surface"), "connector_swap"],
    ["capitalisation that singles out one option", withOption("A", "Although their thin roots reach only a few centimetres below the dry surface"), "inconsistent_capitalisation"],
    ["invented taxonomy", good({ distractorRationales: good().distractorRationales.map((entry, index) => (index === 1 ? { ...entry, misconception: "misconception:made_up" as NodeRef } : entry)) }), "unknown_ref"],
  ])("rejects %s", (_name, candidate, code) => {
    const result = validateCandidate({ spec, candidate: candidate as GeneratedQuestionCandidate });
    expect(result.status).toBe("reject");
    expect(result.issues.filter((issue) => issue.severity === "critical").map((issue) => issue.code)).toContain(code);
  });

  it("rejects overlap with historical items and duplicates within the batch", () => {
    const index = originalityIndex(["Many desert plants survive long periods in the heat."]);
    expect(codes(good(), { originality: index })).toContain("source_overlap");
    expect(validateCandidate({ spec, candidate: good(), originality: originalityIndex(["Something else entirely, never seen."]) }).status).toBe("pass");
    expect(codes(good(), { siblings: [{ id: "x", stem: good().question.stem, options: good().question.options }] })).toContain("duplicate_of_sibling");
  });

  it("does not read the next sentence's option letter as the named key", () => {
    expect(codes(good({ explanation: "Bu yüzden although bağlacı doğru seçenektir. B seçeneği koşul bildirir." }))).not.toContain("explanation_names_other_answer");
    expect(codes(good({ explanation: "Doğru seçenek beklenmedik sonuç (-e rağmen) ilişkisi kurar. D seçeneği neden bildirir." }))).not.toContain("explanation_names_other_answer");
    expect(codes(good({ explanation: "Doğru yanıt (A) çünkü although beklenmeyen bir sonucu verir." }))).not.toContain("explanation_names_other_answer");
  });

  it("warns about greetings and the wrong term in explanations", () => {
    expect(codes(good({ explanation: `Merhaba! ${good().explanation}` }))).toContain("explanation_style");
    expect(codes(good({ explanation: `${good().explanation} Bu bir taviz ilişkisidir.` }))).toContain("explanation_style");
    expect(codes(good({ explanation: `${good().explanation} Bu bir ödünleme ilişkisidir.` }))).toContain("explanation_style");
    expect(codes(good())).not.toContain("explanation_style");
  });

  it("writes each option into the blank for the acceptability check", () => {
    const sentences = completedSentences(good());
    expect(sentences.A).toBe(good().question.stem.replace("----", good().question.options.A));
    expect(Object.values(sentences).every((sentence) => !sentence.includes("----"))).toBe(true);
  });

  it("warns about clues without rejecting", () => {
    const long = withOption("A", "although their thin roots reach only a few centimetres below the dry and very hot sandy desert surface every day");
    const result = validateCandidate({ spec, candidate: long });
    expect(result.issues.map((issue) => issue.code)).toContain("length_clue");
    expect(result.status).toBe("pass");
  });

  it("checks a relational joint plan with the same connector menu as generation", () => {
    const item = buildQuestionSpec({ profile, family, ordinal: 308, band: "hard" });
    const planned = [
      { option: "A" as const, relationFamily: "near_concession", connectorStrategy: "natural" },
      { option: "B" as const, relationFamily: "condition", connectorStrategy: "natural" },
      { option: "D" as const, relationFamily: "time", connectorStrategy: "natural" },
      { option: "E" as const, relationFamily: "contrast", connectorStrategy: "natural" },
    ];
    const candidate = good({
      question: {
        stem: "----, the hut's food stores were still full at the inspection.",
        options: {
          A: "Although earlier parties had used up the hut's food stores before the crew arrived",
          B: "As long as the trail crew reached the upper hut every single week",
          C: "Even though a rockslide had blocked the only track to the upper hut",
          D: "As soon as the trail crew had cleared the track for the season",
          E: "Whereas the upper hut's food supplies had been running low for weeks by then",
        },
      },
      correctOption: "C",
      explanation: "Doğru cevap C. 'even though' beklentinin tersine bir sonucu anlatır. A yakındaki sınırı karşıtlık gibi kurar, B koşul bildirir, D zaman sırası kurar, E karşılaştırır.",
      distractorRationales: [
        { option: "A", distractorType: "distractor_type:wrong_discourse_relation", misconception: "misconception:concession_vs_contrast", whyPlausible: "Yakın bir sınır gibi durur.", whyWrong: "Beklenmedik sonuç ilişkisi kurulmaz." },
        { option: "B", distractorType: "distractor_type:wrong_discourse_relation", misconception: null, whyPlausible: "Koşul akıcı durur.", whyWrong: "Haftalık erişim denetim anını koşullamaz." },
        { option: "D", distractorType: "distractor_type:logical_incompatibility", misconception: null, whyPlausible: "Zaman sırası kurar.", whyWrong: "Denetim anı bu sırayı gerektirmez." },
        { option: "E", distractorType: "distractor_type:wrong_discourse_relation", misconception: "misconception:concession_vs_contrast", whyPlausible: "Karşıtlık var gibi görünür.", whyWrong: "Yalnızca karşılaştırma vardır." },
      ],
      metadata: { connectorByOption: { A: "although", B: "as long as", C: "even though", D: "as soon as", E: "whereas" }, selfRatedDifficulty: "medium" },
    });
    const mismatches = (blueprints?: { option: "A" | "B" | "D" | "E"; relationFamily: string; connectorStrategy: string }[], next = candidate) =>
      validateCandidate({ spec: item, candidate: next, blueprints }).issues.filter((issue) => issue.code === "distractor_connector_mismatch");

    expect(mismatches().map((issue) => issue.option)).toEqual(["A", "B", "D", "E"]);
    expect(mismatches(planned)).toEqual([]);
    expect(validateCandidate({ spec: item, candidate, blueprints: planned }).issues.map((issue) => issue.code)).not.toContain("sole_concessive_clue");

    const wrongFamily = planned.map((entry) => (entry.option === "B" ? { ...entry, relationFamily: "cause" } : entry));
    expect(mismatches(wrongFamily).map((issue) => issue.detail)).toEqual(["connector:as_long_as ∉ discourse_relation:cause"]);

    const because = good({
      ...candidate,
      question: { ...candidate.question, options: { ...candidate.question.options, B: "Because the trail crew reached the upper hut every single week" } },
      metadata: { ...candidate.metadata, connectorByOption: { ...candidate.metadata.connectorByOption, B: "because" } },
    });
    expect(mismatches(planned, because).map((issue) => issue.detail)).toEqual(["connector:because ∉ discourse_relation:condition"]);

    expect(mismatches(planned.map((entry) => ({ ...entry, connectorStrategy: "free" }))).map((issue) => issue.option)).toEqual(["A", "B", "D", "E"]);
    expect(mismatches(planned.map((entry) => ({ ...entry, relationFamily: "made_up" }))).map((issue) => issue.option)).toEqual(["A", "B", "D", "E"]);

    const whereas = good({
      ...candidate,
      question: { ...candidate.question, options: { ...candidate.question.options, A: "Whereas earlier parties had used up the hut's food stores before the crew arrived" } },
      metadata: { ...candidate.metadata, connectorByOption: { ...candidate.metadata.connectorByOption, A: "whereas" } },
    });
    const repeated = validateCandidate({ spec: item, candidate: whereas, blueprints: planned });
    expect(repeated.issues.filter((issue) => issue.code === "distractor_connector_mismatch")).toEqual([]);
    expect(repeated.issues.map((issue) => issue.code)).toContain("sole_concessive_clue");
    expect(repeated.issues.map((issue) => issue.code)).not.toContain("connector_repeated");
    const doubled = good({
      ...candidate,
      question: { ...candidate.question, options: { ...candidate.question.options, A: "Although earlier parties had used the stores even though the crew had not arrived" } },
    });
    expect(validateCandidate({ spec: item, candidate: doubled, blueprints: planned }).issues.filter((issue) => issue.code === "connector_repeated").map((issue) => issue.option)).toEqual(["A"]);

    const lexical = buildQuestionSpec({ profile, family, ordinal: 1, band: "hard" });
    const lexicalPlan = [{ option: "B" as const, relationFamily: "cause", connectorStrategy: "natural" }];
    expect(validateCandidate({ spec: lexical, candidate: good(), blueprints: lexicalPlan }).issues.filter((issue) => issue.code === "distractor_connector_mismatch")).toEqual([]);

    const causePlan = [{ option: "B" as const, relationFamily: "cause", connectorStrategy: "natural" }];
    const becauseOnContrast = withOption("B", "because most forest trees depend on deep roots to collect underground water");
    const easy = buildQuestionSpec({ profile, family, ordinal: 1, band: "easy" });
    expect(validateCandidate({ spec, candidate: becauseOnContrast, blueprints: causePlan }).issues.filter((issue) => issue.code === "distractor_connector_mismatch").map((issue) => issue.option)).toEqual(["B"]);
    expect(validateCandidate({ spec: easy, candidate: becauseOnContrast, blueprints: causePlan }).issues.filter((issue) => issue.code === "distractor_connector_mismatch").map((issue) => issue.option)).toEqual(["B"]);
  });
});

const report = (patch: Partial<JudgeReport> = {}): JudgeReport =>
  judgeReport.parse({
    scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 },
    alternativeDefensibleOptions: [],
    estimatedDifficulty: "medium",
    verdict: "APPROVE",
    reasons: [],
    ...patch,
  });

const onlyKey = (acceptable: Partial<Record<(typeof optionLabels)[number], number>> = {}): OptionAcceptability => ({
  sentences: optionLabels.map((option) => {
    const confidence = acceptable[option];
    return { option, acceptable: confidence !== undefined ? confidence > 0 : option === "A", confidence: Math.abs(confidence ?? 0.9), reason: "" };
  }),
});

describe("judge decision", () => {
  const validation = validateCandidate({ spec, candidate: good() });
  const decide = (patch: Partial<JudgeReport> = {}, blindAnswer: "A" | "B" = "A", acceptability = onlyKey()) =>
    judgeDecision({ spec, validation, judge: { blindAnswer, blindConfidence: 0.9, acceptability, report: report(patch) } });

  it("keeps a standalone natural sentence out of the second-answer reject, and still rejects a key that does not read", () => {
    const natural = onlyKey({ D: 0.8 });
    natural.sentences = natural.sentences.map((entry) => (entry.option === "D" ? { ...entry, relationCoherent: true } : entry));
    const result = decide({}, "A", natural);
    expect(result).toMatchObject({ verdict: "APPROVE", acceptableOptions: ["A", "D"], relationCoherentOptions: ["D"], reasoningStatus: "unverified" });
    expect(result.failures.some((failure) => failure.startsWith("acceptable_distractor_"))).toBe(false);
    expect(decide({}, "A", onlyKey({ D: 0.3 })).verdict).toBe("APPROVE");
    expect(decide({}, "A", onlyKey({ A: -0.9 })).failures).toContain("key_unacceptable");
    expect(decide({}, "A", { sentences: onlyKey().sentences.slice(0, 4).concat(onlyKey().sentences[0]) }).failures).toContain("acceptability_incomplete");
  });

  it("does not treat a correct letter as verified reasoning", () => {
    const fields = { blindAnswer: "A" as const, blindConfidence: 0.9, acceptability: onlyKey(), report: report() };
    const missing = judgeDecision({ spec, validation, judge: { ...fields, blindEvidence: "" } });
    expect(missing.reasoningStatus).toBe("unverified");
    expect(missing.verdict).toBe("REVIEW");
    expect(missing.failures).not.toContain("blind_evidence_missing");
    expect(missing.concerns).toContain("blind_evidence_missing");
    const unsure = judgeDecision({ spec, validation, judge: { ...fields, blindEvidence: "thin roots", blindUncertain: true } });
    expect(unsure.verdict).toBe("REVIEW");
    expect(unsure.concerns).toContain("blind_low_confidence");
    expect(unsure.failures).toEqual([]);
    expect(unsure.reasoningStatus).toBe("unverified");
    const named = judgeDecision({ spec, validation, judge: { ...fields, blindEvidence: "thin roots", blindAlternative: "D" } });
    expect(named.failures).toContain("second_defensible_D");
    expect(named.reasoningStatus).toBe("unverified");
    const namedUnsure = judgeDecision({ spec, validation, judge: { ...fields, blindConfidence: 0.4, blindEvidence: "thin roots", blindUncertain: true, blindAlternative: "D" } });
    expect(namedUnsure.failures.some((failure) => failure.startsWith("second_defensible_"))).toBe(false);
    expect(namedUnsure.concerns).toContain("blind_second_uncertain_D");
  });

  it("shows plan-review concerns without treating them as verified errors", () => {
    const fields = { blindAnswer: "A" as const, blindConfidence: 0.9, acceptability: onlyKey(), report: report() };
    const missing = judgeDecision({ spec, validation, judge: { ...fields, planConcerns: ["review_missing"] } });
    expect(missing.verdict).toBe("REVIEW");
    expect(missing.failures).not.toContain("review_missing");
    expect(missing.concerns).toContain("review_missing");
    expect(engineAdmission({ validation, judge: missing }).failure).toBe("unresolved_review");
    const low = judgeDecision({ spec, validation, judge: { ...fields, planConcerns: ["planned_second_answer", "low_confidence"] } });
    expect(low.verdict).toBe("REVIEW");
    expect(low.failures).not.toContain("planned_second_answer");
    expect(low.concerns).toEqual(expect.arrayContaining(["planned_second_answer", "low_confidence"]));
    const ground = judgeDecision({ spec, validation, judge: { ...fields, planConcerns: ["plan_ground_unanchored", "plan_ground_uncertain"] } });
    expect(ground.failures).not.toContain("plan_ground_unanchored");
    expect(ground.concerns).toEqual(expect.arrayContaining(["plan_ground_unanchored", "plan_ground_uncertain"]));
  });

  it("reads plan concerns from the attempt that reviewed the plans", () => {
    expect(planReviewConcerns([
      { stage: "skeleton", judge: { concerns: ["other_continuations_open", "low_confidence"] } },
      { stage: "distractorPlan", judge: { concerns: ["review_missing", "low_confidence"] } },
    ])).toEqual(["review_missing", "low_confidence"]);
    expect(planReviewConcerns([{ stage: "skeleton", judge: { concerns: ["planned_second_answer", "low_confidence", "other_continuations_open"] } }])).toEqual(["planned_second_answer", "low_confidence"]);
    expect(planReviewConcerns([{ stage: "skeleton", judge: { concerns: ["low_confidence"] } }])).toEqual([]);
  });

  it("approves only when the model and every rule agree", () => {
    expect(decide().verdict).toBe("APPROVE");
    expect(decide().qualityScore).toBeGreaterThan(0.85);
  });

  it("rejects when the blind solve disagrees or a second answer is defensible", () => {
    expect(decide({}, "B")).toMatchObject({ verdict: "REJECT", blindAgrees: false });
    expect(decide({ alternativeDefensibleOptions: ["B"] }).failures).toContain("second_defensible_B");
  });

  it("rejects the contradictory packet and leaves the unused fields out of the verdict", () => {
    const hard = { ...spec, difficulty: { ...spec.difficulty, band: "hard" as const, cefr: "C1" as const } };
    const rejected = {
      ...validation,
      status: "reject" as const,
      critical: validation.critical + 1,
      issues: [...validation.issues, { code: "sole_concessive_clue", severity: "critical" as const, option: "A" as const }],
    };
    const acceptability = onlyKey({ A: -0.8, C: 0.8 });
    const packet = {
      blindAnswer: "C" as const,
      blindConfidence: 0.55,
      blindEvidence: "can still be read",
      blindUncertain: true,
      blindAlternative: "B" as const,
      acceptability,
      report: report({ verdict: "REVIEW", estimatedDifficulty: "medium" }),
    };
    const review = judgeDecision({ spec: hard, validation: rejected, judge: packet });
    expect(review.verdict).toBe("REJECT");
    expect(review.modelVerdict).toBe("REVIEW");
    expect(review.blindAgrees).toBe(false);
    expect(review.failures).toEqual(expect.arrayContaining(["validator_rejected", "blind_answer_C", "key_unacceptable"]));
    expect(review.failures.some((failure) => failure.startsWith("second_defensible_"))).toBe(false);
    expect(review.concerns).not.toContain("blind_low_confidence");
    expect(review.concerns).not.toContain("blind_second_uncertain_B");
    expect(review.concerns).toContain("difficulty_medium");
    expect(review.relationCoherentOptions).toEqual([]);
    expect(review.acceptableOptions).toEqual(["C"]);
    expect(engineAdmission({ validation: rejected, judge: review })).toMatchObject({ state: "REJECTED", status: "validator_rejected" });

    const approvedModel = judgeDecision({ spec: hard, validation, judge: { ...packet, report: report({ verdict: "APPROVE", estimatedDifficulty: "medium" }) } });
    expect(approvedModel.modelVerdict).toBe("APPROVE");
    expect(approvedModel.verdict).toBe("REJECT");
    expect(approvedModel.failures).toEqual(expect.arrayContaining(["blind_answer_C", "key_unacceptable"]));
    expect(approvedModel.failures).not.toContain("validator_rejected");
    expect(engineAdmission({ validation, judge: approvedModel })).toMatchObject({ state: "REJECTED", status: "judge_rejected" });

    const omitted = judgeDecision({ spec, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: onlyKey(), report: report() } });
    expect(omitted.relationCoherentOptions).toEqual([]);
    expect(omitted.failures).toEqual([]);
    expect(omitted.verdict).toBe("APPROVE");

    const incoherentKey = onlyKey();
    incoherentKey.sentences = incoherentKey.sentences.map((entry) => (entry.option === "A" ? { ...entry, relationCoherent: false } : entry));
    const incoherent = judgeDecision({ spec, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: incoherentKey, report: report() } });
    expect(incoherent.failures).toContain("key_relation_incoherent");
    expect(incoherent.verdict).toBe("REJECT");
    expect(incoherent.qualityScore).toBeGreaterThan(0.85);
  });

  it("rejects only an explicit incoherent key relation", () => {
    const high = report();
    const falseKey = onlyKey();
    falseKey.sentences = falseKey.sentences.map((entry) => (entry.option === "A" ? { ...entry, relationCoherent: false } : entry));
    const rejected = judgeDecision({ spec, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: falseKey, report: high } });
    expect(rejected.verdict).toBe("REJECT");
    expect(rejected.failures).toContain("key_relation_incoherent");
    expect(rejected.modelVerdict).toBe("APPROVE");

    const trueKey = onlyKey();
    trueKey.sentences = trueKey.sentences.map((entry) => (entry.option === "A" ? { ...entry, relationCoherent: true } : entry));
    const kept = judgeDecision({ spec, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: trueKey, report: high } });
    expect(kept.verdict).toBe("APPROVE");
    expect(kept.failures).not.toContain("key_relation_incoherent");
    expect(kept.relationCoherentOptions).toContain("A");

    const missing = judgeDecision({ spec, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: onlyKey(), report: high } });
    expect(missing.verdict).toBe("APPROVE");
    expect(missing.failures).not.toContain("key_relation_incoherent");

    const distractor = onlyKey({ D: 0.8 });
    distractor.sentences = distractor.sentences.map((entry) => (entry.option === "D" ? { ...entry, relationCoherent: false } : entry));
    const wrongOnly = judgeDecision({ spec, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: distractor, report: high } });
    expect(wrongOnly.verdict).toBe("APPROVE");
    expect(wrongOnly.failures).not.toContain("key_relation_incoherent");
  });

  it("rejects critical failures even with a high weighted score", () => {
    const result = decide({ scores: { ...report().scores, ambiguityRisk: 0.7 } });
    expect(result.verdict).toBe("REJECT");
    expect(result.qualityScore).toBeGreaterThan(0.85);
  });

  it("never loosens the model's verdict and sends gray zones to a human", () => {
    expect(decide({ verdict: "REJECT" }).verdict).toBe("REJECT");
    expect(decide({ scores: { ...report().scores, distractorQuality: 0.6 } }).verdict).toBe("REVIEW");
    expect(decide({ estimatedDifficulty: "hard" }).verdict).toBe("REVIEW");
  });

  it("keeps a band mismatch as a review", () => {
    const hard = { ...spec, difficulty: { ...spec.difficulty, band: "hard" as const, cefr: "C1" as const } };
    const result = judgeDecision({ spec: hard, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: onlyKey(), report: report({ estimatedDifficulty: "medium", verdict: "APPROVE" }) } });
    expect(result.verdict).toBe("REVIEW");
    expect(result.failures).not.toContain("difficulty_medium");
    expect(result.concerns).toContain("difficulty_medium");
  });

  const warned = (codes: { code: string; severity: "warn" | "critical" }[]) => {
    const issues = codes.map((issue) => ({ code: issue.code, severity: issue.severity }));
    const critical = issues.filter((issue) => issue.severity === "critical").length;
    return { ...validation, status: critical ? ("reject" as const) : ("pass" as const), critical, warnings: issues.length - critical, issues };
  };
  const admit = (codes: { code: string; severity: "warn" | "critical" }[], patch: Partial<JudgeReport> = {}) => {
    const checked = warned(codes);
    const decision = judgeDecision({ spec, validation: checked, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: onlyKey(), report: report(patch) } });
    return { checked, decision, admission: engineAdmission({ validation: checked, judge: decision }) };
  };

  it("lets a length miss through when every other check passes, and keeps the warning on the record", () => {
    const { checked, decision, admission } = admit([{ code: "length_out_of_range", severity: "warn" }, { code: "length_out_of_range", severity: "warn" }]);
    expect(checked.issues.map((issue) => issue.code)).toEqual(["length_out_of_range", "length_out_of_range"]);
    expect(checked.warnings).toBe(2);
    expect(decision.concerns).not.toContain("validator_warnings");
    expect(decision.verdict).toBe("APPROVE");
    expect(admission).toMatchObject({ status: "approved", state: "APPROVED", failure: null });
  });

  it("still blocks a length miss that sits beside a length clue", () => {
    const { decision, admission } = admit([
      { code: "length_out_of_range", severity: "warn" },
      { code: "length_clue", severity: "warn" },
    ]);
    expect(decision.concerns).toContain("validator_warnings");
    expect(decision.verdict).toBe("REVIEW");
    expect(admission).toMatchObject({ status: "judge_rejected", failure: "unresolved_review" });
  });

  it("still rejects a length miss that sits beside a far-out length", () => {
    const { decision, admission } = admit([
      { code: "length_out_of_range", severity: "warn" },
      { code: "length_far_out", severity: "critical" },
    ]);
    expect(decision.failures).toContain("validator_rejected");
    expect(decision.verdict).toBe("REJECT");
    expect(admission).toMatchObject({ status: "validator_rejected", failure: "final_validator" });
  });

  it("still rejects a second answer and a grammar failure beside a length miss", () => {
    const second = admit([{ code: "length_out_of_range", severity: "warn" }], { alternativeDefensibleOptions: ["B"] });
    expect(second.decision.failures).toContain("second_defensible_B");
    expect(second.admission.state).toBe("REJECTED");
    const grammar = admit([{ code: "length_out_of_range", severity: "warn" }], { scores: { ...report().scores, grammar: 0.5 } });
    expect(grammar.decision.failures).toContain("grammar_low");
    expect(grammar.decision.verdict).toBe("REJECT");
  });

  it("does not turn a Sonnet medium item into a hard admission", () => {
    const hard = { ...spec, difficulty: { ...spec.difficulty, band: "hard" as const, cefr: "C1" as const } };
    const checked = warned([{ code: "length_out_of_range", severity: "warn" }]);
    const reportMedium = report({ estimatedDifficulty: "medium", verdict: "APPROVE" });
    const decision = judgeDecision({ spec: hard, validation: checked, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: onlyKey(), report: reportMedium } });
    expect(reportMedium.estimatedDifficulty).toBe("medium");
    expect(decision.concerns).toEqual(["difficulty_medium"]);
    expect(decision.verdict).toBe("REVIEW");
    expect(engineAdmission({ validation: checked, judge: decision }).state).toBe("APPROVED");
  });
});

const prov = {
  pipelineVersion: factoryVersions.pipeline,
  provider: "gemini",
  generatorModel: "gen-model",
  distractorModel: "gen-model",
  distractorJudgeModel: "judge-model",
  judgeModel: "judge-model",
  explanationModel: "gen-model",
  generatorPromptVersion: "skeleton.v1",
  distractorPromptVersion: "distractor.v4",
  distractorJudgePromptVersion: "distractor-judge.v3",
  judgePromptVersion: "judge.v2",
  blindSolvePromptVersion: "verifier-solve.v1",
  acceptabilityPromptVersion: "acceptability.v1",
  explanationPromptVersion: "explanation.v2",
  questionSpecVersion: factoryVersions.questionSpec,
  distractorSpecVersion: factoryVersions.distractorSpec,
  specId: spec.id,
  knowledgeVersion: "1.0",
  dnaVersion: "1",
  examProfileVersion: factoryVersions.examProfile,
  candidateVersion: factoryVersions.candidate,
  validatorVersion: factoryVersions.validator,
  judgeVersion: factoryVersions.judge,
  distractorJudgeVersion: factoryVersions.distractorJudge,
  experiments: [],
  originalityVersion: factoryVersions.originality,
  generatedAt: "2026-10-08T12:00:00.000Z",
  attempts: [
    { stage: "skeleton" as const, option: null, attempt: 1, model: "gen-model", promptVersion: "skeleton.v1", requestHash: "a".repeat(64), cached: false, latencyMs: 900, output: "Although the trial was short, the drug worked.", validator: { status: "pass" as const, codes: [] }, judge: null, rejectionReason: null },
    {
      stage: "distractor" as const,
      option: "B" as const,
      attempt: 1,
      model: "gen-model",
      promptVersion: "distractor.v4",
      requestHash: "e".repeat(64),
      cached: false,
      latencyMs: 700,
      output: "Because the trial was short",
      validator: { status: "pass" as const, codes: [] },
      judge: { model: "judge-model", promptVersion: "distractor-judge.v3", requestHash: "f".repeat(64), decision: "REGENERATE" as const, failures: ["competent_candidate_could_select"], concerns: [], reasons: ["reads as a valid cause"] },
      rejectionReason: "competent_candidate_could_select",
    },
    { stage: "distractor" as const, option: "B" as const, attempt: 2, model: "gen-model", promptVersion: "distractor.v4", requestHash: null, cached: false, latencyMs: 300, output: null, validator: { status: "reject" as const, codes: [] }, judge: null, rejectionReason: "model_error: timeout" },
  ],
  requestHashes: { blindSolve: "b".repeat(64), acceptability: "d".repeat(64), judge: "c".repeat(64) },
  sourceContextIds: ["yds-2018", "yds-2023-10"],
};

describe("distractor diagnosis by construction", () => {
  it("labels every wrong option of the family deterministically, one distinct primary label per option", () => {
    for (let ordinal = 1; ordinal <= 6; ordinal++) {
      const built = buildQuestionSpec({ profile, family, ordinal });
      const dspecs = buildDistractorSpecs(built);
      expect(dspecs.every((dspec) => dspec.diagnosis !== null)).toBe(true);
      expect(buildDistractorSpecs(built).map((dspec) => dspec.diagnosis)).toEqual(dspecs.map((dspec) => dspec.diagnosis));
      expect(new Set(dspecs.map((dspec) => dspec.diagnosis!.primary)).size).toBe(dspecs.length);
    }
    const byRole = Object.fromEntries(buildDistractorSpecs(spec).map((dspec) => [dspec.role, dspec.diagnosis!.primary]));
    expect(byRole).toMatchObject({
      "wrong_discourse_relation:contrast": "relation.concession_vs_contrast",
      "wrong_discourse_relation:cause": "relation.polarity_reversed",
      "wrong_discourse_relation:condition": "relation.condition_misapplied",
      "logical_incompatibility:sequence": "relation.time_for_logic",
    });
  });
});

describe("provenance", () => {
  it("requires every version and model field and keeps every stage attempt", () => {
    expect(provenance.parse(prov)).toEqual(prov);
    const { judgeModel: _judgeModel, ...missing } = prov;
    void _judgeModel;
    expect(provenance.safeParse(missing).success).toBe(false);
    expect(provenance.safeParse({ ...prov, attempts: [] }).success).toBe(false);
    expect(provenance.safeParse({ ...prov, sourceContextIds: ["Some item text"] }).success).toBe(false);
    expect(provenance.safeParse({ ...prov, pipelineVersion: "generator.v3" }).success).toBe(false);
  });

  it("never lets a writer check its own output", () => {
    expect(generatorJudgeIndependent(prov)).toBe(true);
    expect(generatorJudgeIndependent({ generatorModel: "m", judgeModel: "m" })).toBe(false);
    expect(generatorJudgeIndependent({ generatorModel: "g", distractorModel: "m", judgeModel: "m" })).toBe(false);
    expect(generatorJudgeIndependent({ distractorModel: "m", distractorJudgeModel: "m", judgeModel: "j" })).toBe(false);
  });
});

describe("human review", () => {
  const validation = validateCandidate({ spec, candidate: good() });
  const judge = judgeDecision({ spec, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: onlyKey(), report: report({ verdict: "REVIEW" }) } });
  const record: CandidateRecord = {
    id: spec.id,
    spec,
    versions: [{ version: 1, author: "generator", candidate: good(), validation, createdAt: prov.generatedAt }],
    judge,
    provenance: provenance.parse(prov),
    reviews: [],
    status: initialStatus(validation, judge),
  };
  const at = "2026-10-08T13:00:00.000Z";

  it("records the approved band apart from the judge estimate and the explanation estimate", () => {
    const candidate = good();
    candidate.metadata.judgeEstimatedBand = "medium";
    candidate.metadata.selfRatedDifficulty = "easy";
    const stamped: CandidateRecord = { ...record, versions: [{ ...record.versions[0], candidate }] };
    const approved = applyReview(stamped, { decision: "APPROVE", reviewer: "mora", at, band: "hard" });
    const metadata = approved.versions[0].candidate.metadata;
    expect(metadata.approvedBand).toBe("hard");
    expect(metadata.judgeEstimatedBand).toBe("medium");
    expect(metadata.selfRatedDifficulty).toBe("easy");
    const plain = applyReview(stamped, { decision: "APPROVE", reviewer: "mora", at });
    expect(plain.versions[0].candidate.metadata.approvedBand).toBeUndefined();
    expect(plain.versions[0].candidate.metadata.judgeEstimatedBand).toBe("medium");
  });

  it("admits a clean item and quarantines an unresolved review", () => {
    expect(record.status).toBe("approved");
    expect(initialStatus({ ...validation, status: "reject" }, null)).toBe("validator_rejected");
    expect(initialStatus(validation, { ...judge, verdict: "REJECT", failures: ["second_defensible_C"] })).toBe("judge_rejected");
    expect(initialStatus(validation, { ...judge, verdict: "REVIEW", concerns: ["semantic_gray"] })).toBe("judge_rejected");
    expect(initialStatus(validation, { ...judge, verdict: "REVIEW", concerns: ["difficulty_medium"] })).toBe("approved");
  });

  it("EDIT appends a version and keeps the generator's original", () => {
    const edited = good({ explanation: `${good().explanation} Ek not.` });
    const next = applyReview(record, { decision: "EDIT", reviewer: "mora", at, edit: { candidate: edited, validation: validateCandidate({ spec, candidate: edited }) } });
    expect(next.versions.map((version) => [version.version, version.author])).toEqual([
      [1, "generator"],
      [2, "human:mora"],
    ]);
    expect(next.versions[0].candidate).toEqual(good());
    expect(next.status).toBe("pending_review");
    expect(applyReview(next, { decision: "APPROVE", reviewer: "mora", at }).status).toBe("approved");
  });

  it("refuses edits that move the answer and approval of a failing version", () => {
    const moved = good({ correctOption: "B" });
    expect(() => applyReview(record, { decision: "EDIT", reviewer: "mora", at, edit: { candidate: moved, validation: validateCandidate({ spec, candidate: moved }) } })).toThrow(/answer/);
    const broken = withOption("B", "even though forests are wet");
    const pending = applyReview(record, { decision: "EDIT", reviewer: "mora", at, edit: { candidate: broken, validation: validateCandidate({ spec, candidate: broken }) } });
    expect(pending.status).toBe("needs_revalidation");
    expect(() => applyReview(pending, { decision: "APPROVE", reviewer: "mora", at })).toThrow(/validator/);
    expect(() => applyReview(record, { decision: "APPROVE", reviewer: " ", at })).toThrow(/reviewer/);
  });

  it("REJECT keeps every version", () => {
    const next = applyReview(record, { decision: "REJECT", reviewer: "mora", notes: "weak trap", at });
    expect(next).toMatchObject({ status: "rejected", versions: record.versions });
    expect(next.reviews[0]).toMatchObject({ decision: "REJECT", appliesToVersion: 1, notes: "weak trap" });
  });
});

describe("pilot 12 plan failures stay three separate classes", () => {
  const slot = { grammarConstraint: { mustBeGrammatical: true }, requiredProperties: ["coherent_clause"] } as DistractorSpec;
  const threshold = defaultFactoryThresholds.distractorAcceptability;

  it("342 is an outside evidence demand, not a failed concession direction", () => {
    const stem = "----, the published record of that season's flood peaks was more complete than the record for the decade before.";
    expect(stem).toContain("more complete than the record");
    expect(reasonLicensed("external_assumption")).toBe(false);
    expect(reasonLicensed("root_supported")).toBe(true);
    expect(declineJustified(1)).toBe(false);
    expect(declineJustified(0)).toBe(true);
    expect(concessionAlignment({ obstacleSupportsOutcome: false, planTreatsObstacleAsConcession: true })).toBe("aligned");
  });

  it("344 keeps a second answer even when the clause is faithful to the plan", () => {
    expect(reasonLicensed("not_entailed")).toBe(false);
    const decision = distractorDecision({
      dspec: slot,
      report: reportFromVerdict({
        verdict: "second_answer",
        sure: true,
        reason: "A detector is hardware whereas a pipeline is data processing, making this cause-and-effect sentence entirely plausible and defensible.",
        planFidelity: "faithful",
      }),
    });
    expect(decision.decision).toBe("REGENERATE");
    expect(decision.failures).toContain("competent_candidate_could_select");
    expect(decision.failures).not.toContain("plan_fidelity");
  });

  it("346 reverses the concession when the obstacle supports the outcome", () => {
    expect(concessionAlignment({ obstacleSupportsOutcome: true, planTreatsObstacleAsConcession: true })).toBe("reversed");
    expect(concessionAlignment({ obstacleSupportsOutcome: false, planTreatsObstacleAsConcession: true })).toBe("aligned");
    const gate = skeletonGateDecision(
      {
        reasons: ["In archaeology, waterlogged anoxic conditions preserve organic materials rather than destroying them."],
        grammatical: true,
        natural: 0.9,
        keyTrue: false,
        targetRelation: 0.2,
        keyAmbiguous: 0.1,
        confidence: 0.9,
        clauseCarriesClash: true,
      },
      threshold,
      { band: "hard", sentence: "Although the lowest layer of the site had remained waterlogged for centuries", strategy: "relational_inference" },
    );
    expect(gate.decision).toBe("REGENERATE");
    expect(gate.failures).toEqual(expect.arrayContaining(["key_not_true", "key_relation_weak"]));
  });

  it("does not collapse the three grounds into one licensed class", () => {
    expect(claimGrounds.filter(reasonLicensed)).toEqual(["root_supported", "root_entailable"]);
  });

  it("does not treat a proposition status as a distractor verdict", () => {
    expect(undemonstratedExempt("not_entailed")).toBe(true);
    expect(undemonstratedExempt("restatement")).toBe(false);
    expect(undemonstratedExempt(undefined)).toBe(false);
    expect(inferenceReward("not_entailed", "invalid_inference")).toBe("eligible");
    expect(inferenceReward("restatement", "invalid_inference")).toBe("withheld");
    expect(inferenceReward("entailed", "invalid_inference")).toBe("withheld");
    expect(inferenceReward("not_entailed", "none")).toBe("undetermined");
    expect(inferenceReward("contradicted", "invalid_inference")).toBe("undetermined");
    expect(inferenceReward("external_assumption", "invalid_inference")).toBe("undetermined");
    expect(inferenceReward("undetermined", "invalid_inference")).toBe("undetermined");
    expect(reasonLicensed("not_entailed")).toBe(false);
  });
});
