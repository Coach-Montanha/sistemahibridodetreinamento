-- 1. Exercícios: remover leitura irrestrita por qualquer usuário autenticado
DROP POLICY IF EXISTS exercises_student_read ON public.exercises;

CREATE POLICY exercises_student_read ON public.exercises
  FOR SELECT
  TO authenticated
  USING (
    coach_id IS NULL
    OR coach_id = public.auth_coach_id()
    OR EXISTS (
      SELECT 1
      FROM public.session_block_exercises sbe
      JOIN public.session_blocks sb ON sb.id = sbe.session_block_id
      WHERE sbe.exercise_id = exercises.id
        AND public.student_can_read_session(sb.session_id)
    )
  );

-- 2. Templates de bloco: leitura ampla, escrita apenas do dono
DROP POLICY IF EXISTS block_templates_scope ON public.block_templates;

CREATE POLICY block_templates_select ON public.block_templates
  FOR SELECT
  TO authenticated
  USING (coach_id IS NULL OR coach_id = public.auth_coach_id());

CREATE POLICY block_templates_insert ON public.block_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = public.auth_coach_id());

CREATE POLICY block_templates_update ON public.block_templates
  FOR UPDATE
  TO authenticated
  USING (coach_id = public.auth_coach_id())
  WITH CHECK (coach_id = public.auth_coach_id());

CREATE POLICY block_templates_delete ON public.block_templates
  FOR DELETE
  TO authenticated
  USING (coach_id = public.auth_coach_id());

-- 3. Mídia de exercícios: leitura ampla, escrita apenas na mídia dos próprios exercícios
DROP POLICY IF EXISTS exercise_media_scope ON public.exercise_media;

CREATE POLICY exercise_media_select ON public.exercise_media
  FOR SELECT
  TO authenticated
  USING (
    exercise_id IN (
      SELECT e.id FROM public.exercises e
      WHERE e.coach_id IS NULL OR e.coach_id = public.auth_coach_id()
    )
  );

CREATE POLICY exercise_media_insert ON public.exercise_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    exercise_id IN (
      SELECT e.id FROM public.exercises e WHERE e.coach_id = public.auth_coach_id()
    )
  );

CREATE POLICY exercise_media_update ON public.exercise_media
  FOR UPDATE
  TO authenticated
  USING (
    exercise_id IN (
      SELECT e.id FROM public.exercises e WHERE e.coach_id = public.auth_coach_id()
    )
  )
  WITH CHECK (
    exercise_id IN (
      SELECT e.id FROM public.exercises e WHERE e.coach_id = public.auth_coach_id()
    )
  );

CREATE POLICY exercise_media_delete ON public.exercise_media
  FOR DELETE
  TO authenticated
  USING (
    exercise_id IN (
      SELECT e.id FROM public.exercises e WHERE e.coach_id = public.auth_coach_id()
    )
  );

-- 4. Higiene: função de fusão não deve ser chamável por visitantes anônimos
REVOKE EXECUTE ON FUNCTION public.merge_exercises(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_exercises(uuid, uuid[]) TO authenticated;