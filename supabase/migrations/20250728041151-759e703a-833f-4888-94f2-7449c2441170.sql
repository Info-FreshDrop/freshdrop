-- Fix RLS policy to allow operators (not just washers) to view unclaimed orders
DROP POLICY IF EXISTS "Washers can view unclaimed orders in their area" ON orders;

CREATE POLICY "Operators can view unclaimed orders in their area" 
ON orders 
FOR SELECT 
USING (
  (status = 'unclaimed'::order_status) AND 
  (has_role(auth.uid(), 'operator'::app_role) OR has_role(auth.uid(), 'washer'::app_role)) AND 
  (EXISTS ( 
    SELECT 1 FROM washers w 
    WHERE w.user_id = auth.uid() AND 
    (orders.zip_code = ANY (w.zip_codes) OR orders.locker_id = ANY (w.locker_access))
  ))
);

-- Also need to update the policy for operators to update assigned orders
DROP POLICY IF EXISTS "Washers can update assigned orders" ON orders;

CREATE POLICY "Operators can update assigned orders" 
ON orders 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT w.user_id FROM washers w WHERE w.id = orders.washer_id
  )
);

-- And update the policy for viewing assigned orders
DROP POLICY IF EXISTS "Washers can view assigned orders" ON orders;

CREATE POLICY "Operators can view assigned orders" 
ON orders 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT w.user_id FROM washers w WHERE w.id = orders.washer_id
  )
);