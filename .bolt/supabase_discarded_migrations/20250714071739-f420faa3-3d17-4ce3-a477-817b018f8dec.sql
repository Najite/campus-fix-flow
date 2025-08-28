-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('student', 'admin', 'maintenance');
CREATE TYPE public.complaint_category AS ENUM ('plumbing', 'electrical', 'hvac', 'structural', 'cleaning', 'other');
CREATE TYPE public.complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.complaint_status AS ENUM ('submitted', 'assigned', 'in-progress', 'resolved', 'closed');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category complaint_category NOT NULL,
  priority complaint_priority NOT NULL DEFAULT 'medium',
  status complaint_status NOT NULL DEFAULT 'submitted',
  building TEXT NOT NULL,
  room_number TEXT NOT NULL,
  specific_location TEXT,
  images TEXT[] DEFAULT '{}',
  assigned_to UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create complaint notes table
CREATE TABLE public.complaint_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_notes ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_maintenance(user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'maintenance'
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for complaints
CREATE POLICY "Students can view their own complaints" ON public.complaints
  FOR SELECT USING (
    auth.uid() = student_id OR 
    public.is_admin(auth.uid()) OR 
    public.is_maintenance(auth.uid())
  );

CREATE POLICY "Students can create complaints" ON public.complaints
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own complaints" ON public.complaints
  FOR UPDATE USING (
    auth.uid() = student_id OR 
    public.is_admin(auth.uid()) OR 
    public.is_maintenance(auth.uid())
  );

CREATE POLICY "Admins and maintenance can update complaints" ON public.complaints
  FOR UPDATE USING (
    public.is_admin(auth.uid()) OR 
    public.is_maintenance(auth.uid())
  );

-- RLS Policies for chat messages
CREATE POLICY "Users can view chat messages for accessible complaints" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.complaints c 
      WHERE c.id = complaint_id AND (
        c.student_id = auth.uid() OR 
        public.is_admin(auth.uid()) OR 
        public.is_maintenance(auth.uid())
      )
    )
  );

CREATE POLICY "Users can create chat messages for accessible complaints" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.complaints c 
      WHERE c.id = complaint_id AND (
        c.student_id = auth.uid() OR 
        public.is_admin(auth.uid()) OR 
        public.is_maintenance(auth.uid())
      )
    )
  );

-- RLS Policies for complaint notes
CREATE POLICY "Users can view notes for accessible complaints" ON public.complaint_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.complaints c 
      WHERE c.id = complaint_id AND (
        c.student_id = auth.uid() OR 
        public.is_admin(auth.uid()) OR 
        public.is_maintenance(auth.uid())
      )
    )
  );

CREATE POLICY "Users can create notes for accessible complaints" ON public.complaint_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.complaints c 
      WHERE c.id = complaint_id AND (
        c.student_id = auth.uid() OR 
        public.is_admin(auth.uid()) OR 
        public.is_maintenance(auth.uid())
      )
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_complaints_student_id ON public.complaints(student_id);
CREATE INDEX idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_category ON public.complaints(category);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at);
CREATE INDEX idx_chat_messages_complaint_id ON public.chat_messages(complaint_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_complaint_notes_complaint_id ON public.complaint_notes(complaint_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);