-- ============================================
-- SETUP ACHIEVEMENTS SYSTEM
-- ============================================
-- This file creates the achievement definitions and helper functions

-- First, ensure the achievements table exists with proper structure
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    achievement_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    
    category TEXT NOT NULL CHECK (category IN ('safety', 'community', 'riding', 'environmental', 'social')),
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    
    -- Progress tracking
    progress_current INTEGER DEFAULT 0,
    progress_target INTEGER NOT NULL,
    progress_unit TEXT,
    
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    reward_points INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS achievements_is_completed_idx ON public.achievements(is_completed);
CREATE INDEX IF NOT EXISTS achievements_category_tier_idx ON public.achievements(category, tier);

-- ============================================
-- ACHIEVEMENT DEFINITIONS TABLE
-- Stores the master list of all possible achievements
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🏆',
    
    category TEXT NOT NULL CHECK (category IN ('safety', 'community', 'riding', 'environmental', 'social')),
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    
    target_count INTEGER NOT NULL,
    target_unit TEXT,
    reward_points INTEGER DEFAULT 0,
    
    -- Ordering and display
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on achievement_definitions
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read achievement definitions
DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON public.achievement_definitions;
CREATE POLICY "Anyone can view achievement definitions" ON public.achievement_definitions
    FOR SELECT USING (is_active = true);

-- ============================================
-- SEED ACHIEVEMENT DEFINITIONS
-- ============================================
INSERT INTO public.achievement_definitions (id, name, description, icon, category, tier, target_count, target_unit, reward_points, sort_order) VALUES
    -- Safety Achievements
    ('first_responder', 'First Responder', 'Respond to your first emergency alert', '🚨', 'safety', 'bronze', 1, 'responses', 25, 1),
    ('safety_guardian', 'Safety Guardian', 'Respond to 5 emergency alerts', '🛡️', 'safety', 'silver', 5, 'responses', 75, 2),
    ('hero_responder', 'Hero Responder', 'Respond to 10 emergency alerts', '🦸', 'safety', 'gold', 10, 'responses', 150, 3),
    ('emergency_legend', 'Emergency Legend', 'Respond to 25 emergency alerts', '⭐', 'safety', 'platinum', 25, 'responses', 300, 4),
    
    -- Community Achievements
    ('helping_hand', 'Helping Hand', 'Help 3 fellow riders', '🤝', 'community', 'bronze', 3, 'helps', 30, 10),
    ('community_helper', 'Community Helper', 'Help 10 fellow riders', '🫱', 'community', 'silver', 10, 'helps', 100, 11),
    ('community_champion', 'Community Champion', 'Help 25 fellow riders', '👑', 'community', 'gold', 25, 'helps', 200, 12),
    ('community_legend', 'Community Legend', 'Help 50 fellow riders', '💎', 'community', 'platinum', 50, 'helps', 400, 13),
    
    -- Riding Achievements
    ('rookie_rider', 'Rookie Rider', 'Complete your first ride', '🏍️', 'riding', 'bronze', 1, 'rides', 20, 20),
    ('seasoned_rider', 'Seasoned Rider', 'Complete 10 rides', '🏁', 'riding', 'silver', 10, 'rides', 60, 21),
    ('expert_rider', 'Expert Rider', 'Complete 50 rides', '🎖️', 'riding', 'gold', 50, 'rides', 200, 22),
    ('road_warrior', 'Road Warrior', 'Complete 100 rides', '👾', 'riding', 'platinum', 100, 'rides', 500, 23),
    ('kilometer_king', 'Kilometer King', 'Travel 100km total distance', '📏', 'riding', 'silver', 100, 'km', 80, 24),
    ('distance_master', 'Distance Master', 'Travel 500km total distance', '🗺️', 'riding', 'gold', 500, 'km', 250, 25),
    ('marathon_rider', 'Marathon Rider', 'Travel 1000km total distance', '🌍', 'riding', 'platinum', 1000, 'km', 600, 26),
    
    -- Environmental Achievements
    ('eco_starter', 'Eco Starter', 'Practice eco-friendly riding 5 times', '🌱', 'environmental', 'bronze', 5, 'eco_rides', 40, 30),
    ('eco_warrior', 'Eco Warrior', 'Practice eco-friendly riding 20 times', '🌳', 'environmental', 'silver', 20, 'eco_rides', 120, 31),
    ('green_champion', 'Green Champion', 'Practice eco-friendly riding 50 times', '♻️', 'environmental', 'gold', 50, 'eco_rides', 300, 32),
    
    -- Social Achievements
    ('social_butterfly', 'Social Butterfly', 'Join 5 group rides', '🦋', 'social', 'bronze', 5, 'group_rides', 35, 40),
    ('group_leader', 'Group Leader', 'Lead 3 group rides', '👨‍✈️', 'social', 'silver', 3, 'led_rides', 90, 41),
    ('ride_organizer', 'Ride Organizer', 'Lead 10 group rides', '📢', 'social', 'gold', 10, 'led_rides', 250, 42),
    ('chat_active', 'Chat Active', 'Send 50 chat messages', '💬', 'social', 'bronze', 50, 'messages', 25, 43),
    ('route_sharer', 'Route Sharer', 'Share 5 useful routes', '🗺️', 'social', 'silver', 5, 'routes', 75, 44)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    tier = EXCLUDED.tier,
    target_count = EXCLUDED.target_count,
    target_unit = EXCLUDED.target_unit,
    reward_points = EXCLUDED.reward_points,
    sort_order = EXCLUDED.sort_order;

