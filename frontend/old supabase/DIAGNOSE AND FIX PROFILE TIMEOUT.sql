-- ============================================
-- DIAGNOSE AND FIX PROFILE LOADING TIMEOUT
-- ============================================
-- Run this in your Supabase SQL Editor to fix the profile timeout issue

-- ============================================
-- STEP 1: DIAGNOSTIC - Check Current State
-- ============================================

-- Check if profiles table exists and has RLS enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check all RLS policies on profiles table
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check if your user has a profile
-- 👇 Replace with YOUR user ID
SELECT 
    id,
    name,
    email,
    is_online,
    reward_points,
    created_at
FROM public.profiles 
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';

-- Check if handle_new_user trigger exists
SELECT 
    tgname as "Trigger Name",
    tgenabled as "Enabled (O=yes)"
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- ============================================
-- STEP 2: FIX - Add Missing INSERT Policy (If Needed)
-- ============================================

-- Drop old policy if exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Create INSERT policy
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid()::uuid = id);

-- ============================================
-- STEP 3: FIX - Ensure SELECT Policy is Permissive
-- ============================================

-- Drop old SELECT policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

-- Create permissive SELECT policy
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

-- ============================================
-- STEP 4: FIX - Ensure UPDATE Policy Exists
-- ============================================

-- Drop old UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create UPDATE policy
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid()::uuid = id);

-- ============================================
-- STEP 5: CREATE PROFILE FOR CURRENT USER (If Missing)
-- ============================================

-- ⚠️ IMPORTANT: Replace the user_id below with YOUR user ID
-- You can find it in: Authentication → Users → Your email → Copy UUID
-- Or use the ID from your error logs

DO $$
DECLARE
    user_id UUID := '6a70505d-e16d-47e4-a2b2-ebb2a0254e75'; -- 👈 YOUR USER ID HERE
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Get user details from auth.users
    SELECT 
        email,
        COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
    INTO user_email, user_name
    FROM auth.users
    WHERE id = user_id;

    -- Insert profile if it doesn't exist
    INSERT INTO public.profiles (
        id, 
        email, 
        name,
        is_online,
        reward_points,
        total_rides,
        help_count,
        preferences,
        created_at,
        updated_at
    )
    VALUES (
        user_id,
        user_email,
        user_name,
        false,
        0,
        0,
        0,
        '{
            "shareLocation": true,
            "emergencyAlerts": true,
            "voiceAssistant": true,
            "notifications": true,
            "groupInvites": true,
            "rideRequests": true,
            "twoFactorEnabled": false
        }'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = NOW();

    RAISE NOTICE 'Profile created/updated for user: %', user_email;
END $$;

-- ============================================
-- STEP 6: VERIFY - Check Profile Was Created
-- ============================================

SELECT 
    id,
    name,
    email,
    is_online,
    reward_points,
    total_rides,
    created_at,
    '✅ Profile exists!' as status
FROM public.profiles 
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75'; -- 👈 YOUR USER ID HERE

-- ============================================
-- STEP 7: TEST - Verify Policies Work
-- ============================================

-- This should return policies for profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If you see your profile in STEP 6, the fix worked!
-- Now refresh your browser and the timeout should be gone.
