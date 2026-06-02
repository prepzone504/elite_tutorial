-- 1. Add 'subject' column to user_exam_attempts
ALTER TABLE public.user_exam_attempts
ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General';

-- Update existing records to have the correct subject from exam_questions
UPDATE public.user_exam_attempts uea
SET subject = eq.subject
FROM (
  SELECT exam_batch_id, subject FROM public.exam_questions
  GROUP BY exam_batch_id, subject
) eq
WHERE uea.exam_batch_id = eq.exam_batch_id;

-- 2. Create elite puzzle attempts table
CREATE TABLE IF NOT EXISTS public.puzzle_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name  TEXT DEFAULT 'Unknown Student',
  puzzle_id     UUID REFERENCES public.elite_puzzles(id) ON DELETE SET NULL,
  puzzle_level  INT NOT NULL,
  score         INT NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add puzzle_id column if it doesn't exist (for existing tables)
ALTER TABLE public.puzzle_attempts ADD COLUMN IF NOT EXISTS puzzle_id UUID REFERENCES public.elite_puzzles(id) ON DELETE SET NULL;

-- Enable RLS and create policies for puzzle_attempts
ALTER TABLE public.puzzle_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read puzzle attempts" ON public.puzzle_attempts;
CREATE POLICY "Users can read puzzle attempts" 
ON public.puzzle_attempts FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own puzzle attempts" ON public.puzzle_attempts;
CREATE POLICY "Users can insert own puzzle attempts" 
ON public.puzzle_attempts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add answers and time_taken columns for answer review
ALTER TABLE public.puzzle_attempts ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.puzzle_attempts ADD COLUMN IF NOT EXISTS time_taken INT DEFAULT 0;

-- 3. Update RLS for user_exam_attempts to allow reading for leaderboard purposes
-- We previously had "Users can read own attempts". We will drop it and add a new one.
DROP POLICY IF EXISTS "Users can read own attempts" ON public.user_exam_attempts;
CREATE POLICY "Anyone authenticated can read exam attempts" 
ON public.user_exam_attempts FOR SELECT 
USING (auth.role() = 'authenticated');
