-- Remove the net.http_post call from insert_order_message function
CREATE OR REPLACE FUNCTION public.insert_order_message(p_order_id uuid, p_recipient_washer_id uuid, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id UUID := auth.uid();
  v_recipient_user_id UUID;
  v_order_exists BOOLEAN := false;
  v_message_id UUID;
  v_sender_is_customer BOOLEAN := false;
  v_sender_is_operator BOOLEAN := false;
  v_sender_name TEXT;
BEGIN
  -- Check if user is authenticated
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if sender is the customer for this order
  SELECT EXISTS(
    SELECT 1 FROM orders 
    WHERE id = p_order_id AND customer_id = v_sender_id
  ) INTO v_sender_is_customer;
  
  -- Check if sender is the operator for this order
  SELECT EXISTS(
    SELECT 1 FROM orders o
    JOIN washers w ON w.id = o.washer_id
    WHERE o.id = p_order_id AND w.user_id = v_sender_id
  ) INTO v_sender_is_operator;
  
  -- Verify user has access to this order
  IF NOT (v_sender_is_customer OR v_sender_is_operator) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied');
  END IF;
  
  -- Determine recipient based on sender type
  IF v_sender_is_customer THEN
    -- Customer messaging operator: look up operator's user_id from washer_id
    SELECT user_id INTO v_recipient_user_id 
    FROM washers 
    WHERE id = p_recipient_washer_id;
    
    IF v_recipient_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Recipient washer not found');
    END IF;
  ELSE
    -- Operator messaging customer: recipient_washer_id is actually the customer's user_id
    v_recipient_user_id := p_recipient_washer_id;
  END IF;
  
  -- Get sender name for notification
  SELECT COALESCE(first_name || ' ' || last_name, first_name, 'User') INTO v_sender_name
  FROM profiles WHERE user_id = v_sender_id;
  
  -- Insert the message
  INSERT INTO order_messages (order_id, sender_id, recipient_id, message)
  VALUES (p_order_id, v_sender_id, v_recipient_user_id, p_message)
  RETURNING id INTO v_message_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message_id', v_message_id,
    'recipient_user_id', v_recipient_user_id,
    'sender_name', v_sender_name,
    'sender_is_customer', v_sender_is_customer
  );
END;
$function$;