-- Question factory review store: generated candidates, their versions and human decisions. Kept apart from the
-- app and from the question bank: own schema, RLS on, no policies, no client grants. Approved items are published
-- to the bank by a separate, explicit step; nothing here is read by the app.
-- Must run on both Supabase and PGlite: no auth.* references.

CREATE SCHEMA factory;
REVOKE ALL ON SCHEMA factory FROM PUBLIC;
REVOKE ALL ON SCHEMA factory FROM anon, authenticated;

CREATE TABLE factory.runs (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam                       text NOT NULL CHECK (exam = 'yds'),
  family                     text NOT NULL CHECK (family ~ '^[a-z0-9_]+\.[a-z0-9_]+$'),
  band                       text NOT NULL CHECK (band IN ('easy','medium','hard')),
  requested                  smallint NOT NULL CHECK (requested BETWEEN 1 AND 20),
  provider                   text NOT NULL CHECK (char_length(provider) <= 40),
  generator_model            text NOT NULL CHECK (char_length(generator_model) <= 80),
  judge_model                text NOT NULL CHECK (char_length(judge_model) <= 80),
  generator_prompt_version   text NOT NULL CHECK (char_length(generator_prompt_version) <= 40),
  judge_prompt_version       text NOT NULL CHECK (char_length(judge_prompt_version) <= 40),
  blind_solve_prompt_version text NOT NULL CHECK (char_length(blind_solve_prompt_version) <= 40),
  acceptability_prompt_version text NOT NULL CHECK (char_length(acceptability_prompt_version) <= 40),
  question_spec_version      text NOT NULL CHECK (char_length(question_spec_version) <= 40),
  knowledge_version          text NOT NULL REFERENCES public.knowledge_versions(version) ON DELETE RESTRICT,
  dna_version                text NOT NULL CHECK (char_length(dna_version) <= 20),
  exam_profile_version       text NOT NULL CHECK (char_length(exam_profile_version) <= 40),
  validator_version          text NOT NULL CHECK (char_length(validator_version) <= 40),
  judge_version              text NOT NULL CHECK (char_length(judge_version) <= 40),
  originality_version        text NOT NULL CHECK (char_length(originality_version) <= 40),
  started_at                 timestamptz NOT NULL,
  finished_at                timestamptz,
  CONSTRAINT factory_runs_independent_judge CHECK (generator_model <> judge_model)
);
CREATE INDEX factory_runs_knowledge_version ON factory.runs (knowledge_version);

CREATE TABLE factory.candidates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid NOT NULL REFERENCES factory.runs(id) ON DELETE RESTRICT,
  spec_id       text NOT NULL CHECK (spec_id ~ '^[a-z0-9_.-]+$' AND char_length(spec_id) <= 120),
  spec          jsonb NOT NULL,
  status        text NOT NULL CHECK (status IN ('validator_rejected','judge_rejected','pending_review','approved','rejected','needs_revalidation')),
  judge_verdict text CHECK (judge_verdict IN ('APPROVE','REVIEW','REJECT')),
  judge         jsonb,
  provenance    jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT factory_candidates_spec_unique UNIQUE (run_id, spec_id)
);
CREATE INDEX factory_candidates_status ON factory.candidates (status);

-- Version 1 is the generator's output. Versions are append-only: an edit is a new row, never an update.
CREATE TABLE factory.candidate_versions (
  candidate_id      uuid NOT NULL REFERENCES factory.candidates(id) ON DELETE RESTRICT,
  version           smallint NOT NULL CHECK (version >= 1),
  author            text NOT NULL CHECK (author = 'generator' OR author ~ '^human:[a-z0-9_.-]{1,40}$'),
  payload           jsonb NOT NULL,
  validation        jsonb NOT NULL,
  validation_status text NOT NULL CHECK (validation_status IN ('pass','reject')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, version),
  CONSTRAINT factory_versions_first_is_generator CHECK ((version = 1) = (author = 'generator'))
);

CREATE TABLE factory.reviews (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id       uuid NOT NULL REFERENCES factory.candidates(id) ON DELETE RESTRICT,
  applies_to_version smallint NOT NULL,
  decision           text NOT NULL CHECK (decision IN ('APPROVE','EDIT','REJECT')),
  reviewer           text NOT NULL CHECK (reviewer ~ '^[a-z0-9_.-]{1,40}$'),
  notes              text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  review_version     text NOT NULL CHECK (char_length(review_version) <= 40),
  created_at         timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (candidate_id, applies_to_version) REFERENCES factory.candidate_versions(candidate_id, version) ON DELETE RESTRICT
);
CREATE INDEX factory_reviews_candidate ON factory.reviews (candidate_id);

CREATE FUNCTION factory.forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END $$;
CREATE TRIGGER factory_candidate_versions_append_only BEFORE UPDATE OR DELETE ON factory.candidate_versions FOR EACH ROW EXECUTE FUNCTION factory.forbid_change();
CREATE TRIGGER factory_reviews_append_only BEFORE UPDATE OR DELETE ON factory.reviews FOR EACH ROW EXECUTE FUNCTION factory.forbid_change();

ALTER TABLE factory.runs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory.candidates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory.candidate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory.reviews            ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA factory FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA factory FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA factory REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;

-- Rollback:
-- DROP SCHEMA factory CASCADE;
