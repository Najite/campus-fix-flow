-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Fix database functions search path
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_maintenance(user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'maintenance'
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create basic RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for complaints
CREATE POLICY "Students can view their own complaints" ON complaints
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can create complaints" ON complaints
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Maintenance can view assigned complaints" ON complaints
  FOR SELECT USING (auth.uid() = assigned_to OR public.is_maintenance(auth.uid()));

CREATE POLICY "Admin can view all complaints" ON complaints
  FOR ALL USING (public.is_admin(auth.uid()));

-- Policies for complaint notes and chat
CREATE POLICY "Users can view related complaint notes" ON complaint_notes
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM complaints WHERE id = complaint_id AND (student_id = auth.uid() OR assigned_to = auth.uid())) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users can create complaint notes" ON complaint_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view related chat messages" ON chat_messages
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM complaints WHERE id = complaint_id AND (student_id = auth.uid() OR assigned_to = auth.uid())) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users can create chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);