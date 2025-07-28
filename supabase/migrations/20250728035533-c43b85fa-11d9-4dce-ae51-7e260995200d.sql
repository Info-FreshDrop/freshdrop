-- Add missing stripe_session_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;