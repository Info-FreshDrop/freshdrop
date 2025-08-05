-- Fix the function to include proper search path security
CREATE OR REPLACE FUNCTION public.calculate_order_splits(order_total_cents integer)
RETURNS TABLE(business_cut_cents integer, operator_payout_cents integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings jsonb;
  business_percentage integer;
  operator_percentage integer;
  calculated_business_cut integer;
  calculated_operator_cut integer;
BEGIN
  -- Get current revenue split settings
  SELECT setting_value INTO settings 
  FROM public.business_settings 
  WHERE setting_key = 'revenue_split';
  
  -- Extract percentages (default to 50/50 if not found)
  business_percentage := COALESCE((settings->>'business_percentage')::integer, 50);
  operator_percentage := COALESCE((settings->>'operator_percentage')::integer, 50);
  
  -- Calculate splits
  calculated_business_cut := (order_total_cents * business_percentage / 100);
  calculated_operator_cut := (order_total_cents * operator_percentage / 100);
  
  -- Ensure total doesn't exceed order total due to rounding
  IF (calculated_business_cut + calculated_operator_cut) > order_total_cents THEN
    calculated_operator_cut := order_total_cents - calculated_business_cut;
  END IF;
  
  RETURN QUERY SELECT calculated_business_cut, calculated_operator_cut;
END;
$$;