-- Fix Critical Security Issues: Properly handle existing policies

-- 1. Fix operator_applications table policies
DROP POLICY IF EXISTS "Owners can manage all applications" ON public.operator_applications;
DROP POLICY IF EXISTS "Anyone can create applications" ON public.operator_applications;

CREATE POLICY "Owners can manage all applications" 
ON public.operator_applications 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Authenticated users can create applications" 
ON public.operator_applications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix operator_invites table - restrict token-based access
DROP POLICY IF EXISTS "Anyone can view invites by token" ON public.operator_invites;
DROP POLICY IF EXISTS "Token-based invite lookup only" ON public.operator_invites;

CREATE POLICY "Token-based invite lookup only" 
ON public.operator_invites 
FOR SELECT 
USING (
  -- Only allow access if invite is not expired and not used
  signup_expires_at > now() AND is_used = false
);

-- 3. Add rate limiting table for enhanced security
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  action text NOT NULL, -- login, signup, password_reset, etc.
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, action)
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true);

-- 4. Add security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (is_admin_role(auth.uid()));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);