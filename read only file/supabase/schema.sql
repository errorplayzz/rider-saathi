-- ============================================
-- Rider Saathi - Complete Supabase Schema
-- ============================================
-- This schema recreates all MongoDB models as PostgreSQL tables
-- with proper relationships, indexes, and Row Level Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    
    -- Bike details (stored as JSONB for flexibility)
    bike_details JSONB DEFAULT '{}'::jsonb,
    
    -- Emergency contacts (array of objects)
    emergency_contacts JSONB DEFAULT '[]'::jsonb,
    
    -- User preferences
    preferences JSONB DEFAULT '{
        "shareLocation": true,
        "emergencyAlerts": true,
        "voiceAssistant": true,
        "notifications": true,
        "groupInvites": true,
        "rideRequests": true,
        "twoFactorEnabled": false
    }'::jsonb,
    
    -- Current location (PostGIS geography point)
    current_location GEOGRAPHY(POINT, 4326),
    current_address TEXT,
    location_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Stats
    total_rides INTEGER DEFAULT 0,
    total_distance_meters INTEGER DEFAULT 0,
    help_count INTEGER DEFAULT 0,
    reward_points INTEGER DEFAULT 0,
    
    -- Status flags
    is_online BOOLEAN DEFAULT false,
    is_riding BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for location queries
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles USING GIST(current_location);
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles(is_online);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RIDES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Locations (PostGIS geography points)
    start_location GEOGRAPHY(POINT, 4326) NOT NULL,
    start_address TEXT,
    end_location GEOGRAPHY(POINT, 4326),
    end_address TEXT,
    current_location GEOGRAPHY(POINT, 4326),
    current_address TEXT,
    location_updated_at TIMESTAMPTZ,
    
    -- Route data (stored as JSONB array)
    waypoints JSONB DEFAULT '[]'::jsonb,
    total_distance_meters INTEGER DEFAULT 0,
    estimated_duration_seconds INTEGER,
    actual_duration_seconds INTEGER,
    
    -- Status
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
    ride_type TEXT DEFAULT 'solo' CHECK (ride_type IN ('solo', 'group')),
    group_id UUID,
    
    -- Metrics (stored as JSONB)
    metrics JSONB DEFAULT '{}'::jsonb,
    
    -- Weather conditions during ride
    weather_conditions JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rides_rider_id_idx ON public.rides(rider_id);
CREATE INDEX IF NOT EXISTS rides_status_idx ON public.rides(status);
CREATE INDEX IF NOT EXISTS rides_start_location_idx ON public.rides USING GIST(start_location);
CREATE INDEX IF NOT EXISTS rides_created_at_idx ON public.rides(created_at DESC);

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_rides_updated_at ON public.rides;
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON public.rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EMERGENCY ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('accident', 'breakdown', 'medical', 'battery', 'theft', 'other')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    
    -- Location (PostGIS)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'responded', 'resolved', 'cancelled')),
    
    -- Responders (stored as JSONB array)
    responders JSONB DEFAULT '[]'::jsonb,
    
    -- Nearby hospitals (stored as JSONB array)
    nearby_hospitals JSONB DEFAULT '[]'::jsonb,
    
    -- Resolution
    auto_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emergency_alerts_user_id_idx ON public.emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS emergency_alerts_status_idx ON public.emergency_alerts(status);
CREATE INDEX IF NOT EXISTS emergency_alerts_location_idx ON public.emergency_alerts USING GIST(location);
CREATE INDEX IF NOT EXISTS emergency_alerts_created_at_idx ON public.emergency_alerts(created_at DESC);

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_emergency_alerts_updated_at ON public.emergency_alerts;
CREATE TRIGGER update_emergency_alerts_updated_at BEFORE UPDATE ON public.emergency_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CHAT ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    room_type TEXT DEFAULT 'group' CHECK (room_type IN ('group', 'private', 'emergency', 'ride')),
    
    -- Related entities
    ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
    emergency_id UUID REFERENCES public.emergency_alerts(id) ON DELETE CASCADE,
    
    -- Settings
    is_private BOOLEAN DEFAULT false,
    allow_new_members BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 50,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_message_id UUID,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_rooms_type_idx ON public.chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS chat_rooms_is_active_idx ON public.chat_rooms(is_active);
