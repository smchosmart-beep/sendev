DELETE FROM public.reviews
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY post_id, reviewer_name ORDER BY created_at DESC) AS rn
    FROM public.reviews
    WHERE reviewer_name IS NOT NULL AND trim(reviewer_name) <> ''
  ) t WHERE t.rn > 1
);

DELETE FROM public.reviews
WHERE reviewer_name IS NULL OR trim(reviewer_name) = '';

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_post_reviewer_unique UNIQUE (post_id, reviewer_name);