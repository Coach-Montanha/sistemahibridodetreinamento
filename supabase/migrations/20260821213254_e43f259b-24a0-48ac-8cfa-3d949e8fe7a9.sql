-- Revoga permissões de execução pública para garantir que apenas coachs autenticados usem a IA
REVOKE EXECUTE ON FUNCTION public.get_exercises_pending_translation(int) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_exercises_pending_translation(int) FROM anon;

-- Garante que apenas authenticated e service_role (usado via supabaseAdmin no servidor) possam executar
GRANT EXECUTE ON FUNCTION public.get_exercises_pending_translation(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercises_pending_translation(int) TO service_role;
