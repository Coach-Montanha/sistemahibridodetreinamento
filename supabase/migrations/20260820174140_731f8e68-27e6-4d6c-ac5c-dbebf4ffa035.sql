ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS regras_progressao jsonb DEFAULT NULL;

COMMENT ON COLUMN public.programs.regras_progressao IS 'Perfil de geração de treinos (IA) persistido para o programa.';

-- Nenhuma política adicional é necessária se já existirem políticas de SELECT/UPDATE para coaches no programs.
-- As políticas existentes devem cobrir o novo campo JSONB.
