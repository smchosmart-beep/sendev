ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS template_post text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS template_question text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS template_vote text NOT NULL DEFAULT '';