import { foreignKey, index, jsonb, pgSchema, primaryKey, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { CandidateStatus, ReviewDecision } from "@/modules/factory/review";
import type { Verdict } from "@/modules/factory/judge";
import { knowledgeVersions } from "./knowledge-schema";

/** Question factory review store. Not used by the app; never exposed to clients. */
export const factory = pgSchema("factory");

export const factoryRuns = factory.table(
  "runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    exam: text("exam").$type<"yds">().notNull(),
    family: text("family").notNull(),
    band: text("band").$type<"easy" | "medium" | "hard">().notNull(),
    requested: smallint("requested").notNull(),
    provider: text("provider").notNull(),
    generatorModel: text("generator_model").notNull(),
    judgeModel: text("judge_model").notNull(),
    generatorPromptVersion: text("generator_prompt_version").notNull(),
    judgePromptVersion: text("judge_prompt_version").notNull(),
    blindSolvePromptVersion: text("blind_solve_prompt_version").notNull(),
    questionSpecVersion: text("question_spec_version").notNull(),
    knowledgeVersion: text("knowledge_version")
      .notNull()
      .references(() => knowledgeVersions.version, { onDelete: "restrict" }),
    dnaVersion: text("dna_version").notNull(),
    examProfileVersion: text("exam_profile_version").notNull(),
    validatorVersion: text("validator_version").notNull(),
    judgeVersion: text("judge_version").notNull(),
    originalityVersion: text("originality_version").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("factory_runs_knowledge_version").on(table.knowledgeVersion)],
);

export const factoryCandidates = factory.table(
  "candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => factoryRuns.id, { onDelete: "restrict" }),
    specId: text("spec_id").notNull(),
    spec: jsonb("spec").notNull(),
    status: text("status").$type<CandidateStatus>().notNull(),
    judgeVerdict: text("judge_verdict").$type<Verdict>(),
    judge: jsonb("judge"),
    provenance: jsonb("provenance").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("factory_candidates_spec_unique").on(table.runId, table.specId), index("factory_candidates_status").on(table.status)],
);

export const factoryCandidateVersions = factory.table(
  "candidate_versions",
  {
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => factoryCandidates.id, { onDelete: "restrict" }),
    version: smallint("version").notNull(),
    author: text("author").notNull(),
    payload: jsonb("payload").notNull(),
    validation: jsonb("validation").notNull(),
    validationStatus: text("validation_status").$type<"pass" | "reject">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.candidateId, table.version] })],
);

export const factoryReviews = factory.table(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => factoryCandidates.id, { onDelete: "restrict" }),
    appliesToVersion: smallint("applies_to_version").notNull(),
    decision: text("decision").$type<ReviewDecision>().notNull(),
    reviewer: text("reviewer").notNull(),
    notes: text("notes").notNull().default(""),
    reviewVersion: text("review_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("factory_reviews_candidate").on(table.candidateId),
    foreignKey({ columns: [table.candidateId, table.appliesToVersion], foreignColumns: [factoryCandidateVersions.candidateId, factoryCandidateVersions.version] }).onDelete("restrict"),
  ],
);

export const factoryTables = [factoryRuns, factoryCandidates, factoryCandidateVersions, factoryReviews];
