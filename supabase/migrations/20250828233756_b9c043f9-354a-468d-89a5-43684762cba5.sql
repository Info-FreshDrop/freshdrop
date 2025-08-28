-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_notify_new_operator_application ON operator_applications;

-- Drop the existing function
DROP FUNCTION IF EXISTS notify_new_operator_application();

-- Create a fixed trigger function with proper authorization
CREATE OR REPLACE FUNCTION public.notify_new_operator_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  application_data jsonb;
  response_status integer;
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

  -- Make HTTP request with proper headers
  SELECT status INTO response_status
  FROM http((
    'POST',
    'https://sbilxpqluuvxhmgfpggx.supabase.co/functions/v1/notify-new-operator-application',
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))
    ],
    'application/json',
    jsonb_build_object('application', application_data)::text
  ));

  -- Log the response for debugging
  RAISE LOG 'Edge function response status: %', response_status;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the insert
    RAISE LOG 'Error calling edge function: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER trigger_notify_new_operator_application
  AFTER INSERT ON operator_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_operator_application();