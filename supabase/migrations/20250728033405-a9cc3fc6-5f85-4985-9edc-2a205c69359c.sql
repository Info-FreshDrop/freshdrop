-- Create a separate invites table for operator invitations
CREATE TABLE public.operator_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.operator_applications(id),
  signup_token TEXT UNIQUE NOT NULL,
  signup_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  zip_codes TEXT[] DEFAULT '{}',
  locker_access UUID[] DEFAULT '{}',
  is_used BOOLEAN DEFAULT FALSE,
  used_by_user_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.operator_invites ENABLE ROW LEVEL SECURITY;

-- Create policies for operator invites
CREATE POLICY "Owners can manage invites" 
ON public.operator_invites 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Anyone can view invites by token" 
ON public.operator_invites 
FOR SELECT 
TO anon 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_operator_invites_updated_at
BEFORE UPDATE ON public.operator_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();