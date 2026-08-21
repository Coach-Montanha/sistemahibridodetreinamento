CREATE OR REPLACE FUNCTION public.get_exercises_pending_translation(_limit int DEFAULT 2000)
RETURNS TABLE (id uuid, name_original text) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT ec.id, ec.name_original
    FROM public.exercise_catalog ec
    LEFT JOIN public.exercise_catalog_translations ect ON ec.id = ect.catalog_exercise_id
    WHERE ect.id IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.exercise_translation_items eti
        WHERE eti.catalog_exercise_id = ec.id
        AND eti.status IN ('pending', 'processing')
    )
    LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_exercises_pending_translation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercises_pending_translation TO service_role;
