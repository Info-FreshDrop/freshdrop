-- Create operator_earnings table to track all earnings from completed orders
CREATE TABLE public.operator_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  order_id UUID NOT NULL,
  revenue_share_cents INTEGER NOT NULL DEFAULT 0,
  tips_cents INTEGER NOT NULL DEFAULT 0,
  total_earnings_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payouts table to manage batch payments to operators
CREATE TABLE public.payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  earnings_count INTEGER NOT NULL DEFAULT 0,
  payout_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  payout_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method TEXT NOT NULL DEFAULT 'stripe_connect',
  external_payout_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_earnings junction table to track which earnings are included in which payout
CREATE TABLE public.payout_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  earning_id UUID NOT NULL REFERENCES public.operator_earnings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(payout_id, earning_id)
);

-- Enable Row Level Security
ALTER TABLE public.operator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operator_earnings
CREATE POLICY "Operators can view their own earnings" 
ON public.operator_earnings 
FOR SELECT 
USING (
  operator_id IN (
    SELECT id FROM washers WHERE user_id = auth.uid()
  ) OR is_admin_role(auth.uid())
);

CREATE POLICY "System can create earnings" 
ON public.operator_earnings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all earnings" 
ON public.operator_earnings 
FOR ALL 
USING (is_admin_role(auth.uid()));

-- RLS Policies for payouts
CREATE POLICY "Operators can view their own payouts" 
ON public.payouts 
FOR SELECT 
USING (
  operator_id IN (
    SELECT id FROM washers WHERE user_id = auth.uid()
  ) OR is_admin_role(auth.uid())
);

CREATE POLICY "Admins can manage all payouts" 
ON public.payouts 
FOR ALL 
USING (is_admin_role(auth.uid()));

-- RLS Policies for payout_earnings
CREATE POLICY "Users can view payout earnings if they can see the payout" 
ON public.payout_earnings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.payouts 
    WHERE payouts.id = payout_earnings.payout_id 
    AND (
      payouts.operator_id IN (
        SELECT id FROM washers WHERE user_id = auth.uid()
      ) OR is_admin_role(auth.uid())
    )
  )
);

CREATE POLICY "Admins can manage payout earnings" 
ON public.payout_earnings 
FOR ALL 
USING (is_admin_role(auth.uid()));

-- Add indexes for better performance
CREATE INDEX idx_operator_earnings_operator_id ON public.operator_earnings(operator_id);
CREATE INDEX idx_operator_earnings_order_id ON public.operator_earnings(order_id);
CREATE INDEX idx_operator_earnings_status ON public.operator_earnings(status);
CREATE INDEX idx_payouts_operator_id ON public.payouts(operator_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);

-- Create trigger for updating timestamps
CREATE TRIGGER update_operator_earnings_updated_at
BEFORE UPDATE ON public.operator_earnings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
BEFORE UPDATE ON public.payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();