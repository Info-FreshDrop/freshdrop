-- Create a function to notify when new operator applications are submitted
CREATE OR REPLACE FUNCTION public.notify_new_operator_application()
RETURNS TRIGGER AS $$
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

  -- Make an async HTTP request to the edge function
  PERFORM
    net.http_post(
      url := 'https://sbilxpqluuvxhmgfpggx.supabase.co/functions/v1/notify-new-operator-application',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'application', application_data
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new operator application is inserted
CREATE TRIGGER trigger_notify_new_operator_application
  AFTER INSERT ON public.operator_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_operator_application();