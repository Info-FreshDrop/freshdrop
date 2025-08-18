-- CRITICAL SECURITY FIX: Add missing RLS policies to exposed tables

-- 1. Profiles table - users can only access their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (is_admin_role(auth.uid()));

-- 2. Washers table - operators can manage their own washer profile
CREATE POLICY "Operators can view their own washer profile" 
ON public.washers 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin_role(auth.uid()));

CREATE POLICY "Operators can update their own washer profile" 
ON public.washers 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Operators can insert their own washer profile" 
ON public.washers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all washers" 
ON public.washers 
FOR ALL 
USING (is_admin_role(auth.uid()));

-- 3. Operator Applications table - users can only see their own applications
CREATE POLICY "Users can view their own operator applications" 
ON public.operator_applications 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin_role(auth.uid()));

CREATE POLICY "Users can create their own operator applications" 
ON public.operator_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operator applications" 
ON public.operator_applications 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all operator applications" 
ON public.operator_applications 
FOR ALL 
USING (is_admin_role(auth.uid()));

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_applications ENABLE ROW LEVEL SECURITY;