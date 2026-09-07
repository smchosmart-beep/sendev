ALTER TABLE public.record_growth
  ADD COLUMN github_url text NOT NULL DEFAULT '',
  ADD COLUMN review jsonb NOT NULL DEFAULT '{}';

CREATE TABLE public.record_growth_peer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  from_post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  from_name text NOT NULL DEFAULT '',
  expected text NOT NULL DEFAULT '',
  actual text NOT NULL DEFAULT '',
  receiver_type text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.record_growth TO service_role;
GRANT ALL ON public.record_growth_peer_feedback TO service_role;

ALTER TABLE public.record_growth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_growth_peer_feedback ENABLE ROW LEVEL SECURITY;