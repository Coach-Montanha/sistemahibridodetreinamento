DROP POLICY IF EXISTS "Users can manage their own exercise media" ON public.exercise_media;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated selects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.auth_coach_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.auth_student_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.student_can_read_program(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.student_can_read_program_week(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.student_can_read_session(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.merge_exercises(uuid, uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_assignment_ownership() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_generator_prefs_updated_at() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.auth_coach_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_read_program(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_read_program_week(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_read_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_exercises(uuid, uuid[]) TO authenticated;