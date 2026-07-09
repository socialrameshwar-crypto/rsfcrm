
-- template-thumbnails: user-scoped (path starts with auth.uid())
CREATE POLICY "thumbs_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'template-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "thumbs_write_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'template-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "thumbs_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'template-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "thumbs_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'template-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- proposal-pdfs: user-scoped
CREATE POLICY "ppdf_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'proposal-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ppdf_write_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proposal-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ppdf_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'proposal-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ppdf_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'proposal-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
