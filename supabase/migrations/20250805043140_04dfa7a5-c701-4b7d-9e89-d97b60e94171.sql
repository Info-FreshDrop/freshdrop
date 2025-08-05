-- Add clothing shop and tips revenue split settings to business_settings
INSERT INTO public.business_settings (setting_key, setting_value, description) VALUES 
(
  'clothing_shop_split',
  '{"business_percentage": 100, "operator_percentage": 0}',
  'Revenue split configuration for clothing shop sales'
),
(
  'tips_split',
  '{"business_percentage": 0, "operator_percentage": 100}',
  'Revenue split configuration for customer tips'
) ON CONFLICT (setting_key) DO NOTHING;