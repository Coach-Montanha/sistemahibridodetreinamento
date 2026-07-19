CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.merge_exercises(_keeper_id uuid, _duplicate_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach uuid;
  v_keeper_coach uuid;
  v_dup_count int;
BEGIN
  v_coach := public.auth_coach_id();
  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT coach_id INTO v_keeper_coach FROM public.exercises WHERE id = _keeper_id;
  IF v_keeper_coach IS DISTINCT FROM v_coach AND v_keeper_coach IS NOT NULL THEN
    RAISE EXCEPTION 'Exercício principal não pertence ao coach';
  END IF;

  SELECT count(*) INTO v_dup_count
  FROM public.exercises
  WHERE id = ANY(_duplicate_ids)
    AND (coach_id = v_coach OR coach_id IS NULL);

  IF v_dup_count <> array_length(_duplicate_ids, 1) THEN
    RAISE EXCEPTION 'Algum exercício duplicado não pertence ao coach';
  END IF;

  UPDATE public.session_block_exercises
  SET exercise_id = _keeper_id
  WHERE exercise_id = ANY(_duplicate_ids);

  DELETE FROM public.exercises
  WHERE id = ANY(_duplicate_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_exercises(uuid, uuid[]) TO authenticated;