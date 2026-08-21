-- 1. Verificar permissões globais de execução para as funções de segurança
REVOKE ALL ON FUNCTION public.auth_coach_id() FROM public;
REVOKE ALL ON FUNCTION public.auth_coach_id_for_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.auth_coach_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_coach_id_for_user(uuid) TO authenticated, service_role;

-- 2. Corrigir permissões das tabelas base para os papéis da API
GRANT SELECT ON public.coaches TO authenticated, service_role;
GRANT SELECT ON public.coach_members TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_media TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated, service_role;

-- 3. Inspecionar as tabelas de correlação e garantir permissões
GRANT ALL ON public.media_correlation_jobs TO authenticated, service_role;
GRANT ALL ON public.media_correlation_items TO authenticated, service_role;

-- 4. Verificar se a policy de INSERT da exercise_media está correta
-- Ela depende de subquery em exercises, que também deve estar acessível
DROP POLICY IF EXISTS "exercise_media_insert" ON public.exercise_media;
CREATE POLICY "exercise_media_insert" ON public.exercise_media
FOR INSERT TO authenticated
WITH CHECK (
  exercise_id IN (
    SELECT id FROM public.exercises 
    WHERE coach_id = auth_coach_id() OR coach_id IS NULL
  )
);
