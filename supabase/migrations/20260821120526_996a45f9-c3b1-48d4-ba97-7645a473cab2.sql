CREATE OR REPLACE FUNCTION public.auth_coach_id_for_user(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select id from public.coaches where auth_user_id = _user_id),
    (select coach_id from public.coach_members where auth_user_id = _user_id limit 1)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.auth_coach_id_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_coach_id_for_user(uuid) TO service_role;
