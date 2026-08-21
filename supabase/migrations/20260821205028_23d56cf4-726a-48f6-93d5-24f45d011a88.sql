-- Tabelas para Auditoria de Mídia e Deduplicação
CREATE TABLE public.media_audit_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    summary jsonb DEFAULT '{}', -- { total_files, duplicates_found, orphaned_files, size_reclaimable }
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.media_audit_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid REFERENCES public.media_audit_reports(id) ON DELETE CASCADE NOT NULL,
    storage_path text NOT NULL,
    fingerprint text, -- sha256
    size bigint,
    content_type text,
    is_duplicate boolean DEFAULT false,
    is_orphaned boolean DEFAULT false,
    canonical_path text, -- se for duplicata, aponta para o path original
    linked_exercise_id uuid,
    metadata jsonb DEFAULT '{}'
);

-- Tabelas para Tradução em Massa do Catálogo
CREATE TABLE public.exercise_translation_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, paused
    total_items integer DEFAULT 0,
    processed_items integer DEFAULT 0,
    success_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    last_cursor uuid,
    settings jsonb DEFAULT '{"batch_size": 25, "locale": "pt-BR"}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.exercise_translation_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid REFERENCES public.exercise_translation_jobs(id) ON DELETE CASCADE NOT NULL,
    catalog_exercise_id uuid NOT NULL, -- FK virtual para catalog (schema importado)
    status text NOT NULL DEFAULT 'pending', -- pending, processing, draft, approved, error
    translated_content jsonb,
    error_message text,
    attempts integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(job_id, catalog_exercise_id)
);

-- Segurança (RLS e Grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_audit_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_audit_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_translation_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_translation_items TO authenticated;

GRANT ALL ON public.media_audit_reports TO service_role;
GRANT ALL ON public.media_audit_items TO service_role;
GRANT ALL ON public.exercise_translation_jobs TO service_role;
GRANT ALL ON public.exercise_translation_items TO service_role;

ALTER TABLE public.media_audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_translation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_translation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own audit reports"
ON public.media_audit_reports FOR ALL TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can manage their own audit items"
ON public.media_audit_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.media_audit_reports 
    WHERE id = report_id AND coach_id = auth.uid()
));

CREATE POLICY "Coaches can manage their own translation jobs"
ON public.exercise_translation_jobs FOR ALL TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches can manage their own translation items"
ON public.exercise_translation_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.exercise_translation_jobs 
    WHERE id = job_id AND coach_id = auth.uid()
));
