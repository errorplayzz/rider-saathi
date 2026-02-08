-- ============================================
-- FIX CHAT ROOM CREATION - RLS POLICIES
-- ============================================
-- Run this in Supabase SQL Editor to fix the 403 error

-- 1. Add UPDATE policy for chat_rooms (needed when adding participants)
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;
CREATE POLICY "Users can update rooms they created" ON public.chat_rooms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = chat_rooms.id 
            AND user_id = auth.uid()::uuid 
            AND role IN ('admin', 'moderator')
        )
    );

-- 2. Add DELETE policy for chat_rooms
DROP POLICY IF EXISTS "Admins can delete rooms" ON public.chat_rooms;
CREATE POLICY "Admins can delete rooms" ON public.chat_rooms
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = chat_rooms.id 
            AND user_id = auth.uid()::uuid 
            AND role = 'admin'
        )
    );

-- 3. Update room_participants INSERT policy to allow admins to add members
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;
CREATE POLICY "Users can join rooms" ON public.room_participants
    FOR INSERT WITH CHECK (
        -- User can join themselves OR admin can add others
        auth.uid()::uuid = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = room_participants.room_id 
            AND user_id = auth.uid()::uuid 
            AND role IN ('admin', 'moderator')
        )
    );

-- 4. Add UPDATE policy for room_participants (for role changes)
DROP POLICY IF EXISTS "Admins can update participants" ON public.room_participants;
CREATE POLICY "Admins can update participants" ON public.room_participants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = room_participants.room_id 
            AND rp.user_id = auth.uid()::uuid 
            AND rp.role = 'admin'
        )
    );

-- 5. Add DELETE policy for room_participants (for leaving/removing)
DROP POLICY IF EXISTS "Users can leave or admins can remove" ON public.room_participants;
CREATE POLICY "Users can leave or admins can remove" ON public.room_participants
    FOR DELETE USING (
        -- User can remove themselves OR admin can remove others
        auth.uid()::uuid = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = room_participants.room_id 
            AND rp.user_id = auth.uid()::uuid 
            AND rp.role = 'admin'
        )
    );

-- 6. Create a function to handle chat room creation with participants
CREATE OR REPLACE FUNCTION public.create_chat_room_with_participants(
    room_name TEXT,
    room_type TEXT DEFAULT 'group',
    participant_ids UUID[] DEFAULT ARRAY[]::UUID[],
    creator_id UUID DEFAULT auth.uid()::uuid
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_room_id UUID;
    participant_id UUID;
BEGIN
    -- Validate creator is authenticated
    IF creator_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User must be authenticated';
    END IF;

    -- Create the chat room
    INSERT INTO public.chat_rooms (name, room_type)
    VALUES (room_name, room_type)
    RETURNING id INTO new_room_id;

    -- Add creator as admin
    INSERT INTO public.room_participants (room_id, user_id, role)
    VALUES (new_room_id, creator_id, 'admin');

    -- Add other participants
    FOREACH participant_id IN ARRAY participant_ids
    LOOP
        -- Skip creator (already added)
        IF participant_id != creator_id THEN
            INSERT INTO public.room_participants (room_id, user_id, role)
            VALUES (new_room_id, participant_id, 'member')
            ON CONFLICT (room_id, user_id) DO NOTHING;
        END IF;
    END LOOP;

    RETURN new_room_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_chat_room_with_participants TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Chat room policies fixed successfully! You can now create group chats.';
END $$;
