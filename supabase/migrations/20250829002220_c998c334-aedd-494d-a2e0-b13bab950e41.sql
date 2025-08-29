-- Enable real-time updates for onboarding_content
ALTER TABLE public.onboarding_content REPLICA IDENTITY FULL;

-- Add the table to the real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_content;