-- CLEAN UP DUPLICATE POLICIES AND FIX REMAINING SECURITY ISSUES
-- Remove duplicate and insecure public policies

-- Fix Profiles table - Remove all public policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Keep only the secure authenticated policies (already exist)
-- No need to recreate as they already exist

-- Fix Subscribers table - Remove public policies and create proper authenticated ones
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

-- Fix Operator Applications - The policies are mostly correct but ensure they're not duplicated
-- No changes needed as the current policies are secure with authenticated role