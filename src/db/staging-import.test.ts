import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analysisDraft, type AnalysisDraft } from "@/modules/analysis/contract";
import { toDnaQuestion, type DnaQuestion } from "@/modules/analysis/dna";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { diagnosisConfidence, type Lesson } from "@/modules/content/lesson";
import {
  bankImportItemId,
  evaluateBankImport,
  importBankCandidates,
  toBankItemWrite,
  type BankImportSource,
  type BankWriter,
} from "@/modules/factory/bank-import";
import { generatedQuestionCandidate, type GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import { submitEditorialReview } from "@/modules/factory/editorial-review";
import { familyBlueprints } from "@/modules/factory/families";
import { buildExamProfile } from "@/modules/factory/profile";
import type { CandidateRecord } from "@/modules/factory/review";
import { buildQuestionSpec } from "@/modules/factory/spec-engine";
import { validateCandidate } from "@/modules/factory/validator";
import { initialMastery, skillUpdates, weightedMastery } from "@/modules/learning/mastery";
import { buildPlan, rankWeakErrorClasses } from "@/modules/learning/plan";
import { migratePglite } from "./migrations";
import { answers, choices, errorMastery, itemSkills, items, mastery, sessionItems, sessions, skills } from "./schema";
import { syncKnowledge } from "./knowledge-sync";

let client: PGlite;
let db: ReturnType<typeof drizzle>;

function makePgliteWriter(options: { failOnSkills?: boolean } = {}): BankWriter {
  return {
    async hasItem(id: string) {
      const rows = await db.select({ id: items.id }).from(items).where(eq(items.id, id)).limit(1);
      return rows.length > 0;
    },
    async write(payload) {
      await db.transaction(async (tx) => {
        await tx.insert(items).values(payload.item);
        await tx.insert(choices).values(payload.choices);
        if (options.failOnSkills) {
          throw new Error("simulated partial failure before item_skills insert");
        }
        await tx.insert(itemSkills).values(payload.skills);
      });
    },
  };
}

const fixtureItem: ReconstructedQuestion = {
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

const fixtureDraft = (patch: Partial<AnalysisDraft> = {}): AnalysisDraft =>
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

const fixtureDna = (document: string, number: number): DnaQuestion =>
  toDnaQuestion({ document, question: { ...fixtureItem, number }, analysis: fixtureDraft(), answer: "A", textSha256: "0".repeat(64), proposals: [] });

function makeCleanSource(sourceKey: string, specId: string): BankImportSource {
  const spec = {
    ...buildQuestionSpec({
      profile: buildExamProfile([fixtureDna("yds-2018", 31), fixtureDna("yds-2018-2", 32), fixtureDna("yds-2023-10", 33), fixtureDna("yds-2024-11", 34)]),
      family: familyBlueprints["sentence_completion.concession"],
      ordinal: 1,
    }),
    id: specId,
    targetSkill: "skill:coherence" as const,
    cognitiveSkill: "cognitive_skill:context_integration" as const,
  };
  const candidate: GeneratedQuestionCandidate = generatedQuestionCandidate.parse({
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
  });
  const validation = validateCandidate({ spec, candidate });

  const record: CandidateRecord = {
    id: specId,
    spec,
    status: "approved",
    judge: null,
    provenance: {
      pipelineVersion: "atomic.v1",
      provider: "gateway",
      generatorModel: "gateway:anthropic/claude-haiku-5.5",
      distractorModel: "gateway:anthropic/claude-haiku-5.5",
      distractorJudgeModel: "gateway:google/gemini-3.8-flash",
      judgeModel: "gateway:anthropic/claude-sonnet-5.5",
      explanationModel: "gateway:anthropic/claude-haiku-5.5",
      generatorPromptVersion: "skeleton.v2",
      distractorPromptVersion: "distractor.v4",
      distractorJudgePromptVersion: "distractor-judge.v7",
      judgePromptVersion: "judge.v2",
      blindSolvePromptVersion: "verifier-solve.v1",
      acceptabilityPromptVersion: "acceptability.v1",
      explanationPromptVersion: "explanation.v2",
      questionSpecVersion: "question-spec.v2",
      distractorSpecVersion: "distractor-spec.v6",
      specId,
      knowledgeVersion: "1.0",
      dnaVersion: "1",
      examProfileVersion: "yds-profile.v1",
      candidateVersion: "candidate.v2",
      validatorVersion: "validator.v5",
      judgeVersion: "judge-contract.v3",
      distractorJudgeVersion: "distractor-judge.v3",
      skeletonGatePromptVersion: "skeleton-check.v2",
      skeletonGateVersion: "skeleton-gate.v1",
      seed: 1,
      experiments: [],
      distractorDiagnosisVersion: "distractor-diagnosis.v1",
      originalityVersion: "shingle5.v1",
      generatedAt: "2026-11-06T12:00:00.000Z",
      attempts: [],
      requestHashes: { blindSolve: null, acceptability: null, judge: null },
      sourceContextIds: ["yds-2024-11"],
    },
    versions: [
      {
        version: 1,
        author: "generator",
        createdAt: "2026-11-06T12:00:00.000Z",
        candidate,
        validation,
      },
    ],
    reviews: [
      {
        reviewVersion: "review.v1",
        decision: "APPROVE",
        reviewer: "human:editor@outklas.test",
        appliesToVersion: 1,
        notes: "Verified staging test approval.",
        at: "2026-11-24T10:00:00.000Z",
      },
    ],
  };

  return { sourceKey, record };
}

beforeAll(async () => {
  client = new PGlite();
  await migratePglite(client);
  db = drizzle(client);
  await syncKnowledge(drizzle(client));

  await db
    .insert(skills)
    .values([
      { id: "sentence", parentId: null, name: "Sentence completion" },
      { id: "sentence-link", parentId: "sentence", name: "Logical link" },
    ])
    .onConflictDoNothing();

  // Seed a pre-existing item to verify existing data is untouched
  await db.insert(items).values({
    id: "existing-item-1",
    slot: 27,
    section: "sentence",
    layout: "blank",
    direction: null,
    stem: "Existing stem ----.",
    explanation: "Existing explanation for test.",
    difficulty: 3,
    status: "published",
    stimulusId: null,
    lesson: null,
  });
}, 60_000);

afterAll(async () => {
  await client.close();
});

describe("isolated staging import (PGlite)", () => {
  it("runs dry-run without writing, imports once with full relational data, is idempotent, and rolls back partial failure", async () => {
    const cleanSource = makeCleanSource(
      "staging-run::sentence_completion.concession.easy.004",
      "sentence_completion.concession.easy.004",
    );
    const writer = makePgliteWriter();

    // 1. Dry-run must not write
    const dry = await importBankCandidates({ sources: [cleanSource], mode: "dry-run", writer });
    expect(dry.eligible).toBe(1);
    expect(dry.writes).toBe(0);
    expect(await db.select().from(items)).toHaveLength(1);

    // 2. Partial failure must roll back completely
    const failingSource = makeCleanSource(
      "staging-run::sentence_completion.concession.easy.fail",
      "sentence_completion.concession.easy.fail",
    );
    await expect(
      importBankCandidates({
        sources: [failingSource],
        mode: "apply",
        writer: makePgliteWriter({ failOnSkills: true }),
      }),
    ).rejects.toThrow(/simulated partial failure/);
    const failedId = bankImportItemId(failingSource.sourceKey);
    expect(await db.select().from(items).where(eq(items.id, failedId))).toHaveLength(0);
    expect(await db.select().from(choices).where(eq(choices.itemId, failedId))).toHaveLength(0);

    // 3. Apply import into isolated PGlite DB
    const applied = await importBankCandidates({ sources: [cleanSource], mode: "apply", writer });
    expect(applied.writes).toBe(1);
    expect(applied.eligible).toBe(1);

    const importedId = bankImportItemId(cleanSource.sourceKey);
    const [storedItem] = await db.select().from(items).where(eq(items.id, importedId));
    expect(storedItem).toBeDefined();
    expect(storedItem!.stem).toBe(cleanSource.record.versions[0]!.candidate.question.stem);
    expect(storedItem!.explanation).toBe(cleanSource.record.versions[0]!.candidate.explanation);
    expect(storedItem!.lesson).toMatchObject({ task: "sentence_completion", relation: "concession" });

    const storedChoices = await db.select().from(choices).where(eq(choices.itemId, importedId));
    expect(storedChoices).toHaveLength(5);
    expect(storedChoices.filter((c) => c.correct)).toHaveLength(1);
    expect(storedChoices.filter((c) => !c.correct).every((c) => c.errorClass === "discourse_relation")).toBe(true);

    const storedSkills = await db.select().from(itemSkills).where(eq(itemSkills.itemId, importedId));
    expect(storedSkills).toEqual([
      { itemId: importedId, skillId: "sentence-link", weight: 1, role: "primary" },
    ]);

    // Provenance preserves source candidate ID and version
    const decision = evaluateBankImport(cleanSource);
    expect(decision.payload?.provenance.specId).toBe("sentence_completion.concession.easy.004");
    expect(decision.payload?.provenance.appliesToVersion).toBe(1);
    expect(toBankItemWrite(decision.payload!).item.id).toBe(importedId);

    // 4. Repeated import is idempotent
    const repeated = await importBankCandidates({ sources: [cleanSource], mode: "apply", writer });
    expect(repeated.writes).toBe(0);
    expect(repeated.skipped).toBe(1);

    // 5. Pre-existing item remains untouched
    const [existing] = await db.select().from(items).where(eq(items.id, "existing-item-1"));
    expect(existing?.stem).toBe("Existing stem ----.");
  });

  it("completes isolated E2E student loop: review -> import -> session -> wrong distractor -> mastery/error_mastery -> lesson -> daily plan", async () => {
    const base = makeCleanSource(
      "e2e-fixture::sentence_completion.concession.easy.004",
      "sentence_completion.concession.easy.004",
    );
    // Start unapproved, then apply explicit test-fixture editorial approval
    const pending: CandidateRecord = { ...base.record, status: "pending_review", reviews: [] };
    const { record: reviewed } = submitEditorialReview(pending, {
      decision: "APPROVE",
      adminEmail: "fixture-admin@outklas.test",
      notes: "Isolated E2E test fixture approval.",
      band: "easy",
      sourceKey: base.sourceKey,
    });

    const writer = makePgliteWriter();
    const imported = await importBankCandidates({
      sources: [{ sourceKey: base.sourceKey, record: reviewed }],
      mode: "apply",
      writer,
    });
    expect(imported.writes).toBe(1);

    const itemId = bankImportItemId(base.sourceKey);
    const profileId = randomUUID();
    const sessionId = randomUUID();

    // 3. Create practice session with imported item
    await db.insert(sessions).values({
      id: sessionId,
      profileId,
      mode: "practice",
      exam: "yds",
      status: "active",
    });
    await db.insert(sessionItems).values({
      sessionId,
      itemId,
      position: 0,
    });

    // 4. Select a wrong distractor (position 1 = B: CONNECTOR_ERROR / discourse_relation)
    const itemChoices = await db.select().from(choices).where(eq(choices.itemId, itemId));
    const wrongChoice = itemChoices.find((c) => !c.correct && c.position === 1)!;
    const [storedItem] = await db.select().from(items).where(eq(items.id, itemId));
    const storedSkills = await db.select().from(itemSkills).where(eq(itemSkills.itemId, itemId));

    const letter = "ABCDE"[wrongChoice.position] ?? "";
    const diagConf = diagnosisConfidence(storedItem!.lesson as Lesson | null, letter, false);
    await db.insert(answers).values({
      id: randomUUID(),
      sessionId,
      profileId,
      itemId,
      choiceId: wrongChoice.id,
      correct: false,
      responseTimeMs: 4200,
      errorClass: wrongChoice.errorClass,
      diagnosisConfidence: diagConf,
    });

    // 5. Verify answers.choice_id and answers.error_class
    const [savedAnswer] = await db
      .select()
      .from(answers)
      .where(and(eq(answers.sessionId, sessionId), eq(answers.itemId, itemId)));
    expect(savedAnswer?.choiceId).toBe(wrongChoice.id);
    expect(savedAnswer?.errorClass).toBe("discourse_relation");

    // 6. Update mastery (sentence-link) & error_mastery (discourse_relation)
    const links = skillUpdates({
      correct: false,
      links: storedSkills.map((s) => ({
        skillId: s.skillId,
        weight: s.weight,
        role: s.role as "primary" | "secondary",
      })),
    });
    expect(links).toHaveLength(1);
    expect(links[0]?.skillId).toBe("sentence-link");

    const nextSkillMastery = Math.round(weightedMastery(initialMastery(), false, storedItem!.difficulty, links[0]!.weight));
    await db.insert(mastery).values({
      profileId,
      skillId: links[0]!.skillId,
      mastery: nextSkillMastery,
      confidence: 1,
      attempts: 1,
      correctAttempts: 0,
    });
    expect(nextSkillMastery).toBeLessThan(50);

    const nextErrMastery = Math.round(weightedMastery(initialMastery(), false, storedItem!.difficulty, 1));
    await db.insert(errorMastery).values({
      profileId,
      errorClass: wrongChoice.errorClass!,
      mastery: nextErrMastery,
      attempts: 1,
      correctAttempts: 0,
    });

    // 7. Verify Röntgen/Lesson data reaches student reveal layer
    const lesson = storedItem!.lesson as Lesson | null;
    expect(lesson?.task).toBe("sentence_completion");
    expect(lesson?.relation).toBe("concession");
    expect(lesson?.xray?.diagnosis?.raw.length).toBeGreaterThan(5);

    // 8. Verify daily plan prioritizes discourse_relation
    const errRows = await db.select().from(errorMastery).where(eq(errorMastery.profileId, profileId));
    const weakErrors = rankWeakErrorClasses(errRows);
    expect(weakErrors).toEqual(["discourse_relation"]);

    const followUpItemId = `${itemId}-followup`;
    const plan = buildPlan({
      minutes: 15,
      mastery: [{ section: "sentence", mastery: nextSkillMastery }],
      dueQuestionIds: [],
      dueVocabIds: [],
      seenIds: [itemId],
      targetSection: "sentence",
      weakErrors,
      pool: [
        {
          id: followUpItemId,
          slot: 8002,
          stimulusId: null,
          skillIds: ["sentence-link"],
          section: "sentence",
          difficulty: storedItem!.difficulty,
          errorClasses: ["discourse_relation"],
        },
      ],
    });
    expect(plan.weakErrors).toEqual(["discourse_relation"]);
    expect(plan.blocks).toContainEqual(
      expect.objectContaining({ kind: "question", id: followUpItemId, section: "sentence", bucket: "weak" }),
    );
  });
});
