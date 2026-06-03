ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.categories c
SET slug = 'b' || sub.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY sort_order, created_at) AS rn
  FROM public.categories
) sub
WHERE c.id = sub.id AND (c.slug IS NULL OR c.slug = '');

ALTER TABLE public.categories ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON public.categories (slug);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_no integer;

UPDATE public.posts p
SET post_no = sub.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY category_id ORDER BY created_at, id) AS rn
  FROM public.posts
) sub
WHERE p.id = sub.id AND p.post_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_category_no_key ON public.posts (category_id, post_no);