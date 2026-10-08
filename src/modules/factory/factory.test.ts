import { describe, expect, it } from "vitest";
import { analysisDraft, optionLabels, type AnalysisDraft } from "@/modules/analysis/contract";
import { toDnaQuestion, type DnaQuestion } from "@/modules/analysis/dna";
import { ydsDnaV1 } from "@/modules/analysis/corpus";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import type { NodeRef } from "@/modules/knowledge/graph";
import { completedSentences, generatedQuestionCandidate, type GeneratedQuestionCandidate } from "./candidate";
import { connectorsFor, familyBlueprints } from "./families";
import { judgeDecision, judgeReport, type JudgeReport, type OptionAcceptability } from "./judge";
import { buildExamProfile, consistentMisconception, evidenceLevel, familyConcept } from "./profile";
import { generatorJudgeIndependent, provenance } from "./provenance";
import { applyReview, initialStatus, type CandidateRecord } from "./review";
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
    expect(codes(good({ explanation: "Doğru seçenek ödünleme (concession) ilişkisi kurar. D seçeneği neden bildirir." }))).not.toContain("explanation_names_other_answer");
    expect(codes(good({ explanation: "Doğru yanıt (A) çünkü although beklenmeyen bir sonucu verir." }))).not.toContain("explanation_names_other_answer");
  });

  it("warns about greetings and the wrong term in explanations", () => {
    expect(codes(good({ explanation: `Merhaba! ${good().explanation}` }))).toContain("explanation_style");
    expect(codes(good({ explanation: `${good().explanation} Bu bir taviz ilişkisidir.` }))).toContain("explanation_style");
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

  it("rejects a wrong option that reads as a sensible sentence on its own, and a key that does not", () => {
    expect(decide({}, "A", onlyKey({ D: 0.8 }))).toMatchObject({ verdict: "REJECT", acceptableOptions: ["A", "D"] });
    expect(decide({}, "A", onlyKey({ D: 0.8 })).failures).toContain("acceptable_distractor_D");
    expect(decide({}, "A", onlyKey({ D: 0.3 }))).toMatchObject({ verdict: "REVIEW", concerns: expect.arrayContaining(["acceptable_distractor_D"]) });
    expect(decide({}, "A", onlyKey({ A: -0.9 })).failures).toContain("key_unacceptable");
    expect(decide({}, "A", { sentences: onlyKey().sentences.slice(0, 4).concat(onlyKey().sentences[0]) }).failures).toContain("acceptability_incomplete");
  });

  it("approves only when the model and every rule agree", () => {
    expect(decide().verdict).toBe("APPROVE");
    expect(decide().qualityScore).toBeGreaterThan(0.85);
  });

  it("rejects when the blind solve disagrees or a second answer is defensible", () => {
    expect(decide({}, "B")).toMatchObject({ verdict: "REJECT", blindAgrees: false });
    expect(decide({ alternativeDefensibleOptions: ["B"] }).failures).toContain("second_defensible_B");
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
  distractorPromptVersion: "distractor.v1",
  distractorJudgePromptVersion: "distractor-judge.v1",
  judgePromptVersion: "judge.v2",
  blindSolvePromptVersion: "verifier-solve.v1",
  acceptabilityPromptVersion: "acceptability.v1",
  explanationPromptVersion: "explanation.v1",
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
  originalityVersion: factoryVersions.originality,
  generatedAt: "2026-10-08T12:00:00.000Z",
  attempts: [
    { stage: "skeleton" as const, option: null, attempt: 1, model: "gen-model", promptVersion: "skeleton.v1", requestHash: "a".repeat(64), cached: false, latencyMs: 900, output: "Although the trial was short, the drug worked.", validator: { status: "pass" as const, codes: [] }, judge: null, rejectionReason: null },
    {
      stage: "distractor" as const,
      option: "B" as const,
      attempt: 1,
      model: "gen-model",
      promptVersion: "distractor.v1",
      requestHash: "e".repeat(64),
      cached: false,
      latencyMs: 700,
      output: "Because the trial was short",
      validator: { status: "pass" as const, codes: [] },
      judge: { model: "judge-model", promptVersion: "distractor-judge.v1", requestHash: "f".repeat(64), decision: "REGENERATE" as const, failures: ["competent_candidate_could_select"], concerns: [], reasons: ["reads as a valid cause"] },
      rejectionReason: "competent_candidate_could_select",
    },
    { stage: "distractor" as const, option: "B" as const, attempt: 2, model: "gen-model", promptVersion: "distractor.v1", requestHash: null, cached: false, latencyMs: 300, output: null, validator: { status: "reject" as const, codes: [] }, judge: null, rejectionReason: "model_error: timeout" },
  ],
  requestHashes: { blindSolve: "b".repeat(64), acceptability: "d".repeat(64), judge: "c".repeat(64) },
  sourceContextIds: ["yds-2018", "yds-2023-10"],
};

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

  it("queues only validator-clean, judge-unrejected candidates", () => {
    expect(record.status).toBe("pending_review");
    expect(initialStatus({ ...validation, status: "reject" }, null)).toBe("validator_rejected");
    expect(initialStatus(validation, { ...judge, verdict: "REJECT" })).toBe("judge_rejected");
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
