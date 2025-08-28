-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_notify_new_operator_application ON operator_applications;

-- Drop the existing function
DROP FUNCTION IF EXISTS notify_new_operator_application();

-- Create a simplified trigger function that uses the http extension correctly
CREATE OR REPLACE FUNCTION public.notify_new_operator_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  application_data jsonb;
BEGIN
  -- Build the application data to send to the edge function
  application_data := jsonb_build_object(
    'id', NEW.id,
    'first_name', NEW.first_name,
    'last_name', NEW.last_name,
    'email', NEW.email,
    'phone', NEW.phone,
    'address', NEW.address,
    'city', NEW.city,
    'state', NEW.state,
    'zip_code', NEW.zip_code,
    'vehicle_type', NEW.vehicle_type,
    'experience', NEW.experience,
    'motivation', NEW.motivation,
    'created_at', NEW.created_at
  );

  -- Make HTTP request using the correct signature with proper auth header
  PERFORM
    http_post(
      'https://sbilxpqluuvxhmgfpggx.supabase.co/functions/v1/notify-new-operator-application',
      jsonb_build_object(
        'application', application_data
      )::text,
      'application/json'
    );

  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER trigger_notify_new_operator_application
  AFTER INSERT ON operator_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_operator_application();