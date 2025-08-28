-- Create a test user directly using admin functions
-- This bypasses the edge function to test if the basic auth setup works

-- Insert a user directly into auth.users with a known ID
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'student@campus.edu',
  crypt('student123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test Student", "role": "student", "username": "student"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Insert the corresponding profile
INSERT INTO public.profiles (
  id,
  user_id,
  username,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'student',
  'Test Student',
  'student',
  NOW(),
  NOW()
);