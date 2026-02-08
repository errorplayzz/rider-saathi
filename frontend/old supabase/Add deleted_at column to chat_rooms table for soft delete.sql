-- Add deleted_at column to chat_rooms table for soft delete
-- Run this in Supabase SQL Editor

-- Add deleted_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_rooms' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.chat_rooms ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE 'Added deleted_at column to chat_rooms table';
  ELSE
    RAISE NOTICE 'deleted_at column already exists in chat_rooms table';
  END IF;
END $$;

-- Create an index for deleted rooms
CREATE INDEX IF NOT EXISTS chat_rooms_deleted_at_idx ON public.chat_rooms(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update the query to filter out deleted rooms
-- You may want to add this to your queries:
-- SELECT * FROM chat_rooms WHERE is_active = true AND deleted_at IS NULL;
