-- ============================================================
-- ELITE TUTORIAL - Add order_id to Exam Questions
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Add the order_id column to preserve question arrangement order
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS order_id INT;

-- (Optional) Update existing records to have an order_id based on their insertion order/UUID
-- For older exams without an order_id, we can safely leave it NULL 
-- because the query has a fallback: .order('created_at', { ascending: true })
