ALTER TABLE public.categories
  ADD COLUMN enable_notice boolean NOT NULL DEFAULT true,
  ADD COLUMN enable_question boolean NOT NULL DEFAULT true,
  ADD COLUMN enable_general boolean NOT NULL DEFAULT true,
  ADD COLUMN enable_project boolean NOT NULL DEFAULT true,
  ADD COLUMN general_name text NOT NULL DEFAULT '일반게시판';

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_type_check CHECK (type = ANY (ARRAY['notice'::text, 'project'::text, 'question'::text, 'general'::text]));