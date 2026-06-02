-- Add student_name and exam_title to user_exam_attempts to make admin dashboard rendering easy

ALTER TABLE public.user_exam_attempts
ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT 'Unknown Student',
ADD COLUMN IF NOT EXISTS exam_title TEXT DEFAULT 'Unknown Exam';
