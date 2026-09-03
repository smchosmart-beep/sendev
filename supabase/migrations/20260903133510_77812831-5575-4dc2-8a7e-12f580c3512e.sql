ALTER TABLE public.categories
  ADD COLUMN record_kind text NOT NULL DEFAULT 'challenge';

CREATE TABLE public.record_growth (
  post_id uuid PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  project_name text NOT NULL DEFAULT '',
  one_line text NOT NULL DEFAULT '',
  primary_user text NOT NULL DEFAULT '',
  problem_area text NOT NULL DEFAULT '',
  result_type text NOT NULL DEFAULT '',
  problem_text text NOT NULL DEFAULT '',
  evidence text NOT NULL DEFAULT '',
  solution text NOT NULL DEFAULT '',
  expected_change text NOT NULL DEFAULT '',
  result_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  tools text NOT NULL DEFAULT '',
  features text[] NOT NULL DEFAULT '{}',
  flow text[] NOT NULL DEFAULT '{}',
  hero_image_url text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT '',
  resolution text NOT NULL DEFAULT '',
  ai_work text NOT NULL DEFAULT '',
  human_check text NOT NULL DEFAULT '',
  privacy text NOT NULL DEFAULT '',
  education_check text NOT NULL DEFAULT '',
  ethics text[] NOT NULL DEFAULT '{}',
  promise text NOT NULL DEFAULT '',
  learned text NOT NULL DEFAULT '',
  next_plan text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.record_growth TO service_role;

ALTER TABLE public.record_growth ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_record_growth_updated_at
  BEFORE UPDATE ON public.record_growth
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();