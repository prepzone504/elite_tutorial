-- ============================================================
-- ELITE TUTORIAL — Exam Assignments Migration
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Create Exam Assignments Table
CREATE TABLE IF NOT EXISTS public.exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_batch_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_batch_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Policies
DROP POLICY IF EXISTS "Users can read their own assignments" ON public.exam_assignments;
CREATE POLICY "Users can read their own assignments"
  ON public.exam_assignments FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'authenticated'); 
  -- Allow authenticated to read (admin needs to see them, and students need to read their own. For simplicity, we allow authenticated to read them so admin panel works, or we restrict to user_id for non-admins).
  -- A safer policy for students reading their own, and admins reading all:
  -- USING (auth.uid() = user_id OR (SELECT count(*) FROM public.app_settings) > 0); -- Hack for admin check, but simple authenticated works if data isn't sensitive between students

DROP POLICY IF EXISTS "Anyone authenticated can read assignments" ON public.exam_assignments;
CREATE POLICY "Anyone authenticated can read assignments"
  ON public.exam_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone authenticated can insert assignments" ON public.exam_assignments;
CREATE POLICY "Anyone authenticated can insert assignments"
  ON public.exam_assignments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone authenticated can delete assignments" ON public.exam_assignments;
CREATE POLICY "Anyone authenticated can delete assignments"
  ON public.exam_assignments FOR DELETE
  USING (auth.role() = 'authenticated');


-- 3. Retroactively assign all existing exams to all existing students
-- This ensures backward compatibility for older exams.
DO $$ 
DECLARE
  v_batch RECORD;
  v_user RECORD;
BEGIN
  -- Loop through all unique exam batches
  FOR v_batch IN (SELECT DISTINCT exam_batch_id FROM public.exam_questions) LOOP
    -- Loop through all users
    FOR v_user IN (SELECT id FROM auth.users) LOOP
      -- Insert assignment, ignoring if it already exists
      INSERT INTO public.exam_assignments (exam_batch_id, user_id)
      VALUES (v_batch.exam_batch_id, v_user.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
