-- Migration: Create Media Correlation tracking tables
-- Created at: 2026-08-21 08:58:13

CREATE TABLE IF NOT EXISTS public.media_correlation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    stats JSONB DEFAULT '{
        "total_files": 0,
        "exact_matches": 0,
        "ambiguous_matches": 0,
        "no_matches": 0,
        "applied": 0
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_correlation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.media_correlation_jobs(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    matched_exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    match_type TEXT NOT NULL, -- deterministic, exact, ambiguous, none
    match_confidence FLOAT DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, applied, skipped, review_needed
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_correlation_jobs TO authenticated;
GRANT ALL ON public.media_correlation_jobs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_correlation_items TO authenticated;
GRANT ALL ON public.media_correlation_items TO service_role;

-- RLS
ALTER TABLE public.media_correlation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_correlation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own jobs"
ON public.media_correlation_jobs
FOR ALL
TO authenticated
USING (coach_id IN (
    SELECT coach_id FROM public.coach_members WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Coaches can manage their own correlation items"
ON public.media_correlation_items
FOR ALL
TO authenticated
USING (job_id IN (
    SELECT id FROM public.media_correlation_jobs WHERE coach_id IN (
        SELECT coach_id FROM public.coach_members WHERE auth_user_id = auth.uid()
    )
));
