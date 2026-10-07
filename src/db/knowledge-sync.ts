import { sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { parseRef } from "@/modules/knowledge/graph";
import { knowledgeEdges, knowledgeNodes, knowledgeVersion, legacyMap } from "@/modules/knowledge/seed";

const lit = (value: string | null | undefined) => (value == null ? "NULL" : `'${value.replaceAll("'", "''")}'`);

const values = (rows: string[][]) => rows.map((row) => `(${row.join(", ")})`).join(",\n  ");

/** Idempotent upserts keyed on (node_type, slug); never deletes. Retire a node by marking it deprecated in the seed. */
export function knowledgeSyncStatements(): string[] {
  const version = lit(knowledgeVersion.version);
  return [
    `INSERT INTO knowledge_versions AS v (version, notes) VALUES (${version}, ${lit(knowledgeVersion.notes)})
ON CONFLICT (version) DO UPDATE SET notes = excluded.notes WHERE v.notes IS DISTINCT FROM excluded.notes`,

    `INSERT INTO knowledge_nodes AS n (node_type, slug, name, name_tr, description, cefr_level, status, metadata, since_version) VALUES
  ${values(
    knowledgeNodes.map((node) => [
      lit(node.type),
      lit(node.slug),
      lit(node.name),
      lit(node.nameTr),
      lit(node.description),
      lit(node.cefrLevel),
      lit(node.status ?? "active"),
      `${lit(JSON.stringify(node.metadata ?? {}))}::jsonb`,
      version,
    ]),
  )}
ON CONFLICT (node_type, slug) DO UPDATE SET
  name = excluded.name, name_tr = excluded.name_tr, description = excluded.description,
  cefr_level = excluded.cefr_level, status = excluded.status, metadata = excluded.metadata, updated_at = now()
WHERE (n.name, n.name_tr, n.description, n.cefr_level, n.status, n.metadata)
  IS DISTINCT FROM (excluded.name, excluded.name_tr, excluded.description, excluded.cefr_level, excluded.status, excluded.metadata)`,

    `INSERT INTO knowledge_edges (from_node_id, to_node_id, edge_type, since_version)
SELECT f.id, t.id, v.edge_type, ${version}
FROM (VALUES
  ${values(
    knowledgeEdges.map((edge) => {
      const from = parseRef(edge.from);
      const to = parseRef(edge.to);
      return [lit(from.type), lit(from.slug), lit(to.type), lit(to.slug), lit(edge.type)];
    }),
  )}
) AS v (from_type, from_slug, to_type, to_slug, edge_type)
JOIN knowledge_nodes f ON f.node_type = v.from_type AND f.slug = v.from_slug
JOIN knowledge_nodes t ON t.node_type = v.to_type AND t.slug = v.to_slug
ON CONFLICT (from_node_id, to_node_id, edge_type) DO NOTHING`,

    `INSERT INTO legacy_node_map AS m (legacy_kind, legacy_id, node_id, match)
SELECT v.legacy_kind, v.legacy_id, n.id, v.match
FROM (VALUES
  ${values(
    legacyMap.map((mapping) => {
      const target = parseRef(mapping.node);
      return [lit(mapping.kind), lit(mapping.id), lit(target.type), lit(target.slug), lit(mapping.match)];
    }),
  )}
) AS v (legacy_kind, legacy_id, node_type, slug, match)
JOIN knowledge_nodes n ON n.node_type = v.node_type AND n.slug = v.slug
ON CONFLICT (legacy_kind, legacy_id, node_id) DO UPDATE SET match = excluded.match
WHERE m.match IS DISTINCT FROM excluded.match`,
  ];
}

export async function syncKnowledge(db: PgliteDatabase) {
  await db.transaction(async (tx) => {
    for (const statement of knowledgeSyncStatements()) await tx.execute(sql.raw(statement));
  });
}
