revoke execute on function public.auth_coach_id() from public, anon;
revoke execute on function public.auth_student_id() from public, anon;
grant execute on function public.auth_coach_id() to authenticated;
grant execute on function public.auth_student_id() to authenticated;