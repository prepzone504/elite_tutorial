-- Add missing columns to puzzle_attempts for answer review and time tracking
ALTER TABLE public.puzzle_attempts ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.puzzle_attempts ADD COLUMN IF NOT EXISTS time_taken INT DEFAULT 0;
