-- Update Storage Policies to allow both auth.uid() and auth_coach_id()
-- This ensures backward compatibility with files already in auth.uid() folders
-- while allowing the new coach_id based folder structure.

BEGIN;

-- Drop existing policies for the 'exercise-media' bucket to recreate them correctly
DROP POLICY IF EXISTS "coach media read" ON storage.objects;
DROP POLICY IF EXISTS "coach media write" ON storage.objects;
DROP POLICY IF EXISTS "coach media update" ON storage.objects;
DROP POLICY IF EXISTS "coach media delete" ON storage.objects;

-- Create more flexible policies
CREATE POLICY "coach media read" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exercise-media' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR 
    (storage.foldername(name))[1] = auth_coach_id()::text
  )
);

CREATE POLICY "coach media write" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-media' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR 
    (storage.foldername(name))[1] = auth_coach_id()::text
  )
);

CREATE POLICY "coach media update" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercise-media' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR 
    (storage.foldername(name))[1] = auth_coach_id()::text
  )
);

CREATE POLICY "coach media delete" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-media' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR 
    (storage.foldername(name))[1] = auth_coach_id()::text
  )
);

COMMIT;
