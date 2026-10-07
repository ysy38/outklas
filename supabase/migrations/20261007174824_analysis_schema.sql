-- Historical-exam analysis, kept apart from the app: its own schema, RLS on, no policies, no client grants.
-- Holds text-free features only. Item text, OCR and reconstructions stay in the local .data/analysis/ folder.
-- Must run on both Supabase and PGlite: no auth.* references.

CREATE SCHEMA analysis;
REVOKE ALL ON SCHEMA analysis FROM PUBLIC;
REVOKE ALL ON SCHEMA analysis FROM anon, authenticated;

CREATE TABLE analysis.sources (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL CHECK (slug ~ '^[a-z0-9]+(_[a-z0-9]+)*$' AND char_length(slug) <= 64),
  name       text NOT NULL CHECK (char_length(name) <= 200),
  kind       text NOT NULL CHECK (kind IN ('exam_authority','academic_aggregator','academic_repository','publisher','third_party_upload','internal')),
  url        text CHECK (char_length(url) <= 500),
  terms_url  text CHECK (char_length(terms_url) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_sources_slug_unique UNIQUE (slug)
);

CREATE TABLE analysis.source_documents (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id              uuid NOT NULL REFERENCES analysis.sources(id) ON DELETE RESTRICT,
  slug                   text NOT NULL CHECK (slug ~ '^[a-z0-9]+([_-][a-z0-9]+)*$' AND char_length(slug) <= 64),
  document_type          text NOT NULL CHECK (document_type IN ('exam_booklet','exam_compilation','question_bank','wordlist','article','book','dataset','other')),
  title                  text NOT NULL CHECK (char_length(title) <= 300),
  authors                text[] NOT NULL DEFAULT '{}',
  publication_year       smallint CHECK (publication_year BETWEEN 1900 AND 2100),
  url                    text CHECK (char_length(url) <= 500),
  doi                    text CHECK (char_length(doi) <= 200),
  language               text NOT NULL CHECK (char_length(language) <= 16),
  content_hash           text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  storage_path           text CHECK (char_length(storage_path) <= 300),
  page_count             integer CHECK (page_count > 0),
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_type            text NOT NULL CHECK (source_type IN ('owned','licensed','open','reference_only')),
  license_status         text NOT NULL DEFAULT 'unknown' CHECK (license_status IN ('unknown','pending_review','verified','analysis_only','rejected')),
  license_name           text CHECK (char_length(license_name) <= 200),
  license_url            text CHECK (char_length(license_url) <= 500),
  commercial_use         boolean NOT NULL DEFAULT false,
  derivative_use         boolean NOT NULL DEFAULT false,
  redistribution_allowed boolean NOT NULL DEFAULT false,
  text_mining_allowed    boolean NOT NULL DEFAULT false,
  attribution_required   boolean NOT NULL DEFAULT true,
  verified               boolean NOT NULL DEFAULT false,
  verified_at            timestamptz,
  verified_by            text CHECK (char_length(verified_by) <= 200),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_source_documents_slug_unique UNIQUE (slug),
  CONSTRAINT analysis_source_documents_hash_unique UNIQUE (content_hash),
  CONSTRAINT analysis_source_documents_reference_only CHECK (
    source_type <> 'reference_only' OR NOT (commercial_use OR derivative_use OR redistribution_allowed)),
  CONSTRAINT analysis_source_documents_verified_at CHECK (NOT verified OR verified_at IS NOT NULL),
  CONSTRAINT analysis_source_documents_verified_status CHECK (license_status <> 'verified' OR verified)
);
CREATE INDEX analysis_source_documents_source ON analysis.source_documents (source_id);

CREATE TABLE analysis.documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES analysis.source_documents(id) ON DELETE RESTRICT,
  exam               text NOT NULL CHECK (exam IN ('yds','ydt','e_yds','yokdil')),
  year               smallint NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  session            text NOT NULL CHECK (char_length(session) <= 16),
  blueprint          text NOT NULL CHECK (char_length(blueprint) <= 32),
  question_count     smallint NOT NULL CHECK (question_count > 0),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_documents_source_unique UNIQUE (source_document_id)
);

