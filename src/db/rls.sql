-- Applied on the Supabase project (see supabase/migrations). The Next.js
-- server connects as the database owner and bypasses these policies. The
-- public API key must not read answer keys or another person's rows, and
-- must never write: role, subscriptions and drill quotas grant privileges.

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
ALTER TABLE drill_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own ON profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY sessions_own ON sessions
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

CREATE POLICY session_items_own ON session_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.profile_id = (SELECT auth.uid()))
  );

-- answers.correct is stored before a test is submitted; it must stay hidden until then.
CREATE POLICY answers_own ON answers
  FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.status = 'submitted')
  );

CREATE POLICY mastery_own ON mastery
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

CREATE POLICY reviews_own ON reviews
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

CREATE POLICY drill_answers_own ON drill_answers
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

CREATE POLICY plans_own ON plans
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

CREATE POLICY subscriptions_own ON subscriptions
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- events: no policy. question_answered payloads carry correctness for unsubmitted tests.
