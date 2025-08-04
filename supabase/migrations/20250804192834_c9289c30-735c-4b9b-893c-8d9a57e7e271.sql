-- Add new columns to promo_codes table for visibility and date range
ALTER TABLE public.promo_codes 
ADD COLUMN visible_to_customers boolean DEFAULT false,
ADD COLUMN valid_from timestamp with time zone DEFAULT null,
ADD COLUMN valid_until timestamp with time zone DEFAULT null;