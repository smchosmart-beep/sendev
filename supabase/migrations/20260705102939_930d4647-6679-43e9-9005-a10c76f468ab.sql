ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_type_check
  CHECK (type = ANY (ARRAY['post'::text, 'project'::text, 'link'::text, 'problem'::text]));