
-- programs: student can read programs assigned to them (directly, or through week/session)
CREATE POLICY "programs_student_read" ON public.programs FOR SELECT
USING (
  id IN (SELECT program_id FROM public.assignments WHERE student_id = public.auth_student_id() AND program_id IS NOT NULL)
  OR id IN (SELECT pw.program_id FROM public.program_weeks pw JOIN public.assignments a ON a.program_week_id = pw.id WHERE a.student_id = public.auth_student_id())
  OR id IN (SELECT pw.program_id FROM public.program_weeks pw JOIN public.sessions s ON s.program_week_id = pw.id JOIN public.assignments a ON a.session_id = s.id WHERE a.student_id = public.auth_student_id())
);

-- program_weeks: student can read weeks tied to sessions they can read
CREATE POLICY "program_weeks_student_read" ON public.program_weeks FOR SELECT
USING (
  program_id IN (SELECT program_id FROM public.assignments WHERE student_id = public.auth_student_id() AND program_id IS NOT NULL)
  OR id IN (SELECT program_week_id FROM public.assignments WHERE student_id = public.auth_student_id() AND program_week_id IS NOT NULL)
  OR id IN (SELECT s.program_week_id FROM public.sessions s JOIN public.assignments a ON a.session_id = s.id WHERE a.student_id = public.auth_student_id())
);

-- session_blocks: student can read blocks belonging to sessions they can read
CREATE POLICY "session_blocks_student_read" ON public.session_blocks FOR SELECT
USING (
  session_id IN (
    SELECT s.id FROM public.sessions s
    WHERE s.id IN (SELECT a.session_id FROM public.assignments a WHERE a.student_id = public.auth_student_id() AND a.session_id IS NOT NULL)
       OR s.program_week_id IN (SELECT a.program_week_id FROM public.assignments a WHERE a.student_id = public.auth_student_id() AND a.program_week_id IS NOT NULL)
       OR s.program_week_id IN (SELECT pw.id FROM public.program_weeks pw JOIN public.assignments a ON a.program_id = pw.program_id WHERE a.student_id = public.auth_student_id())
  )
);

-- session_block_exercises: same via session_blocks
CREATE POLICY "session_block_exercises_student_read" ON public.session_block_exercises FOR SELECT
USING (
  session_block_id IN (
    SELECT sb.id FROM public.session_blocks sb
    WHERE sb.session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.id IN (SELECT a.session_id FROM public.assignments a WHERE a.student_id = public.auth_student_id() AND a.session_id IS NOT NULL)
         OR s.program_week_id IN (SELECT a.program_week_id FROM public.assignments a WHERE a.student_id = public.auth_student_id() AND a.program_week_id IS NOT NULL)
         OR s.program_week_id IN (SELECT pw.id FROM public.program_weeks pw JOIN public.assignments a ON a.program_id = pw.program_id WHERE a.student_id = public.auth_student_id())
    )
  )
);

-- exercises: allow authenticated students to read exercise details referenced anywhere
CREATE POLICY "exercises_student_read" ON public.exercises FOR SELECT
USING (auth.uid() IS NOT NULL);
