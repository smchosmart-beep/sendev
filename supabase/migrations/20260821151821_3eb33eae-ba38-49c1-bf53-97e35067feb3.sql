ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS vote_seats integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vote_round integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vote_runoff_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vote_locked_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vote_round_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS round integer NOT NULL DEFAULT 1;

UPDATE public.votes SET round = 1 WHERE round IS NULL;

ALTER TABLE public.votes
  DROP CONSTRAINT IF EXISTS votes_category_id_post_id_voter_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_per_round
  ON public.votes (category_id, post_id, voter_key, round);

CREATE INDEX IF NOT EXISTS votes_category_round_idx
  ON public.votes (category_id, round);