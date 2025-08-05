-- Create business settings table for revenue configuration
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for business settings
CREATE POLICY "Owners can manage business settings" 
ON public.business_settings 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Insert default revenue split settings
INSERT INTO public.business_settings (setting_key, setting_value, description) VALUES 
(
  'revenue_split', 
  '{"business_percentage": 50, "operator_percentage": 50, "split_type": "percentage", "minimum_business_cut_cents": 0, "minimum_operator_cut_cents": 0}'::jsonb,
  'Default revenue split configuration between business and operators'
),
(
  'pricing_structure',
  '{"base_price_cents": 3500, "per_bag_cents": 3500, "express_surcharge_cents": 1000, "currency": "USD"}'::jsonb,
  'Base pricing structure for laundry services'
);

-- Create trigger to update updated_at
CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate business cut for orders
CREATE OR REPLACE FUNCTION public.calculate_order_splits(order_total_cents integer)
RETURNS TABLE(business_cut_cents integer, operator_payout_cents integer)
LANGUAGE plpgsql
SECURITY DEFINER
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