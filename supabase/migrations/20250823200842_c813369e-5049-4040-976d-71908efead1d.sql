-- Create function to automatically calculate earnings when order is completed
CREATE OR REPLACE FUNCTION public.trigger_earnings_calculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Call the calculate-operator-earnings edge function
    PERFORM net.http_post(
      url := concat(
        coalesce(current_setting('app.supabase_url', true), 'https://sbilxpqluuvxhmgfpggx.supabase.co'),
        '/functions/v1/calculate-operator-earnings'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', coalesce(current_setting('app.supabase_service_role_key', true), ''))
      ),
      body := jsonb_build_object('order_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically calculate earnings on order completion
DROP TRIGGER IF EXISTS calculate_earnings_on_completion ON public.orders;
CREATE TRIGGER calculate_earnings_on_completion
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_earnings_calculation();

-- Create function to backfill earnings for existing completed orders
CREATE OR REPLACE FUNCTION public.backfill_operator_earnings()
RETURNS TEXT AS $$
DECLARE
  order_record RECORD;
  result_count INTEGER := 0;
BEGIN
  -- Loop through all completed orders that don't have earnings calculated
  FOR order_record IN
    SELECT o.id, o.washer_id, o.total_amount_cents, o.status
    FROM orders o
    WHERE o.status = 'completed' 
      AND o.washer_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM operator_earnings oe WHERE oe.order_id = o.id
      )
  LOOP
    -- Call the calculate-operator-earnings function for each order
    PERFORM net.http_post(
      url := concat(
        coalesce(current_setting('app.supabase_url', true), 'https://sbilxpqluuvxhmgfpggx.supabase.co'),
        '/functions/v1/calculate-operator-earnings'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', coalesce(current_setting('app.supabase_service_role_key', true), ''))
      ),
      body := jsonb_build_object('order_id', order_record.id)
    );
    
    result_count := result_count + 1;
  END LOOP;
  
  RETURN format('Processed %s completed orders for earnings calculation', result_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the backfill function immediately
SELECT public.backfill_operator_earnings();