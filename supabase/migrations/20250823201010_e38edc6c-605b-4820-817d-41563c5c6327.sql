-- Create function to manually trigger earnings calculation for completed orders
CREATE OR REPLACE FUNCTION public.calculate_missing_earnings()
RETURNS TABLE(processed_order_id uuid, result_message text) AS $$
DECLARE
  order_record RECORD;
  settings_record RECORD;
  operator_percentage INTEGER := 50;
  revenue_share_cents INTEGER;
  total_tips_cents INTEGER;
  total_earnings_cents INTEGER;
BEGIN
  -- Get revenue split settings
  SELECT setting_value INTO settings_record 
  FROM business_settings 
  WHERE setting_key = 'revenue_split';
  
  IF FOUND AND settings_record.setting_value ? 'operator_percentage' THEN
    operator_percentage := (settings_record.setting_value->>'operator_percentage')::integer;
  END IF;

  -- Process each completed order without earnings
  FOR order_record IN
    SELECT o.id, o.washer_id, o.total_amount_cents, o.status
    FROM orders o
    WHERE o.status = 'completed' 
      AND o.washer_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM operator_earnings oe WHERE oe.order_id = o.id
      )
  LOOP
    -- Calculate revenue share
    revenue_share_cents := (order_record.total_amount_cents * operator_percentage / 100);
    
    -- Get tips for this order (qualify column names to avoid ambiguity)
    SELECT COALESCE(SUM(t.amount_cents), 0) INTO total_tips_cents
    FROM tips t
    WHERE t.order_id = order_record.id;
    
    -- Calculate total earnings
    total_earnings_cents := revenue_share_cents + total_tips_cents;
    
    -- Insert earnings record
    INSERT INTO operator_earnings (
      operator_id,
      order_id,
      revenue_share_cents,
      tips_cents,
      total_earnings_cents,
      status
    ) VALUES (
      order_record.washer_id,
      order_record.id,
      revenue_share_cents,
      total_tips_cents,
      total_earnings_cents,
      'pending'
    );
    
    -- Return info about processed order
    processed_order_id := order_record.id;
    result_message := format('Calculated earnings: $%.2f (revenue: $%.2f + tips: $%.2f)', 
      total_earnings_cents/100.0, 
      revenue_share_cents/100.0, 
      total_tips_cents/100.0
    );
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to backfill missing earnings
SELECT * FROM public.calculate_missing_earnings();