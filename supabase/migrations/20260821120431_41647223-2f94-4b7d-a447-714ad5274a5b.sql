DO $$
BEGIN
    -- Grant permission to use public.auth_coach_id() to authenticated users
    GRANT EXECUTE ON FUNCTION public.auth_coach_id() TO authenticated;
    
    -- Grant SELECT on coaches and coach_members (needed for the security definer function logic)
    GRANT SELECT ON public.coaches TO authenticated;
    GRANT SELECT ON public.coach_members TO authenticated;
    
    -- Ensure grants for exercise_media are complete
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_media TO authenticated;
    GRANT ALL ON public.exercise_media TO service_role;
END $$;
