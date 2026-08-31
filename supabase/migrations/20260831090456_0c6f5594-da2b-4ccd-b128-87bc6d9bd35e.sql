DROP POLICY IF EXISTS exercises_update ON public.exercises;
DROP POLICY IF EXISTS exercises_delete ON public.exercises;

CREATE POLICY exercises_update ON public.exercises
FOR UPDATE TO authenticated
USING (coach_id = public.auth_coach_id())
WITH CHECK (coach_id = public.auth_coach_id());

CREATE POLICY exercises_delete ON public.exercises
FOR DELETE TO authenticated
USING (coach_id = public.auth_coach_id());