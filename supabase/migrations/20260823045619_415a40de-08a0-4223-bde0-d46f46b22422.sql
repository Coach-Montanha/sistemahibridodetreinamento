
REVOKE EXECUTE ON FUNCTION public.auth_coach_id_for_user(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_coach_id_for_user(uuid) TO service_role;
-- We might need it for authenticated users if we use it in RLS policies via RPC
-- But if RLS uses it, we should ensure it's safe. 
-- For now, revoking from public/anon is mandatory.
