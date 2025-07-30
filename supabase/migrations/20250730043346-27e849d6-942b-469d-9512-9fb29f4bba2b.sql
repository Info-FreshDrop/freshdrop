-- Allow operators to manage their own zip codes and preferences
-- Update the washer RLS policy to allow zip code updates

DROP POLICY IF EXISTS "Washers can update own status" ON public.washers;

CREATE POLICY "Washers can update own data" ON public.washers
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure orders are properly visible to customers and operators
-- Add missing index for better performance on order queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_id_status ON public.orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_zip_code_status ON public.orders(zip_code, status);
CREATE INDEX IF NOT EXISTS idx_orders_washer_id_status ON public.orders(washer_id, status) WHERE washer_id IS NOT NULL;