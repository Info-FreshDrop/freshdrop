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
-- First check if the table exists
CREATE TABLE IF NOT EXISTS public.operator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  drivers_license text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on operator applications
ALTER TABLE public.operator_applications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies and create secure ones
DROP POLICY IF EXISTS "Everyone can view all applications" ON public.operator_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.operator_applications;
DROP POLICY IF EXISTS "Owners can manage all applications" ON public.operator_applications;

CREATE POLICY "Users can view their own application" ON public.operator_applications
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR is_admin_role(auth.uid()));

CREATE POLICY "Users can create their own application" ON public.operator_applications
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own application" ON public.operator_applications
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can manage all applications" ON public.operator_applications
FOR ALL 
TO authenticated
USING (is_admin_role(auth.uid()));

-- Fix Profiles table - ensure it exists and has proper policies
-- The table should already exist, but let's ensure it's properly secured
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- These policies were already fixed in the previous migration, but double-check
-- Drop any remaining public policies
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;

-- Ensure only authenticated users can access profiles
-- The policies should already be in place from the previous migration, but verify they're correct