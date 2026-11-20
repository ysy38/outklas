-- Skill weight is how much an item measures a skill. Role keeps a miss off supporting skills.
-- diagnosis_confidence is the option diagnosis, not the learner's self-report (answers.confidence).
-- Existing mastery rows are left as they are. Existing links default to weight 1, role primary,
-- so a later answer on an unweighted link still moves that skill by the full step.

ALTER TABLE public.item_skills ADD COLUMN IF NOT EXISTS weight real NOT NULL DEFAULT 1;
ALTER TABLE public.item_skills ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'primary';
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS diagnosis_confidence real;
