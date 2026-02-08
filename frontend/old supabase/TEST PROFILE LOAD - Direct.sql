-- ============================================
-- DIRECT PROFILE TEST - Same as Frontend
-- ============================================

-- Test 1: Exactly what frontend queries
SELECT 
    '🔍 Frontend Query Test' as test_type,
    *
FROM public.profiles 
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';

-- Test 2: Check if profile exists
SELECT 
    '📊 Profile Count' as test_type,
    COUNT(*) as profile_count,
    BOOL_OR(id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75') as target_user_exists
FROM public.profiles;

-- Test 3: Check table permissions
SELECT 
    '🔐 Table Permissions' as test_type,
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles' 
AND table_schema = 'public';

-- Test 4: Check if RLS is interfering
SELECT 
    '🛡️ RLS Status' as test_type,
    tablename,
    rowsecurity as rls_enabled,
    hasrules as has_rules
FROM pg_tables 
WHERE tablename = 'profiles';

-- Test 5: Force raw query without filters
SELECT 
    '🎯 Raw Data Test' as test_type,
    COUNT(*) as total_profiles
FROM public.profiles;