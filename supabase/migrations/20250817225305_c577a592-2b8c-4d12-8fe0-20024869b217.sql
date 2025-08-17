-- FINAL SECURITY CLEANUP - Remove all public access policies
-- This addresses the remaining critical security vulnerabilities

-- Clean up Subscribers table - Remove all public policies
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create secure authenticated-only policies for subscribers
CREATE POLICY "Users can view their own subscription" ON public.subscribers
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR auth.email() = email OR is_admin_role(auth.uid()));

CREATE POLICY "Users can insert their own subscription" ON public.subscribers
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.email() = email);

CREATE POLICY "Users can update their own subscription" ON public.subscribers
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR auth.email() = email)
WITH CHECK (auth.uid() = user_id OR auth.email() = email);

-- Clean up Profiles table - Remove all public policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create secure authenticated-only policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR is_admin_role(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Clean up Operator Applications - Fix the INSERT policy to have proper WITH CHECK
DROP POLICY IF EXISTS "Users can create applications" ON public.operator_applications;

CREATE POLICY "Users can create applications" ON public.operator_applications
FOR INSERT 
TO authenticated
WITH CHECK (auth.email() = email);