-- Create a function to handle operator application approvals
CREATE OR REPLACE FUNCTION public.handle_operator_approval()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

    -- Make an async HTTP request to the edge function
    PERFORM
      net.http_post(
        url := 'https://sbilxpqluuvxhmgfpggx.supabase.co/functions/v1/operator-approval-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiaWx4cHFsdXV2eGhtZ2ZwZ2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5NDIzNSwiZXhwIjoyMDY4NjcwMjM1fQ.8PBKPB_QdhtdhP3GkVABLd1QQOEWHqN5TdTQJqODBto'
        ),
        body := jsonb_build_object(
          'approval_data', approval_data
        )
      );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that fires after operator application status update
CREATE TRIGGER trigger_handle_operator_approval
  AFTER UPDATE ON public.operator_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_operator_approval();