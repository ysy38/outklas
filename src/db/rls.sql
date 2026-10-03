-- Applied on the Supabase project. The Next.js server connects as the
-- database owner and bypasses these policies. The public API key must not
-- read answer keys or another person's rows.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stimuli ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own ON profiles
  FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY sessions_own ON sessions
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY session_items_own ON session_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.profile_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.profile_id = (SELECT auth.uid()))
  );

CREATE POLICY answers_own ON answers
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY mastery_own ON mastery
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY reviews_own ON reviews
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY plans_own ON plans
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY subscriptions_own ON subscriptions
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY events_own ON events
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));
