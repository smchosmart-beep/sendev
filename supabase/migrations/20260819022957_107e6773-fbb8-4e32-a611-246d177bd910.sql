CREATE OR REPLACE FUNCTION public.validate_record_row_kind()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.kind NOT IN ('feature','flow','limit','plan','maker','process','devlog','check') THEN
    RAISE EXCEPTION 'invalid kind: %', NEW.kind;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE UNIQUE INDEX IF NOT EXISTS record_rows_check_unique
  ON public.record_rows (post_id, sort_order)
  WHERE kind = 'check';

CREATE TABLE IF NOT EXISTS public.record_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  username text NOT NULL,
  username_key text NOT NULL,
  content text NOT NULL DEFAULT '',
  promise text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, username_key)
);

GRANT ALL ON public.record_reflections TO service_role;
ALTER TABLE public.record_reflections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_record_reflections_updated_at
BEFORE UPDATE ON public.record_reflections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();