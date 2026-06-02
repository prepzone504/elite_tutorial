-- ============================================================
-- ELITE TUTORIAL — Supabase Schema
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rgbiwtftjmfsuhxexdan/sql
-- ============================================================

-- ── 1. APP SETTINGS (stores API keys securely) ──────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  value      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only allow reads if the user is authenticated (admin session)
DROP POLICY IF EXISTS "Admin can read app_settings" ON public.app_settings;
CREATE POLICY "Admin can read app_settings"
  ON public.app_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insert your API keys
INSERT INTO public.app_settings (key, value)
VALUES 
  ('mistral_api_key', 'BfpkXIq0rUmYz4uf9xrcObOKb2oCh8Vs'),
  ('elevenlabs_api_key', 'sk_977bb6296ee5bb3c3311ab797006d7b4bdce186fddf36254')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ── 2. EXAM QUESTIONS (stores AI-generated questions) ────────
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_batch_id UUID NOT NULL DEFAULT gen_random_uuid(),  -- Groups all questions in 1 generation together
  exam_title    TEXT NOT NULL,
  subject       TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options       JSONB NOT NULL,       -- [{letter, text, correct}]
  difficulty    TEXT DEFAULT 'medium',
  duration_mins INT  DEFAULT 60,
  pass_mark     INT  DEFAULT 60,
  dispatched_to TEXT DEFAULT 'all',  -- 'all' or JSON array of user IDs
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add exam_batch_id to existing tables if column doesn't exist yet
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='exam_questions' AND column_name='exam_batch_id'
  ) THEN
    ALTER TABLE public.exam_questions ADD COLUMN exam_batch_id UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

-- Admins (authenticated users) can do everything
DROP POLICY IF EXISTS "Authenticated users can insert exam questions" ON public.exam_questions;
CREATE POLICY "Authenticated users can insert exam questions"
  ON public.exam_questions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read exam questions" ON public.exam_questions;
CREATE POLICY "Authenticated users can read exam questions"
  ON public.exam_questions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update exam questions" ON public.exam_questions;
CREATE POLICY "Authenticated users can update exam questions"
  ON public.exam_questions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete exam questions" ON public.exam_questions;
CREATE POLICY "Authenticated users can delete exam questions"
  ON public.exam_questions
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ── 3. USER STATS (Stores dynamic score and study hours) ──────
CREATE TABLE IF NOT EXISTS public.user_stats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  average_score INT DEFAULT 0,
  study_hours   INT DEFAULT 0,
  streak_days   INT DEFAULT 0,
  exams_taken   INT DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own stats" ON public.user_stats;
CREATE POLICY "Users can manage their own stats"
  ON public.user_stats FOR ALL USING (auth.uid() = user_id);

-- ── 4. USER ACTIVITY (Recent events for the dashboard) ────────
CREATE TABLE IF NOT EXISTS public.user_activity (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL, -- 'exam', 'flashcard', 'puzzle'
  score         TEXT,          -- e.g. '92%', '18/24', 'Cleared'
  is_good       BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own activity" ON public.user_activity;
CREATE POLICY "Users can manage their own activity"
  ON public.user_activity FOR ALL USING (auth.uid() = user_id);

-- ── 5. FLASH CARDS (Stores flashcards grouped by subject) ─────
CREATE TABLE IF NOT EXISTS public.flash_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT NOT NULL,
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  explanation   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.flash_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can read flash cards" ON public.flash_cards;
CREATE POLICY "Anyone authenticated can read flash cards"
  ON public.flash_cards FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage flash cards" ON public.flash_cards;
CREATE POLICY "Admins can manage flash cards"
  ON public.flash_cards FOR ALL USING (auth.role() = 'authenticated');

-- ── 6. LEADERBOARD (Puzzle attempts and Exam subject backfill) ─────
-- Add 'subject' column to user_exam_attempts
ALTER TABLE public.user_exam_attempts ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General';

-- Update existing records to have the correct subject from exam_questions
UPDATE public.user_exam_attempts uea SET subject = eq.subject FROM (
  SELECT exam_batch_id, subject FROM public.exam_questions GROUP BY exam_batch_id, subject
) eq WHERE uea.exam_batch_id = eq.exam_batch_id;

-- Create elite puzzle attempts table
CREATE TABLE IF NOT EXISTS public.puzzle_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name  TEXT DEFAULT 'Unknown Student',
  puzzle_id     UUID REFERENCES public.elite_puzzles(id) ON DELETE SET NULL,
  puzzle_level  INT NOT NULL,
  score         INT NOT NULL,
  answers       JSONB DEFAULT '[]'::jsonb,
  time_taken    INT DEFAULT 0,
  completed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create policies for puzzle_attempts
ALTER TABLE public.puzzle_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read puzzle attempts" ON public.puzzle_attempts;
CREATE POLICY "Users can read puzzle attempts" ON public.puzzle_attempts FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own puzzle attempts" ON public.puzzle_attempts;
CREATE POLICY "Users can insert own puzzle attempts" ON public.puzzle_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update RLS for user_exam_attempts to allow reading for leaderboard purposes
DROP POLICY IF EXISTS "Users can read own attempts" ON public.user_exam_attempts;
CREATE POLICY "Anyone authenticated can read exam attempts" ON public.user_exam_attempts FOR SELECT USING (auth.role() = 'authenticated');

-- ── 7. ELITE PUZZLES (Stores AI-generated puzzle configurations) ─────
CREATE TABLE IF NOT EXISTS public.elite_puzzles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  course_code   TEXT NOT NULL,
  time_limit    INT DEFAULT 3,
  level_label   TEXT DEFAULT 'Level 1',
  rounds        JSONB NOT NULL,       -- Array of {question, options, correctAnswer, points, penalty, difficulty}
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS and create policies for elite_puzzles
ALTER TABLE public.elite_puzzles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read elite_puzzles" ON public.elite_puzzles;
CREATE POLICY "Anyone authenticated can read elite_puzzles" ON public.elite_puzzles FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can insert elite_puzzles" ON public.elite_puzzles;
CREATE POLICY "Admins can insert elite_puzzles" ON public.elite_puzzles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
