ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS tab_group text NOT NULL DEFAULT 'hackathon';

CREATE OR REPLACE FUNCTION public.validate_category_tab_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tab_group NOT IN ('hackathon', 'resources', 'devground', 'helloworld') THEN
    RAISE EXCEPTION 'invalid tab_group: %', NEW.tab_group;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_category_tab_group_trigger ON public.categories;
CREATE TRIGGER validate_category_tab_group_trigger
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.validate_category_tab_group();

UPDATE public.categories SET tab_group = 'hackathon'
  WHERE slug IN ('b1', 'b2', 'b3');
UPDATE public.categories SET tab_group = 'devground'
  WHERE slug = 'tester';