ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stimuli ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own ON public.profiles
  FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY sessions_own ON public.sessions
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY session_items_own ON public.session_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.profile_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.profile_id = (SELECT auth.uid()))
  );

CREATE POLICY answers_own ON public.answers
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY mastery_own ON public.mastery
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY reviews_own ON public.reviews
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY plans_own ON public.plans
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY subscriptions_own ON public.subscriptions
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY events_own ON public.events
  FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));
