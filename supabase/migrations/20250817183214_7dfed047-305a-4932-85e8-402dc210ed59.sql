-- Fix the security issue by adding proper search_path to the function
CREATE OR REPLACE FUNCTION public.update_price_display()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.price_display IS NULL OR NEW.price_display = '' THEN
    NEW.price_display := 'From $' || (NEW.base_price_cents / 100.0)::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;