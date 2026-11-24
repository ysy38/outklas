import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analysisDraft, type AnalysisDraft } from "@/modules/analysis/contract";
import { toDnaQuestion, type DnaQuestion } from "@/modules/analysis/dna";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { evaluateBankImport, importBankCandidates, memoryBankWriter, type BankImportSource } from "./bank-import";
import { generatedQuestionCandidate, type GeneratedQuestionCandidate } from "./candidate";
import { buildEditorialView, submitEditorialReview } from "./editorial-review";
import { familyBlueprints } from "./families";
import { judgeDecision, judgeReport, type JudgeReport } from "./judge";
import { buildExamProfile } from "./profile";
import { applyReview, isVerifiedHumanReviewer, type CandidateRecord } from "./review";
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
    skills: { primary: "skill:coherence", secondary: [], cognitive: ["cognitive_skill:context_integration"] },
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

const spec = {
  ...buildQuestionSpec({
    profile: buildExamProfile([dnaRow("yds-2018", 31), dnaRow("yds-2018-2", 32), dnaRow("yds-2023-10", 33), dnaRow("yds-2024-11", 34)]),
    family: familyBlueprints["sentence_completion.concession"],
    ordinal: 1,
  }),
  targetSkill: "skill:coherence" as const,
  cognitiveSkill: "cognitive_skill:context_integration" as const,
};

function makeCandidate(stem = "Many desert plants survive long periods without any rain at all ----."): GeneratedQuestionCandidate {
  return generatedQuestionCandidate.parse({
    question: {
      stem,
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
  });
}

function makeRecord(candidate = makeCandidate(), judgeVerdict: "APPROVE" | "REJECT" = "APPROVE"): CandidateRecord {
  const validation = validateCandidate({ spec, candidate });
  const correct = spec.answerConstraints.correctOption;
  const wrong = (["A", "B", "C", "D", "E"] as const).filter((l) => l !== correct);
  const report: JudgeReport = judgeReport.parse({
    scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 },
    alternativeDefensibleOptions: judgeVerdict === "REJECT" ? [wrong[0]!] : [],
    estimatedDifficulty: "medium",
    verdict: judgeVerdict,
    reasons: [],
  });
  const judge = judgeDecision({
    spec,
    validation,
    judge: {
      blindAnswer: correct,
      blindConfidence: 0.9,
      acceptability: {
        sentences: (["A", "B", "C", "D", "E"] as const).map((option) => ({
          option,
          acceptable: option === correct || (judgeVerdict === "REJECT" && option === wrong[0]),
          confidence: 0.9,
          reason: "",
        })),
      },
      report,
    },
  });
  return {
    id: spec.id,
    spec,
    versions: [{ version: 1, author: "generator", candidate, validation, createdAt: "2026-11-06T12:00:00.000Z" }],
    judge,
    provenance: {
      pipelineVersion: factoryVersions.pipeline,
      provider: "gateway",
      generatorModel: "gen",
      distractorModel: "gen",
      distractorJudgeModel: "judge",
      judgeModel: "judge",
      explanationModel: "gen",
      generatorPromptVersion: "skeleton.v2",
      distractorPromptVersion: "distractor.v4",
      distractorJudgePromptVersion: "distractor-judge.v7",
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
      generatedAt: "2026-11-06T12:00:00.000Z",
      attempts: [],
      requestHashes: { blindSolve: null, acceptability: null, judge: null },
      sourceContextIds: ["yds-2023-10"],
    },
    reviews: [],
    status: "pending_review",
  };
}

