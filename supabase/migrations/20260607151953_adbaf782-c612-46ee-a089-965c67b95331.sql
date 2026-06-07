
-- categories: tree structure
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_post boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);

-- enable_post derived from legacy notice/question/general toggles
UPDATE public.categories
  SET enable_post = (enable_notice OR enable_question OR enable_general);

-- posts: pinned flag for notices
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

-- unify post types: notice -> post (pinned), question/general -> post
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;

UPDATE public.posts SET pinned = true WHERE type = 'notice';
UPDATE public.posts SET type = 'post' WHERE type IN ('notice', 'question', 'general');

ALTER TABLE public.posts
  ADD CONSTRAINT posts_type_check CHECK (type = ANY (ARRAY['post'::text, 'project'::text, 'link'::text]));
