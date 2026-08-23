
ALTER TABLE public.media_audit_reports 
DROP CONSTRAINT IF EXISTS media_audit_reports_coach_id_fkey,
ADD CONSTRAINT media_audit_reports_coach_id_fkey 
FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE;

ALTER TABLE public.exercise_translation_jobs
DROP CONSTRAINT IF EXISTS exercise_translation_jobs_coach_id_fkey,
ADD CONSTRAINT exercise_translation_jobs_coach_id_fkey 
FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE;
