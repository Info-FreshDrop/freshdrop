-- Create a temporary table to store order data before payment confirmation
CREATE TABLE public.pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_intent_id TEXT UNIQUE,
  order_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 hour')
);

-- Enable Row Level Security
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own pending orders
CREATE POLICY "Users can manage their own pending orders" ON public.pending_orders
FOR ALL
USING (auth.uid() = user_id);

-- Create policy for system operations (edge functions)
CREATE POLICY "System can manage all pending orders" ON public.pending_orders
FOR ALL
USING (true);

-- Create index for efficient lookups
CREATE INDEX idx_pending_orders_payment_intent ON public.pending_orders(payment_intent_id);
CREATE INDEX idx_pending_orders_expires_at ON public.pending_orders(expires_at);

-- Create function to clean up expired pending orders
CREATE OR REPLACE FUNCTION cleanup_expired_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.pending_orders 
  WHERE expires_at < now();
END;
$$;