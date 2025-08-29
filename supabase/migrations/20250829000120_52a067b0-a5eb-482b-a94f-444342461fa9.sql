-- Add training_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN training_completed boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.training_completed IS 'Tracks if operator has completed training modules';