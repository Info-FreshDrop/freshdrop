-- Fix the operator approval trigger to use correct http_post signature
CREATE OR REPLACE FUNCTION public.handle_operator_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  approval_data jsonb;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Build the approval data to send to the edge function
    approval_data := jsonb_build_object(
      'application_id', NEW.id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'zip_code', NEW.zip_code
    );

    -- Make HTTP request using correct 3-parameter signature
    PERFORM
      http_post(
        'https://sbilxpqluuvxhmgfpggx.supabase.co/functions/v1/operator-approval-notification',
        jsonb_build_object(
          'approval_data', approval_data
        )::text,
        'application/json'
      );
  END IF;

  RETURN NEW;
END;
$function$;