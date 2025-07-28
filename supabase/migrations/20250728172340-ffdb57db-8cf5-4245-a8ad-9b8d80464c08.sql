-- Add columns to track revenue split between business and operators
ALTER TABLE public.orders 
ADD COLUMN operator_payout_cents INTEGER DEFAULT 0,
ADD COLUMN business_cut_cents INTEGER DEFAULT 0;

-- Update existing orders to calculate split (assuming 70% to operator, 30% to business)
UPDATE public.orders 
SET 
  operator_payout_cents = FLOOR(total_amount_cents * 0.7),
  business_cut_cents = FLOOR(total_amount_cents * 0.3)
WHERE total_amount_cents > 0;