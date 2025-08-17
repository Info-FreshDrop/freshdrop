-- Fix the security issue by setting search_path for the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.pending_orders 
  WHERE expires_at < now();
END;
$$;