CREATE TABLE public.award_icon_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  icon text NOT NULL DEFAULT 'Trophy',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.award_icon_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.award_icon_rules TO authenticated;
GRANT ALL ON public.award_icon_rules TO service_role;

ALTER TABLE public.award_icon_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Award icon rules are publicly readable"
  ON public.award_icon_rules FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER update_award_icon_rules_updated_at
  BEFORE UPDATE ON public.award_icon_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();