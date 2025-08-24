-- Add the missing approved_at column to operator_applications table
ALTER TABLE public.operator_applications 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;