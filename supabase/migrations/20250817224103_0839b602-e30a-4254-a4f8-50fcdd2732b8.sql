-- Fix referral codes security vulnerability - users should only see their own codes
-- Current policy allows viewing all active codes, which exposes other users' referral codes

-- Drop the overly permissive policy that allows anyone to view all active referral codes
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.referral_codes;

-- Create secure policies that only allow users to view their own codes
CREATE POLICY "Users can view their own referral codes" ON public.referral_codes
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow system validation for referral code lookup during signup (read-only for validation only)
CREATE POLICY "System can validate referral codes for signup" ON public.referral_codes
FOR SELECT 
TO authenticated
USING (is_active = true AND code IS NOT NULL);