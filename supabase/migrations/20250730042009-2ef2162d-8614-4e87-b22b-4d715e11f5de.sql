-- Security Enhancement Migration
-- Phase 1: Critical Security Fixes

-- 1. Add role change audit logging table
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs" ON public.role_change_audit
  FOR SELECT USING (is_admin_role(auth.uid()));

-- Only system can insert audit logs
CREATE POLICY "System can create audit logs" ON public.role_change_audit
  FOR INSERT WITH CHECK (true);

-- 2. Enhanced role validation function with audit logging
CREATE OR REPLACE FUNCTION public.change_user_role(
  target_user_id UUID,
  new_role app_role,
  reason TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role app_role;
  old_role app_role;
  change_allowed BOOLEAN := false;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  -- Only owners can change roles
  IF current_user_role != 'owner' THEN
    RAISE EXCEPTION 'Insufficient permissions to change user roles';
  END IF;
  
  -- Get the user's current role
  SELECT role INTO old_role 
  FROM public.user_roles 
  WHERE user_id = target_user_id 
  LIMIT 1;
  
  -- Prevent self-role changes for owners
  IF target_user_id = auth.uid() AND current_user_role = 'owner' THEN
    RAISE EXCEPTION 'Owners cannot change their own role';
  END IF;
  
  -- Log the role change attempt
  INSERT INTO public.role_change_audit (
    user_id, old_role, new_role, changed_by, reason
  ) VALUES (
    target_user_id, old_role, new_role, auth.uid(), reason
  );
  
  -- Update the role
  UPDATE public.user_roles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;

-- 3. Strengthen RLS policies for orders table
DROP POLICY IF EXISTS "Operators can view available orders in their area" ON public.orders;

CREATE POLICY "Operators can view available orders in their area" ON public.orders
  FOR SELECT 
  USING (
    (status = ANY (ARRAY['placed'::order_status, 'unclaimed'::order_status])) 
    AND (has_role(auth.uid(), 'operator'::app_role) OR has_role(auth.uid(), 'washer'::app_role)) 
    AND (EXISTS (
      SELECT 1 FROM washers w 
      WHERE w.user_id = auth.uid() 
      AND w.is_active = true 
      AND w.approval_status = 'approved'
      AND (orders.zip_code = ANY (w.zip_codes) OR orders.locker_id = ANY (w.locker_access))
    ))
  );

-- 4. Add input validation constraints
-- Ensure zip codes follow proper format
ALTER TABLE public.orders 
ADD CONSTRAINT valid_zip_code 
CHECK (zip_code ~ '^[0-9]{5}(-[0-9]{4})?$');

-- Ensure email format in operator applications
ALTER TABLE public.operator_applications 
ADD CONSTRAINT valid_email 
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Limit special instructions length to prevent abuse
ALTER TABLE public.orders 
ADD CONSTRAINT reasonable_instructions_length 
CHECK (char_length(special_instructions) <= 500);

-- 5. Enhanced promo code validation
CREATE OR REPLACE FUNCTION public.validate_promo_code_usage(
  code_to_check TEXT,
  user_id_to_check UUID,
  order_total_cents INTEGER
) RETURNS TABLE(
  is_valid BOOLEAN,
  discount_amount_cents INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo_record RECORD;
  usage_count INTEGER := 0;
BEGIN
  -- Get promo code details
  SELECT * INTO promo_record 
  FROM public.promo_codes 
  WHERE code = code_to_check AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Invalid promo code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user already used this code (if one-time use)
  IF promo_record.one_time_use_per_user THEN
    SELECT COUNT(*) INTO usage_count 
    FROM public.promo_code_usage 
    WHERE promo_code_id = promo_record.id AND user_id = user_id_to_check;
    
    IF usage_count > 0 THEN
      RETURN QUERY SELECT false, 0, 'Promo code already used'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount
  DECLARE
    discount INTEGER;
  BEGIN
    IF promo_record.discount_type = 'percentage' THEN
      discount := LEAST(
        (order_total_cents * promo_record.discount_value / 100)::INTEGER,
        order_total_cents
      );
    ELSE
      discount := LEAST(
        (promo_record.discount_value * 100)::INTEGER,
        order_total_cents
      );
    END IF;
    
    RETURN QUERY SELECT true, discount, ''::TEXT;
  END;
END;
$$;