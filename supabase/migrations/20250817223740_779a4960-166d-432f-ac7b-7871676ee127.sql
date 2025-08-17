-- Fix critical security vulnerability in operator_applications table
-- Remove overly permissive policy and add proper access controls

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can create applications" ON public.operator_applications;

-- Create secure policies that protect sensitive PII data
CREATE POLICY "Users can create applications" 
ON public.operator_applications 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can view their own applications" 
ON public.operator_applications 
FOR SELECT 
TO authenticated 
USING (email = auth.email());

CREATE POLICY "Users can update their own applications" 
ON public.operator_applications 
FOR UPDATE 
TO authenticated 
USING (email = auth.email())
WITH CHECK (email = auth.email());