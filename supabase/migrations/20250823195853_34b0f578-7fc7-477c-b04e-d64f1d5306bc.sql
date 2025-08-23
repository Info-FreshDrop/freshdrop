-- Remove unused payment fields from washers table
ALTER TABLE public.washers 
DROP COLUMN IF EXISTS hourly_rate_cents,
DROP COLUMN IF EXISTS base_pay_per_order_cents,
DROP COLUMN IF EXISTS bonus_pay_per_order_cents,
DROP COLUMN IF EXISTS payment_notes;