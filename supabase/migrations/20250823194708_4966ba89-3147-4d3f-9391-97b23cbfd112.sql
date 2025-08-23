-- Add foreign key relationship between washers and profiles tables
-- This will allow Supabase joins to work properly in PayoutManagement

ALTER TABLE public.washers 
ADD CONSTRAINT fk_washers_user_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);