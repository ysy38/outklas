import { index, jsonb, numeric, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { CefrLevel, EdgeType, LegacyKind, MatchKind, NodeStatus, NodeType } from "@/modules/knowledge/graph";

export const knowledgeVersions = pgTable("knowledge_versions", {
  version: text("version").primaryKey(),
  notes: text("notes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeNodes = pgTable(
  "knowledge_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nodeType: text("node_type").$type<NodeType>().notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameTr: text("name_tr"),
    description: text("description"),
    cefrLevel: text("cefr_level").$type<CefrLevel>(),
    status: text("status").$type<NodeStatus>().notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    sinceVersion: text("since_version")
      .notNull()
      .references(() => knowledgeVersions.version, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("knowledge_nodes_type_slug_unique").on(table.nodeType, table.slug),
    index("knowledge_nodes_since_version").on(table.sinceVersion),
  ],
);

export const knowledgeEdges = pgTable(
  "knowledge_edges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromNodeId: uuid("from_node_id")
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    toNodeId: uuid("to_node_id")
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    edgeType: text("edge_type").$type<EdgeType>().notNull(),
    weight: numeric("weight", { precision: 4, scale: 3 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    sinceVersion: text("since_version")
      .notNull()
      .references(() => knowledgeVersions.version, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("knowledge_edges_unique").on(table.fromNodeId, table.toNodeId, table.edgeType),
    index("knowledge_edges_to_type").on(table.toNodeId, table.edgeType),
    index("knowledge_edges_since_version").on(table.sinceVersion),
  ],
);

export const legacyNodeMap = pgTable(
  "legacy_node_map",
  {
    legacyKind: text("legacy_kind").$type<LegacyKind>().notNull(),
    legacyId: text("legacy_id").notNull(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: "restrict" }),
    match: text("match").$type<MatchKind>().notNull().default("exact"),
  },
  (table) => [
    primaryKey({ columns: [table.legacyKind, table.legacyId, table.nodeId] }),
    index("legacy_node_map_node").on(table.nodeId),
  ],
);
