
CREATE OR REPLACE FUNCTION public.validate_assignment_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_coach uuid;
  v_program_coach uuid;
  v_session_coach uuid;
BEGIN
  -- Aluno tem que pertencer ao mesmo coach
  SELECT coach_id INTO v_student_coach FROM public.students WHERE id = NEW.student_id;
  IF v_student_coach IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado';
  END IF;
  IF v_student_coach <> NEW.coach_id THEN
    RAISE EXCEPTION 'Aluno não pertence a este coach';
  END IF;

  -- Programa (se informado) tem que pertencer ao mesmo coach
  IF NEW.program_id IS NOT NULL THEN
    SELECT coach_id INTO v_program_coach FROM public.programs WHERE id = NEW.program_id;
    IF v_program_coach IS NULL THEN
      RAISE EXCEPTION 'Programa não encontrado';
    END IF;
    IF v_program_coach <> NEW.coach_id THEN
      RAISE EXCEPTION 'Programa não pertence a este coach';
    END IF;
  END IF;

  -- Sessão (se informada) tem que pertencer ao mesmo coach
  IF NEW.session_id IS NOT NULL THEN
    SELECT p.coach_id
      INTO v_session_coach
      FROM public.sessions s
      JOIN public.program_weeks w ON w.id = s.program_week_id
      JOIN public.programs p ON p.id = w.program_id
      WHERE s.id = NEW.session_id;
    IF v_session_coach IS NULL THEN
      RAISE EXCEPTION 'Sessão não encontrada';
    END IF;
    IF v_session_coach <> NEW.coach_id THEN
      RAISE EXCEPTION 'Sessão não pertence a este coach';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_assignment_ownership() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_assignment_ownership() FROM anon, authenticated;

DROP TRIGGER IF EXISTS assignments_ownership_check ON public.assignments;
CREATE TRIGGER assignments_ownership_check
BEFORE INSERT OR UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_assignment_ownership();
