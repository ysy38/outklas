-- Must run on both Supabase and PGlite: no auth.* references.

CREATE TABLE public.knowledge_versions (
  version    text PRIMARY KEY,
  notes      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_nodes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type     text NOT NULL CHECK (node_type IN (
                  'domain','question_type','skill','cognitive_skill','grammar',
                  'grammar_pattern','discourse_relation','connector','misconception',
                  'distractor_type','vocabulary','topic')),
  slug          text NOT NULL CHECK (slug ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  name          text NOT NULL,
  name_tr       text,
  description   text,
  cefr_level    text CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','deprecated')),
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  since_version text NOT NULL REFERENCES public.knowledge_versions(version) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_nodes_type_slug_unique UNIQUE (node_type, slug)
);
CREATE INDEX knowledge_nodes_since_version ON public.knowledge_nodes (since_version);

CREATE TABLE public.knowledge_edges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id  uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  to_node_id    uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  edge_type     text NOT NULL CHECK (edge_type IN (
                  'parent_of','prerequisite','related_to','contrasts_with',
                  'often_confused_with','expressed_by','has_pattern','measures',
                  'exploits','synonym_of','antonym_of','collocates_with','derived_from')),
  weight        numeric(4,3) CHECK (weight >= 0 AND weight <= 1),
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  since_version text NOT NULL REFERENCES public.knowledge_versions(version) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_edges_unique  UNIQUE (from_node_id, to_node_id, edge_type),
  CONSTRAINT knowledge_edges_no_self CHECK (from_node_id <> to_node_id)
);
-- Forward lookups use the UNIQUE index prefix; this one serves reverse lookups.
CREATE INDEX knowledge_edges_to_type ON public.knowledge_edges (to_node_id, edge_type);
CREATE INDEX knowledge_edges_since_version ON public.knowledge_edges (since_version);

CREATE TABLE public.legacy_node_map (
  legacy_kind text NOT NULL CHECK (legacy_kind IN ('section','skill','distractor','connector','relation')),
  legacy_id   text NOT NULL,
  node_id     uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  match       text NOT NULL DEFAULT 'exact' CHECK (match IN ('exact','broader','narrower','related')),
  PRIMARY KEY (legacy_kind, legacy_id, node_id)
);
CREATE INDEX legacy_node_map_node ON public.legacy_node_map (node_id);

-- No policies: only the server (table owner) reads and writes the graph.
ALTER TABLE public.knowledge_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_nodes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_edges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_node_map    ENABLE ROW LEVEL SECURITY;

-- Rollback:
-- DROP TABLE public.legacy_node_map, public.knowledge_edges, public.knowledge_nodes, public.knowledge_versions;
