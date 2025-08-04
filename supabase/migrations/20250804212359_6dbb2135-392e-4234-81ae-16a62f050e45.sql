-- Create secure function for inserting order messages
CREATE OR REPLACE FUNCTION public.insert_order_message(
  p_order_id UUID,
  p_recipient_washer_id UUID,
  p_message TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_recipient_user_id UUID;
  v_order_exists BOOLEAN := false;
  v_message_id UUID;
BEGIN
  -- Check if user is authenticated
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Verify the order exists and user has access to it (either as customer or assigned washer)
  SELECT EXISTS(
    SELECT 1 FROM orders o 
    LEFT JOIN washers w ON w.id = o.washer_id
    WHERE o.id = p_order_id 
    AND (o.customer_id = v_sender_id OR w.user_id = v_sender_id)
  ) INTO v_order_exists;
  
  IF NOT v_order_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied');
  END IF;
  
  -- Get the recipient's user_id from the washer
  SELECT user_id INTO v_recipient_user_id 
  FROM washers 
  WHERE id = p_recipient_washer_id;
  
  IF v_recipient_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient washer not found');
  END IF;
  
  -- Insert the message
  INSERT INTO order_messages (order_id, sender_id, recipient_id, message)
  VALUES (p_order_id, v_sender_id, v_recipient_user_id, p_message)
  RETURNING id INTO v_message_id;
  
  -- Call notification function
  PERFORM public.send_order_notification(
    'message',
    NULL, -- customer_id will be determined by the function
    p_recipient_washer_id, -- operator_id
    p_order_id,
    'New message from customer',
    'You have a new message: "' || p_message || '"',
    (SELECT first_name || ' ' || COALESCE(last_name, '') FROM profiles WHERE user_id = v_sender_id)
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message_id', v_message_id,
    'recipient_user_id', v_recipient_user_id
  );
END;
$$;