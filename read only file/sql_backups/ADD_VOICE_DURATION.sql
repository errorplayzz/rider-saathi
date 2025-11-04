-- Add voice_duration column to messages table for voice messages
-- Run this in Supabase SQL Editor

-- Add voice_duration column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'voice_duration'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN voice_duration INTEGER;
    RAISE NOTICE 'Added voice_duration column to messages table';
  ELSE
    RAISE NOTICE 'voice_duration column already exists in messages table';
  END IF;
END $$;

-- Create an index for voice messages
CREATE INDEX IF NOT EXISTS messages_voice_type_idx ON public.messages(message_type) WHERE message_type = 'voice';
