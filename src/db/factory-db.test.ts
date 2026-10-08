import { PGlite } from "@electric-sql/pglite";
import { getTableConfig } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { actualShape, expectedShape } from "./drift";
import { factoryTables } from "./factory-schema";
import { syncKnowledge } from "./knowledge-sync";
import { migratePglite } from "./migrations";

let client: PGlite;
const rows = async <T>(query: string, params: unknown[] = []) => (await client.query<T>(query, params)).rows;

const run = (generator: string, judge: string) =>
  rows<{ id: string }>(
    `insert into factory.runs (exam, family, band, requested, provider, generator_model, judge_model, generator_prompt_version, judge_prompt_version,
       blind_solve_prompt_version, question_spec_version, knowledge_version, dna_version, exam_profile_version, validator_version, judge_version, originality_version, started_at)
     values ('yds', 'sentence_completion.concession', 'medium', 12, 'gemini', $1, $2, 'generator.v1', 'judge.v1', 'verifier-solve.v1', 'question-spec.v2', '1.0', '1',
       'yds-profile.v1', 'validator.v1', 'judge-contract.v1', 'shingle5.v1', now()) returning id`,
    [generator, judge],
  );

beforeAll(async () => {
  client = new PGlite();
  await migratePglite(client);
  await syncKnowledge(drizzle(client));
}, 60_000);

afterAll(async () => {
  await client.close();
});

describe("factory schema", () => {
  it("matches the Drizzle schema", async () => {
    for (const table of factoryTables) expect(await actualShape(rows, table), getTableConfig(table).name).toEqual(expectedShape(table));
  });

  it("keeps RLS on, no policies and no client grants", async () => {
    expect(await rows("select relname from pg_class where relnamespace = 'factory'::regnamespace and relkind = 'r' and not relrowsecurity")).toEqual([]);
    expect(await rows("select policyname from pg_policies where schemaname = 'factory'")).toEqual([]);
    expect(await rows("select grantee, table_name from information_schema.role_table_grants where table_schema = 'factory' and grantee in ('anon', 'authenticated', 'PUBLIC')")).toEqual([]);
    expect((await rows<{ usable: boolean }>("select has_schema_privilege('anon', 'factory', 'USAGE') as usable"))[0].usable).toBe(false);
  });

  it("refuses a run whose judge is the generator model", async () => {
    await expect(run("same", "same")).rejects.toThrow(/independent_judge/);
  });

  it("keeps versions and reviews append-only and version 1 for the generator", async () => {
    const [{ id: runId }] = await run("gen", "judge");
    const [{ id }] = await rows<{ id: string }>("insert into factory.candidates (run_id, spec_id, spec, status, provenance) values ($1, 'sc.concession.medium.001', '{}', 'pending_review', '{}') returning id", [runId]);
    await rows("insert into factory.candidate_versions (candidate_id, version, author, payload, validation, validation_status) values ($1, 1, 'generator', '{}', '{}', 'pass')", [id]);
    await expect(rows("insert into factory.candidate_versions (candidate_id, version, author, payload, validation, validation_status) values ($1, 2, 'generator', '{}', '{}', 'pass')", [id])).rejects.toThrow();
    await rows("insert into factory.candidate_versions (candidate_id, version, author, payload, validation, validation_status) values ($1, 2, 'human:mora', '{}', '{}', 'pass')", [id]);
    await expect(rows("update factory.candidate_versions set payload = '{\"x\":1}' where candidate_id = $1 and version = 1", [id])).rejects.toThrow(/append-only/);
    await expect(rows("delete from factory.candidate_versions where candidate_id = $1", [id])).rejects.toThrow(/append-only/);
    await rows("insert into factory.reviews (candidate_id, applies_to_version, decision, reviewer, review_version) values ($1, 2, 'APPROVE', 'mora', 'review.v1')", [id]);
    await expect(rows("insert into factory.reviews (candidate_id, applies_to_version, decision, reviewer, review_version) values ($1, 3, 'APPROVE', 'mora', 'review.v1')", [id])).rejects.toThrow();
    await expect(rows("delete from factory.reviews where candidate_id = $1", [id])).rejects.toThrow(/append-only/);
  });
});
