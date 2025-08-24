/*
  # Add completion images column to complaints table

  1. Schema Changes
    - Add `completion_images` column to store URLs of completion photos
    - Set default to empty array

  2. Purpose
    - Store completion photos uploaded by maintenance staff
    - Allow tracking of before/after images for complaints
*/

-- Add completion_images column to complaints table
ALTER TABLE complaints 
ADD COLUMN IF NOT EXISTS completion_images text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN complaints.completion_images IS 'URLs of images uploaded by maintenance staff showing completed work';