/*
  # Create complaint images storage bucket

  1. Storage Setup
    - Create `complaint-images` bucket for storing all complaint-related images
    - Set up proper RLS policies for secure access
    - Configure bucket for public access to images

  2. Security
    - Enable RLS on storage objects
    - Allow authenticated users to upload images
    - Allow public read access to images
    - File size and type restrictions handled in application layer
*/

-- Create the complaint-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-images',
  'complaint-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload complaint images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaint-images');

-- Policy: Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their own complaint images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'complaint-images' AND auth.uid()::text = owner);

-- Policy: Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own complaint images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'complaint-images' AND auth.uid()::text = owner);

-- Policy: Allow public read access to all complaint images
CREATE POLICY "Public read access to complaint images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'complaint-images');