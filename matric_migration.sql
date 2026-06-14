-- ============================================================
-- ELITE TUTORIAL — Matric Number Migration
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure the profiles table exists and has necessary columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  real_name TEXT,
  matric_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if the table already existed without them
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='real_name') THEN
    ALTER TABLE public.profiles ADD COLUMN real_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='matric_number') THEN
    ALTER TABLE public.profiles ADD COLUMN matric_number TEXT UNIQUE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- 2. Create Sequence for Matric Numbers
CREATE SEQUENCE IF NOT EXISTS public.matric_seq START 1;


-- 3. Create RPC Function to assign a matric number safely
-- This function gets the next sequence value, formats it as ELITE/26/####
-- and updates the authenticated user's profile.
CREATE OR REPLACE FUNCTION public.assign_matric_number(p_real_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_next_val INT;
  v_matric TEXT;
  v_existing_matric TEXT;
BEGIN
  -- Get the ID of the authenticated user making the request
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if the user already has a matric number
  SELECT matric_number INTO v_existing_matric FROM public.profiles WHERE id = v_user_id;
  
  IF v_existing_matric IS NOT NULL THEN
    -- If they already have one, return the existing one, update real_name just in case
    UPDATE public.profiles SET real_name = p_real_name WHERE id = v_user_id;
    RETURN v_existing_matric;
  END IF;

  -- Generate the new matric number
  v_next_val := nextval('public.matric_seq');
  v_matric := 'ELITE/26/' || LPAD(v_next_val::TEXT, 4, '0');

  -- Update the profile
  -- Upsert in case the profile row doesn't exist yet
  INSERT INTO public.profiles (id, real_name, matric_number)
  VALUES (v_user_id, p_real_name, v_matric)
  ON CONFLICT (id) DO UPDATE SET 
    real_name = EXCLUDED.real_name,
    matric_number = EXCLUDED.matric_number;

  RETURN v_matric;
END;
$$;
