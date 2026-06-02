-- Run this in Supabase SQL Editor to add the explanation column
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
