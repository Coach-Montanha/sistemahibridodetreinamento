-- Storage: cada coach gerencia arquivos sob prefixo <coach_id>/...
create policy "coach media read" on storage.objects for select to authenticated
  using (
    bucket_id in ('exercise-media','coach-branding','exports','ai-ingestion-sources')
    and (storage.foldername(name))[1] = public.auth_coach_id()::text
  );
create policy "coach media write" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('exercise-media','coach-branding','exports','ai-ingestion-sources')
    and (storage.foldername(name))[1] = public.auth_coach_id()::text
  );
create policy "coach media update" on storage.objects for update to authenticated
  using (
    bucket_id in ('exercise-media','coach-branding','exports','ai-ingestion-sources')
    and (storage.foldername(name))[1] = public.auth_coach_id()::text
  );
create policy "coach media delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('exercise-media','coach-branding','exports','ai-ingestion-sources')
    and (storage.foldername(name))[1] = public.auth_coach_id()::text
  );