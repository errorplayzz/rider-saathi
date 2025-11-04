-- ============================================
-- SUPABASE REALTIME COMPLETE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ENABLE REALTIME FOR EXISTING TABLES
-- ============================================

-- Enable realtime replication for chat tables (with error handling)
DO $$
BEGIN
    -- Add messages table
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Table messages already in publication';
    END;
    
    -- Add chat_rooms table
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Table chat_rooms already in publication';
    END;
    
    -- Add room_participants table
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Table room_participants already in publication';
    END;
    
    -- Add profiles table
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Table profiles already in publication';
    END;
    
    -- Add emergency_alerts table
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE emergency_alerts;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Table emergency_alerts already in publication';
    END;
END $$;

-- ============================================
-- 2. CREATE TYPING STATUS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.typing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Create index for typing status
CREATE INDEX IF NOT EXISTS typing_status_room_idx ON public.typing_status(room_id);
CREATE INDEX IF NOT EXISTS typing_status_user_idx ON public.typing_status(user_id);
CREATE INDEX IF NOT EXISTS typing_status_updated_idx ON public.typing_status(updated_at);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Typing status policies
DROP POLICY IF EXISTS "Users can view typing in their rooms" ON public.typing_status;
CREATE POLICY "Users can view typing in their rooms" ON public.typing_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = typing_status.room_id AND user_id = auth.uid()::uuid
        )
    );

DROP POLICY IF EXISTS "Users can manage their typing status" ON public.typing_status;
CREATE POLICY "Users can manage their typing status" ON public.typing_status
    FOR ALL USING (auth.uid()::uuid = user_id);

-- Enable realtime for typing_status (with error handling)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE typing_status;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table typing_status already in publication';
END $$;

-- ============================================
-- 3. ADD MESSAGE DELIVERY TRACKING
-- ============================================

-- Add delivery tracking columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS temp_id TEXT;

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS messages_room_created_idx ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_delivered_idx ON messages(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_read_idx ON messages(read_at) WHERE read_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_not_deleted_idx ON messages(room_id, is_deleted) WHERE is_deleted = false;

-- ============================================
-- 4. AUTO-CLEANUP FUNCTIONS
-- ============================================

-- Function to auto-cleanup old typing status (after 10 seconds of inactivity)
CREATE OR REPLACE FUNCTION cleanup_old_typing_status()
RETURNS void AS $$
BEGIN
    DELETE FROM public.typing_status
    WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Function to update typing status timestamp
CREATE OR REPLACE FUNCTION update_typing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update typing timestamp on update
DROP TRIGGER IF EXISTS typing_status_update_timestamp ON public.typing_status;
CREATE TRIGGER typing_status_update_timestamp
    BEFORE UPDATE ON public.typing_status
    FOR EACH ROW
    EXECUTE FUNCTION update_typing_timestamp();

-- ============================================
-- 5. MESSAGE NOTIFICATION FUNCTION
-- ============================================

-- Function to notify on new message (for push notifications later)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    room_name TEXT;
    sender_name TEXT;
BEGIN
    -- Get room name
    SELECT name INTO room_name FROM public.chat_rooms WHERE id = NEW.room_id;
    
    -- Get sender name
    SELECT name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
    
    -- Log the message
    RAISE NOTICE 'New message in room %: % from %', room_name, NEW.content, sender_name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new messages
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- ============================================
-- 6. ONLINE STATUS MANAGEMENT
-- ============================================

-- Add last activity column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();

-- Function to update last activity
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last activity on profile update
DROP TRIGGER IF EXISTS profile_last_activity ON public.profiles;
CREATE TRIGGER profile_last_activity
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (OLD.is_online IS DISTINCT FROM NEW.is_online)
    EXECUTE FUNCTION update_last_activity();

-- ============================================
-- 7. ROOM LAST ACTIVITY UPDATE
-- ============================================

-- Function to update room last activity on new message
CREATE OR REPLACE FUNCTION update_room_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_rooms
    SET last_activity = NOW(),
        last_message_id = NEW.id
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for room last activity
DROP TRIGGER IF EXISTS on_message_update_room ON public.messages;
CREATE TRIGGER on_message_update_room
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_room_last_activity();

-- ============================================
-- 8. EMERGENCY ALERTS REALTIME
-- ============================================

-- Ensure emergency_alerts table exists (may already exist)
-- Just add realtime if not already added
-- Already done above: ALTER PUBLICATION supabase_realtime ADD TABLE emergency_alerts;

-- ============================================
-- 9. PERFORMANCE INDEXES
-- ============================================

-- Room participants indexes
CREATE INDEX IF NOT EXISTS room_participants_room_idx ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS room_participants_user_idx ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS room_participants_room_user_idx ON room_participants(room_id, user_id);

-- Chat rooms indexes
CREATE INDEX IF NOT EXISTS chat_rooms_type_idx ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS chat_rooms_active_idx ON chat_rooms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS chat_rooms_activity_idx ON chat_rooms(last_activity DESC);

-- Profiles indexes for presence
CREATE INDEX IF NOT EXISTS profiles_online_idx ON profiles(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS profiles_last_seen_idx ON profiles(last_seen DESC);

-- ============================================
-- 10. RLS POLICIES VERIFICATION
-- ============================================

-- Verify messages policies allow realtime
-- Users can view messages in their rooms
DROP POLICY IF EXISTS "Users can view messages in their rooms realtime" ON public.messages;
CREATE POLICY "Users can view messages in their rooms realtime" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = messages.room_id AND user_id = auth.uid()::uuid
        )
    );

