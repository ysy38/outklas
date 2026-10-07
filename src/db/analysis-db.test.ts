import { PGlite } from "@electric-sql/pglite";
import { getTableConfig } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AnalysisDraft } from "@/modules/analysis/contract";
import { toDnaQuestion } from "@/modules/analysis/dna";
import { sourceDocuments, sourceProviders } from "@/modules/analysis/sources";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { words } from "@/modules/analysis/surface";
import { analysisImportStatements, readDnaQuestions, type DnaBundle } from "./analysis-import";
import { analysisTables } from "./analysis-schema";
import { actualShape, expectedShape } from "./drift";
import { syncKnowledge } from "./knowledge-sync";
import { migratePglite } from "./migrations";

let client: PGlite;

const rows = async <T>(query: string, params: unknown[] = []) => (await client.query<T>(query, params)).rows;

const question: ReconstructedQuestion = {
  number: 8,
  section: "grammar",
  layout: "blank",
  stimulusKey: null,
  stimulus: null,
  stem: "The village council approved the bridge repairs ---- several residents openly questioned the projected budget.",
  options: { A: "despite", B: "although", C: "because of", D: "so that", E: "unless" },
  translationDirection: null,
};

const analysis: AnalysisDraft = {
  question_number: 8,
  question_type: "question_type:grammar",
  correct_option: "B",
  knowledge: {
    primary_concepts: ["discourse_relation:concession", "grammar_pattern:clause_connector"],
    secondary_concepts: ["discourse_relation:contrast"],
    grammar: ["grammar:adverbial_clause", "grammar:conjunction"],
    vocabulary: [
      { lemma: "although", pos: "conjunction", role: "answer", ref: "connector:although" },
      { lemma: "despite", pos: "preposition", role: "distractor", ref: "connector:despite" },
      { lemma: "approve", pos: "verb", role: "tested", ref: null },
    ],
    discourse_relations: ["discourse_relation:concession"],
  },
  skills: { primary: null, secondary: [], cognitive: ["cognitive_skill:logical_relationship", "cognitive_skill:semantic_discrimination"] },
  difficulty: { overall: 0.45, lexical: 0.3, syntactic: 0.55, semantic: 0.4, inference: 0.3, distractor_similarity: 0.6, context_dependency: 0.5 },
  answer_expresses: ["connector:although", "discourse_relation:concession"],
  distractors: [
    { label: "A", type: "distractor_type:syntactic_mismatch", expresses: "connector:despite", targeted_concept: "grammar_pattern:prepositional_connector", misconception: "misconception:despite_with_finite_clause", why_plausible: "x", why_wrong: "y" },
    { label: "C", type: "distractor_type:wrong_discourse_relation", expresses: "discourse_relation:cause", targeted_concept: null, misconception: "misconception:cause_vs_result_direction", why_plausible: "x", why_wrong: "y" },
    { label: "D", type: "distractor_type:wrong_discourse_relation", expresses: "discourse_relation:purpose", targeted_concept: null, misconception: null, why_plausible: "x", why_wrong: "y" },
    { label: "E", type: "distractor_type:wrong_discourse_relation", expresses: "discourse_relation:condition", targeted_concept: null, misconception: null, why_plausible: "x", why_wrong: "y" },
  ],
  misconceptions: ["misconception:despite_with_finite_clause"],
  prerequisites: ["grammar:conjunction"],
  learning_objective: "Pick a concessive subordinator before a finite clause.",
  pedagogy: { cognitive_demand: "apply", transfer_requirement: "medium" },
  proposals: [],
  ambiguities: [],
  confidence: 0.9,
  needs_review: false,
};

const dna = toDnaQuestion({ document: "yds-2024-11", question, analysis, answer: "B", textSha256: "a".repeat(64), proposals: [] });

const bundle: DnaBundle = {
  sources: sourceProviders,
  sourceDocuments,
  document: { slug: "yds-2024-11", exam: "yds", year: 2024, session: "2024-11", blueprint: "yds-en", questionCount: 80, sourceClass: "complete_exam", usableForDistribution: true },
  run: {
    stage: "analyze",
    stageVersion: "1",
    provider: "gemini",
    model: "test-model",
    promptVersion: "analyzer.v1",
    schemaVersion: "1",
    knowledgeVersion: "1.0",
    inputHash: "b".repeat(64),
    outputHash: "c".repeat(64),
    status: "succeeded",
    itemCount: 1,
    acceptedCount: 1,
    reviewCount: 0,
    failedCount: 0,
    inputTokens: 10,
    outputTokens: 20,
    startedAt: "2026-10-07T10:00:00Z",
    finishedAt: "2026-10-07T10:05:00Z",
  },
  questions: [dna],
  proposals: [{ type: "vocabulary", slug: "approve", name: "approve", questions: [8] }],
};

const runImport = async () => {
  await client.transaction(async (tx) => {
    for (const statement of analysisImportStatements(bundle)) await tx.exec(statement);
  });
};

const counts = async () =>
  (
    await rows<Record<string, number>>(
      `select ${analysisTables.map((table) => `(select count(*) from analysis.${getTableConfig(table).name})::int as ${getTableConfig(table).name}`).join(", ")},
              (select count(*) from knowledge_nodes)::int as knowledge_nodes, (select count(*) from knowledge_edges)::int as knowledge_edges,
              (select count(*) from legacy_node_map)::int as legacy_node_map`,
    )
  )[0];

