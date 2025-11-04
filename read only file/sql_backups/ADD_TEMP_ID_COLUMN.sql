-- ============================================
-- QUICK FIX: Add temp_id column to messages
-- ============================================
-- Run this in Supabase SQL Editor to fix the error

-- Add temp_id column for optimistic UI updates
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS temp_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS messages_temp_id_idx ON messages(temp_id) WHERE temp_id IS NOT NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ temp_id column added successfully!';
    RAISE NOTICE 'You can now send messages with optimistic UI updates.';
END $$;
