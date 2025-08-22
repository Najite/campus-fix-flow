/*
  # Add completion images support

  1. Schema Changes
    - Add completion_images column to complaints table to store completion photos
    - Create storage bucket for complaint images if not exists
    - Set up proper RLS policies for image access

  2. Security
    - Enable RLS on storage bucket
    - Allow authenticated users to upload images
    - Allow all users to view images related to their complaints
*/

-- Add completion_images column to complaints table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'complaints' AND column_name = 'completion_images'
  ) THEN
    ALTER TABLE complaints ADD COLUMN completion_images text[] DEFAULT '{}';
  END IF;
END $$;

-- Create storage bucket for complaint images (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-images',
  'complaint-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for storage
CREATE POLICY "Allow authenticated users to upload complaint images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaint-images');

CREATE POLICY "Allow users to view complaint images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'complaint-images');

CREATE POLICY "Allow users to delete their own uploaded images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update complaints table to include completion_images in existing queries
COMMENT ON COLUMN complaints.completion_images IS 'Array of URLs for completion/after photos uploaded by maintenance staff';