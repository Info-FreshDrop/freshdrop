-- Add image_url column to promo_codes table for coupon carousel
ALTER TABLE public.promo_codes 
ADD COLUMN image_url TEXT;