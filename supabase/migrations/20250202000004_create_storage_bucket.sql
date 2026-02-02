-- Phase 3: Create Storage Bucket for Card Uploads
-- This migration creates the card-uploads bucket and RLS policies

-- ============================================================================
-- 1. Create Storage Bucket
-- ============================================================================
-- Note: Buckets cannot be created via SQL in Supabase.
-- This section documents the required bucket configuration.
--
-- CREATE BUCKET VIA DASHBOARD:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create new bucket named: "card-uploads"
-- 3. Set to PRIVATE (not public)
-- 4. File size limit: 10MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp, image/heic

-- ============================================================================
-- 2. Storage RLS Policies
-- ============================================================================
-- These policies must be applied AFTER creating the bucket in Dashboard

-- Policy: Users can upload files to their own folder
-- Path pattern: {user_id}/{filename}
CREATE POLICY "Users can upload own card images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'card-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can view their own files
CREATE POLICY "Users can view own card images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'card-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own card images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'card-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own files (for replacing)
CREATE POLICY "Users can update own card images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'card-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'card-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON POLICY "Users can upload own card images" ON storage.objects IS
  'Allows authenticated users to upload images to their own folder (user_id/filename)';
COMMENT ON POLICY "Users can view own card images" ON storage.objects IS
  'Allows authenticated users to view/download their own uploaded images';
COMMENT ON POLICY "Users can delete own card images" ON storage.objects IS
  'Allows authenticated users to delete their own uploaded images';
COMMENT ON POLICY "Users can update own card images" ON storage.objects IS
  'Allows authenticated users to replace/update their own uploaded images';
