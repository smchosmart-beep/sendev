CREATE TABLE public.post_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username_key text NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (username_key, post_id)
);

GRANT ALL ON public.post_reads TO service_role;

ALTER TABLE public.post_reads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_post_reads_username_key ON public.post_reads (username_key);