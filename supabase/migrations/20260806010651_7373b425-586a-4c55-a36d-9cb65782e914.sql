-- 2. Configurar RLS para o bucket
-- Permitir que usuários autenticados façam upload
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Allow authenticated uploads" ON storage.objects
        FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exercise-media');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated selects' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Allow authenticated selects" ON storage.objects
        FOR SELECT TO authenticated USING (bucket_id = 'exercise-media');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated deletes' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Allow authenticated deletes" ON storage.objects
        FOR DELETE TO authenticated USING (bucket_id = 'exercise-media');
    END IF;
END $$;

-- 3. Garantir que a tabela exercise_media existe e tem a estrutura correta
CREATE TABLE IF NOT EXISTS public.exercise_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'youtube')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(exercise_id, storage_path)
);

-- 4. Habilitar RLS e permissões na tabela
ALTER TABLE public.exercise_media ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.exercise_media TO authenticated;
GRANT ALL ON public.exercise_media TO service_role;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own exercise media' AND tablename = 'exercise_media' AND schemaname = 'public') THEN
        CREATE POLICY "Users can manage their own exercise media" ON public.exercise_media
        FOR ALL TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;
