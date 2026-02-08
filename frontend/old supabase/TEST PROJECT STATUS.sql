-- ============================================
-- TEST SUPABASE PROJECT STATUS
-- ============================================
-- Run this in Supabase SQL Editor to confirm project is active

-- Simple test query
SELECT 
    'Project is ACTIVE and responding! ✅' as status,
    NOW() as current_time,
    version() as postgres_version;

-- Check if profiles table exists
SELECT 
    'profiles table exists ✅' as status,
    COUNT(*) as total_profiles
FROM public.profiles;

-- Check your specific profile
SELECT 
    'Your profile exists ✅' as status,
    id,
    name,
    email
FROM public.profiles
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';
