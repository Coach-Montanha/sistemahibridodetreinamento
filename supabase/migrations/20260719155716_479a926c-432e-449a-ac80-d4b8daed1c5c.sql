
CREATE TABLE public.generator_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  metodologia text NOT NULL,
  blocos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, metodologia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generator_preferences TO authenticated;
GRANT ALL ON public.generator_preferences TO service_role;

ALTER TABLE public.generator_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach manages own generator prefs"
  ON public.generator_preferences
  FOR ALL
  USING (coach_id = public.auth_coach_id())
  WITH CHECK (coach_id = public.auth_coach_id());

CREATE OR REPLACE FUNCTION public.set_generator_prefs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generator_prefs_updated_at
  BEFORE UPDATE ON public.generator_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_generator_prefs_updated_at();
