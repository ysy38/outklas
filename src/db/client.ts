import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { ydsBlueprint, type SectionId } from "@/modules/exam/blueprint";
import { publishBlockers } from "@/modules/content/publish";
import type { PoolItem } from "@/modules/exam/select";
import { hashPassword } from "@/server/password";
import { examDraft, skillTree, stimuli, vocabDrafts, vocabLinkDrafts, type DraftItem } from "./exam-draft";
import { packItems, packStimuli } from "./pack-draft";
import { initSql } from "./init-sql";
import { answers, choices, drillAnswers, events, itemSkills, itemVocabulary, items, mastery, plans, profiles, reviews, sessionItems, sessions, skills, stimuli as stimuliTable, subscriptions, vocabulary, vocabLinks } from "./schema";

type AppDb = PgliteDatabase;

let database: AppDb | null = null;
let ready: Promise<AppDb> | null = null;

async function migrate(db: AppDb) {
  for (const statement of initSql.split(";").map((part) => part.trim()).filter(Boolean)) {
    await db.execute(sql.raw(statement));
  }
}

function assertDraft(draft: DraftItem) {
  const blockers = publishBlockers({
    stem: draft.stem,
    explanation: draft.explanation,
    difficulty: draft.difficulty,
    skillIds: draft.skills,
    layout: draft.layout,
    choices: draft.choices.map((choice) => ({
      body: choice.text,
      correct: Boolean(choice.correct),
      distractorType: choice.distractor ?? null,
    })),
  });
  if (blockers.length > 0) {
    throw new Error(`Slot ${draft.slot} cannot be published: ${blockers.join(" ")}`);
  }
}

export async function seed(db: AppDb) {
  const existing = await db.select({ id: items.id }).from(items).limit(1);
  if (existing.length > 0) return;
  for (const draft of examDraft) assertDraft(draft);
  if (examDraft.length !== ydsBlueprint.questionCount) {
    throw new Error("Exam draft is not 80 items.");
  }
  await db.insert(skills).values(skillTree.map((skill) => ({ id: skill.id, parentId: skill.parentId, name: skill.name })));
  await db.insert(stimuliTable).values(stimuli.map((stimulus) => ({ id: stimulus.key, kind: stimulus.kind, body: stimulus.body })));
  await db.insert(vocabulary).values(
    vocabDrafts.map((word) => ({
      id: word.id,
      word: word.word,
      meaningTr: word.meaningTr,
      partOfSpeech: word.partOfSpeech,
      example: word.example,
    })),
  );
  await db.insert(vocabLinks).values(vocabLinkDrafts);
  await db.insert(items).values(
    examDraft.map((draft) => ({
      id: `item-${draft.slot}`,
      slot: draft.slot,
      section: draft.section,
      layout: draft.layout,
      direction: draft.direction ?? null,
      stem: draft.stem,
      explanation: draft.explanation,
      difficulty: draft.difficulty,
      status: draft.section === "cloze" || draft.section === "reading" ? "booklet" : "published",
      stimulusId: draft.stimulusKey ?? null,
    })),
  );
  await db.insert(choices).values(
    examDraft.flatMap((draft) =>
      draft.choices.map((choice, index) => ({
        id: `item-${draft.slot}-c${index}`,
        itemId: `item-${draft.slot}`,
        position: index,
        body: choice.text,
        correct: Boolean(choice.correct),
        distractorType: choice.distractor ?? null,
      })),
    ),
  );
  await db.insert(itemSkills).values(
    examDraft.flatMap((draft) => draft.skills.map((skillId) => ({ itemId: `item-${draft.slot}`, skillId }))),
  );
  const vocabRows = examDraft.flatMap((draft) =>
    (draft.vocab ?? []).map((vocabularyId) => ({ itemId: `item-${draft.slot}`, vocabularyId })),
  );
  if (vocabRows.length > 0) await db.insert(itemVocabulary).values(vocabRows);
  if (process.env.VERCEL) return;
  await db.insert(profiles).values({
    id: randomUUID(),
    email: "admin@ydslab.local",
    passwordHash: hashPassword("lab-admin"),
    role: "admin",
    onboardingCompleted: true,
    dailyMinutes: 30,
    targetScore: 80,
  });
}

let packReady = false;

async function syncPack(db: AppDb) {
  if (packReady) return;
  const stale = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.status, "published"), inArray(items.section, ["cloze", "reading"]), sql`${items.id} like 'item-%'`))
    .limit(1);
  if (stale.length > 0) {
    await db
      .update(items)
      .set({ status: "booklet" })
      .where(and(inArray(items.section, ["cloze", "reading"]), sql`${items.id} like 'item-%'`));
  }
  await db
    .insert(skills)
    .values([
      { id: "situation", parentId: null, name: "Situation" },
      { id: "situation-line", parentId: "situation", name: "Situation line" },
    ])
    .onConflictDoNothing();
  const present = await db.select({ id: items.id }).from(items).where(eq(items.id, "pack-201")).limit(1);
  if (present.length > 0) {
    packReady = true;
    return;
  }
  for (const draft of packItems) assertDraft(draft);
  await db.insert(stimuliTable).values(packStimuli.map((stimulus) => ({ id: stimulus.key, kind: stimulus.kind, body: stimulus.body }))).onConflictDoNothing();
  await db.insert(items).values(
    packItems.map((draft) => ({
      id: `pack-${draft.slot}`,
      slot: draft.slot,
      section: draft.section,
      layout: draft.layout,
      direction: null,
      stem: draft.stem,
      explanation: draft.explanation,
      difficulty: draft.difficulty,
      status: "published",
      stimulusId: draft.stimulusKey ?? null,
    })),
  );
  await db.insert(choices).values(
    packItems.flatMap((draft) =>
      draft.choices.map((choice, index) => ({
        id: `pack-${draft.slot}-c${index}`,
        itemId: `pack-${draft.slot}`,
        position: index,
        body: choice.text,
        correct: Boolean(choice.correct),
        distractorType: choice.distractor ?? null,
      })),
    ),
  );
  await db.insert(itemSkills).values(packItems.flatMap((draft) => draft.skills.map((skillId) => ({ itemId: `pack-${draft.slot}`, skillId }))));
  packReady = true;
}

