-- Drop all existing triggers and functions related to operator approval with CASCADE
DROP TRIGGER IF EXISTS trigger_handle_operator_approval ON operator_applications CASCADE;
DROP TRIGGER IF EXISTS operator_approval_trigger ON operator_applications CASCADE;
DROP TRIGGER IF EXISTS trigger_operator_approval ON operator_applications CASCADE;
DROP FUNCTION IF EXISTS handle_operator_approval() CASCADE;

-- Create function to handle operator approval
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

    -- Make HTTP request to the operator approval notification function
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
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the update
    RAISE LOG 'Error calling operator approval function: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create trigger on operator_applications table
CREATE TRIGGER trigger_operator_approval
  AFTER UPDATE ON operator_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_operator_approval();