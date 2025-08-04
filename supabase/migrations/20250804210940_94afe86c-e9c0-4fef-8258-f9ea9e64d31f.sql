-- Fix the RLS policy for order_messages to allow customers to send messages
DROP POLICY IF EXISTS "Users can send messages for their orders" ON order_messages;

-- Create a simpler policy that allows users to send messages if they are involved in the order
CREATE POLICY "Users can send messages for their orders" 
ON order_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Customer can send if they own the order
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_messages.order_id 
      AND orders.customer_id = auth.uid()
    )
    OR
    -- Operator can send if they are assigned to the order
    EXISTS (
      SELECT 1 FROM orders o
      JOIN washers w ON w.id = o.washer_id
      WHERE o.id = order_messages.order_id 
      AND w.user_id = auth.uid()
    )
  )
);