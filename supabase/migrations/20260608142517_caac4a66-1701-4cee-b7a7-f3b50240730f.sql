ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_profiles FROM anon, authenticated;

DROP POLICY IF EXISTS "Deny public access to user_profiles" ON public.user_profiles;
CREATE POLICY "Deny public access to user_profiles"
  ON public.user_profiles
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);