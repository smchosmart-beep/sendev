DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anyone can upload post files'
  ) THEN
    CREATE POLICY "Anyone can upload post files"
      ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'post-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anyone can read post files'
  ) THEN
    CREATE POLICY "Anyone can read post files"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'post-files');
  END IF;
END $$;