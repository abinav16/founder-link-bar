
-- Public read
CREATE POLICY "startup-logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'startup-logos');

-- Owner write/update/delete (path: {user_id}/...)
CREATE POLICY "startup-logos owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'startup-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "startup-logos owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'startup-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'startup-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "startup-logos owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'startup-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
