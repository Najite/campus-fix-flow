/*
  # Create storage bucket for complaint images

  1. Storage Setup
    - Create `complaint-images` bucket for storing all complaint-related images
    - Set up proper RLS policies for secure access
    - Configure bucket for public access to images

  2. Security
    - Enable RLS on storage objects
    - Allow authenticated users to upload images
    - Allow public read access to images
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-images',
  'complaint-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload complaint images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaint-images');

-- Policy to allow authenticated users to view images
CREATE POLICY "Allow authenticated users to view complaint images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'complaint-images');

-- Policy to allow public read access to images (for sharing)
CREATE POLICY "Allow public read access to complaint images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'complaint-images');

-- Policy to allow users to delete their own uploaded images
CREATE POLICY "Allow users to delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);