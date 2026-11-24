-- Client sessions must only read their own error_mastery; server writes via service role.
DROP POLICY IF EXISTS error_mastery_own ON public.error_mastery;
CREATE POLICY error_mastery_own ON public.error_mastery
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));
