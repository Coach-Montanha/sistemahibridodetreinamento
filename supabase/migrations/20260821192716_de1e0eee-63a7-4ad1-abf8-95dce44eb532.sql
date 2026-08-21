
BEGIN;
-- 1. Reparar sessões históricas: desvincular do placeholder e manter o nome limpo em nome_livre
UPDATE public.session_block_exercises sbe
SET 
    exercise_id = NULL,
    nome_livre = REPLACE(e.nome_pt, '[Pendente] ', '')
FROM public.exercises e
WHERE sbe.exercise_id = e.id
  AND e.nome_pt LIKE '[Pendente] %';

-- 2. Deletar mídias vinculadas a placeholders
DELETE FROM public.exercise_media
WHERE exercise_id IN (
    SELECT id FROM public.exercises WHERE nome_pt LIKE '[Pendente] %'
);

-- 3. Deletar os exercícios placeholders
DELETE FROM public.exercises
WHERE nome_pt LIKE '[Pendente] %';

COMMIT;
