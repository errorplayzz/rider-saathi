-- Function to create chat room with participants atomically
-- The creator is automatically added as admin
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_chat_room_with_participants(
  room_name TEXT,
  room_type TEXT,
  participant_ids UUID[],
  creator_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_room_id UUID;
  participant_id UUID;
BEGIN
  -- Create the chat room
  INSERT INTO chat_rooms (name, room_type, created_by)
  VALUES (room_name, room_type, creator_id)
  RETURNING id INTO new_room_id;
  
  -- Add creator as admin
  INSERT INTO room_participants (room_id, user_id, role)
  VALUES (new_room_id, creator_id, 'admin');
  
  -- Add other participants as members
  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    -- Skip if participant is the creator (already added as admin)
    IF participant_id != creator_id THEN
      INSERT INTO room_participants (room_id, user_id, role)
      VALUES (new_room_id, participant_id, 'member')
      ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN new_room_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_chat_room_with_participants TO authenticated;