CREATE TABLE analysis.runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NOT NULL REFERENCES analysis.documents(id) ON DELETE RESTRICT,
  stage             text NOT NULL CHECK (char_length(stage) <= 32),
  stage_version     text NOT NULL CHECK (char_length(stage_version) <= 16),
  provider          text CHECK (char_length(provider) <= 32),
  model             text CHECK (char_length(model) <= 64),
  prompt_version    text CHECK (char_length(prompt_version) <= 64),
  schema_version    text NOT NULL CHECK (char_length(schema_version) <= 16),
  knowledge_version text NOT NULL REFERENCES public.knowledge_versions(version) ON DELETE RESTRICT CHECK (char_length(knowledge_version) <= 16),
  input_hash        text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash       text CHECK (output_hash ~ '^[0-9a-f]{64}$'),
  status            text NOT NULL CHECK (status IN ('succeeded','partial','failed')),
  item_count        integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  accepted_count    integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  review_count      integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  failed_count      integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  input_tokens      bigint NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens     bigint NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  started_at        timestamptz NOT NULL,
  finished_at       timestamptz,
  CONSTRAINT analysis_runs_input_unique UNIQUE (document_id, stage, input_hash)
);
CREATE INDEX analysis_runs_knowledge_version ON analysis.runs (knowledge_version);

CREATE TABLE analysis.questions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id            uuid NOT NULL REFERENCES analysis.documents(id) ON DELETE RESTRICT,
  run_id                 uuid NOT NULL REFERENCES analysis.runs(id) ON DELETE RESTRICT,
  question_number        smallint NOT NULL CHECK (question_number BETWEEN 1 AND 200),
  section                text NOT NULL CHECK (char_length(section) <= 32),
  question_type_node_id  uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  translation_direction  text CHECK (translation_direction IN ('en_tr','tr_en')),
  answer_position        text NOT NULL CHECK (answer_position IN ('A','B','C','D','E')),
  option_count           smallint NOT NULL CHECK (option_count BETWEEN 2 AND 6),
  structural_format      text NOT NULL CHECK (char_length(structural_format) <= 32),
  stimulus_key           text CHECK (char_length(stimulus_key) <= 32),
  stimulus_word_count    smallint NOT NULL CHECK (stimulus_word_count >= 0),
  stem_word_count        smallint NOT NULL CHECK (stem_word_count >= 0),
  option_word_mean       numeric(6,2) NOT NULL CHECK (option_word_mean >= 0),
  option_word_max        smallint NOT NULL CHECK (option_word_max >= 0),
  sentence_count         smallint NOT NULL CHECK (sentence_count >= 0),
  mean_sentence_length   numeric(6,2) NOT NULL CHECK (mean_sentence_length >= 0),
  blank_count            smallint NOT NULL CHECK (blank_count >= 0),
  text_sha256            text NOT NULL CHECK (text_sha256 ~ '^[0-9a-f]{64}$'),
  confidence             numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  validated_by           text NOT NULL CHECK (validated_by IN ('rules','human')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_questions_number_unique UNIQUE (document_id, question_number)
);
CREATE INDEX analysis_questions_type ON analysis.questions (question_type_node_id);
CREATE INDEX analysis_questions_run ON analysis.questions (run_id);
CREATE INDEX analysis_questions_text_hash ON analysis.questions (text_sha256);

CREATE TABLE analysis.question_features (
  question_id           uuid PRIMARY KEY REFERENCES analysis.questions(id) ON DELETE CASCADE,
  overall               numeric(4,3) NOT NULL CHECK (overall BETWEEN 0 AND 1),
  lexical               numeric(4,3) NOT NULL CHECK (lexical BETWEEN 0 AND 1),
  syntactic             numeric(4,3) NOT NULL CHECK (syntactic BETWEEN 0 AND 1),
  semantic              numeric(4,3) NOT NULL CHECK (semantic BETWEEN 0 AND 1),
  inference             numeric(4,3) NOT NULL CHECK (inference BETWEEN 0 AND 1),
  distractor_similarity numeric(4,3) NOT NULL CHECK (distractor_similarity BETWEEN 0 AND 1),
  context_dependency    numeric(4,3) NOT NULL CHECK (context_dependency BETWEEN 0 AND 1),
  cognitive_demand      text NOT NULL CHECK (cognitive_demand IN ('remember','understand','apply','analyze','evaluate')),
  transfer_requirement  text NOT NULL CHECK (transfer_requirement IN ('low','medium','high'))
);

