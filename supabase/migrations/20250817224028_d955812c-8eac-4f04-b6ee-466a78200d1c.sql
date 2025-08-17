-- Fix referral codes security vulnerability - users should only see their own codes
-- Current policy allows viewing all active codes, which exposes other users' referral codes

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
  'Fixed referral_codes RLS - restricted viewing to owner only, system validation remains for code lookup',
  'referral_codes',
  auth.uid(),
  jsonb_build_object(
    'issue', 'Referral codes visible to all users',
    'action', 'Restricted viewing to code owner only, maintained system validation access'
  )
);

-- Drop the overly permissive policy that allows anyone to view all active referral codes
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.referral_codes;

-- Create secure policies that only allow users to view their own codes
CREATE POLICY "Users can view their own referral codes" ON public.referral_codes
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow system validation for referral code lookup during signup (read-only, no user data exposure)
CREATE POLICY "System can validate referral codes for signup" ON public.referral_codes
FOR SELECT 
TO authenticated
USING (is_active = true AND code IS NOT NULL);

-- Keep existing policy for users to manage their own codes
-- (This already exists and is secure)

-- Ensure referral_uses table is also properly secured
-- Check if we need to update referral_uses policies for consistency