
CREATE OR REPLACE FUNCTION public.student_can_read_program_week(_pw_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.student_id = public.auth_student_id()
      AND (
        a.program_week_id = _pw_id
        OR a.program_id = (SELECT pw.program_id FROM public.program_weeks pw WHERE pw.id = _pw_id)
        OR a.session_id IN (SELECT s.id FROM public.sessions s WHERE s.program_week_id = _pw_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.student_can_read_program(_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.student_id = public.auth_student_id()
      AND (
        a.program_id = _program_id
        OR a.program_week_id IN (SELECT pw.id FROM public.program_weeks pw WHERE pw.program_id = _program_id)
        OR a.session_id IN (
          SELECT s.id FROM public.sessions s
          JOIN public.program_weeks pw ON pw.id = s.program_week_id
          WHERE pw.program_id = _program_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.student_can_read_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.student_id = public.auth_student_id()
      AND (
        a.session_id = _session_id
        OR a.program_week_id = (SELECT s.program_week_id FROM public.sessions s WHERE s.id = _session_id)
        OR a.program_id = (
          SELECT pw.program_id
          FROM public.sessions s
          JOIN public.program_weeks pw ON pw.id = s.program_week_id
          WHERE s.id = _session_id
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.student_can_read_program_week(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_read_program(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_read_session(uuid) TO authenticated;

DROP POLICY IF EXISTS program_weeks_student_read ON public.program_weeks;
CREATE POLICY program_weeks_student_read ON public.program_weeks
  FOR SELECT
  USING (public.student_can_read_program_week(id));

DROP POLICY IF EXISTS programs_student_read ON public.programs;
CREATE POLICY programs_student_read ON public.programs
  FOR SELECT
  USING (public.student_can_read_program(id));

DROP POLICY IF EXISTS sessions_student_read ON public.sessions;
CREATE POLICY sessions_student_read ON public.sessions
  FOR SELECT
  USING (public.student_can_read_session(id));
