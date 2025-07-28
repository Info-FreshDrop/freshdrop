-- Add foreign key relationship between orders and profiles
ALTER TABLE public.orders 
ADD CONSTRAINT orders_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also add a proper index for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_zip_code ON public.orders(zip_code);
CREATE INDEX IF NOT EXISTS idx_orders_washer_id ON public.orders(washer_id);