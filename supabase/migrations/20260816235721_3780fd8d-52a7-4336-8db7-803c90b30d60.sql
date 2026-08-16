ALTER TABLE public.session_blocks ALTER COLUMN formato TYPE text;
ALTER TABLE public.block_templates ALTER COLUMN formato TYPE text;

-- Opcional: Remover enums se não forem mais usados em outras tabelas
-- DROP TYPE block_format;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_templates TO authenticated;
GRANT ALL ON public.session_blocks TO service_role;
GRANT ALL ON public.block_templates TO service_role;