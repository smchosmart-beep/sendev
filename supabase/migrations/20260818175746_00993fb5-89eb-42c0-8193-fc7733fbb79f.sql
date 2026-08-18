ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_type_check CHECK (type IN ('post','project','link','problem','vote','record'));

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS enable_record boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS record_name text NOT NULL DEFAULT '활동기록';

CREATE TABLE IF NOT EXISTS public.record_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  username text NOT NULL,
  username_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, username_key),
  UNIQUE (category_id, username_key)
);
GRANT ALL ON public.record_members TO service_role;
ALTER TABLE public.record_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.record_final (
  post_id uuid PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  service_name text NOT NULL DEFAULT '',
  one_liner text NOT NULL DEFAULT '',
  target_user text NOT NULL DEFAULT '',
  problem text NOT NULL DEFAULT '',
  solution text NOT NULL DEFAULT '',
  hero_image_url text NOT NULL DEFAULT '',
  deploy_url text NOT NULL DEFAULT '',
  github_url text NOT NULL DEFAULT '',
  tech_stack text NOT NULL DEFAULT '',
  env_names text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.record_final TO service_role;
ALTER TABLE public.record_final ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_record_final_updated_at BEFORE UPDATE ON public.record_final
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.record_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  kind text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  col1 text NOT NULL DEFAULT '',
  col2 text NOT NULL DEFAULT '',
  col3 text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS record_rows_post_idx ON public.record_rows (post_id, kind, sort_order);
GRANT ALL ON public.record_rows TO service_role;
ALTER TABLE public.record_rows ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_record_rows_updated_at BEFORE UPDATE ON public.record_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_record_row_kind()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.kind NOT IN ('feature','flow','limit','plan','maker') THEN
    RAISE EXCEPTION 'invalid kind: %', NEW.kind;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_record_row_kind BEFORE INSERT OR UPDATE ON public.record_rows
  FOR EACH ROW EXECUTE FUNCTION public.validate_record_row_kind();