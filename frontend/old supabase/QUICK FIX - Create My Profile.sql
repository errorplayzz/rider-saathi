-- ============================================
-- QUICK FIX: Create Profile for Current User
-- ============================================
-- Run this in Supabase SQL Editor to quickly create your profile

-- ⚠️ IMPORTANT: Replace the user_id with YOUR user ID
-- Find it in: Authentication → Users → Your email → Copy UUID

DO $$
DECLARE
    user_id UUID := '6a70505d-e16d-47e4-a2b2-ebb2a0254e75'; -- 👈 REPLACE WITH YOUR USER ID
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Get user details from auth.users
    SELECT 
        email,
        COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Rider')
    INTO user_email, user_name
    FROM auth.users
    WHERE id = user_id;

    -- Create or update profile
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

    RAISE NOTICE '✅ Profile created/updated for: %', user_email;
END $$;

-- Verify it worked
SELECT 
    id,
    name,
    email,
    reward_points,
    created_at,
    '✅ Profile exists!' as status
FROM public.profiles 
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75'; -- 👈 REPLACE WITH YOUR USER ID
