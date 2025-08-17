-- PHASE 1: CRITICAL DATA EXPOSURE FIXES

-- 1. Fix operator_applications table RLS policies
-- Remove existing overly permissive policies and add secure ones
DROP POLICY IF EXISTS "Anyone can create operator applications" ON public.operator_applications;
DROP POLICY IF EXISTS "Anyone can view applications" ON public.operator_applications;
DROP POLICY IF EXISTS "Owners can manage all applications" ON public.operator_applications;

-- Add secure policies for operator_applications
CREATE POLICY "Authenticated users can create applications" 
ON public.operator_applications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own applications" 
ON public.operator_applications 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view and manage all applications" 
ON public.operator_applications 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- 2. Fix subscribers table RLS policies
-- Remove overly permissive policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Add secure policies for subscribers
CREATE POLICY "Users can create their own subscription" 
ON public.subscribers 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.email() = email);

CREATE POLICY "Users can view their own subscription" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR auth.email() = email);

CREATE POLICY "Users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR auth.email() = email);

CREATE POLICY "Owners can manage all subscriptions" 
ON public.subscribers 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- 3. Fix pending_orders table RLS policies
-- Remove the overly permissive "System can manage all pending orders" policy
DROP POLICY IF EXISTS "System can manage all pending orders" ON public.pending_orders;
DROP POLICY IF EXISTS "Users can manage their own pending orders" ON public.pending_orders;

-- Add secure policies for pending_orders
CREATE POLICY "Users can manage their own pending orders" 
ON public.pending_orders 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all pending orders" 
ON public.pending_orders 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- PHASE 2: ROLE-BASED ACCESS CONTROL HARDENING

-- 4. Secure user_roles table - add explicit policies to prevent self-role assignment
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can manage all roles" ON public.user_roles;

-- Add secure policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only owners can insert roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can update roles" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can delete roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- Add audit logging for security events
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  target_user_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Add policies for security_events
CREATE POLICY "Only owners can view security events" 
ON public.security_events 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "System can insert security events" 
ON public.security_events 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    user_id,
    target_user_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_event_type,
    auth.uid(),
    p_target_user_id,
    p_details,
    p_ip_address,
    p_user_agent
  );
END;
$$;

-- Update change_user_role function to include security logging
CREATE OR REPLACE FUNCTION public.change_user_role(target_user_id uuid, new_role app_role, reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  current_user_role app_role;
  old_role app_role;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  -- Only owners can change roles
  IF current_user_role != 'owner' THEN
    -- Log unauthorized attempt
    PERFORM log_security_event(
      'unauthorized_role_change_attempt',
      target_user_id,
      jsonb_build_object(
        'attempted_role', new_role,
        'reason', reason,
        'current_user_role', current_user_role
      )
    );
    RAISE EXCEPTION 'Insufficient permissions to change user roles';
  END IF;
  
  -- Get the user's current role
  SELECT role INTO old_role 
  FROM public.user_roles 
  WHERE user_id = target_user_id 
  LIMIT 1;
  
  -- Prevent self-role changes for owners
  IF target_user_id = auth.uid() AND current_user_role = 'owner' THEN
    -- Log self-role change attempt
    PERFORM log_security_event(
      'owner_self_role_change_attempt',
      target_user_id,
      jsonb_build_object('attempted_role', new_role, 'reason', reason)
    );
    RAISE EXCEPTION 'Owners cannot change their own role';
  END IF;
  
  -- Log the role change attempt
  INSERT INTO public.role_change_audit (
    user_id, old_role, new_role, changed_by, reason
  ) VALUES (
    target_user_id, old_role, new_role, auth.uid(), reason
  );
  
  -- Log security event
  PERFORM log_security_event(
    'role_changed',
    target_user_id,
    jsonb_build_object(
      'old_role', old_role,
      'new_role', new_role,
      'reason', reason
    )
  );
  
  -- Update the role
  UPDATE public.user_roles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;