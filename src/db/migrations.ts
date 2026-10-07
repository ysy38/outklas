import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { initSql } from "./init-sql";

/** Production applies these through Supabase migration history; this runner is for PGlite only. */
export function migrationFiles() {
  const dir = path.join(process.cwd(), "supabase/migrations");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(path.join(dir, name), "utf8") }));
}

/** Stand-ins for Supabase's roles and auth.uid() so policy migrations also run on PGlite. */
const supabaseShim = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
`;

export async function migratePglite(client: PGlite): Promise<string[]> {
  await client.exec(initSql);
  await client.exec(supabaseShim);
  const done = new Set((await client.query<{ name: string }>("select name from app_migrations")).rows.map((row) => row.name));
  const applied: string[] = [];
  for (const file of migrationFiles()) {
    if (done.has(file.name)) continue;
    await client.transaction(async (tx) => {
      await tx.exec(file.sql);
      await tx.query("insert into app_migrations (name) values ($1)", [file.name]);
    });
    applied.push(file.name);
  }
  return applied;
}
