-- Backup of original SUPABASE_FIXES.sql
-- (This is a backup copy moved from repository root)

-- ============================================
-- SUPABASE DATABASE FIXES
-- Run these in Supabase SQL Editor to fix current errors
-- ============================================

-- FIX 1: Drop and recreate room_participants RLS policies to fix infinite recursion
-- ============================================
DROP POLICY IF EXISTS "Users can view room participants" ON room_participants;
DROP POLICY IF EXISTS "Users can insert room participants" ON room_participants;
DROP POLICY IF EXISTS "Users can update their own room participants" ON room_participants;
DROP POLICY IF EXISTS "Users can delete their own room participants" ON room_participants;

-- Simple policies without recursion
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON room_participants;
CREATE POLICY "Enable read access for authenticated users" 
ON room_participants FOR SELECT 
USING (auth.uid()::uuid IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON room_participants;
CREATE POLICY "Enable insert for authenticated users" 
ON room_participants FOR INSERT 
WITH CHECK (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Enable delete for own records" ON room_participants;
CREATE POLICY "Enable delete for own records" 
ON room_participants FOR DELETE 
USING (auth.uid()::uuid = user_id);

-- FIX 2: Recreate get_nearby_users function with correct return type
-- ============================================
DROP FUNCTION IF EXISTS get_nearby_users(numeric, numeric, numeric, boolean);

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nearby_users TO authenticated;

-- FIX 3: Verify chat_rooms table has last_activity column
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_rooms' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN last_activity TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update existing chat_rooms to have last_activity
UPDATE chat_rooms SET last_activity = created_at WHERE last_activity IS NULL;

-- FIX 4: Enable RLS on all tables if not already enabled
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- FIX 5: Basic RLS policies for chat_rooms (if not exists)
-- ============================================
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
CREATE POLICY "Users can view their chat rooms" 
ON chat_rooms FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = chat_rooms.id 
    AND room_participants.user_id = auth.uid()::uuid
  )
);

DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
CREATE POLICY "Users can create chat rooms" 
ON chat_rooms FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- FIX 6: Messages RLS policies
-- ============================================
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON messages;
CREATE POLICY "Users can view messages in their rooms" 
ON messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = messages.room_id 
    AND room_participants.user_id = auth.uid()::uuid
  )
);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" 
ON messages FOR INSERT 
WITH CHECK (sender_id = auth.uid()::uuid);

-- ============================================
-- VERIFICATION QUERIES (Check these after running fixes)
-- ============================================

-- Check RLS policies
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Test get_nearby_users function
-- SELECT * FROM get_nearby_users(-73.935242, 40.730610, 10000, false);

-- Check chat_rooms structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'chat_rooms';

COMMENT ON FUNCTION get_nearby_users IS 'Fixed return type to use DOUBLE PRECISION for distance';
