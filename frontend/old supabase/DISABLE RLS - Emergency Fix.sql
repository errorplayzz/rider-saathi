-- ============================================
-- SIMPLEST FIX EVER - Just Disable RLS
-- ============================================
-- If nothing else works, temporarily disable RLS to test

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Check it worked
SELECT 
    '✅ RLS Disabled' as status,
    tablename,
    rowsecurity as "RLS Still Enabled?"
FROM pg_tables 
WHERE tablename = 'profiles';

-- Verify your profile is accessible
SELECT 
    '✅ Your Profile' as status,
    id,
    name,
    email,
    reward_points
FROM public.profiles
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';
