-- The server connects as the table owner (BYPASSRLS) and is unaffected.
-- Signed-in users may read their own rows through the data API but never
-- write them: profiles.role, subscriptions and drill quotas grant privileges.

ALTER TABLE public.app_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_own ON public.profiles;
CREATE POLICY profiles_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS subscriptions_own ON public.subscriptions;
CREATE POLICY subscriptions_own ON public.subscriptions
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS sessions_own ON public.sessions;
CREATE POLICY sessions_own ON public.sessions
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS session_items_own ON public.session_items;
CREATE POLICY session_items_own ON public.session_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.profile_id = (SELECT auth.uid()))
  );

-- answers.correct is stored before a test is submitted; it must stay hidden until then.
DROP POLICY IF EXISTS answers_own ON public.answers;
CREATE POLICY answers_own ON public.answers
  FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.status = 'submitted')
  );

DROP POLICY IF EXISTS mastery_own ON public.mastery;
CREATE POLICY mastery_own ON public.mastery
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS reviews_own ON public.reviews;
CREATE POLICY reviews_own ON public.reviews
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS plans_own ON public.plans;
CREATE POLICY plans_own ON public.plans
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS drill_answers_own ON public.drill_answers;
CREATE POLICY drill_answers_own ON public.drill_answers
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- question_answered payloads carry correctness for unsubmitted tests; no client access.
DROP POLICY IF EXISTS events_own ON public.events;
