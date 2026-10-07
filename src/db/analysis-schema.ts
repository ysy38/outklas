import { bigint, boolean, index, integer, jsonb, numeric, pgSchema, primaryKey, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { NodeType } from "@/modules/knowledge/graph";
import type { DocumentType, LicenseStatus, SourceKind, SourceType } from "@/modules/analysis/sources";
import { knowledgeNodes, knowledgeVersions } from "./knowledge-schema";

/** Offline analysis of historical exams. Not used by the app; never exposed to clients. */
export const analysis = pgSchema("analysis");

export const analysisSources = analysis.table(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: text("kind").$type<SourceKind>().notNull(),
    url: text("url"),
    termsUrl: text("terms_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("analysis_sources_slug_unique").on(table.slug)],
);

export const analysisSourceDocuments = analysis.table(
  "source_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => analysisSources.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    documentType: text("document_type").$type<DocumentType>().notNull(),
    title: text("title").notNull(),
    authors: text("authors").array().notNull().default([]),
    publicationYear: smallint("publication_year"),
    url: text("url"),
    doi: text("doi"),
    language: text("language").notNull(),
    contentHash: text("content_hash").notNull(),
    storagePath: text("storage_path"),
    pageCount: integer("page_count"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    sourceType: text("source_type").$type<SourceType>().notNull(),
    licenseStatus: text("license_status").$type<LicenseStatus>().notNull().default("unknown"),
    licenseName: text("license_name"),
    licenseUrl: text("license_url"),
    commercialUse: boolean("commercial_use").notNull().default(false),
    derivativeUse: boolean("derivative_use").notNull().default(false),
    redistributionAllowed: boolean("redistribution_allowed").notNull().default(false),
    textMiningAllowed: boolean("text_mining_allowed").notNull().default(false),
    attributionRequired: boolean("attribution_required").notNull().default(true),
    verified: boolean("verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("analysis_source_documents_slug_unique").on(table.slug),
    unique("analysis_source_documents_hash_unique").on(table.contentHash),
    index("analysis_source_documents_source").on(table.sourceId),
  ],
);

export const analysisDocuments = analysis.table(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => analysisSourceDocuments.id, { onDelete: "restrict" }),
    exam: text("exam").notNull(),
    year: smallint("year").notNull(),
    session: text("session").notNull(),
    blueprint: text("blueprint").notNull(),
    questionCount: smallint("question_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("analysis_documents_source_unique").on(table.sourceDocumentId)],
);

export const analysisRuns = analysis.table(
  "runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => analysisDocuments.id, { onDelete: "restrict" }),
    stage: text("stage").notNull(),
    stageVersion: text("stage_version").notNull(),
    provider: text("provider"),
    model: text("model"),
    promptVersion: text("prompt_version"),
    schemaVersion: text("schema_version").notNull(),
    knowledgeVersion: text("knowledge_version")
      .notNull()
      .references(() => knowledgeVersions.version, { onDelete: "restrict" }),
    inputHash: text("input_hash").notNull(),
    outputHash: text("output_hash"),
    status: text("status").$type<"succeeded" | "partial" | "failed">().notNull(),
    itemCount: integer("item_count").notNull().default(0),
    acceptedCount: integer("accepted_count").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [unique("analysis_runs_input_unique").on(table.documentId, table.stage, table.inputHash), index("analysis_runs_knowledge_version").on(table.knowledgeVersion)],
);

export const analysisQuestions = analysis.table(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => analysisDocuments.id, { onDelete: "restrict" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    questionNumber: smallint("question_number").notNull(),
    section: text("section").notNull(),
    questionTypeNodeId: uuid("question_type_node_id")
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    translationDirection: text("translation_direction").$type<"en_tr" | "tr_en">(),
    answerPosition: text("answer_position").notNull(),
    optionCount: smallint("option_count").notNull(),
    structuralFormat: text("structural_format").notNull(),
    stimulusKey: text("stimulus_key"),
    stimulusWordCount: smallint("stimulus_word_count").notNull(),
    stemWordCount: smallint("stem_word_count").notNull(),
    optionWordMean: numeric("option_word_mean", { precision: 6, scale: 2 }).notNull(),
    optionWordMax: smallint("option_word_max").notNull(),
    sentenceCount: smallint("sentence_count").notNull(),
    meanSentenceLength: numeric("mean_sentence_length", { precision: 6, scale: 2 }).notNull(),
    blankCount: smallint("blank_count").notNull(),
    textSha256: text("text_sha256").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    validatedBy: text("validated_by").$type<"rules" | "human">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("analysis_questions_number_unique").on(table.documentId, table.questionNumber),
    index("analysis_questions_type").on(table.questionTypeNodeId),
    index("analysis_questions_run").on(table.runId),
    index("analysis_questions_text_hash").on(table.textSha256),
  ],
);

const unit = (name: string) => numeric(name, { precision: 4, scale: 3 }).notNull();

export const analysisQuestionFeatures = analysis.table("question_features", {
  questionId: uuid("question_id")
    .primaryKey()
    .references(() => analysisQuestions.id, { onDelete: "cascade" }),
  overall: unit("overall"),
  lexical: unit("lexical"),
  syntactic: unit("syntactic"),
  semantic: unit("semantic"),
  inference: unit("inference"),
  distractorSimilarity: unit("distractor_similarity"),
  contextDependency: unit("context_dependency"),
  cognitiveDemand: text("cognitive_demand").notNull(),
  transferRequirement: text("transfer_requirement").notNull(),
});

export const analysisQuestionNodes = analysis.table(
  "question_nodes",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => analysisQuestions.id, { onDelete: "cascade" }),
    facet: text("facet").notNull(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    rank: smallint("rank").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.questionId, table.facet, table.nodeId] }), index("analysis_question_nodes_node").on(table.nodeId, table.facet)],
);

