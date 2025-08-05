-- Add payment fields to washers table
ALTER TABLE public.washers 
ADD COLUMN hourly_rate_cents integer DEFAULT 2000, -- Default $20/hour
ADD COLUMN base_pay_per_order_cents integer DEFAULT 800, -- Default $8 per order
ADD COLUMN bonus_pay_per_order_cents integer DEFAULT 0, -- Default $0 bonus
ADD COLUMN payment_notes text,
ADD COLUMN pay_updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN pay_updated_by uuid;

-- Add comment to explain the payment structure
COMMENT ON COLUMN public.washers.hourly_rate_cents IS 'Hourly rate in cents for time-based compensation';
COMMENT ON COLUMN public.washers.base_pay_per_order_cents IS 'Base payment per completed order in cents';
COMMENT ON COLUMN public.washers.bonus_pay_per_order_cents IS 'Bonus payment per order in cents for performance incentives';
COMMENT ON COLUMN public.washers.payment_notes IS 'Notes about payment arrangement or special terms';
COMMENT ON COLUMN public.washers.pay_updated_at IS 'Timestamp when payment was last updated';
COMMENT ON COLUMN public.washers.pay_updated_by IS 'User ID who last updated the payment information';