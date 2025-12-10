-- Supabase Storage Setup
-- Run this in Supabase SQL Editor after creating the bucket

-- Create the videos bucket (do this in Supabase Dashboard first)
-- Storage > New bucket > Name: "videos" > Public: true

-- Storage policies for videos bucket
-- Allow anyone to read
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

-- Allow anyone to upload (change to authenticated only for production)
CREATE POLICY "Allow uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos');

-- Allow anyone to update their own files
CREATE POLICY "Allow updates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos');

-- Allow anyone to delete their own files
CREATE POLICY "Allow deletes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos');

