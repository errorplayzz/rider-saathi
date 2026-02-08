-- ============================================
-- SUPER SIMPLE FIX - Just Run This! ⚡
-- ============================================
-- This will create your profile immediately
-- Just run this entire file in Supabase SQL Editor

-- Create your profile (with your actual user ID already filled in)
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
SELECT 
    '6a70505d-e16d-47e4-a2b2-ebb2a0254e75'::uuid,
    email,
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Rider'),
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
FROM auth.users
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75'::uuid
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

-- Check it worked
SELECT 
    '✅ SUCCESS!' as status,
    name,
    email,
    reward_points,
    total_rides,
    created_at
FROM public.profiles 
WHERE id = '6a70505d-e16d-47e4-a2b2-ebb2a0254e75';
