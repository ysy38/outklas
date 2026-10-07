CREATE POLICY drill_answers_own ON drill_answers FOR ALL TO authenticated USING (profile_id = (SELECT auth.uid())) WITH CHECK (profile_id = (SELECT auth.uid()));
