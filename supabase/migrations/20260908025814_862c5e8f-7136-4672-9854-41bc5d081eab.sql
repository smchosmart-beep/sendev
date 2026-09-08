CREATE TABLE public.record_growth_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  number integer NOT NULL,
  area text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, number)
);
GRANT ALL ON public.record_growth_group TO service_role;
ALTER TABLE public.record_growth_group ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.record_growth_group_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.record_growth_group(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.record_growth_group_member TO service_role;
ALTER TABLE public.record_growth_group_member ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.record_growth_evaluation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  from_post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  problem smallint NOT NULL DEFAULT 0,
  effect smallint NOT NULL DEFAULT 0,
  accuracy smallint NOT NULL DEFAULT 0,
  not_visited boolean NOT NULL DEFAULT false,
  takeaway text NOT NULL DEFAULT '',
  submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, from_post_id)
);
GRANT ALL ON public.record_growth_evaluation TO service_role;
ALTER TABLE public.record_growth_evaluation ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.record_growth_quote_pick (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  evaluation_id uuid NOT NULL REFERENCES public.record_growth_evaluation(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, evaluation_id)
);
GRANT ALL ON public.record_growth_quote_pick TO service_role;
ALTER TABLE public.record_growth_quote_pick ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.record_growth_stage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  order_no integer NOT NULL DEFAULT 1,
  area text NOT NULL DEFAULT '',
  aggregated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, post_id)
);
GRANT ALL ON public.record_growth_stage TO service_role;
ALTER TABLE public.record_growth_stage ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.record_growth_stage_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.record_growth_stage(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.record_growth_stage_comment TO service_role;
ALTER TABLE public.record_growth_stage_comment ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.record_growth_heart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.record_growth_stage(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stage_id, voter_key)
);
GRANT ALL ON public.record_growth_heart TO service_role;
ALTER TABLE public.record_growth_heart ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_record_growth_group_updated_at
  BEFORE UPDATE ON public.record_growth_group
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_record_growth_evaluation_updated_at
  BEFORE UPDATE ON public.record_growth_evaluation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS gallery_open boolean NOT NULL DEFAULT false;