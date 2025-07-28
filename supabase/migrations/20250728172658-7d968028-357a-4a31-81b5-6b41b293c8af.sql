-- Update revenue split to 50/50 between business and operators
UPDATE public.orders 
SET 
  operator_payout_cents = FLOOR(total_amount_cents * 0.5),
  business_cut_cents = FLOOR(total_amount_cents * 0.5)
WHERE total_amount_cents > 0;