beforeAll(async () => {
  client = new PGlite();
  await migratePglite(client);
  await syncKnowledge(drizzle(client));
}, 60_000);

afterAll(async () => {
  await client.close();
});

describe("analysis schema", () => {
  it("matches the Drizzle schema", async () => {
    for (const table of analysisTables) expect(await actualShape(rows, table), getTableConfig(table).name).toEqual(expectedShape(table));
  });

  it("keeps RLS on, no policies and no client grants", async () => {
    expect(await rows("select relname from pg_class where relnamespace = 'analysis'::regnamespace and relkind = 'r' and not relrowsecurity")).toEqual([]);
    expect(await rows("select policyname from pg_policies where schemaname = 'analysis'")).toEqual([]);
    expect(await rows("select grantee, table_name from information_schema.role_table_grants where table_schema = 'analysis' and grantee in ('anon', 'authenticated', 'PUBLIC')")).toEqual([]);
    expect((await rows<{ usable: boolean }>("select has_schema_privilege('anon', 'analysis', 'USAGE') as usable"))[0].usable).toBe(false);
    expect((await rows<{ usable: boolean }>("select has_schema_privilege('authenticated', 'analysis', 'USAGE') as usable"))[0].usable).toBe(false);
  });

  it("bounds every text column so no sentence fits, except source metadata", async () => {
    const allowed = new Set(["source_documents.title", "source_documents.authors"]);
    const unbounded = await rows<{ column: string }>(
      `select c.table_name || '.' || c.column_name as column from information_schema.columns c
       where c.table_schema = 'analysis' and c.data_type in ('text', 'ARRAY')
         and not exists (
           select 1 from pg_constraint k join pg_class t on t.oid = k.conrelid
           where t.relnamespace = 'analysis'::regnamespace and t.relname = c.table_name and k.contype = 'c'
             and pg_get_constraintdef(k.oid) ~ ('(char_length\\("?' || c.column_name || '"?\\) <= \\d+|"?' || c.column_name || '"? ~ |"?' || c.column_name || '"? = ANY|"?' || c.column_name || '"? IN )')
         )
       order by 1`,
    );
    expect(unbounded.map((row) => row.column).filter((column) => !allowed.has(column))).toEqual([]);
    const jsonb = await rows<{ column: string }>(
      "select table_name || '.' || column_name as column from information_schema.columns where table_schema = 'analysis' and data_type = 'jsonb'",
    );
    expect(jsonb.map((row) => row.column)).toEqual(["source_documents.metadata"]);
  });

  it("imports idempotently and reads the same DNA back", async () => {
    const knowledgeBefore = await counts();
    await runImport();
    const after = await counts();
    expect(after).toMatchObject({ questions: 1, question_features: 1, distractors: 4, families: 2, family_members: 2, node_proposals: 1, question_proposals: 1, runs: 1, documents: 1 });
    expect(after.source_documents).toBe(sourceDocuments.length);
    expect(after.question_nodes).toBe(dna.nodes.length);
    await runImport();
    expect(await counts()).toEqual(after);
    expect({ nodes: after.knowledge_nodes, edges: after.knowledge_edges, map: after.legacy_node_map }).toEqual({
      nodes: knowledgeBefore.knowledge_nodes,
      edges: knowledgeBefore.knowledge_edges,
      map: knowledgeBefore.legacy_node_map,
    });
    expect(await readDnaQuestions(rows, "yds-2024-11")).toEqual([{ ...dna, proposals: [{ type: "vocabulary", slug: "approve" }] }]);
  });

  it("never carries item text into the database", async () => {
    const sql = analysisImportStatements(bundle).join("\n").toLowerCase();
    const itemWords = words([question.stem, ...Object.values(question.options)].join(" ")).map((word) => word.toLowerCase());
    for (let i = 0; i + 5 <= itemWords.length; i += 1) expect(sql).not.toContain(itemWords.slice(i, i + 5).join(" "));
    expect(sql).not.toContain(analysis.learning_objective.toLowerCase());
  });

  it("enforces license and reference constraints", async () => {
    await expect(
      client.query(
        "update analysis.source_documents set commercial_use = true where slug = 'yds-2024-11'",
      ),
    ).rejects.toThrow(/analysis_source_documents_reference_only/);
    await expect(client.query("update analysis.source_documents set license_status = 'verified' where slug = 'yds-2024-11'")).rejects.toThrow(/verified_status/);
    await expect(client.query("update analysis.source_documents set verified = true where slug = 'yds-2024-11'")).rejects.toThrow(/verified_at/);
    await expect(client.query("update analysis.questions set structural_format = repeat('x', 65)")).rejects.toThrow(/check/);
    await expect(client.query("update analysis.questions set text_sha256 = 'not a hash'")).rejects.toThrow(/check/);
    await expect(client.query("delete from knowledge_nodes where node_type = 'connector' and slug = 'despite'")).rejects.toThrow(/foreign key/);
    await expect(client.query("delete from knowledge_nodes where node_type = 'question_type' and slug = 'grammar'")).rejects.toThrow(/foreign key/);
  });
});
