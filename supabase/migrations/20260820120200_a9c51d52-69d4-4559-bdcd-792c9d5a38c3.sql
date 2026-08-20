
CREATE TYPE public.block_origin AS ENUM ('system', 'coach');

CREATE TABLE public.format_definitions (
    id text PRIMARY KEY,
    base_format text NOT NULL,
    label text NOT NULL,
    description text,
    default_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    is_builtin boolean NOT NULL DEFAULT false,
    coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.format_definitions TO authenticated; 
GRANT ALL ON public.format_definitions TO service_role;

ALTER TABLE public.format_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public format definitions are viewable by all"
    ON public.format_definitions FOR SELECT
    TO authenticated
    USING (coach_id IS NULL OR coach_id = auth_coach_id());

CREATE POLICY "Coaches can manage their own format definitions"
    ON public.format_definitions FOR ALL
    TO authenticated
    USING (coach_id = auth_coach_id())
    WITH CHECK (coach_id = auth_coach_id());

CREATE TABLE public.set_type_definitions (
    id text PRIMARY KEY,
    label text NOT NULL,
    fields jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    is_builtin boolean NOT NULL DEFAULT false,
    coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.set_type_definitions TO authenticated;
GRANT ALL ON public.set_type_definitions TO service_role;

ALTER TABLE public.set_type_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public set type definitions are viewable by all"
    ON public.set_type_definitions FOR SELECT
    TO authenticated
    USING (coach_id IS NULL OR coach_id = auth_coach_id());

CREATE POLICY "Coaches can manage their own set type definitions"
    ON public.set_type_definitions FOR ALL
    TO authenticated
    USING (coach_id = auth_coach_id())
    WITH CHECK (coach_id = auth_coach_id());

ALTER TABLE public.block_templates ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
ALTER TABLE public.block_templates ADD COLUMN IF NOT EXISTS origin public.block_origin DEFAULT 'coach';
ALTER TABLE public.block_templates ADD COLUMN IF NOT EXISTS format_definition_id text REFERENCES public.format_definitions(id) ON DELETE SET NULL;
