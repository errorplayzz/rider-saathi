-- ============================================
-- NUCLEAR OPTION: Fix Everything Now
-- ============================================
-- This will fix RLS completely - just run this!

-- Step 1: Remove ALL old policies (clean slate)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Create simple, permissive policies
CREATE POLICY "enable_read_access_for_all_users" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "enable_insert_for_authenticated_users_only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_update_for_users_based_on_user_id" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Step 3: Verify your profile
SELECT 
    '✅ Profile Check' as status,
    id,
    name,
    email,
    reward_points,
    created_at
FROM public.profiles
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';

-- Step 4: Show new policies
SELECT 
    '✅ New Policies' as status,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'profiles';
