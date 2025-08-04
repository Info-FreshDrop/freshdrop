-- Update the send_order_notification function to use valid notification types
CREATE OR REPLACE FUNCTION public.send_order_notification(
  p_notification_type TEXT,
  p_customer_id UUID,
  p_operator_id UUID,
  p_order_id UUID,
  p_subject TEXT,
  p_message TEXT,
  p_sender_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_notification_type TEXT;
BEGIN
  -- Map notification types to valid values
  CASE p_notification_type
    WHEN 'message' THEN v_valid_notification_type := 'email';
    WHEN 'order_status' THEN v_valid_notification_type := 'email';
    ELSE v_valid_notification_type := 'email';
  END CASE;

  -- This function logs the notification attempt
  INSERT INTO notification_logs (
    notification_type,
    customer_id,
    order_id,
    status,
    message_content,
    recipient
  ) VALUES (
    v_valid_notification_type,
    COALESCE(p_customer_id, auth.uid()),
    p_order_id,
    'pending',
    p_message,
    p_subject
  );
END;
$$;