CREATE TABLE public.review_allowlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (category_id, reviewer_key)
);

GRANT ALL ON public.review_allowlist TO service_role;

ALTER TABLE public.review_allowlist ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories
  ADD COLUMN review_allowlist_only boolean NOT NULL DEFAULT false;