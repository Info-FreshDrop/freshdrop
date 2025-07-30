-- Add a field to track if customer has acknowledged completed order
ALTER TABLE public.orders 
ADD COLUMN customer_acknowledged boolean DEFAULT false;