describe("human editorial review workflow", () => {
  it("rejects inspector and automated labels as unverified human approval", () => {
    expect(isVerifiedHumanReviewer("inspector")).toBe(false);
    expect(isVerifiedHumanReviewer("judge")).toBe(false);
    expect(isVerifiedHumanReviewer("admin:editor@outklas.test")).toBe(true);

    const record: CandidateRecord = {
      ...makeRecord(),
      status: "approved",
      reviews: [
        {
          reviewVersion: factoryVersions.review,
          decision: "APPROVE",
          reviewer: "inspector",
          appliesToVersion: 1,
          notes: "Automated batch note",
          at: "2026-11-06T12:49:44.255Z",
        },
      ],
    };

    const decision = evaluateBankImport({ sourceKey: "run::item", record });
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toContain("REVIEW_PROVENANCE_UNVERIFIED");
  });

  it("binds admin APPROVE to the current version and preserves earlier reviews", () => {
    const initial: CandidateRecord = {
      ...makeRecord(),
      reviews: [
        {
          reviewVersion: factoryVersions.review,
          decision: "APPROVE",
          reviewer: "inspector",
          appliesToVersion: 1,
          notes: "Old inspector note",
          at: "2026-11-06T12:49:44.255Z",
        },
      ],
    };

    const { record, entry, dryRunDecision } = submitEditorialReview(initial, {
      decision: "APPROVE",
      adminEmail: "editor@outklas.test",
      notes: "Tek doğru cevap A, dil ve açıklama temiz.",
      band: "medium",
      at: "2026-11-24T11:20:00.000Z",
    });

    expect(entry.reviewer).toBe("admin:editor@outklas.test");
    expect(entry.appliesToVersion).toBe(1);
    expect(record.reviews).toHaveLength(2);
    expect(record.reviews[0]?.reviewer).toBe("inspector");
    expect(dryRunDecision.eligible).toBe(true);
  });

  it("invalidates previous approval when content is edited to a new version", () => {
    const { record: approvedV1 } = submitEditorialReview(makeRecord(), {
      decision: "APPROVE",
      adminEmail: "editor@outklas.test",
      notes: "v1 onaylandı.",
    });

    const edited = makeCandidate("Many desert plants survive dry seasons without any rain at all ----.");
    const validation = validateCandidate({ spec, candidate: edited });
    const v2 = applyReview(approvedV1, {
      decision: "EDIT",
      reviewer: "admin:editor@outklas.test",
      notes: "Kök güncellendi.",
      at: "2026-11-24T11:21:00.000Z",
      edit: { candidate: edited, validation },
    });

    expect(v2.versions).toHaveLength(2);
    expect(v2.status).toBe("pending_review");
    const decision = evaluateBankImport({ sourceKey: "run::v2", record: v2 });
    expect(decision.eligible).toBe(false);
  });

  it("blocks REVISE and REJECT decisions from import", async () => {
    const { record: revised } = submitEditorialReview(makeRecord(), {
      decision: "REVISE",
      adminEmail: "editor@outklas.test",
      notes: "Açıklama düzeltilmeli.",
    });
    expect(revised.status).toBe("needs_revalidation");
    expect(evaluateBankImport({ sourceKey: "run::revise", record: revised }).eligible).toBe(false);

    const { record: rejected } = submitEditorialReview(makeRecord(), {
      decision: "REJECT",
      adminEmail: "editor@outklas.test",
      notes: "İkinci doğru cevap riski.",
    });
    expect(rejected.status).toBe("rejected");
    expect(evaluateBankImport({ sourceKey: "run::reject", record: rejected }).eligible).toBe(false);

    const writer = memoryBankWriter();
    const report = await importBankCandidates({
      sources: [
        { sourceKey: "run::revise", record: revised },
        { sourceKey: "run::reject", record: rejected },
      ],
      mode: "apply",
      writer,
    });
    expect(report.writes).toBe(0);
    expect(writer.items.size).toBe(0);
  });

  it("prevents live import without verified human APPROVE and keeps dry-run default", async () => {
    const unapproved = makeRecord();
    const writer = memoryBankWriter();
    const report = await importBankCandidates({
      sources: [{ sourceKey: "run::no-human", record: unapproved }],
      mode: "apply",
      writer,
    });
    expect(report.writes).toBe(0);
    expect(report.eligible).toBe(0);

    const view = buildEditorialView(unapproved, "run::no-human");
    expect(view.dryRunDecision.eligible).toBe(false);
    expect(view.skills.studentSkillIds).toEqual(["sentence-link"]);
  });

  it("never auto-approves the existing 51 inspector-reviewed candidates", () => {
    const runsRoot = path.join(process.cwd(), ".data/analysis/_factory/runs");
    if (!existsSync(runsRoot)) return;
    const sources: BankImportSource[] = [];
    for (const run of readdirSync(runsRoot).sort()) {
      const dir = path.join(runsRoot, run, "candidates");
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
        const record = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as CandidateRecord;
        if (record.spec?.questionType) {
          sources.push({ sourceKey: `${run}::${record.id}`, record });
        }
      }
    }
    const eligible = sources.filter((s) => evaluateBankImport(s).eligible);
    expect(eligible).toHaveLength(0);
  });

  it("invalidates an earlier APPROVE when a later REVISE or REJECT arrives on the same version", () => {
    const { record: approved } = submitEditorialReview(makeRecord(), {
      decision: "APPROVE",
      adminEmail: "editor@outklas.test",
      notes: "İlk onay.",
    });
    expect(evaluateBankImport({ sourceKey: "run::same-ver", record: approved }).eligible).toBe(true);

    const { record: revised } = submitEditorialReview(approved, {
      decision: "REVISE",
      adminEmail: "editor@outklas.test",
      notes: "Aynı sürümde düzeltme istendi.",
    });
    expect(revised.status).toBe("needs_revalidation");
    expect(evaluateBankImport({ sourceKey: "run::same-ver", record: revised }).eligible).toBe(false);

    // Even if status were manually forced back to approved, the latest review on v1 is REVISE, not APPROVE
    expect(evaluateBankImport({ sourceKey: "run::same-ver", record: { ...revised, status: "approved" } }).eligible).toBe(false);
  });

  it("rejects empty admin session or forged unverified reviewer identity", () => {
    expect(() =>
      submitEditorialReview(makeRecord(), {
        decision: "APPROVE",
        adminEmail: "   ",
        notes: "Yetkisiz deneme.",
      }),
    ).toThrow(/admin/i);

    expect(() =>
      applyReview(makeRecord(), {
        decision: "APPROVE",
        reviewer: "inspector",
        notes: "Sahte inspector onayı.",
        at: "2026-11-24T11:30:00.000Z",
      }),
    ).toThrow(/verified human reviewer/i);
  });

  it("exposes all five first-wave candidates with complete editorial view and zero auto-approvals", () => {
    const runsRoot = path.join(process.cwd(), ".data/analysis/_factory/runs");
    if (!existsSync(runsRoot)) return;
    const targets = [
      ["sentence_completion.concession.easy.n8-from2.atomic.v1.gateway-band", "sentence_completion.concession.easy.004"],
      ["sentence_completion.concession.easy.n8-from2.atomic.v1.gateway-band", "sentence_completion.concession.easy.006"],
      ["sentence_completion.concession.easy.n8-from2.atomic.v1.gateway-band", "sentence_completion.concession.easy.007"],
      ["sentence_completion.concession.hard.n10-from212.atomic.v1.gateway-hard-pilot", "sentence_completion.concession.hard.221"],
      ["sentence_completion.concession.hard.n5-ord252.atomic.v1.gateway-relational-4", "sentence_completion.concession.hard.260"],
    ] as const;

    for (const [run, id] of targets) {
      const file = path.join(runsRoot, run, "candidates", `${id}.json`);
      expect(existsSync(file)).toBe(true);
      const record = JSON.parse(readFileSync(file, "utf8")) as CandidateRecord;
      expect(record.id).toBe(id);
      const view = buildEditorialView(record, `${run}::${id}`);
      expect(view.stem.trim().length).toBeGreaterThan(0);
      expect(Object.values(view.options).every((opt) => opt.trim().length > 0)).toBe(true);
      expect(view.explanation.trim().length).toBeGreaterThanOrEqual(12);
      expect(view.lessonGaps.filter).toEqual([]);
      expect(view.distractors).toHaveLength(4);
      expect(view.distractors.every((d) => Boolean(d.errorClass) && d.whyWrong.trim().length > 0)).toBe(true);
      expect(view.skills.studentSkillIds).toEqual(["sentence-link"]);
      expect(view.dryRunDecision.eligible).toBe(false);
    }
  });
});
