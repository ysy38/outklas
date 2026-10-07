import { sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { knowledgeSyncStatements, syncKnowledge } from "../src/db/knowledge-sync";

const countSql = sql.raw(
  "select (select count(*) from knowledge_nodes)::int as nodes, (select count(*) from knowledge_edges)::int as edges, (select count(*) from legacy_node_map)::int as mappings",
);

async function run(db: PgliteDatabase) {
  await syncKnowledge(db);
  const result = (await db.execute(countSql)) as unknown;
  console.log((Array.isArray(result) ? result : (result as { rows: unknown[] }).rows)[0]);
}

async function main() {
  if (process.argv.includes("--sql")) {
    console.log(`BEGIN;\n\n${knowledgeSyncStatements().join(";\n\n")};\n\nCOMMIT;`);
    return;
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { max: 1, prepare: !/pgbouncer=true|:6543\b/.test(url) });
    await run(drizzle(client) as unknown as PgliteDatabase);
    await client.end();
    return;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(process.env.PGLITE_DIR ?? ".data/pglite");
  await run(drizzle(client));
  await client.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
