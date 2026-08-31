-- Indexes for accelerated relational joins and filter operations

-- 1. Program weeks and sessions hierarchy
CREATE INDEX IF NOT EXISTS idx_program_weeks_program_id ON public.program_weeks(program_id);
CREATE INDEX IF NOT EXISTS idx_sessions_week_id ON public.sessions(program_week_id);
CREATE INDEX IF NOT EXISTS idx_session_blocks_session_id ON public.session_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_block_exercises_block_id ON public.session_block_exercises(session_block_id);
CREATE INDEX IF NOT EXISTS idx_session_block_exercises_exercise_id ON public.session_block_exercises(exercise_id);

-- 2. Exercises coach and media optimization
CREATE INDEX IF NOT EXISTS idx_exercises_coach_id ON public.exercises(coach_id);
CREATE INDEX IF NOT EXISTS idx_exercise_media_exercise_id ON public.exercise_media(exercise_id);

-- 3. Student assignments
CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON public.assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_session_id ON public.assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_program_id ON public.assignments(program_id);
