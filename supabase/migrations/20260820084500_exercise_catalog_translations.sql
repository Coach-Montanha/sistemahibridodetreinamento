-- Create exercise_catalog_translations table
CREATE TABLE public.exercise_catalog_translations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_exercise_id uuid NOT NULL REFERENCES public.exercise_catalog(id) ON DELETE CASCADE,
    locale text NOT NULL DEFAULT 'pt-BR',
    name_pt_br text,
    category_pt_br text,
    body_part_pt_br text,
    equipment_pt_br text,
    target_pt_br text,
    muscle_group_pt_br text,
    secondary_muscles_pt_br jsonb,
    instructions_pt_br text,
    instruction_steps_pt_br jsonb,
    translation_status text NOT NULL DEFAULT 'pending', -- 'pending', 'draft', 'needs_review', 'approved', 'rejected'
    translation_source text DEFAULT 'llm', -- 'llm', 'human', 'hybrid'
    translation_model text,
    review_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (catalog_exercise_id, locale)
);

-- RLS and Grants
ALTER TABLE public.exercise_catalog_translations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_catalog_translations TO authenticated;
GRANT ALL ON public.exercise_catalog_translations TO service_role;

-- Policy: Admins and coaches can manage translations
CREATE POLICY "Admins and coaches can manage translations" 
ON public.exercise_catalog_translations 
FOR ALL 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM public.coach_members 
    WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'coach')
));

-- Policy: Anyone authenticated can view translations
CREATE POLICY "Anyone authenticated can view translations" 
ON public.exercise_catalog_translations 
FOR SELECT 
TO authenticated 
USING (true);

-- Add tracking for the active translation to exercise_catalog
ALTER TABLE public.exercise_catalog 
ADD COLUMN IF NOT EXISTS active_translation_id uuid REFERENCES public.exercise_catalog_translations(id);

-- Update exercise_catalog trigger for timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.exercise_catalog_translations
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

