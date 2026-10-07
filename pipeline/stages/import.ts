import { analysisImportStatements, type DnaBundle } from "@/db/analysis-import";
import { analysisTables } from "@/db/analysis-schema";
import { getTableConfig } from "drizzle-orm/pg-core";
import { readJson, readManifest, runStage } from "../lib/artifacts";
import { openLocalDatabase } from "../lib/db";
import type { StageContext } from "./context";

export const countsSql = `select ${analysisTables.map((table) => `(select count(*) from analysis.${getTableConfig(table).name})::int as ${getTableConfig(table).name}`).join(", ")},
  (select count(*) from public.knowledge_nodes)::int as knowledge_nodes, (select count(*) from public.knowledge_edges)::int as knowledge_edges,
  (select count(*) from public.legacy_node_map)::int as legacy_node_map`;

/** Writes the text-free rows to the local database and leaves import.sql for the live database. */
export async function importStage(context: StageContext) {
  const slug = context.document.slug;
  const built = readManifest(slug, "dna");
  if (!built) throw new Error("Run the dna stage first.");
  return runStage(
    { document: slug, stage: "import", version: "1", inputs: { dna: built.outputHash }, code: ["pipeline/stages/import.ts", "src/db/analysis-import.ts"], force: true },
    async () => {
      const bundle = readJson<DnaBundle>(slug, "dna", "rows.json");
      const statements = analysisImportStatements(bundle);
      const db = await openLocalDatabase();
      try {
        const before = (await db.query<Record<string, number>>(countsSql))[0];
        await db.apply(statements);
        await db.apply(statements);
        const after = (await db.query<Record<string, number>>(countsSql))[0];
        return {
          files: { "import.sql": `BEGIN;\n\n${statements.join(";\n\n")};\n\nCOMMIT;\n`, "counts.json": `${JSON.stringify({ before, after }, null, 1)}\n` },
          stats: { statements: statements.length, ...after },
        };
      } finally {
        await db.close();
      }
    },
  );
}
