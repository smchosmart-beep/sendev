CREATE TABLE public.record_ethics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT '',
  username_key text NOT NULL,
  s1 numeric(2,1) NOT NULL DEFAULT 0,
  s2 numeric(2,1) NOT NULL DEFAULT 0,
  s3 numeric(2,1) NOT NULL DEFAULT 0,
  s4 numeric(2,1) NOT NULL DEFAULT 0,
  s5 numeric(2,1) NOT NULL DEFAULT 0,
  s6 numeric(2,1) NOT NULL DEFAULT 0,
  s7 numeric(2,1) NOT NULL DEFAULT 0,
  extra_promise text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, username_key),
  CONSTRAINT record_ethics_scores_range CHECK (
    s1 >= 0 AND s1 <= 5 AND (s1 * 2) = floor(s1 * 2) AND
    s2 >= 0 AND s2 <= 5 AND (s2 * 2) = floor(s2 * 2) AND
    s3 >= 0 AND s3 <= 5 AND (s3 * 2) = floor(s3 * 2) AND
    s4 >= 0 AND s4 <= 5 AND (s4 * 2) = floor(s4 * 2) AND
    s5 >= 0 AND s5 <= 5 AND (s5 * 2) = floor(s5 * 2) AND
    s6 >= 0 AND s6 <= 5 AND (s6 * 2) = floor(s6 * 2) AND
    s7 >= 0 AND s7 <= 5 AND (s7 * 2) = floor(s7 * 2)
  )
);

GRANT ALL ON public.record_ethics TO service_role;

ALTER TABLE public.record_ethics ENABLE ROW LEVEL SECURITY;

CREATE INDEX record_ethics_post_id_idx ON public.record_ethics (post_id);