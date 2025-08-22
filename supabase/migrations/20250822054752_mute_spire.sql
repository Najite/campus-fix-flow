/*
# Create storage bucket for complaint images

1. Storage Setup
   - Create `complaint-images` bucket for storing uploaded images
   - Set up public access policies for viewing images
   - Configure upload policies for authenticated users

2. Security
   - Only authenticated users can upload images
   - Images are publicly viewable once uploaded
   - File size and type restrictions handled in frontend
*/

-- Create storage bucket for complaint images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-images',
  'complaint-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload complaint images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaint-images');

-- Allow public access to view images
CREATE POLICY "Public can view complaint images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'complaint-images');

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their own complaint images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);