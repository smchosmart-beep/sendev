ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS enable_vote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vote_name text NOT NULL DEFAULT '투표',
  ADD COLUMN IF NOT EXISTS vote_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS vote_max_choices integer NOT NULL DEFAULT 1;

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_type_check
  CHECK (type = ANY (ARRAY['post'::text, 'project'::text, 'link'::text, 'problem'::text, 'vote'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS posts_vote_one_per_author
  ON public.posts (category_id, lower(btrim(author)))
  WHERE type = 'vote';

CREATE TABLE IF NOT EXISTS public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  voter_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (category_id, post_id, voter_key)
);

GRANT ALL ON public.votes TO service_role;

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS votes_category_idx ON public.votes (category_id);
CREATE INDEX IF NOT EXISTS votes_category_voter_idx ON public.votes (category_id, voter_key);