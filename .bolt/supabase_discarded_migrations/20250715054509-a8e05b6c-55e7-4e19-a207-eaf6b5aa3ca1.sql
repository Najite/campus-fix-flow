-- Allow admins to insert profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()) OR auth.uid() = user_id);

-- Create a function for admins to create users
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_role user_role DEFAULT 'student',
  user_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Check if the calling user is an admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Generate a UUID for the new user
  new_user_id := gen_random_uuid();

  -- Insert into profiles table (auth user creation will be handled by the frontend)
  INSERT INTO public.profiles (user_id, username, name, role, phone)
  VALUES (new_user_id, user_email, user_name, user_role, user_phone);

  -- Return the user data
  SELECT json_build_object(
    'user_id', new_user_id,
    'email', user_email,
    'name', user_name,
    'role', user_role,
    'phone', user_phone
  ) INTO result;

  RETURN result;
END;
$$;

-- Insert sample complaints data
INSERT INTO public.complaints (
  student_id,
  title,
  description,
  category,
  priority,
  building,
  room_number,
  specific_location,
  status
) VALUES 
-- We'll use placeholder UUIDs that will be replaced with actual user IDs
('00000000-0000-0000-0000-000000000001', 'Broken faucet in bathroom', 'The main faucet in the bathroom is leaking continuously and won''t shut off properly.', 'plumbing', 'medium', 'Building A', '101', 'Main bathroom', 'submitted'),
('00000000-0000-0000-0000-000000000001', 'Air conditioning not working', 'The AC unit in the room has stopped working completely. Room is getting very hot.', 'hvac', 'high', 'Building A', '101', 'Main room', 'assigned'),
('00000000-0000-0000-0000-000000000001', 'Electrical outlet sparking', 'The outlet near the desk is making sparking sounds and appears dangerous.', 'electrical', 'urgent', 'Building A', '101', 'Near desk area', 'in-progress'),
('00000000-0000-0000-0000-000000000001', 'Door lock broken', 'The main door lock is jammed and won''t open or close properly.', 'structural', 'high', 'Building A', '101', 'Main entrance', 'resolved'),
('00000000-0000-0000-0000-000000000001', 'Room needs deep cleaning', 'Room hasn''t been properly cleaned in weeks, needs thorough cleaning.', 'cleaning', 'low', 'Building A', '101', 'Entire room', 'closed');

-- Update the handle_new_user function to properly handle the username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;