export const analysisDistractors = analysis.table(
  "distractors",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => analysisQuestions.id, { onDelete: "cascade" }),
    position: text("position").notNull(),
    distractorTypeNodeId: uuid("distractor_type_node_id")
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    expressesNodeId: uuid("expresses_node_id").references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    targetedNodeId: uuid("targeted_node_id").references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    misconceptionNodeId: uuid("misconception_node_id").references(() => knowledgeNodes.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.questionId, table.position] }),
    index("analysis_distractors_type").on(table.distractorTypeNodeId),
    index("analysis_distractors_expresses").on(table.expressesNodeId),
    index("analysis_distractors_targeted").on(table.targetedNodeId),
    index("analysis_distractors_misconception").on(table.misconceptionNodeId),
  ],
);

export const analysisFamilies = analysis.table(
  "families",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    primaryNodeId: uuid("primary_node_id")
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("analysis_families_primary_unique").on(table.primaryNodeId)],
);

export const analysisFamilyMembers = analysis.table(
  "family_members",
  {
    familyId: uuid("family_id")
      .notNull()
      .references(() => analysisFamilies.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => analysisQuestions.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.familyId, table.questionId] }), index("analysis_family_members_question").on(table.questionId)],
);

export const analysisNodeProposals = analysis.table(
  "node_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nodeType: text("node_type").$type<NodeType>().notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: text("status").$type<"pending" | "accepted" | "rejected" | "merged">().notNull().default("pending"),
    nodeId: uuid("node_id").references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    firstSeenRunId: uuid("first_seen_run_id").references(() => analysisRuns.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("analysis_node_proposals_unique").on(table.nodeType, table.slug),
    index("analysis_node_proposals_node").on(table.nodeId),
    index("analysis_node_proposals_run").on(table.firstSeenRunId),
  ],
);

export const analysisQuestionProposals = analysis.table(
  "question_proposals",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => analysisQuestions.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => analysisNodeProposals.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.questionId, table.proposalId] }), index("analysis_question_proposals_proposal").on(table.proposalId)],
);

export const analysisTables = [
  analysisSources,
  analysisSourceDocuments,
  analysisDocuments,
  analysisRuns,
  analysisQuestions,
  analysisQuestionFeatures,
  analysisQuestionNodes,
  analysisDistractors,
  analysisFamilies,
  analysisFamilyMembers,
  analysisNodeProposals,
  analysisQuestionProposals,
];
