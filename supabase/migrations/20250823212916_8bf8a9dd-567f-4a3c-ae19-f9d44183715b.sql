-- Update RLS policy to only allow operators to see unclaimed orders (payment confirmed)
DROP POLICY IF EXISTS "Operators can view available orders in their area" ON public.orders;

CREATE POLICY "Operators can view available orders in their area" 
ON public.orders 
FOR SELECT 
USING (
  (status = 'unclaimed'::order_status) AND 
  (has_role(auth.uid(), 'operator'::app_role) OR has_role(auth.uid(), 'washer'::app_role)) AND 
  (EXISTS ( 
    SELECT 1
    FROM washers w
    WHERE (
      (w.user_id = auth.uid()) AND 
      (w.is_active = true) AND 
      (w.approval_status = 'approved'::text) AND 
      ((orders.zip_code = ANY (w.zip_codes)) OR (orders.locker_id = ANY (w.locker_access)))
    )
  ))
);