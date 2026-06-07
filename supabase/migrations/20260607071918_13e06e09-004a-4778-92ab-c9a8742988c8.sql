CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  liker_key text NOT NULL,
  liker_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, liker_key)
);

GRANT ALL ON public.post_likes TO service_role;

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_post_likes_target ON public.post_likes (target_type, target_id);
CREATE INDEX idx_post_likes_liker ON public.post_likes (liker_key);

CREATE OR REPLACE FUNCTION public.validate_post_like_target_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.target_type NOT IN ('post', 'comment') THEN
    RAISE EXCEPTION 'invalid target_type: %', NEW.target_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_post_like_target_type
BEFORE INSERT OR UPDATE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.validate_post_like_target_type();