-- Users can send messages to their rooms
DROP POLICY IF EXISTS "Users can send messages to their rooms realtime" ON public.messages;
CREATE POLICY "Users can send messages to their rooms realtime" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid()::uuid = sender_id AND
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = messages.room_id AND user_id = auth.uid()::uuid
        )
    );

-- ============================================
-- 11. HELPER FUNCTIONS FOR FRONTEND
-- ============================================

-- Function to mark message as delivered
CREATE OR REPLACE FUNCTION mark_message_delivered(message_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.messages
    SET delivered_at = NOW()
    WHERE id = message_id AND delivered_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_read(message_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.messages
    SET read_at = NOW()
    WHERE id = message_id AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_count(p_room_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
    last_seen TIMESTAMPTZ;
BEGIN
    -- Get user's last seen time for this room
    SELECT rp.last_seen INTO last_seen
    FROM public.room_participants rp
    WHERE rp.room_id = p_room_id AND rp.user_id = auth.uid()::uuid;
    
    -- Count unread messages
    SELECT COUNT(*)::INTEGER INTO count
    FROM public.messages
    WHERE room_id = p_room_id
      AND sender_id != auth.uid()::uuid
      AND created_at > COALESCE(last_seen, '1970-01-01'::TIMESTAMPTZ)
      AND is_deleted = false;
    
    RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_message_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION mark_message_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_count TO authenticated;

-- ============================================
-- 12. CREATE INDEXES FOR REALTIME PERFORMANCE
-- ============================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS messages_room_sender_created_idx 
    ON messages(room_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_room_type_created_idx 
    ON messages(room_id, message_type, created_at DESC);

-- Partial indexes for active data
CREATE INDEX IF NOT EXISTS active_chat_rooms_idx 
    ON chat_rooms(id, last_activity DESC) 
    WHERE is_active = true;

-- Remove the time-based predicate as NOW() is not IMMUTABLE
-- This index will cover recent messages efficiently without the time filter
CREATE INDEX IF NOT EXISTS recent_messages_idx 
    ON messages(room_id, created_at DESC) 
    WHERE is_deleted = false;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ SUPABASE REALTIME SCHEMA SETUP COMPLETE';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📡 Realtime enabled for tables:';
    RAISE NOTICE '   - messages';
    RAISE NOTICE '   - chat_rooms';
    RAISE NOTICE '   - room_participants';
    RAISE NOTICE '   - typing_status';
    RAISE NOTICE '   - profiles';
    RAISE NOTICE '   - emergency_alerts';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Created functions:';
    RAISE NOTICE '   - cleanup_old_typing_status()';
    RAISE NOTICE '   - update_typing_timestamp()';
    RAISE NOTICE '   - notify_new_message()';
    RAISE NOTICE '   - mark_message_delivered()';
    RAISE NOTICE '   - mark_message_read()';
    RAISE NOTICE '   - get_unread_count()';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next steps:';
    RAISE NOTICE '   1. Go to Database → Replication in Supabase Dashboard';
    RAISE NOTICE '   2. Verify realtime is enabled for all tables';
    RAISE NOTICE '   3. Test RLS policies in SQL Editor';
    RAISE NOTICE '   4. Update frontend to use RealtimeContext';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to go serverless!';
    RAISE NOTICE '============================================';
END $$;
