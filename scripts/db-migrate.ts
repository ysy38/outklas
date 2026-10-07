import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { migratePglite } from "../src/db/migrations";

async function main() {
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const applied = await migratePglite(client);
  console.log(applied.length > 0 ? `Applied to ${dir}: ${applied.join(", ")}` : `${dir} is up to date.`);
  await client.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
