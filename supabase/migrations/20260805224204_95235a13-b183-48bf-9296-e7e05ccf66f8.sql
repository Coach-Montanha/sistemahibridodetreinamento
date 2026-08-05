-- Adiciona uma restrição única para evitar duplicatas de mídias por exercício e caminho no storage
ALTER TABLE public.exercise_media 
ADD CONSTRAINT exercise_media_unique_path UNIQUE (exercise_id, storage_path);

-- Garante privilégios para o role authenticated
GRANT ALL ON public.exercise_media TO authenticated;
GRANT ALL ON public.exercise_media TO service_role;
