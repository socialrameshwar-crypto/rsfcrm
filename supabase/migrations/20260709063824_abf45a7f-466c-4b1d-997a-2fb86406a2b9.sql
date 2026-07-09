CREATE POLICY "template pdfs — user reads own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'template-pdfs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "template pdfs — user inserts own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'template-pdfs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "template pdfs — user updates own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'template-pdfs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "template pdfs — user deletes own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'template-pdfs' AND (auth.uid())::text = (storage.foldername(name))[1]);
