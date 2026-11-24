import { describe, expect, it } from "vitest";
import { skillUpdates, weightedMastery } from "@/modules/learning/mastery";
import { buildPlan } from "@/modules/learning/plan";
import { analysisDraft, type AnalysisDraft } from "@/modules/analysis/contract";
import { toDnaQuestion, type DnaQuestion } from "@/modules/analysis/dna";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { generatedQuestionCandidate, type GeneratedQuestionCandidate } from "./candidate";
import { familyBlueprints } from "./families";
import { judgeDecision, judgeReport, type JudgeReport, type OptionAcceptability } from "./judge";
import { optionLabels } from "@/modules/analysis/contract";
import {
  bankImportChoiceId,
  bankImportItemId,
  evaluateBankImport,
  importBankCandidates,
  memoryBankWriter,
  sourceFromFactoryRow,
  toBankItemWrite,
  type BankImportSource,
} from "./bank-import";
import { provenance } from "./provenance";
import { applyReview, initialStatus, type CandidateRecord } from "./review";
import { buildExamProfile } from "./profile";
import { buildQuestionSpec } from "./spec-engine";
import { validateCandidate } from "./validator";
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

const dnaRow = (document: string, number: number): DnaQuestion =>
  toDnaQuestion({ document, question: { ...item, number }, analysis: draft(), answer: "A", textSha256: "0".repeat(64), proposals: [] });

const spec = buildQuestionSpec({
  profile: buildExamProfile([dnaRow("yds-2018", 31), dnaRow("yds-2018-2", 32), dnaRow("yds-2023-10", 33), dnaRow("yds-2024-11", 34)]),
  family: familyBlueprints["sentence_completion.concession"],
  ordinal: 1,
});

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

const report = (patch: Partial<JudgeReport> = {}): JudgeReport =>
  judgeReport.parse({
    scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 },
    alternativeDefensibleOptions: [],
    estimatedDifficulty: "medium",
    verdict: "APPROVE",
    reasons: [],
    ...patch,
  });

const onlyKey = (): OptionAcceptability => ({
  sentences: optionLabels.map((option) => ({ option, acceptable: option === "A", confidence: 0.9, reason: "" })),
});

const prov = provenance.parse({
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
    {
      stage: "skeleton",
      option: null,
      attempt: 1,
      model: "gen-model",
      promptVersion: "skeleton.v1",
      requestHash: "a".repeat(64),
      cached: false,
      latencyMs: 900,
      output: "Although the trial was short, the drug worked.",
      validator: { status: "pass", codes: [] },
      judge: null,
      rejectionReason: null,
    },
  ],
  requestHashes: { blindSolve: "b".repeat(64), acceptability: "d".repeat(64), judge: "c".repeat(64) },
  sourceContextIds: ["yds-2018", "yds-2023-10"],
});

function pendingRecord(candidate = good()): CandidateRecord {
  const validation = validateCandidate({ spec, candidate });
  const judge = judgeDecision({ spec, validation, judge: { blindAnswer: "A", blindConfidence: 0.9, acceptability: onlyKey(), report: report() } });
  return {
    id: spec.id,
    spec,
    versions: [{ version: 1, author: "generator", candidate, validation, createdAt: prov.generatedAt }],
    judge,
    provenance: prov,
    reviews: [],
    status: initialStatus(validation, judge),
  };
}

function approvedSource(patch?: { candidate?: GeneratedQuestionCandidate; sourceKey?: string; meaningProven?: boolean; qualityAccepted?: boolean }): BankImportSource {
  const record = applyReview(pendingRecord(patch?.candidate), { decision: "APPROVE", reviewer: "mora", at: "2026-11-06T12:00:00.000Z", band: "medium" });
  return {
    sourceKey: patch?.sourceKey ?? "sc.concession.medium.001",
    record,
    ...(patch?.meaningProven === undefined ? {} : { meaningProven: patch.meaningProven }),
    ...(patch?.qualityAccepted === undefined ? {} : { qualityAccepted: patch.qualityAccepted }),
  };
}

