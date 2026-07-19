DROP POLICY IF EXISTS sessions_student_read ON public.sessions;

CREATE POLICY sessions_student_read ON public.sessions
FOR SELECT
USING (
  id IN (
    SELECT a.session_id FROM public.assignments a
    WHERE a.student_id = public.auth_student_id() AND a.session_id IS NOT NULL
  )
  OR program_week_id IN (
    SELECT a.program_week_id FROM public.assignments a
    WHERE a.student_id = public.auth_student_id() AND a.program_week_id IS NOT NULL
  )
  OR program_week_id IN (
    SELECT pw.id FROM public.program_weeks pw
    JOIN public.assignments a ON a.program_id = pw.program_id
    WHERE a.student_id = public.auth_student_id()
  )
);