-- Enable realtime for order_messages table
ALTER TABLE order_messages REPLICA IDENTITY FULL;

-- Add order_messages to the realtime publication
-- (This ensures real-time updates work properly)