-- Apply on Supabase, where auth.uid() exists. The server connection still
-- filters every read by profile id; these policies cover direct API access.
-- Do not run against the local embedded database.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own ON profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY sessions_own ON sessions
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY session_items_own ON session_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.profile_id = auth.uid())
  );

CREATE POLICY answers_own ON answers
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY mastery_own ON mastery
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY reviews_own ON reviews
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY plans_own ON plans
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY subscriptions_own ON subscriptions
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY events_own ON events
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stimuli ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_published ON items
  FOR SELECT USING (status = 'published' OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY choices_published ON choices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items i
      WHERE i.id = item_id AND (
        i.status = 'published' OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

CREATE POLICY stimuli_read ON stimuli FOR SELECT USING (true);
CREATE POLICY skills_read ON skills FOR SELECT USING (true);
CREATE POLICY vocabulary_read ON vocabulary FOR SELECT USING (true);
CREATE POLICY vocab_links_read ON vocab_links FOR SELECT USING (true);
