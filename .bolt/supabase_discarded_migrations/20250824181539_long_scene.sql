/*
  # Create complaint images storage bucket

  1. Storage Setup
    - Create `complaint-images` storage bucket if it doesn't exist
    - Set up RLS policies for authenticated users to upload
    - Allow public read access for viewing images

  2. Security
    - Only authenticated users can upload images
    - Public read access for complaint images
    - File size and type restrictions handled in application layer
*/

-- Create the complaint-images bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'complaint-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('complaint-images', 'complaint-images', true);
  END IF;
END $$;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload complaint images'
  ) THEN
    CREATE POLICY "Authenticated users can upload complaint images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'complaint-images');
  END IF;
END $$;

-- Create policy for public read access to complaint images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for complaint images'
  ) THEN
    CREATE POLICY "Public read access for complaint images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'complaint-images');
  END IF;
END $$;

-- Create policy for authenticated users to update their own uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own complaint images'
  ) THEN
    CREATE POLICY "Users can update their own complaint images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Create policy for authenticated users to delete their own uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own complaint images'
  ) THEN
    CREATE POLICY "Users can delete their own complaint images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;