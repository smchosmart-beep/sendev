ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS eval_open boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eval_seed bigint NOT NULL DEFAULT 0;