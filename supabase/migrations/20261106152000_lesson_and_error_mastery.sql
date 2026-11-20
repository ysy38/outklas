-- Teaching document and the error-class axis used by adaptive practice.
-- Skills stay what a correct answer trains. error_class is what a wrong choice reveals.
-- lesson holds x-ray layers, solution moves and per-option reasons. The selector reads columns, not this prose.

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS lesson jsonb;
ALTER TABLE public.choices ADD COLUMN IF NOT EXISTS error_class text;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS error_class text;

CREATE TABLE IF NOT EXISTS public.error_mastery (
  profile_id uuid NOT NULL,
  error_class text NOT NULL,
  mastery integer NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  correct_attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, error_class)
);

ALTER TABLE public.error_mastery ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'error_mastery' AND policyname = 'error_mastery_own'
  ) THEN
    CREATE POLICY error_mastery_own ON public.error_mastery
      FOR ALL TO authenticated
      USING (profile_id = (SELECT auth.uid()))
      WITH CHECK (profile_id = (SELECT auth.uid()));
  END IF;
END $$;
