ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_post_view(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION public.increment_post_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_view(uuid) TO service_role;