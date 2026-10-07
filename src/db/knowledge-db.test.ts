import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { knowledgeEdges, knowledgeNodes, legacyMap } from "@/modules/knowledge/seed";
import { actualShape, expectedShape } from "./drift";
import { syncKnowledge } from "./knowledge-sync";
import { knowledgeEdges as edgesTable, knowledgeNodes as nodesTable, knowledgeVersions, legacyNodeMap } from "./knowledge-schema";
import { migratePglite } from "./migrations";

let client: PGlite;

const rows = async <T>(query: string, params: unknown[] = []) => (await client.query<T>(query, params)).rows;

const counts = async () =>
  (
    await rows<{ versions: number; nodes: number; edges: number; mappings: number; touched: string }>(
      `select (select count(*) from knowledge_versions)::int as versions, (select count(*) from knowledge_nodes)::int as nodes,
              (select count(*) from knowledge_edges)::int as edges, (select count(*) from legacy_node_map)::int as mappings,
              (select max(updated_at)::text from knowledge_nodes) as touched`,
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

describe("knowledge graph database", () => {
  it("loads every seed node, edge and mapping", async () => {
    expect(await counts()).toMatchObject({ versions: 1, nodes: knowledgeNodes.length, edges: knowledgeEdges.length, mappings: legacyMap.length });
  });

  it("is idempotent across repeated migrate and sync runs", async () => {
    const before = await counts();
    expect(await migratePglite(client)).toEqual([]);
    await syncKnowledge(drizzle(client));
    expect(await counts()).toEqual(before);
  });

  it("enforces graph constraints", async () => {
    const insertEdge = (select: string) => client.query(`insert into knowledge_edges (from_node_id, to_node_id, edge_type, since_version) ${select}`);
    await expect(insertEdge("select id, id, 'related_to', '1.0' from knowledge_nodes limit 1")).rejects.toThrow(/knowledge_edges_no_self/);
    await expect(insertEdge("select from_node_id, to_node_id, edge_type, since_version from knowledge_edges limit 1")).rejects.toThrow(/knowledge_edges_unique/);
    await expect(insertEdge("select a.id, b.id, 'child_of', '1.0' from knowledge_nodes a, knowledge_nodes b where a.id <> b.id limit 1")).rejects.toThrow(/check/);
    await expect(client.query("insert into knowledge_nodes (node_type, slug, name, since_version) values ('concept', 'x', 'X', '1.0')")).rejects.toThrow(/check/);
    await expect(client.query("insert into knowledge_nodes (node_type, slug, name, since_version) values ('skill', 'Bad-Slug', 'X', '1.0')")).rejects.toThrow(/check/);
    await expect(client.query("delete from knowledge_nodes where node_type = 'discourse_relation' and slug = 'concession'")).rejects.toThrow(/foreign key/);
  });

  it("matches the Drizzle schema", async () => {
    for (const table of [knowledgeVersions, nodesTable, edgesTable, legacyNodeMap] as PgTable[]) {
      expect(await actualShape(rows, table), getTableConfig(table).name).toEqual(expectedShape(table));
    }
  });

  it("answers graph questions", async () => {
    const related = await rows<{ ref: string }>(
      `select distinct o.node_type || ':' || o.slug as ref
       from knowledge_nodes c
       join knowledge_edges e on c.id in (e.from_node_id, e.to_node_id)
       join knowledge_nodes o on o.id = case when e.from_node_id = c.id then e.to_node_id else e.from_node_id end
       where c.node_type = 'discourse_relation' and c.slug = 'concession'`,
    );
    expect(related.map((row) => row.ref)).toEqual(
      expect.arrayContaining(["discourse_relation:contrast", "connector:although", "connector:despite", "misconception:concession_vs_contrast", "domain:discourse"]),
    );

    const nounConnectors = await rows<{ slug: string }>(
      `select c.slug from knowledge_nodes r
       join knowledge_edges ex on ex.from_node_id = r.id and ex.edge_type = 'expressed_by'
       join knowledge_nodes c on c.id = ex.to_node_id
       join knowledge_edges hp on hp.from_node_id = c.id and hp.edge_type = 'has_pattern'
       join knowledge_nodes p on p.id = hp.to_node_id
       where r.node_type = 'discourse_relation' and r.slug = 'concession' and p.slug = 'prepositional_connector'
       order by c.slug`,
    );
    expect(nounConnectors.map((row) => row.slug)).toEqual(["despite", "in_spite_of"]);

    const exploited = await rows<{ slug: string }>(
      `select m.slug from knowledge_nodes d
       join knowledge_edges e on e.from_node_id = d.id and e.edge_type = 'exploits'
       join knowledge_nodes m on m.id = e.to_node_id
       where d.node_type = 'distractor_type' and d.slug = 'wrong_discourse_relation' order by m.slug`,
    );
    expect(exploited.map((row) => row.slug)).toEqual(["cause_vs_result_direction", "concession_vs_contrast"]);

    const legacy = await rows<{ ref: string }>(
      `select n.node_type || ':' || n.slug as ref from legacy_node_map m join knowledge_nodes n on n.id = m.node_id
       where m.legacy_kind = 'distractor' and m.legacy_id = 'CONNECTOR_ERROR'`,
    );
    expect(legacy).toEqual([{ ref: "distractor_type:wrong_discourse_relation" }]);
  });

  it("keeps RLS on every table and client policies read-only", async () => {
    expect(await rows("select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity and relname <> 'app_migrations'")).toEqual(
      [],
    );
    expect(await rows("select policyname from pg_policies where schemaname = 'public' and cmd <> 'SELECT'")).toEqual([]);

    const me = randomUUID();
    await client.query("insert into profiles (id, email) values ($1, $2)", [me, `${me}@example.test`]);
    await client.exec("GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, subscriptions, app_meta TO authenticated");
    await client.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [me]);
      expect((await tx.query("select id from profiles")).rows).toEqual([{ id: me }]);
      expect((await tx.query("update profiles set role = 'admin' returning id")).rows).toEqual([]);
      expect((await tx.query("select * from app_meta")).rows).toEqual([]);
      await expect(tx.query("insert into subscriptions (profile_id, plan, status, provider) values ($1, 'kamp', 'active', 'api')", [me])).rejects.toThrow(
        /row-level security/,
      );
    });
    expect((await rows<{ role: string }>("select role from profiles where id = $1", [me]))[0].role).toBe("learner");
  });
});
