-- Update the RLS policy to allow operators to see both 'placed' and 'unclaimed' orders in their area
DROP POLICY IF EXISTS "Operators can view unclaimed orders in their area" ON public.orders;

CREATE POLICY "Operators can view available orders in their area" 
ON public.orders 
FOR SELECT 
USING (
  (status IN ('placed', 'unclaimed')) AND 
  (has_role(auth.uid(), 'operator'::app_role) OR has_role(auth.uid(), 'washer'::app_role)) AND 
  (EXISTS ( 
    SELECT 1
    FROM washers w
    WHERE (w.user_id = auth.uid()) AND 
    ((orders.zip_code = ANY (w.zip_codes)) OR (orders.locker_id = ANY (w.locker_access)))
  ))
);