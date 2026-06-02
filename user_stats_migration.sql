-- 1. Create user_stats table to track overall student progress
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exams_taken   INT DEFAULT 0,
  average_score NUMERIC DEFAULT 0,
  study_time_h  NUMERIC DEFAULT 0,
  streak_days   INT DEFAULT 0,
  last_active   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create policies for user_stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own stats" ON public.user_stats;
CREATE POLICY "Users can read own stats" 
ON public.user_stats FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
CREATE POLICY "Users can update own stats" 
ON public.user_stats FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_stats;
CREATE POLICY "Users can insert own stats" 
ON public.user_stats FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Create user_exam_attempts table to track which exams the user has already taken
CREATE TABLE IF NOT EXISTS public.user_exam_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_batch_id UUID NOT NULL,
  score         INT NOT NULL,
  total_q       INT NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exam_batch_id) -- Ensures a user can only take an exam once!
);

-- Enable RLS and create policies for user_exam_attempts
ALTER TABLE public.user_exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own attempts" ON public.user_exam_attempts;
CREATE POLICY "Users can read own attempts" 
ON public.user_exam_attempts FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own attempts" ON public.user_exam_attempts;
CREATE POLICY "Users can insert own attempts" 
ON public.user_exam_attempts FOR INSERT 
WITH CHECK (auth.uid() = user_id);
