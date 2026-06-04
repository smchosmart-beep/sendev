ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS enable_link boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_name text NOT NULL DEFAULT '링크';