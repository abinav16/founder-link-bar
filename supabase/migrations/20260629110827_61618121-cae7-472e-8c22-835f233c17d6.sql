DROP POLICY IF EXISTS "startup-logos public read" ON storage.objects;
DROP POLICY IF EXISTS "startup-logos owner read" ON storage.objects;

CREATE POLICY "startup-logos owner read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'startup-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);