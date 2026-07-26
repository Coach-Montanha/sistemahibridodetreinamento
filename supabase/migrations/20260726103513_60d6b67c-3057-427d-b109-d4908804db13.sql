CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT 'Chave da API',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  last4 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX api_keys_key_hash_idx ON public.api_keys (key_hash);
CREATE INDEX api_keys_coach_idx ON public.api_keys (coach_id);

GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;