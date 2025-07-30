-- Add RLS policy to allow customers to acknowledge their own completed orders
CREATE POLICY "Customers can acknowledge their own completed orders" 
ON public.orders 
FOR UPDATE 
USING (
  auth.uid() = customer_id AND 
  status IN ('completed', 'cancelled')
)
WITH CHECK (
  auth.uid() = customer_id AND 
  status IN ('completed', 'cancelled')
);