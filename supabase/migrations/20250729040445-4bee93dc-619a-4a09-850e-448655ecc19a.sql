-- Add stripe_payment_intent_id column to orders table for embedded payments
ALTER TABLE public.orders 
ADD COLUMN stripe_payment_intent_id TEXT;