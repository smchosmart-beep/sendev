ALTER TABLE public.posts DROP CONSTRAINT posts_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_type_check CHECK (type = ANY (ARRAY['notice'::text, 'project'::text, 'question'::text]));