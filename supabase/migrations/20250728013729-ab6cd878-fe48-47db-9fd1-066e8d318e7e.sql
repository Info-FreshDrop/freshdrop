-- Add approval workflow columns to washers table
ALTER TABLE public.washers 
ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN signup_token text,
ADD COLUMN signup_expires_at timestamp with time zone;

-- Enable real-time for tables that need updates
ALTER TABLE public.washers REPLICA IDENTITY FULL;
ALTER TABLE public.service_areas REPLICA IDENTITY FULL;
ALTER TABLE public.lockers REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.washers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_areas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lockers;