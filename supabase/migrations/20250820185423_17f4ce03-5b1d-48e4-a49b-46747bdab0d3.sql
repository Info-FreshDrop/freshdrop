-- Account deletion tracking table
CREATE TABLE public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  reason TEXT,
  data_export_requested BOOLEAN NOT NULL DEFAULT false,
  data_export_url TEXT,
  confirmation_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for account deletion requests
CREATE POLICY "Users can view their own deletion requests" 
ON public.account_deletion_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deletion requests" 
ON public.account_deletion_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deletion requests" 
ON public.account_deletion_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all deletion requests" 
ON public.account_deletion_requests 
FOR ALL 
USING (is_admin_role(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_account_deletion_requests_updated_at
BEFORE UPDATE ON public.account_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Data export logs table
CREATE TABLE public.data_export_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  export_type TEXT NOT NULL DEFAULT 'account_deletion' CHECK (export_type IN ('account_deletion', 'gdpr_request', 'manual')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  file_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_export_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for data export logs
CREATE POLICY "Users can view their own export logs" 
ON public.data_export_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage export logs" 
ON public.data_export_logs 
FOR ALL 
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_data_export_logs_updated_at
BEFORE UPDATE ON public.data_export_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();