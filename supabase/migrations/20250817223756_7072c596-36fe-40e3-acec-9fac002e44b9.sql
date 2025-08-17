-- Fix security vulnerability: Customer Order Data and Addresses Exposed
-- Remove overly permissive policy and implement proper RLS for pending_orders table

-- Log this security fix
INSERT INTO security_events (
  event_type,
  severity,
  description,
  table_affected,
  user_id,
  metadata
) VALUES (
  'policy_update',
  'high',
  'Fixed pending_orders table RLS - removed overly permissive policy exposing customer addresses',
  'pending_orders',
  auth.uid(),
  jsonb_build_object(
    'issue', 'Customer Order Data and Addresses Exposed',
    'action', 'Removed system-wide access policy, restricted to owner and admin only'
  )
);

-- Drop the overly permissive policy that allows any authenticated user to access all pending orders
DROP POLICY IF EXISTS "System can manage all pending orders" ON public.pending_orders;

-- Keep the existing policy for users to manage their own pending orders
-- (This policy already exists and is secure: users can only access their own orders)

-- Add policy for admin users to manage pending orders when needed for support
CREATE POLICY "Admins can manage all pending orders" ON public.pending_orders
FOR ALL 
TO authenticated
USING (is_admin_role(auth.uid()))
WITH CHECK (is_admin_role(auth.uid()));

-- Ensure the user_id column is properly set on inserts to prevent policy violations
-- Update the existing user policy to ensure proper user_id validation on insert
DROP POLICY IF EXISTS "Users can manage their own pending orders" ON public.pending_orders;

-- Recreate with stricter validation
CREATE POLICY "Users can view their own pending orders" ON public.pending_orders
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending orders" ON public.pending_orders
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders" ON public.pending_orders
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending orders" ON public.pending_orders
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);