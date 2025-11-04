-- Backup of original APPLY_THESE_FIXES.sql
-- (This is a backup copy moved from repository root)

-- ============================================
-- CRITICAL FIXES FOR EXISTING SCHEMA
-- Run this AFTER your main schema
-- ============================================

-- FIX 1: Drop problematic RLS policies on room_participants
-- ============================================
DROP POLICY IF EXISTS "Users can view participants of their rooms" ON public.room_participants;

-- Create simple non-recursive policy
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.room_participants;
CREATE POLICY "Enable read access for authenticated users" 
ON public.room_participants FOR SELECT 
USING (auth.uid()::uuid IS NOT NULL);

-- FIX 2: Update get_nearby_users function return type
-- ============================================
DROP FUNCTION IF EXISTS get_nearby_users(numeric, numeric, integer, boolean);

CREATE OR REPLACE FUNCTION get_nearby_users(
  user_longitude DOUBLE PRECISION,
  user_latitude DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 10000,
  include_offline BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  is_online BOOLEAN,
  is_riding BOOLEAN,
  current_location GEOGRAPHY,
  distance DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.email,
    p.avatar_url,
    p.is_online,
    p.is_riding,
    p.current_location,
    ST_Distance(
      p.current_location::geography,
      ST_SetSRID(ST_MakePoint(user_longitude, user_latitude), 4326)::geography
    )::DOUBLE PRECISION as distance
  FROM profiles p
  WHERE 
    p.id != auth.uid()::uuid
    AND p.current_location IS NOT NULL
    AND ST_DWithin(
      p.current_location::geography,
      ST_SetSRID(ST_MakePoint(user_longitude, user_latitude), 4326)::geography,
      radius_meters
    )
    AND (include_offline OR p.is_online = true)
  ORDER BY distance ASC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_nearby_users TO authenticated;

-- FIX 3: Add missing columns if not exist
-- ============================================
DO $$ 
BEGIN
  -- Add bike_model column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'bike_model'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bike_model TEXT;
  END IF;

  -- Add bike_year column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'bike_year'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bike_year INTEGER;
  END IF;

  -- Add bike_color column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'bike_color'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bike_color TEXT;
  END IF;

  -- Add emergency_contact column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'emergency_contact'
  ) THEN
    ALTER TABLE profiles ADD COLUMN emergency_contact TEXT;
  END IF;
END $$;

-- FIX 4: Add user_achievements table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_earned_at_idx ON public.user_achievements(earned_at DESC);

-- RLS for user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid()::uuid = user_id);

-- FIX 5: Add emergency_responses table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.emergency_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES public.emergency_alerts(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT,
    responder_location GEOGRAPHY(POINT, 4326),
    estimated_arrival_minutes INTEGER,
    status TEXT DEFAULT 'heading' CHECK (status IN ('heading', 'arrived', 'helping', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emergency_responses_alert_id_idx ON public.emergency_responses(alert_id);
CREATE INDEX IF NOT EXISTS emergency_responses_responder_id_idx ON public.emergency_responses(responder_id);

ALTER TABLE public.emergency_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view responses to visible alerts" ON public.emergency_responses;
CREATE POLICY "Users can view responses to visible alerts" ON public.emergency_responses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create responses" ON public.emergency_responses;
CREATE POLICY "Users can create responses" ON public.emergency_responses
  FOR INSERT WITH CHECK (auth.uid()::uuid = responder_id);

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_emergency_responses_updated_at ON public.emergency_responses;
CREATE TRIGGER update_emergency_responses_updated_at BEFORE UPDATE ON public.emergency_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FIX 6: Update achievements table structure
-- ============================================
-- Remove user_id from achievements (it should be in user_achievements)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'achievements' AND column_name = 'user_id'
  ) THEN
    -- This is the master achievements table, not user-specific
    -- Create new table without user_id if needed
    CREATE TABLE IF NOT EXISTS public.achievements_master (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      achievement_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT,
      badge_color TEXT,
      category TEXT NOT NULL,
      tier TEXT DEFAULT 'bronze',
      points INTEGER DEFAULT 0,
      progress_target INTEGER NOT NULL,
      progress_unit TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    ALTER TABLE public.achievements_master ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.achievements_master;
    CREATE POLICY "Achievements are viewable by everyone" ON public.achievements_master
      FOR SELECT USING (true);
  END IF;
END $$;

-- FIX 7: Grant permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- FIX 8: Enable Realtime (run this in Supabase Dashboard > Database > Replication)
-- ============================================
-- You need to enable these tables for Realtime in the Supabase Dashboard:
-- 1. messages
-- 2. emergency_alerts  
-- 3. profiles (for online status)
-- 4. locations (for live tracking)

-- This is just a comment reminder - actual Realtime enabling is done via Dashboard UI

COMMENT ON TABLE public.profiles IS 'Enable Realtime for online status updates';
COMMENT ON TABLE public.messages IS 'Enable Realtime for live chat';
COMMENT ON TABLE public.emergency_alerts IS 'Enable Realtime for emergency notifications';
COMMENT ON TABLE public.locations IS 'Enable Realtime for live location tracking';

-- ============================================
-- VERIFICATION
-- ============================================

-- Test get_nearby_users function
-- SELECT * FROM get_nearby_users(-73.935242, 40.730610, 10000, false);

-- Check if all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- ============================================
-- SUCCESS!
-- ============================================
-- All fixes applied successfully!
-- Your app should now work without errors.
