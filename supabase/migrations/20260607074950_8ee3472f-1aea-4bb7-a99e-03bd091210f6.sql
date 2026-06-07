CREATE TABLE public.user_awards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  username_key text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_awards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_awards TO authenticated;
GRANT ALL ON public.user_awards TO service_role;

ALTER TABLE public.user_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User awards are publicly readable"
  ON public.user_awards FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_user_awards_username_key ON public.user_awards (username_key);

CREATE TRIGGER update_user_awards_updated_at
  BEFORE UPDATE ON public.user_awards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.user_awards (username, username_key, name, sort_order)
SELECT username, username_key, btrim(award), 0
FROM public.user_profiles
WHERE btrim(award) <> '';