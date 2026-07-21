DROP POLICY IF EXISTS exercises_update ON public.exercises;

CREATE POLICY exercises_update ON public.exercises
  FOR UPDATE
  TO authenticated
  USING (coach_id = public.auth_coach_id())
  WITH CHECK (coach_id = public.auth_coach_id());