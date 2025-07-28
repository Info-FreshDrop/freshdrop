-- Create operator_applications table to store applications from homepage form
CREATE TABLE public.operator_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  drivers_license TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  availability TEXT NOT NULL,
  experience TEXT,
  motivation TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.operator_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for operator applications
CREATE POLICY "Owners can manage all applications" 
ON public.operator_applications 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Anyone can create applications" 
ON public.operator_applications 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_operator_applications_updated_at
BEFORE UPDATE ON public.operator_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();