describe("factory bank import", () => {
  it("rejects a candidate without a human APPROVE review", () => {
    const engineOnly: BankImportSource = { sourceKey: "engine-only", record: pendingRecord() };
    const judged = evaluateBankImport(engineOnly);
    expect(engineOnly.record.status).toBe("approved");
    expect(engineOnly.record.reviews).toEqual([]);
    expect(judged.eligible).toBe(false);
    expect(judged.reason).toMatch(/APPROVE/);
    const rejected = applyReview(pendingRecord(), { decision: "REJECT", reviewer: "mora", at: "2026-11-06T12:00:00.000Z" });
    expect(evaluateBankImport({ sourceKey: "rejected", record: rejected }).eligible).toBe(false);
  });

  it("rejects a candidate that fails publishBlockers", () => {
    const source = approvedSource();
    const latest = source.record.versions[0]!;
    latest.candidate = {
      ...latest.candidate,
      question: { ...latest.candidate.question, stem: "Hi ----" },
    };
    const decision = evaluateBankImport(source);
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toMatch(/publishBlockers/);
  });

  it("imports an approved candidate with choices, skills, error classes and Lesson", () => {
    const source = approvedSource();
    const decision = evaluateBankImport(source);
    expect(decision.eligible).toBe(true);
    const payload = decision.payload!;
    expect(payload.exam).toBe("yds");
    expect(payload.questionType).toBe("question_type:sentence_completion");
    expect(payload.section).toBe("sentence");
    expect(payload.layout).toBe("blank");
    expect(payload.stem).toBe(source.record.versions[0]!.candidate.question.stem);
    expect(payload.stimulus).toBeNull();
    expect(payload.targetBand).toBe("medium");
    expect(payload.difficulty).toBe(3);
    expect(payload.skillIds[0]).toBe("sentence-link");
    expect(payload.choices).toHaveLength(5);
    expect(payload.choices.filter((choice) => choice.correct)).toHaveLength(1);
    expect(payload.choices.find((choice) => choice.letter === "A")).toMatchObject({ correct: true, errorClass: null, distractorType: null });
    expect(payload.choices.find((choice) => choice.letter === "B")).toMatchObject({ errorClass: "discourse_relation", distractorType: "CONNECTOR_ERROR" });
    expect(payload.choices.find((choice) => choice.letter === "E")).toMatchObject({ errorClass: "discourse_relation", distractorType: "LOGICAL_ERROR" });
    expect(payload.lesson.task).toBe("sentence_completion");
    expect(payload.lesson.choices.map((choice) => choice.letter)).toEqual(["A", "B", "C", "D", "E"]);
    expect(payload.lesson.choices.find((choice) => choice.letter === "B")?.error).toBe("discourse_relation");
    expect(payload.provenance.reviewer).toBe("mora");
    const write = toBankItemWrite(payload);
    expect(write.item.id).toBe(bankImportItemId(source.sourceKey));
    expect(write.item.lesson).toBe(payload.lesson);
    expect(write.choices.map((choice) => choice.id)).toEqual([0, 1, 2, 3, 4].map((position) => bankImportChoiceId(write.item.id, position)));
    expect(write.skills).toEqual([{ itemId: write.item.id, skillId: "sentence-link", weight: 1, role: "primary" }]);
  });

  it("does not silently fill a missing distractor rationale or explanation", () => {
    const missingWhy = approvedSource({ sourceKey: "missing-why" });
    missingWhy.record.versions[0]!.candidate.distractorRationales[0] = {
      ...missingWhy.record.versions[0]!.candidate.distractorRationales[0]!,
      whyWrong: "",
    };
    expect(evaluateBankImport(missingWhy).reason).toMatch(/çeldirici/);
    const missingType = approvedSource({ sourceKey: "missing-type" });
    missingType.record.versions[0]!.candidate.distractorRationales = missingType.record.versions[0]!.candidate.distractorRationales.slice(0, 3);
    expect(evaluateBankImport(missingType).reason).toMatch(/çeldirici|eksik/);
    const missingExplanation = approvedSource({ sourceKey: "missing-explanation" });
    missingExplanation.record.versions[0]!.candidate.explanation = "kısa";
    expect(evaluateBankImport(missingExplanation).reason).toMatch(/açıklama/i);
  });

  it("does not import the same source twice", async () => {
    const source = approvedSource();
    const writer = memoryBankWriter();
    const first = await importBankCandidates({ sources: [source], mode: "apply", writer });
    const second = await importBankCandidates({ sources: [source], mode: "apply", writer });
    expect(first.writes).toBe(1);
    expect(second.writes).toBe(0);
    expect(second.skipped).toBe(1);
    expect(second.rows[0]?.reason).toMatch(/daha önce/);
    expect(writer.items.size).toBe(1);
    expect(writer.choices).toHaveLength(5);
  });

  it("does not leave a partial item when a write fails", async () => {
    const writer = memoryBankWriter({ failOnWrite: true });
    await expect(importBankCandidates({ sources: [approvedSource()], mode: "apply", writer })).rejects.toThrow(/forced import failure/);
    expect(writer.items.size).toBe(0);
    expect(writer.choices).toEqual([]);
    expect(writer.skills).toEqual([]);
  });

  it("keeps choices.error_class and item_skills on the written rows", async () => {
    const writer = memoryBankWriter();
    const report = await importBankCandidates({ sources: [approvedSource({ sourceKey: "keep-labels" })], mode: "apply", writer });
    const itemId = report.rows[0]!.itemId;
    expect(writer.choices.filter((choice) => !choice.correct).every((choice) => choice.errorClass === "discourse_relation")).toBe(true);
    expect(writer.choices.find((choice) => choice.correct)?.errorClass).toBeNull();
    expect(writer.skills).toEqual([{ itemId, skillId: "sentence-link", weight: 1, role: "primary" }]);
  });

  it("binds Lesson to the same bank item the choices belong to", async () => {
    const writer = memoryBankWriter();
    await importBankCandidates({ sources: [approvedSource({ sourceKey: "lesson-bind" })], mode: "apply", writer });
    const item = [...writer.items.values()][0]!;
    expect(item.lesson?.choices).toHaveLength(5);
    for (const choice of writer.choices) {
      const letter = "ABCDE"[choice.position];
      const lessonChoice = item.lesson?.choices.find((entry) => entry.letter === letter);
      expect(lessonChoice?.error ?? null).toBe(choice.errorClass);
    }
    expect(item.id).toBe(writer.choices[0]?.itemId);
  });

  it("does not write the bank on dry-run", async () => {
    const writer = memoryBankWriter();
    const report = await importBankCandidates({ sources: [approvedSource()], writer });
    expect(report.mode).toBe("dry-run");
    expect(report.writes).toBe(0);
    expect(report.eligible).toBe(1);
    expect(writer.items.size).toBe(0);
    expect(writer.choices).toEqual([]);
  });

  it("does not treat meaningProven/qualityAccepted false as a human approval", () => {
    const blocked = evaluateBankImport(approvedSource({ meaningProven: false, qualityAccepted: false }));
    expect(blocked.eligible).toBe(false);
    expect(blocked.reason).toMatch(/item-model/);
  });

  it("reads factory.candidates + factory.reviews through the existing record shape", () => {
    const approved = approvedSource();
    const latest = approved.record.versions[0]!;
    const source = sourceFromFactoryRow({
      candidateId: "11111111-1111-1111-1111-111111111111",
      spec: approved.record.spec,
      status: approved.record.status,
      provenance: approved.record.provenance,
      versions: approved.record.versions,
      reviews: approved.record.reviews,
      judge: approved.record.judge,
      lesson: approved.record.lesson,
    });
    expect(source.sourceKey).toBe("11111111-1111-1111-1111-111111111111");
    expect(source.record.reviews[0]?.decision).toBe("APPROVE");
    const decision = evaluateBankImport(source);
    expect(decision.eligible).toBe(true);
    expect(decision.itemId).toBe(bankImportItemId("11111111-1111-1111-1111-111111111111"));
    expect(latest.validation.status).toBe("pass");
  });

  it("maps sentence_completion skill:coherence to sentence-link for mastery updates and daily plan", () => {
    const source = approvedSource({ sourceKey: "coherence-sentence-link" });
    source.record.spec = {
      ...source.record.spec,
      targetSkill: "skill:coherence",
      cognitiveSkill: "cognitive_skill:context_integration",
    };

    const decision = evaluateBankImport(source);
    expect(decision.eligible).toBe(true);
    const payload = decision.payload!;
    expect(payload.skillIds).toEqual(["sentence-link"]);

    const write = toBankItemWrite(payload);
    expect(write.skills).toEqual([
      { itemId: write.item.id, skillId: "sentence-link", weight: 1, role: "primary" },
    ]);

    const hitLinks = skillUpdates({ correct: true, links: write.skills });
    expect(hitLinks).toHaveLength(1);
    expect(weightedMastery(50, true, write.item.difficulty, hitLinks[0]!.weight)).toBeGreaterThan(50);

    const missLinks = skillUpdates({ correct: false, links: write.skills });
    expect(missLinks).toHaveLength(1);
    expect(weightedMastery(50, false, write.item.difficulty, missLinks[0]!.weight)).toBeLessThan(50);

    const plan = buildPlan({
      minutes: 15,
      mastery: [{ section: "sentence", mastery: 45 }],
      dueQuestionIds: [],
      dueVocabIds: [],
      seenIds: [],
      targetSection: "sentence",
      weakErrors: ["discourse_relation"],
      pool: [
        {
          id: write.item.id,
          slot: write.item.slot,
          stimulusId: null,
          skillIds: ["sentence-link"],
          section: write.item.section,
          difficulty: write.item.difficulty,
          errorClasses: [
            ...new Set(write.choices.map((choice) => choice.errorClass).filter((value): value is string => Boolean(value))),
          ],
        },
      ],
    });
    expect(plan.blocks).toContainEqual(
      expect.objectContaining({ kind: "question", id: write.item.id, section: "sentence" }),
    );
  });
});
