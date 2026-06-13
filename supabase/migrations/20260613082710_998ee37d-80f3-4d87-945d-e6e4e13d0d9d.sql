CREATE TABLE public.hackathon_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname text NOT NULL,
  participant_type text NOT NULL,
  content text NOT NULL,
  color text NOT NULL DEFAULT 'yellow',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hackathon_reviews TO anon;
GRANT SELECT ON public.hackathon_reviews TO authenticated;
GRANT ALL ON public.hackathon_reviews TO service_role;

ALTER TABLE public.hackathon_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hackathon reviews"
ON public.hackathon_reviews
FOR SELECT
USING (true);

CREATE TRIGGER update_hackathon_reviews_updated_at
BEFORE UPDATE ON public.hackathon_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_posts_author_category ON public.posts (author, category_id);