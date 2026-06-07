ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS recovery_question text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recovery_answer text NOT NULL DEFAULT '';