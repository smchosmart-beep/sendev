ALTER TABLE public.record_final
  ADD COLUMN IF NOT EXISTS problem_area text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS output_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS consent text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deploy_status text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS usage_env text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS usage_condition text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS demo_video_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_screen text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_server text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_ai text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_storage text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_deploy text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dir_structure text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS install_cmd text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS run_cmd text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_scope text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS change_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS change_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS privacy_status text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_expected text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_mitigation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_stop text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_test text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS license_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS license_docs text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS license_external text NOT NULL DEFAULT '';

ALTER TABLE public.record_rows
  ADD COLUMN IF NOT EXISTS col4 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS col5 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS col6 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtype text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS author text NOT NULL DEFAULT '';

ALTER TABLE public.record_members
  ADD COLUMN IF NOT EXISTS affiliation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '';

ALTER TABLE public.record_reflections
  ADD COLUMN IF NOT EXISTS affiliation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS q1 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS q2 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS promises text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS promise_detail text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS spread_plan text NOT NULL DEFAULT '';

DROP INDEX IF EXISTS public.record_rows_check_unique;

DELETE FROM public.record_rows WHERE kind = 'check';

CREATE UNIQUE INDEX IF NOT EXISTS record_rows_stance_unique
  ON public.record_rows (post_id, sort_order)
  WHERE kind = 'stance';

CREATE OR REPLACE FUNCTION public.validate_record_row_kind()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.kind NOT IN ('feature','flow','limit','plan','maker','process','devlog','decision','stuck','stance','ai_use','ai_error','privacy') THEN
    RAISE EXCEPTION 'invalid kind: %', NEW.kind;
  END IF;
  RETURN NEW;
END;
$function$;