-- Clean up existing sample profiles that aren't linked to auth users
DELETE FROM profiles WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');

-- Remove password_hash and email columns from profiles since they should be in auth.users
ALTER TABLE profiles DROP COLUMN IF EXISTS password_hash;
ALTER TABLE profiles DROP COLUMN IF EXISTS email;

-- Add user_id column to link profiles to auth.users if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;