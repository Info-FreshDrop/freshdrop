-- Add TEST promo code if it doesn't exist
INSERT INTO public.promo_codes (code, discount_type, discount_value, description, is_active) 
VALUES ('TEST', 'percentage', 100, 'Test promo code for 100% discount - for testing payments', true)
ON CONFLICT (code) DO NOTHING;

-- Update orders table to include promo code tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER DEFAULT 0;