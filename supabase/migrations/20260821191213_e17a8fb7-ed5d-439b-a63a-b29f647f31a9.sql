-- 1. Reforçar a função de resolução de coach_id
CREATE OR REPLACE FUNCTION public.auth_coach_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Resolve primeiro o dono (coaches.auth_user_id)
  -- Depois membros (coach_members.auth_user_id)
  SELECT id FROM (
    SELECT id, criado_em FROM public.coaches WHERE auth_user_id = auth.uid()
    UNION ALL
    SELECT coach_id as id, criado_em FROM public.coach_members WHERE auth_user_id = auth.uid()
  ) AS combined
  ORDER BY criado_em ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.auth_coach_id() TO authenticated, service_role;

-- 2. Limpar e recriar políticas para tabelas de importação
-- media_import_jobs
DROP POLICY IF EXISTS "Coaches can manage their own import jobs" ON public.media_import_jobs;
DROP POLICY IF EXISTS "media_import_jobs_owner_policy" ON public.media_import_jobs;

ALTER TABLE public.media_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_import_jobs_select" ON public.media_import_jobs FOR SELECT TO authenticated USING (coach_id = public.auth_coach_id());
CREATE POLICY "media_import_jobs_insert" ON public.media_import_jobs FOR INSERT TO authenticated WITH CHECK (coach_id = public.auth_coach_id());
CREATE POLICY "media_import_jobs_update" ON public.media_import_jobs FOR UPDATE TO authenticated USING (coach_id = public.auth_coach_id()) WITH CHECK (coach_id = public.auth_coach_id());
CREATE POLICY "media_import_jobs_delete" ON public.media_import_jobs FOR DELETE TO authenticated USING (coach_id = public.auth_coach_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_import_jobs TO authenticated;
GRANT ALL ON public.media_import_jobs TO service_role;

-- media_import_items
DROP POLICY IF EXISTS "Coaches can manage items of their own jobs" ON public.media_import_items;
DROP POLICY IF EXISTS "media_import_items_owner_policy" ON public.media_import_items;

ALTER TABLE public.media_import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_import_items_select" ON public.media_import_items FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.media_import_jobs j WHERE j.id = job_id AND j.coach_id = public.auth_coach_id()));

CREATE POLICY "media_import_items_insert" ON public.media_import_items FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.media_import_jobs j WHERE j.id = job_id AND j.coach_id = public.auth_coach_id()));

CREATE POLICY "media_import_items_update" ON public.media_import_items FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.media_import_jobs j WHERE j.id = job_id AND j.coach_id = public.auth_coach_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.media_import_jobs j WHERE j.id = job_id AND j.coach_id = public.auth_coach_id()));

CREATE POLICY "media_import_items_delete" ON public.media_import_items FOR DELETE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.media_import_jobs j WHERE j.id = job_id AND j.coach_id = public.auth_coach_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_import_items TO authenticated;
GRANT ALL ON public.media_import_items TO service_role;

-- media_correlation_jobs
DROP POLICY IF EXISTS "media_correlation_jobs_policy" ON public.media_correlation_jobs;
ALTER TABLE public.media_correlation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_correlation_jobs_all" ON public.media_correlation_jobs FOR ALL TO authenticated USING (coach_id = public.auth_coach_id()) WITH CHECK (coach_id = public.auth_coach_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_correlation_jobs TO authenticated;
GRANT ALL ON public.media_correlation_jobs TO service_role;

-- media_correlation_items
DROP POLICY IF EXISTS "media_correlation_items_policy" ON public.media_correlation_items;
ALTER TABLE public.media_correlation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_correlation_items_all" ON public.media_correlation_items FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.media_correlation_jobs j WHERE j.id = job_id AND j.coach_id = public.auth_coach_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.media_correlation_jobs j WHERE j.id = job_id AND j.coach_id = public.auth_coach_id()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_correlation_items TO authenticated;
GRANT ALL ON public.media_correlation_items TO service_role;
