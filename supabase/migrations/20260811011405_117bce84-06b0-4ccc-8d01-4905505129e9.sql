UPDATE public.session_blocks 
SET formato = 'preparacao_movimento' 
WHERE formato::text = 'mobilidade';

UPDATE public.block_templates 
SET formato = 'preparacao_movimento' 
WHERE formato::text = 'mobilidade';