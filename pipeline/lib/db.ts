import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Query } from "@/db/drift";
import { syncKnowledge } from "@/db/knowledge-sync";
import { migratePglite } from "@/db/migrations";

/** A PGlite directory of its own: two processes on the app's `.data/pglite` corrupt it. The live database is written only through reviewed SQL. */
export async function openLocalDatabase() {
  const client = new PGlite(process.env.PGLITE_DIR ?? ".data/analysis/pglite");
  await migratePglite(client);
  await syncKnowledge(drizzle(client));
  const query: Query = async <T>(sql: string, params: unknown[] = []) => (await client.query<T>(sql, params)).rows;
  return {
    query,
    async apply(statements: string[]) {
      await client.transaction(async (tx) => {
        for (const statement of statements) await tx.exec(statement);
      });
    },
    close: () => client.close(),
  };
}
