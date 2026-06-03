CREATE POLICY "Anyone can upload post images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Anyone can read post images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'post-images');