-- ============================================
-- SIMPLE TEST: Check RLS Issue
-- ============================================

-- Test 1: Can you see your profile? (This should work in SQL Editor)
SELECT 
    'Test 1: Direct Query' as test,
    id, 
    name, 
    email 
FROM public.profiles 
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';

-- Test 2: What RLS policies exist?
SELECT 
    'Test 2: RLS Policies' as test,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test 3: Is RLS even enabled?
SELECT 
    'Test 3: RLS Status' as test,
    tablename,
    rowsecurity as "RLS Enabled?"
FROM pg_tables 
WHERE tablename = 'profiles';
