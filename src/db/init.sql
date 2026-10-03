CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text,
  role text NOT NULL DEFAULT 'learner',
  target_score integer,
  exam_date text,
  daily_minutes integer,
  prior_score integer,
  estimated_low integer,
  estimated_high integer,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stimuli (
  id text PRIMARY KEY,
  kind text NOT NULL,
  body text NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id text PRIMARY KEY,
  slot integer,
  section text NOT NULL,
  layout text NOT NULL,
  direction text,
  stem text NOT NULL,
  explanation text NOT NULL,
  difficulty integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  stimulus_id text
);

CREATE TABLE IF NOT EXISTS choices (
  id text PRIMARY KEY,
  item_id text NOT NULL,
  position integer NOT NULL,
  body text NOT NULL,
  correct boolean NOT NULL,
  distractor_type text
);

CREATE TABLE IF NOT EXISTS skills (
  id text PRIMARY KEY,
  parent_id text,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS item_skills (
  item_id text NOT NULL,
  skill_id text NOT NULL,
  PRIMARY KEY (item_id, skill_id)
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id text PRIMARY KEY,
  word text NOT NULL,
  meaning_tr text NOT NULL,
  part_of_speech text NOT NULL,
  example text NOT NULL
);

CREATE TABLE IF NOT EXISTS vocab_links (
  id text PRIMARY KEY,
  from_id text NOT NULL,
  to_id text NOT NULL,
  kind text NOT NULL
);

CREATE TABLE IF NOT EXISTS item_vocabulary (
  item_id text NOT NULL,
  vocabulary_id text NOT NULL,
  PRIMARY KEY (item_id, vocabulary_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  profile_id uuid,
  guest_id text,
  mode text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  score real,
  correct_count integer,
  wrong_count integer,
  blank_count integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  ends_at timestamptz
);

CREATE TABLE IF NOT EXISTS session_items (
  session_id uuid NOT NULL,
  item_id text NOT NULL,
  position integer NOT NULL,
  flagged boolean NOT NULL DEFAULT false,
  PRIMARY KEY (session_id, item_id)
);

CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL,
  profile_id uuid,
  item_id text NOT NULL,
  choice_id text,
  correct boolean,
  response_time_ms integer NOT NULL DEFAULT 0,
  confidence text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS answers_session_item ON answers (session_id, item_id);

CREATE TABLE IF NOT EXISTS mastery (
  profile_id uuid NOT NULL,
  skill_id text NOT NULL,
  mastery integer NOT NULL,
  confidence integer NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  correct_attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, skill_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY,
  profile_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  due_at timestamptz NOT NULL,
  step integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  stability_days real NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_target ON reviews (profile_id, target_type, target_id);

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL,
  plan_date text NOT NULL,
  payload jsonb NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS plans_day ON plans (profile_id, plan_date);

CREATE TABLE IF NOT EXISTS subscriptions (
  profile_id uuid PRIMARY KEY,
  plan text NOT NULL,
  status text NOT NULL,
  provider text NOT NULL,
  period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY,
  profile_id uuid,
  name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_name ON events (name, created_at);
