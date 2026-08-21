-- Migration: Persistent Media Import Queue and Job Tracking
CREATE TABLE IF NOT EXISTS public.media_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    error_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_import_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.media_import_jobs(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    relative_path TEXT,
    storage_bucket TEXT DEFAULT 'exercise-media',
    storage_path TEXT,
    size INTEGER,
    content_type TEXT,
    fingerprint TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'uploading', 'success', 'error')),
    error_code TEXT,
    error_message TEXT,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_import_items_job_id ON public.media_import_items(job_id);
CREATE INDEX IF NOT EXISTS idx_media_import_jobs_coach_id ON public.media_import_jobs(coach_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_import_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_import_items TO authenticated;
GRANT ALL ON public.media_import_jobs TO service_role;
GRANT ALL ON public.media_import_items TO service_role;

ALTER TABLE public.media_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_import_items ENABLE ROW LEVEL SECURITY;

-- Note: we use a check that ensures the user is a member of the coach profile they are trying to access
CREATE POLICY "Coaches can manage their own import jobs" 
ON public.media_import_jobs 
FOR ALL 
TO authenticated 
USING (
    coach_id IN (
        SELECT coach_id FROM public.coach_members WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "Coaches can manage their own import items" 
ON public.media_import_items 
FOR ALL 
TO authenticated 
USING (
    coach_id IN (
        SELECT coach_id FROM public.coach_members WHERE auth_user_id = auth.uid()
    )
);