async function openPglite(dataDir?: string): Promise<AppDb> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client) as unknown as AppDb;
  await prepare(db);
  return db;
}

const schemaVersion = createHash("sha256")
  .update(initSql)
  .update(`${examDraft.length}:${packItems.length}:${packStimuli.length}`)
  .digest("hex")
  .slice(0, 16);

async function storedVersion(db: AppDb): Promise<string | null> {
  try {
    const result = (await db.execute(sql`select value from app_meta where key = 'schema'`)) as unknown;
    const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
    return (rows[0] as { value?: string } | undefined)?.value ?? null;
  } catch {
    return null;
  }
}

/** Full migrate, seed and pack sync only when the schema or content version changes. */
async function prepare(db: AppDb) {
  if ((await storedVersion(db)) === schemaVersion) return;
  await migrate(db);
  await seed(db);
  await syncPack(db);
  await db.execute(
    sql`insert into app_meta (key, value) values ('schema', ${schemaVersion}) on conflict (key) do update set value = excluded.value`,
  );
}

const urlSources = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"] as const;

/** `<ref>.supabase.co` is the HTTP API, not Postgres; connecting to it hangs until the timeout. */
function usablePostgresUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return /^postgres(ql)?:$/.test(url.protocol) && !/^[a-z0-9]+\.supabase\.co$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function postgresSource() {
  const source = urlSources.find((name) => usablePostgresUrl(process.env[name]));
  return source ? { source, url: process.env[source] as string } : null;
}

export function databaseInfo() {
  const found = postgresSource();
  const skipped = urlSources.filter((name) => process.env[name] && !usablePostgresUrl(process.env[name]));
  if (!found) return { driver: "pglite" as const, source: null, host: null, skipped };
  return { driver: "postgres" as const, source: found.source, host: new URL(found.url).hostname, skipped };
}

async function open(): Promise<AppDb> {
  const url = postgresSource()?.url;
  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const pooled = /pgbouncer=true|:6543\b/.test(url);
    const client = postgres(url, { max: 4, prepare: !pooled, connect_timeout: 10, idle_timeout: 20 });
    const db = drizzle(client) as unknown as AppDb;
    await prepare(db);
    return db;
  }
  if (process.env.VERCEL) {
    throw new Error(
      "No usable Postgres URL on Vercel. Set DATABASE_URL to the Supabase pooler URL (postgresql://…pooler.supabase.com:6543/postgres) or connect the Supabase integration (POSTGRES_URL).",
    );
  }
  const dir = path.join(process.cwd(), ".data/pglite");
  try {
    return await openPglite(dir);
  } catch {
    return openPglite();
  }
}

/** One handle per process: dev compiles each route separately, and two PGlite instances on one directory do not see each other's writes. */
const shared = globalThis as typeof globalThis & { __tomoDb?: Promise<AppDb> };

export function getDb(): Promise<AppDb> {
  if (database) return Promise.resolve(database);
  ready ??= shared.__tomoDb ??= open().catch((error: unknown) => {
    shared.__tomoDb = undefined;
    ready = null;
    throw error;
  });
  return ready.then((db) => {
    database = db;
    return db;
  });
}

const poolCache = new Map<"study" | "mock", { at: number; rows: PoolItem[] }>();

export function clearPoolCache() {
  poolCache.clear();
}

export async function publishedPool(scope: "study" | "mock" = "study"): Promise<PoolItem[]> {
  const hit = poolCache.get(scope);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.rows;
  const db = await getDb();
  const [rows, links] = await Promise.all([
    db
      .select({
        id: items.id,
        slot: items.slot,
        section: items.section,
        stimulusId: items.stimulusId,
        difficulty: items.difficulty,
      })
      .from(items)
      .where(inArray(items.status, scope === "mock" ? ["published", "booklet"] : ["published"]))
      .orderBy(asc(items.slot)),
    db.select().from(itemSkills),
  ]);
  const byItem = new Map<string, string[]>();
  for (const link of links) {
    const list = byItem.get(link.itemId) ?? [];
    list.push(link.skillId);
    byItem.set(link.itemId, list);
  }
  const mapped = rows
    .filter((row) => row.slot != null)
    .map((row) => ({
      id: row.id,
      slot: row.slot ?? 0,
      section: row.section as SectionId,
      stimulusId: row.stimulusId,
      difficulty: row.difficulty,
      skillIds: byItem.get(row.id) ?? [],
    }));
  poolCache.set(scope, { at: Date.now(), rows: mapped });
  return mapped;
}

export { and, asc, desc, eq, gte, inArray, lt, sql, answers, choices, drillAnswers, events, itemSkills, items, mastery, plans, profiles, reviews, sessionItems, sessions, skills, subscriptions, vocabulary, vocabLinks, stimuliTable };