-- ============================================
-- FUNCTION TO INITIALIZE USER ACHIEVEMENTS
-- Call this when a new user is created
-- ============================================
CREATE OR REPLACE FUNCTION initialize_user_achievements(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Insert all active achievement definitions for the user
    INSERT INTO public.achievements (
        user_id,
        achievement_id,
        name,
        description,
        icon,
        category,
        tier,
        progress_current,
        progress_target,
        progress_unit,
        reward_points
    )
    SELECT
        p_user_id,
        ad.id,
        ad.name,
        ad.description,
        ad.icon,
        ad.category,
        ad.tier,
        0, -- progress_current starts at 0
        ad.target_count,
        ad.target_unit,
        ad.reward_points
    FROM public.achievement_definitions ad
    WHERE ad.is_active = true
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION TO UPDATE ACHIEVEMENT PROGRESS
-- ============================================
CREATE OR REPLACE FUNCTION update_achievement_progress(
    p_user_id UUID,
    p_achievement_id TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_achievement_record RECORD;
    v_newly_completed BOOLEAN := FALSE;
BEGIN
    -- Get the achievement record
    SELECT * INTO v_achievement_record
    FROM public.achievements
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
    
    -- If achievement doesn't exist for user, initialize it first
    IF NOT FOUND THEN
        PERFORM initialize_user_achievements(p_user_id);
        
        -- Try again
        SELECT * INTO v_achievement_record
        FROM public.achievements
        WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
        
        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Don't update if already completed
    IF v_achievement_record.is_completed THEN
        RETURN FALSE;
    END IF;
    
    -- Update progress
    UPDATE public.achievements
    SET 
        progress_current = LEAST(progress_current + p_increment, progress_target),
        is_completed = (progress_current + p_increment >= progress_target),
        completed_at = CASE 
            WHEN (progress_current + p_increment >= progress_target) THEN NOW()
            ELSE completed_at
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
    RETURNING is_completed INTO v_newly_completed;
    
    -- If achievement was just completed, award points to user profile
    IF v_newly_completed THEN
        UPDATE public.profiles
        SET reward_points = COALESCE(reward_points, 0) + v_achievement_record.reward_points
        WHERE id = p_user_id;
    END IF;
    
    RETURN v_newly_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION TO TRACK ACTIVITY AND UPDATE ACHIEVEMENTS
-- ============================================
CREATE OR REPLACE FUNCTION track_achievement_activity(
    p_user_id UUID,
    p_activity_type TEXT
)
RETURNS void AS $$
BEGIN
    -- Map activity types to achievements
    CASE p_activity_type
        WHEN 'emergency_response' THEN
            PERFORM update_achievement_progress(p_user_id, 'first_responder', 1);
            PERFORM update_achievement_progress(p_user_id, 'safety_guardian', 1);
            PERFORM update_achievement_progress(p_user_id, 'hero_responder', 1);
            PERFORM update_achievement_progress(p_user_id, 'emergency_legend', 1);
            
        WHEN 'help_rider' THEN
            PERFORM update_achievement_progress(p_user_id, 'helping_hand', 1);
            PERFORM update_achievement_progress(p_user_id, 'community_helper', 1);
            PERFORM update_achievement_progress(p_user_id, 'community_champion', 1);
            PERFORM update_achievement_progress(p_user_id, 'community_legend', 1);
            
        WHEN 'ride_complete' THEN
            PERFORM update_achievement_progress(p_user_id, 'rookie_rider', 1);
            PERFORM update_achievement_progress(p_user_id, 'seasoned_rider', 1);
            PERFORM update_achievement_progress(p_user_id, 'expert_rider', 1);
            PERFORM update_achievement_progress(p_user_id, 'road_warrior', 1);
            
        WHEN 'eco_riding' THEN
            PERFORM update_achievement_progress(p_user_id, 'eco_starter', 1);
            PERFORM update_achievement_progress(p_user_id, 'eco_warrior', 1);
            PERFORM update_achievement_progress(p_user_id, 'green_champion', 1);
            
        WHEN 'group_ride_join' THEN
            PERFORM update_achievement_progress(p_user_id, 'social_butterfly', 1);
            
        WHEN 'group_ride_lead' THEN
            PERFORM update_achievement_progress(p_user_id, 'group_leader', 1);
            PERFORM update_achievement_progress(p_user_id, 'ride_organizer', 1);
            
        WHEN 'chat_message' THEN
            PERFORM update_achievement_progress(p_user_id, 'chat_active', 1);
            
        WHEN 'route_share' THEN
            PERFORM update_achievement_progress(p_user_id, 'route_sharer', 1);
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ACHIEVEMENT POLICIES
-- ============================================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.achievements;
CREATE POLICY "Users can view their own achievements" ON public.achievements
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view public achievements of others" ON public.achievements;
CREATE POLICY "Users can view public achievements of others" ON public.achievements
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "System can manage achievements" ON public.achievements;
CREATE POLICY "System can manage achievements" ON public.achievements
    FOR ALL USING (true);

-- ============================================
-- TRIGGER TO AUTO-INITIALIZE ACHIEVEMENTS FOR NEW USERS
-- ============================================
-- NOTE: This is now handled in the handle_new_user() function
-- to avoid trigger conflicts during user registration.
-- See FIX_REGISTRATION_ERROR.sql for the updated implementation.
-- 
-- If you run this file AFTER the main schema, achievements will be
-- automatically initialized via the handle_new_user() trigger.

-- ============================================
-- MANUALLY INITIALIZE ACHIEVEMENTS FOR EXISTING USERS
-- Run this to create achievements for users that already exist
-- ============================================
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM public.profiles
    LOOP
        PERFORM initialize_user_achievements(user_record.id);
    END LOOP;
END $$;
