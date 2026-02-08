-- ============================================
-- CHECK API & RLS STATUS
-- ============================================

-- Check if RLS is really disabled
SELECT 
    'RLS Status Check' as test,
    tablename,
    rowsecurity as "RLS Enabled?"
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check current policies (should be none if truly disabled)
SELECT 
    'Current Policies' as test,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'profiles';

-- List any remaining policies
SELECT 
    'Policy Details' as test,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'profiles';
