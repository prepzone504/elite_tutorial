-- ========================================================
-- FLASH CARD REVIEWS: Track which decks a user has studied
-- Run this in your Supabase SQL Editor
-- ========================================================

-- 1. Create flash_card_reviews table
CREATE TABLE IF NOT EXISTS public.flash_card_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_name     TEXT NOT NULL,
  got_it_count  INT DEFAULT 0,
  hard_count    INT DEFAULT 0,
  reviewed_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, deck_name)
);

-- 2. Enable RLS
ALTER TABLE public.flash_card_reviews ENABLE ROW LEVEL SECURITY;

-- 3. Allow authenticated users to read their own reviews
DROP POLICY IF EXISTS "Users can read own flash reviews" ON public.flash_card_reviews;
CREATE POLICY "Users can read own flash reviews"
  ON public.flash_card_reviews FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Allow authenticated users to insert their own reviews
DROP POLICY IF EXISTS "Users can insert own flash reviews" ON public.flash_card_reviews;
CREATE POLICY "Users can insert own flash reviews"
  ON public.flash_card_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Allow users to update their own review records (e.g., restudy updates stats)
DROP POLICY IF EXISTS "Users can update own flash reviews" ON public.flash_card_reviews;
CREATE POLICY "Users can update own flash reviews"
  ON public.flash_card_reviews FOR UPDATE
  USING (auth.uid() = user_id);