CREATE TABLE analysis.question_nodes (
  question_id uuid NOT NULL REFERENCES analysis.questions(id) ON DELETE CASCADE,
  facet       text NOT NULL CHECK (facet IN ('primary_concept','secondary_concept','grammar','vocabulary','discourse',
                'skill_primary','skill_secondary','cognitive','misconception','prerequisite','answer_expresses')),
  node_id     uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  rank        smallint NOT NULL DEFAULT 0 CHECK (rank >= 0),
  PRIMARY KEY (question_id, facet, node_id)
);
CREATE INDEX analysis_question_nodes_node ON analysis.question_nodes (node_id, facet);

CREATE TABLE analysis.distractors (
  question_id             uuid NOT NULL REFERENCES analysis.questions(id) ON DELETE CASCADE,
  position                text NOT NULL CHECK (position IN ('A','B','C','D','E')),
  distractor_type_node_id uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  expresses_node_id       uuid REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  targeted_node_id        uuid REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  misconception_node_id   uuid REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  PRIMARY KEY (question_id, position)
);
CREATE INDEX analysis_distractors_type ON analysis.distractors (distractor_type_node_id);
CREATE INDEX analysis_distractors_expresses ON analysis.distractors (expresses_node_id);
CREATE INDEX analysis_distractors_targeted ON analysis.distractors (targeted_node_id);
CREATE INDEX analysis_distractors_misconception ON analysis.distractors (misconception_node_id);

CREATE TABLE analysis.families (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_node_id uuid NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_families_primary_unique UNIQUE (primary_node_id)
);

CREATE TABLE analysis.family_members (
  family_id   uuid NOT NULL REFERENCES analysis.families(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES analysis.questions(id) ON DELETE CASCADE,
  PRIMARY KEY (family_id, question_id)
);
CREATE INDEX analysis_family_members_question ON analysis.family_members (question_id);

-- Review queue for concepts the taxonomy lacks. Accepting one means editing the seed by hand, never an insert here.
CREATE TABLE analysis.node_proposals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type         text NOT NULL CHECK (node_type IN (
                      'domain','question_type','skill','cognitive_skill','grammar',
                      'grammar_pattern','discourse_relation','connector','misconception',
                      'distractor_type','vocabulary','topic')),
  slug              text NOT NULL CHECK (slug ~ '^[a-z0-9]+(_[a-z0-9]+)*$' AND char_length(slug) <= 64),
  name              text NOT NULL CHECK (char_length(name) <= 120),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','merged')),
  node_id           uuid REFERENCES public.knowledge_nodes(id) ON DELETE RESTRICT,
  first_seen_run_id uuid REFERENCES analysis.runs(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_node_proposals_unique UNIQUE (node_type, slug)
);
CREATE INDEX analysis_node_proposals_node ON analysis.node_proposals (node_id);
CREATE INDEX analysis_node_proposals_run ON analysis.node_proposals (first_seen_run_id);

CREATE TABLE analysis.question_proposals (
  question_id uuid NOT NULL REFERENCES analysis.questions(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES analysis.node_proposals(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, proposal_id)
);
CREATE INDEX analysis_question_proposals_proposal ON analysis.question_proposals (proposal_id);

ALTER TABLE analysis.sources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.source_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.runs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.question_features  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.question_nodes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.distractors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.families           ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.family_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.node_proposals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.question_proposals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA analysis FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA analysis REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;

-- Rollback:
-- DROP SCHEMA analysis CASCADE;
