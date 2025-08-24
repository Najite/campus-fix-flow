/*
  # Add completion images column to complaints table

  1. Schema Changes
    - Add completion_images column to store URLs of completion photos
    - Set default to empty array

  2. Purpose
    - Store completion photos uploaded by maintenance staff
    - Allow tracking of before/after images for complaints
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

-- Add index for better query performance on completion images
CREATE INDEX IF NOT EXISTS idx_complaints_completion_images 
ON complaints USING GIN (completion_images);

-- Add comment to document the column purpose
COMMENT ON COLUMN complaints.completion_images IS 'URLs of completion photos uploaded by maintenance staff when work is completed';