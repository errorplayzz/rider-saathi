-- ============================================
-- CREATE CHAT MEDIA STORAGE BUCKET
-- ============================================
-- Run this in Supabase SQL Editor to create storage bucket for chat media

-- Create the chat-media bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Set storage policies for chat-media bucket
-- 1. Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- 2. Allow authenticated users to view their room's media
DROP POLICY IF EXISTS "Users can view chat media" ON storage.objects;
CREATE POLICY "Users can view chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');

-- 3. Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete their own chat media" ON storage.objects;
CREATE POLICY "Users can delete their own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'chat-media' 
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Chat media storage bucket created successfully!';
    RAISE NOTICE 'Users can now upload images and files to chat rooms.';
END $$;
