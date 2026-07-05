ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS enable_problem boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS problem_name text NOT NULL DEFAULT '문제ZIP';

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS problem_area text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS problem_frequency text NOT NULL DEFAULT '';

INSERT INTO public.site_settings (key, value)
VALUES
  ('problem_areas', '["💊보건/건강","📝행정/공문","👩‍🏫수업/평가","💬학부모소통","🏃‍♂️학교행사"]'),
  ('problem_frequencies', '["숨 쉴 때마다 (매일)","잊을 만하면 (주 1~2회)","시즌 한정 (학기초/말)"]')
ON CONFLICT (key) DO NOTHING;