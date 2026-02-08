-- ============================================
-- FIX RLS BLOCKING ISSUE
-- ============================================
-- Your profile exists but RLS is blocking queries
-- Run this to fix the policies

-- Step 1: Check current policies
SELECT 
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 2: Fix SELECT policy (make it truly permissive)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "allow_select_all_profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Step 3: Fix INSERT policy (for new users)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

CREATE POLICY "allow_insert_own_profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Step 4: Fix UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "allow_update_own_profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Step 5: Fix your profile name (change "error" to actual name)
UPDATE public.profiles
SET 
    name = COALESCE(
        (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75'),
        split_part(email, '@', 1),
        'Rider'
    ),
    updated_at = NOW()
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';

-- Step 6: Verify everything is fixed
SELECT 
    '✅ RLS Policies Fixed!' as status,
    id,
    name,
    email,
    reward_points,
    created_at
FROM public.profiles 
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';

-- Step 7: Show new policies
SELECT 
    policyname,
    cmd as operation,
    'FIXED ✅' as status
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;
