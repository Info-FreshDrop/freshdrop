-- Fix the function to use proper search path and correct authentication
CREATE OR REPLACE FUNCTION public.notify_new_operator_application()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Make an async HTTP request to the edge function using service role key
  PERFORM
    net.http_post(
      url := 'https://sbilxpqluuvxhmgfpggx.supabase.co/functions/v1/notify-new-operator-application',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiaWx4cHFsdXV2eGhtZ2ZwZ2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5NDIzNSwiZXhwIjoyMDY4NjcwMjM1fQ.8PBKPB_QdhtdhP3GkVABLd1QQOEWHqN5TdTQJqODBto'
      ),
      body := jsonb_build_object(
        'application', application_data
      )
    );

  RETURN NEW;
END;
$$;