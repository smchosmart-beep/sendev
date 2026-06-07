ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS nickname_password text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;