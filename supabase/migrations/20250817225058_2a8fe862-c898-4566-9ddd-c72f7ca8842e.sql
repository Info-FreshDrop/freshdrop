-- FIX REMAINING CRITICAL SECURITY VULNERABILITIES
-- Address the 3 critical errors found in the security scan

-- Fix Subscribers table - CRITICAL: Contains customer emails and Stripe IDs
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

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

-- Fix Operator Applications table - CRITICAL: Contains sensitive personal data
-- The operator_applications table doesn't have user_id, so we need different approach
ALTER TABLE public.operator_applications ENABLE ROW LEVEL SECURITY;

-- Drop any existing dangerous policies
DROP POLICY IF EXISTS "Everyone can view all applications" ON public.operator_applications;
DROP POLICY IF EXISTS "Public can view applications" ON public.operator_applications;
DROP POLICY IF EXISTS "All can view operator applications" ON public.operator_applications;

-- Create secure policies based on email matching (since no user_id column)
CREATE POLICY "Admins can manage all applications" ON public.operator_applications
FOR ALL 
TO authenticated
USING (is_admin_role(auth.uid()));

CREATE POLICY "Users can view their own application by email" ON public.operator_applications
FOR SELECT 
TO authenticated
USING (auth.email() = email OR is_admin_role(auth.uid()));

CREATE POLICY "Users can create applications" ON public.operator_applications
FOR INSERT 
TO authenticated
WITH CHECK (auth.email() = email);

CREATE POLICY "Users can update their own application by email" ON public.operator_applications
FOR UPDATE 
TO authenticated
USING (auth.email() = email)
WITH CHECK (auth.email() = email);

-- Fix Profiles table - ensure no public access policies remain
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any remaining public policies that might exist
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "All can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;

-- The secure policies should already be in place from previous migration
-- but let's ensure they exist
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);