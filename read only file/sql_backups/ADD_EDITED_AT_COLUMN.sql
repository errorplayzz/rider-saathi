-- Add edited_at column to messages table for tracking message edits
-- Run this in Supabase SQL Editor

-- Add edited_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN edited_at TIMESTAMPTZ;
    RAISE NOTICE 'Added edited_at column to messages table';
  ELSE
    RAISE NOTICE 'edited_at column already exists in messages table';
  END IF;
END $$;

-- Create an index for edited messages
CREATE INDEX IF NOT EXISTS messages_edited_at_idx ON public.messages(edited_at) WHERE edited_at IS NOT NULL;
