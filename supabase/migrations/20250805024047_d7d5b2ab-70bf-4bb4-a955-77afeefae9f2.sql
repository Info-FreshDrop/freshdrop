-- Add email, birthday and promotional preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email TEXT,
ADD COLUMN birthday DATE,
ADD COLUMN opt_in_sms BOOLEAN DEFAULT false,
ADD COLUMN opt_in_email BOOLEAN DEFAULT false;

-- Add a comment to document the new fields
COMMENT ON COLUMN public.profiles.email IS 'User email address for profile display and contact';
COMMENT ON COLUMN public.profiles.birthday IS 'User birthday for promotions and age verification';
COMMENT ON COLUMN public.profiles.opt_in_sms IS 'User consent to receive SMS promotional messages';
COMMENT ON COLUMN public.profiles.opt_in_email IS 'User consent to receive email promotional messages';