CREATE INDEX IF NOT EXISTS chat_rooms_ride_id_idx ON public.chat_rooms(ride_id);

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROOM PARTICIPANTS TABLE (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS public.room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_participants_room_id_idx ON public.room_participants(room_id);
CREATE INDEX IF NOT EXISTS room_participants_user_id_idx ON public.room_participants(user_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'voice', 'emergency')),
    
    -- Location (for location messages)
    location GEOGRAPHY(POINT, 4326),
    location_address TEXT,
    
    -- Media (for media messages)
    media_url TEXT,
    media_type TEXT,
    media_size INTEGER,
    
    -- Message status
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    
    -- Replies
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    
    -- Reactions (stored as JSONB array)
    reactions JSONB DEFAULT '[]'::jsonb,
    
    -- Read receipts (stored as JSONB array)
    read_by JSONB DEFAULT '[]'::jsonb,
    
    -- Deletion
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    
    -- Auto-expiry
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_room_id_idx ON public.messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_expires_at_idx ON public.messages(expires_at) WHERE expires_at IS NOT NULL;

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REWARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Activity type
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'emergency_response', 'breakdown_help', 'route_sharing', 'safety_report',
        'community_help', 'ride_completion', 'daily_login', 'profile_completion',
        'referral', 'eco_riding', 'group_ride_leader', 'first_aid_certified'
    )),
    
    points INTEGER NOT NULL CHECK (points >= 0),
    description TEXT NOT NULL,
    
    -- Related activity reference
    related_activity_id UUID,
    related_model TEXT CHECK (related_model IN ('emergency_alerts', 'rides', 'profiles', 'messages')),
    
    -- Badge information (stored as JSONB)
    badge JSONB DEFAULT '{}'::jsonb,
    
    -- Multiplier for special events
    multiplier NUMERIC(4,2) DEFAULT 1.0,
    
    -- Expiry
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rewards_user_id_idx ON public.rewards(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rewards_activity_type_idx ON public.rewards(activity_type);
CREATE INDEX IF NOT EXISTS rewards_expires_at_idx ON public.rewards(expires_at) WHERE expires_at IS NOT NULL;

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_rewards_updated_at ON public.rewards;
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- LEADERBOARD TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly', 'alltime')),
    category TEXT DEFAULT 'total_points' CHECK (category IN ('total_points', 'emergency_responses', 'rides_completed', 'distance_covered', 'eco_points')),
    
    score INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL,
    
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, period, category)
);

CREATE INDEX IF NOT EXISTS leaderboard_period_category_rank_idx ON public.leaderboard(period, category, rank);
CREATE INDEX IF NOT EXISTS leaderboard_user_id_idx ON public.leaderboard(user_id);

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS achievements_is_completed_idx ON public.achievements(is_completed);
CREATE INDEX IF NOT EXISTS achievements_category_tier_idx ON public.achievements(category, tier);

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_achievements_updated_at ON public.achievements;
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- LOCATIONS TABLE (for realtime tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT,
    speed NUMERIC(6,2), -- km/h
    heading NUMERIC(5,2), -- degrees (0-360)
    accuracy NUMERIC(8,2), -- meters
    
    ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS locations_user_id_idx ON public.locations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS locations_ride_id_idx ON public.locations(ride_id);
CREATE INDEX IF NOT EXISTS locations_location_idx ON public.locations USING GIST(location);
CREATE INDEX IF NOT EXISTS locations_created_at_idx ON public.locations(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid()::uuid = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid()::uuid = id);

-- RIDES POLICIES
DROP POLICY IF EXISTS "Users can view their own rides" ON public.rides;
CREATE POLICY "Users can view their own rides" ON public.rides
    FOR SELECT USING (auth.uid()::uuid = rider_id);

DROP POLICY IF EXISTS "Users can insert their own rides" ON public.rides;
CREATE POLICY "Users can insert their own rides" ON public.rides
    FOR INSERT WITH CHECK (auth.uid()::uuid = rider_id);

DROP POLICY IF EXISTS "Users can update their own rides" ON public.rides;
CREATE POLICY "Users can update their own rides" ON public.rides
    FOR UPDATE USING (auth.uid()::uuid = rider_id);

DROP POLICY IF EXISTS "Users can delete their own rides" ON public.rides;
CREATE POLICY "Users can delete their own rides" ON public.rides
    FOR DELETE USING (auth.uid()::uuid = rider_id);

-- EMERGENCY ALERTS POLICIES
DROP POLICY IF EXISTS "Active emergency alerts are viewable by everyone" ON public.emergency_alerts;
CREATE POLICY "Active emergency alerts are viewable by everyone" ON public.emergency_alerts
    FOR SELECT USING (status = 'active' OR auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users can insert their own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can insert their own emergency alerts" ON public.emergency_alerts
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users can update their own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can update their own emergency alerts" ON public.emergency_alerts
    FOR UPDATE USING (auth.uid()::uuid = user_id);

-- CHAT ROOMS POLICIES
DROP POLICY IF EXISTS "Users can view rooms they're part of" ON public.chat_rooms;
CREATE POLICY "Users can view rooms they're part of" ON public.chat_rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = chat_rooms.id AND user_id = auth.uid()::uuid
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.chat_rooms;
CREATE POLICY "Authenticated users can create rooms" ON public.chat_rooms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ROOM PARTICIPANTS POLICIES
DROP POLICY IF EXISTS "Users can view participants of their rooms" ON public.room_participants;
CREATE POLICY "Users can view participants of their rooms" ON public.room_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = room_participants.room_id AND rp.user_id = auth.uid()::uuid
        )
    );

DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;
CREATE POLICY "Users can join rooms" ON public.room_participants
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

-- MESSAGES POLICIES
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.messages;
CREATE POLICY "Users can view messages in their rooms" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = messages.room_id AND user_id = auth.uid()::uuid
        )
    );

DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.messages;
CREATE POLICY "Users can send messages to their rooms" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid()::uuid = sender_id AND
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = messages.room_id AND user_id = auth.uid()::uuid
        )
    );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE USING (auth.uid()::uuid = sender_id);

-- REWARDS POLICIES
DROP POLICY IF EXISTS "Users can view their own rewards" ON public.rewards;
CREATE POLICY "Users can view their own rewards" ON public.rewards
    FOR SELECT USING (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "System can insert rewards" ON public.rewards;
CREATE POLICY "System can insert rewards" ON public.rewards
    FOR INSERT WITH CHECK (true);

-- LEADERBOARD POLICIES
DROP POLICY IF EXISTS "Leaderboard is viewable by everyone" ON public.leaderboard;
CREATE POLICY "Leaderboard is viewable by everyone" ON public.leaderboard
    FOR SELECT USING (true);

-- ACHIEVEMENTS POLICIES
DROP POLICY IF EXISTS "Users can view public achievements" ON public.achievements;
CREATE POLICY "Users can view public achievements" ON public.achievements
    FOR SELECT USING (is_public = true OR auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users can update their own achievements" ON public.achievements;
CREATE POLICY "Users can update their own achievements" ON public.achievements
    FOR UPDATE USING (auth.uid()::uuid = user_id);

-- LOCATIONS POLICIES
DROP POLICY IF EXISTS "Users can view their own locations" ON public.locations;
CREATE POLICY "Users can view their own locations" ON public.locations
    FOR SELECT USING (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users can insert their own locations" ON public.locations;
CREATE POLICY "Users can insert their own locations" ON public.locations
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get nearby users (replaces Mongoose $near)
CREATE OR REPLACE FUNCTION get_nearby_users(
    user_longitude NUMERIC,
    user_latitude NUMERIC,
    radius_meters INTEGER DEFAULT 10000,
    include_offline BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    current_location GEOGRAPHY,
    current_address TEXT,
    is_online BOOLEAN,
    distance_meters NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.email,
        p.avatar_url,
        p.current_location,
        p.current_address,
        p.is_online,
        ST_Distance(
            p.current_location,
            ST_SetSRID(ST_MakePoint(user_longitude, user_latitude), 4326)::geography
        ) AS distance_meters
    FROM public.profiles p
    WHERE
        p.current_location IS NOT NULL
            AND p.id != auth.uid()::uuid
        AND (include_offline OR p.is_online = true)
        AND ST_DWithin(
            p.current_location,
            ST_SetSRID(ST_MakePoint(user_longitude, user_latitude), 4326)::geography,
            radius_meters
        )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update last_activity in chat_rooms when message is sent
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_rooms
    SET
        last_activity = NOW(),
        last_message_id = NEW.id
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure we don't fail if the trigger already exists
DROP TRIGGER IF EXISTS update_room_activity_trigger ON public.messages;
CREATE TRIGGER update_room_activity_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_room_activity();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- You can uncomment these to insert sample data for testing
/*
INSERT INTO public.profiles (id, name, email) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Demo User', 'demo@ridersathi.com');
*/

-- ============================================
-- COMPLETION
-- ============================================
-- Schema creation complete!
-- Next steps:
-- 1. Enable Realtime for: messages, emergency_alerts, profiles, locations
-- 2. Create Storage buckets: avatars (public), chat-media (private)
-- 3. Configure Auth providers in Supabase dashboard
