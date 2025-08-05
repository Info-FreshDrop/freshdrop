-- Add stock tracking to clothes items
ALTER TABLE public.clothes_items 
ADD COLUMN is_in_stock boolean NOT NULL DEFAULT true;