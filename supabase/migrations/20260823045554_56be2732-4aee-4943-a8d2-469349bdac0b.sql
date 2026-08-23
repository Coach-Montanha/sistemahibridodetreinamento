
CREATE OR REPLACE FUNCTION public.auth_coach_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coach_id 
  FROM public.coach_members 
  WHERE auth_user_id = _user_id 
  LIMIT 1;
$$;
