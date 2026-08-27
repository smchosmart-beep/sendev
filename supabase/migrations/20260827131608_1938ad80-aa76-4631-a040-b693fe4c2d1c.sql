ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS vote_target_type text NOT NULL DEFAULT 'vote';