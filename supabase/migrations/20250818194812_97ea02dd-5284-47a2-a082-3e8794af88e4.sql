-- SECURITY FIX: Add security monitoring and audit improvements

-- 1. Create security audit function for admin actions
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_user_agent text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    details,
    user_agent,
    ip_address
  ) VALUES (
    auth.uid(),
    p_action,
    p_details,
    p_user_agent,
    p_ip_address
  );
END;
$$;

-- 2. Add trigger for role changes to log security events
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log role change event
  PERFORM public.log_security_event(
    'role_change',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'old_role', OLD.role,
      'new_role', NEW.role,
      'changed_by', auth.uid()
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for role changes
DROP TRIGGER IF EXISTS log_role_change_trigger ON public.user_roles;
CREATE TRIGGER log_role_change_trigger
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- 3. Enhanced rate limiting for sensitive operations
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  attempt_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit entries
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
  
  -- Count attempts in current window
  SELECT COUNT(*) INTO attempt_count
  FROM public.rate_limits
  WHERE identifier = p_identifier 
    AND action = p_action 
    AND window_start > window_start;
  
  -- If under limit, record attempt and allow
  IF attempt_count < p_max_attempts THEN
    INSERT INTO public.rate_limits (identifier, action, attempts, window_start)
    VALUES (p_identifier, p_action, 1, now())
    ON CONFLICT (identifier, action) 
    DO UPDATE SET 
      attempts = public.rate_limits.attempts + 1,
      window_start = CASE 
        WHEN public.rate_limits.window_start < window_start THEN now()
        ELSE public.rate_limits.window_start
      END;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;