-- AGGRESSIVE SECURITY CLEANUP - Drop ALL policies and recreate securely

-- Drop ALL existing policies on critical tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on subscribers table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'subscribers' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscribers', pol.policyname);
    END LOOP;
    
    -- Drop all policies on profiles table  
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
    
    -- Drop all policies on operator_applications table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'operator_applications' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.operator_applications', pol.policyname);
    END LOOP;
END
$$;

-- Create secure authenticated-only policies for SUBSCRIBERS
CREATE POLICY "subscribers_select_own" ON public.subscribers
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR auth.email() = email OR is_admin_role(auth.uid()));

CREATE POLICY "subscribers_insert_own" ON public.subscribers
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.email() = email);

CREATE POLICY "subscribers_update_own" ON public.subscribers
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR auth.email() = email)
WITH CHECK (auth.uid() = user_id OR auth.email() = email);

-- Create secure authenticated-only policies for PROFILES
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR is_admin_role(auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create secure authenticated-only policies for OPERATOR APPLICATIONS
CREATE POLICY "operator_apps_select_own" ON public.operator_applications
FOR SELECT 
TO authenticated
USING (auth.email() = email OR is_admin_role(auth.uid()));

CREATE POLICY "operator_apps_insert_own" ON public.operator_applications
FOR INSERT 
TO authenticated
WITH CHECK (auth.email() = email);

CREATE POLICY "operator_apps_update_own" ON public.operator_applications
FOR UPDATE 
TO authenticated
USING (auth.email() = email)
WITH CHECK (auth.email() = email);

CREATE POLICY "operator_apps_admin_manage" ON public.operator_applications
FOR ALL 
TO authenticated
USING (is_admin_role(auth.uid()));