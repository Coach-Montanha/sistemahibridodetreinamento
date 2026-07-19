
CREATE POLICY "coach_files_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'coach-files' AND (storage.foldername(name))[1] = auth_coach_id()::text);

CREATE POLICY "coach_files_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'coach-files' AND (storage.foldername(name))[1] = auth_coach_id()::text);

CREATE POLICY "coach_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'coach-files' AND (storage.foldername(name))[1] = auth_coach_id()::text);
