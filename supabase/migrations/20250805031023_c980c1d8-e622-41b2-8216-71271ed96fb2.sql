-- Backfill missing promo code usage records
INSERT INTO public.promo_code_usage (promo_code_id, user_id, order_id, used_at)
SELECT 
  pc.id as promo_code_id,
  o.customer_id as user_id,
  o.id as order_id,
  o.created_at as used_at
FROM public.orders o
JOIN public.promo_codes pc ON pc.code = o.promo_code
WHERE o.promo_code IS NOT NULL
  AND o.discount_amount_cents > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.promo_code_usage pcu 
    WHERE pcu.order_id = o.id
  );