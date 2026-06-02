-- Allow the admin dashboard to read data (Since admin login is handled locally via JS, they query as 'anon')
-- IMPORTANT: This allows public read access. In a real production app, the admin should use Supabase Auth.
DROP POLICY IF EXISTS "Allow anon read stats for admin" ON public.user_stats;
CREATE POLICY "Allow anon read stats for admin" ON public.user_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read questions for admin" ON public.exam_questions;
CREATE POLICY "Allow anon read questions for admin" ON public.exam_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read attempts for admin" ON public.user_exam_attempts;
CREATE POLICY "Allow anon read attempts for admin" ON public.user_exam_attempts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read flashcards for admin" ON public.flash_cards;
CREATE POLICY "Allow anon read flashcards for admin" ON public.flash_cards FOR SELECT USING (true);
