
DROP POLICY IF EXISTS exercises_scope ON public.exercises;

-- Leitura e mutação do que já é do coach OU globais (coach_id IS NULL)
CREATE POLICY exercises_select ON public.exercises
  FOR SELECT TO authenticated
  USING (coach_id IS NULL OR coach_id = public.auth_coach_id());

CREATE POLICY exercises_insert ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = public.auth_coach_id());

CREATE POLICY exercises_update ON public.exercises
  FOR UPDATE TO authenticated
  USING (coach_id IS NULL OR coach_id = public.auth_coach_id())
  WITH CHECK (coach_id IS NULL OR coach_id = public.auth_coach_id());

CREATE POLICY exercises_delete ON public.exercises
  FOR DELETE TO authenticated
  USING (coach_id = public.auth_coach_id());
