DO $$
BEGIN
  ALTER TYPE public.block_format RENAME VALUE 'preparacao_movimento' TO 'mobilidade';
EXCEPTION
  WHEN OTHERS THEN
    -- Ignora se já existir ou se o valor original não existir
    NULL;
END
$$;