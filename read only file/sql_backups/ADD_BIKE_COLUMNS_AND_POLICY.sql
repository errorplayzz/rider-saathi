-- SAFE / IDEMPOTENT SUPABASE FIXES
-- Paste this into Supabase SQL editor and run.

-- ========== Helper: remove any existing overloaded get_nearby_users functions ==========
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema,
           p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_nearby_users'
  LOOP
    RAISE NOTICE 'Dropping function: %.%(% )', r.schema, r.name, r.args;
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.schema) || '.' || quote_ident(r.name) || '(' || r.args || ');';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========== FIX 1: room_participants policies (idempotent) ==========
DROP POLICY IF EXISTS "Users can view room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Users can insert room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Users can update their own room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Users can delete their own room participants" ON public.room_participants;

-- Simple policies without recursion (idempotent)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.room_participants;
CREATE POLICY "Enable read access for authenticated users"
  ON public.room_participants FOR SELECT
  USING (auth.uid()::uuid IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.room_participants;
CREATE POLICY "Enable insert for authenticated users"
  ON public.room_participants FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Enable delete for own records" ON public.room_participants;
CREATE POLICY "Enable delete for own records"
  ON public.room_participants FOR DELETE
  USING (auth.uid()::uuid = user_id);

-- ========== FIX 2: Recreate get_nearby_users (single safe signature) ==========
CREATE OR REPLACE FUNCTION public.get_nearby_users(
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
    )::DOUBLE PRECISION AS distance
  FROM public.profiles p
  WHERE
    p.current_location IS NOT NULL
    AND p.id != auth.uid()::uuid
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

-- Grant execute on the specific signature we just created
GRANT EXECUTE ON FUNCTION public.get_nearby_users(double precision, double precision, double precision, boolean) TO authenticated;

COMMENT ON FUNCTION public.get_nearby_users IS 'Returns nearby users with DOUBLE PRECISION distance (idempotent replacement).';

-- ========== FIX 3: ensure chat_rooms.last_activity exists ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_rooms' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE public.chat_rooms ADD COLUMN last_activity TIMESTAMPTZ DEFAULT NOW();
  END IF;
END;
$$;

UPDATE public.chat_rooms SET last_activity = created_at WHERE last_activity IS NULL;

-- ========== FIX 4: enable RLS on key tables ==========
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emergency_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leaderboard ENABLE ROW LEVEL SECURITY;

-- ========== FIX 5: chat_rooms policies (idempotent) ==========
DROP POLICY IF EXISTS "Users can view their chat rooms" ON public.chat_rooms;
CREATE POLICY "Users can view their chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE public.room_participants.room_id = public.chat_rooms.id
        AND public.room_participants.user_id = auth.uid()::uuid
    )
  );

DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
CREATE POLICY "Users can create chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ========== FIX 6: messages policies (idempotent) ==========
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;
CREATE POLICY "Users can view messages in their rooms"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE public.room_participants.room_id = public.messages.room_id
        AND public.room_participants.user_id = auth.uid()::uuid
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid()::uuid);

-- ========== VERIFICATION / NOTES ==========
-- To list policies:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- To test function:
-- SELECT * FROM public.get_nearby_users(-73.935242, 40.730610, 10000, false);

-- End of file.