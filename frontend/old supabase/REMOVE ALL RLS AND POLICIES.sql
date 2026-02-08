-- ============================================
-- COMPLETELY REMOVE ALL RLS AND POLICIES
-- ============================================

-- Step 1: Drop ALL policies one by one
DROP POLICY IF EXISTS "enable_read_access_for_all_users" ON public.profiles;
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users_only" ON public.profiles;
DROP POLICY IF EXISTS "enable_update_for_users_based_on_user_id" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Step 2: Disable RLS completely
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify EVERYTHING is clean
SELECT 
    '✅ RLS Status' as check_type,
    tablename,
    rowsecurity as "RLS Enabled?"
FROM pg_tables 
WHERE tablename = 'profiles';

SELECT 
    '✅ Remaining Policies' as check_type,
    COUNT(*) as "Should be ZERO"
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 4: Test profile access
SELECT 
    '✅ Profile Access Test' as check_type,
    id,
    name,
    email
FROM public.profiles
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';
