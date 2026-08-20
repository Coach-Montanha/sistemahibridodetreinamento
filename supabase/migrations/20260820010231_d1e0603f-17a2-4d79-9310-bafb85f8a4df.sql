-- 1. Create exercise_catalog table
CREATE TABLE public.exercise_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL DEFAULT 'coach-montanha-exercises-dataset',
    source_commit text NOT NULL,
    source_exercise_id text NOT NULL,
    name_original text NOT NULL,
    category text,
    body_part text,
    equipment_original text,
    target text,
    muscle_group text,
    secondary_muscles jsonb,
    instructions jsonb NOT NULL DEFAULT '{}',
    instruction_steps jsonb NOT NULL DEFAULT '{}',
    attribution text DEFAULT '© Gym visual — https://gymvisual.com/',
    image_path text,
    gif_path text,
    raw_hash text,
    review_status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_for_projection boolean NOT NULL DEFAULT false,
    projected_exercise_id uuid,
    imported_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source, source_exercise_id)
);

-- 2. Add projection tracking to exercises
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS source_id text,
ADD COLUMN IF NOT EXISTS source_commit text;

-- Create index for faster lookups during projection checks
CREATE INDEX IF NOT EXISTS idx_exercises_source_id ON public.exercises (source, source_id) WHERE (coach_id IS NULL);

-- 3. RLS and Grants for exercise_catalog
ALTER TABLE public.exercise_catalog ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.exercise_catalog TO authenticated;
GRANT ALL ON public.exercise_catalog TO service_role;

-- Policy: Coaches and admins can manage the catalog
CREATE POLICY "Admins and coaches can manage catalog" 
ON public.exercise_catalog 
FOR ALL 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM public.coach_members 
    WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'coach')
));

-- Policy: Anyone authenticated can view catalog
CREATE POLICY "Anyone authenticated can view catalog" 
ON public.exercise_catalog 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Grant access to service role
GRANT ALL ON public.exercises TO service_role;
